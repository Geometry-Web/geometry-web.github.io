/* =====================================================================
 * moderation.js — reports, staff review and audit history.
 *
 * Reporting is open to any signed-in player. Reviewing is limited to the
 * moderator and admin roles, which only exist in the database (there is no
 * setting, header or client flag that can grant them). Every staff action is
 * written to moderation_actions and audit_logs.
 * ===================================================================== */
import express from "express";
import { all, get, run, tx } from "../db.js";
import { recordAudit, requireAuth, requireRole } from "../auth.js";
import { badRequest, conflict, forbidden, id, notFound, oneOf, pageParams, text, wrap } from "../util.js";
import { notify } from "./notifications.js";

export const moderation = express.Router();

/* POST /reports — target types are fixed, and the target must exist, so a report
 * always points at something an admin can open. */
moderation.post("/reports", requireAuth, wrap((req, res) => {
    const body = req.body || {};
    const targetType = oneOf(body.targetType, "targetType", ["user", "level", "comment"]);
    const targetId = id(body.targetId, "targetId");
    const reason = text(body.reason, "reason", { min: 3, max: 120 });
    const details = text(body.details, "details", { max: 500, required: false }) || null;

    const exists = {
        user: "SELECT id FROM users WHERE id = ? AND deleted_at IS NULL",
        level: "SELECT id FROM levels WHERE id = ? AND deleted_at IS NULL",
        comment: "SELECT id FROM level_comments WHERE id = ? AND deleted_at IS NULL"
    }[targetType];
    if (!get(exists, [targetId])) throw notFound("That " + targetType + " does not exist.");
    if (get("SELECT 1 AS x FROM reports WHERE reporter_id = ? AND status = 'open' AND target_type = ? " +
        "AND target_id = ?", [req.user.id, targetType, targetId])) {
        throw conflict("already_reported", "You already reported that.");
    }

    const info = run(
        "INSERT INTO reports (reporter_id, target_type, target_id, reason, details, created_at) " +
            "VALUES (?, ?, ?, ?, ?, ?)",
        [req.user.id, targetType, targetId, reason, details, new Date().toISOString()]
    );
    res.status(201).json({ ok: true, reportId: info.lastInsertRowid });
}));

/* GET /admin/reports — staff queue. */
moderation.get("/admin/reports", requireRole("moderator", "admin"), wrap((req, res) => {
    const { page, limit, offset } = pageParams(req.query);
    const status = req.query.status || "open";
    oneOf(status, "status", ["open", "resolved", "dismissed", "all"]);
    const rows = all(
        "SELECT r.*, u.username AS reporter FROM reports r JOIN users u ON u.id = r.reporter_id " +
            (status === "all" ? "" : "WHERE r.status = ? ") +
            "ORDER BY r.created_at DESC LIMIT ? OFFSET ?",
        status === "all" ? [limit, offset] : [status, limit, offset]
    );
    res.json({
        reports: rows.map((row) => ({
            id: row.id,
            reporter: { id: row.reporter_id, username: row.reporter },
            targetType: row.target_type,
            targetId: row.target_id,
            reason: row.reason,
            details: row.details,
            status: row.status,
            createdAt: row.created_at
        })),
        page
    });
}));

moderation.post("/admin/reports/:id/resolve", requireRole("moderator", "admin"), wrap((req, res) => {
    const report = get("SELECT * FROM reports WHERE id = ?", [id(req.params.id, "report")]);
    if (!report) throw notFound("No such report.");
    const resolution = oneOf((req.body || {}).resolution, "resolution", ["resolved", "dismissed"]);
    const notes = text((req.body || {}).notes, "notes", { max: 300, required: false }) || null;
    const stamp = new Date().toISOString();
    tx(() => {
        run("UPDATE reports SET status = ?, resolved_at = ?, resolved_by = ? WHERE id = ?",
            [resolution, stamp, req.user.id, report.id]);
        run("INSERT INTO moderation_actions (admin_id, action, target_type, target_id, notes, created_at) " +
            "VALUES (?, ?, ?, ?, ?, ?)",
            [req.user.id, "report_" + resolution, report.target_type, report.target_id, notes, stamp]);
    });
    recordAudit(req.user.id, "moderation.report", {
        targetType: report.target_type, targetId: report.target_id, ip: req.ip,
        meta: { reportId: report.id, resolution }
    });
    notify(report.reporter_id, "report_update",
        "Your report was reviewed (" + resolution + ").", null);
    res.json({ ok: true });
}));

/* POST /admin/users/:id/suspend — disables the account and destroys its sessions.
 * Moderators may suspend players; only admins may touch another staff account. */
moderation.post("/admin/users/:id/suspend", requireRole("moderator", "admin"), wrap((req, res) => {
    const targetId = id(req.params.id, "user");
    const target = get("SELECT * FROM users WHERE id = ? AND deleted_at IS NULL", [targetId]);
    if (!target) throw notFound("No such player.");
    if (target.role !== "player" && req.user.role !== "admin") {
        throw forbidden("Only an administrator can act on staff.");
    }
    if (target.id === req.user.id) throw badRequest("self_target", "You cannot suspend yourself.");
    const reason = text((req.body || {}).reason, "reason", { min: 3, max: 200 });
    const stamp = new Date().toISOString();
    tx(() => {
        run("UPDATE users SET disabled_at = ?, disable_reason = ?, updated_at = ? WHERE id = ?",
            [stamp, reason, stamp, target.id]);
        run("DELETE FROM sessions WHERE user_id = ?", [target.id]);
        run("INSERT INTO moderation_actions (admin_id, action, target_type, target_id, notes, created_at) " +
            "VALUES (?, 'suspend', 'user', ?, ?, ?)", [req.user.id, target.id, reason, stamp]);
    });
    recordAudit(req.user.id, "moderation.suspend", {
        targetType: "user", targetId: target.id, ip: req.ip, meta: { reason }
    });
    res.json({ ok: true });
}));

moderation.post("/admin/users/:id/unsuspend", requireRole("moderator", "admin"), wrap((req, res) => {
    const targetId = id(req.params.id, "user");
    if (!get("SELECT id FROM users WHERE id = ?", [targetId])) throw notFound("No such player.");
    run("UPDATE users SET disabled_at = NULL, disable_reason = NULL, updated_at = ? WHERE id = ?",
        [new Date().toISOString(), targetId]);
    recordAudit(req.user.id, "moderation.unsuspend", { targetType: "user", targetId, ip: req.ip });
    res.json({ ok: true });
}));

/* DELETE /admin/levels/:id — staff removal, distinct from the owner's own delete
 * only in the audit trail it leaves. */
moderation.delete("/admin/levels/:id", requireRole("moderator", "admin"), wrap((req, res) => {
    const levelId = id(req.params.id, "level");
    const level = get("SELECT * FROM levels WHERE id = ? AND deleted_at IS NULL", [levelId]);
    if (!level) throw notFound("No such level.");
    const stamp = new Date().toISOString();
    tx(() => {
        run("UPDATE levels SET deleted_at = ? WHERE id = ?", [stamp, levelId]);
        run("INSERT INTO moderation_actions (admin_id, action, target_type, target_id, notes, created_at) " +
            "VALUES (?, 'remove_level', 'level', ?, ?, ?)",
            [req.user.id, levelId, (req.body || {}).reason || null, stamp]);
    });
    recordAudit(req.user.id, "moderation.level_delete", {
        targetType: "level", targetId: levelId, ip: req.ip
    });
    notify(level.owner_id, "level_removed",
        "Your level \"" + level.name + "\" was removed by a moderator.", null);
    res.json({ ok: true });
}));

/* POST /admin/users/:id/role — administrator only, and never self-service. */
moderation.post("/admin/users/:id/role", requireRole("admin"), wrap((req, res) => {
    const targetId = id(req.params.id, "user");
    const role = oneOf((req.body || {}).role, "role", ["player", "moderator", "admin"]);
    if (targetId === req.user.id) throw badRequest("self_target", "You cannot change your own role.");
    if (!get("SELECT id FROM users WHERE id = ?", [targetId])) throw notFound("No such player.");
    run("UPDATE users SET role = ?, updated_at = ? WHERE id = ?", [role, new Date().toISOString(), targetId]);
    recordAudit(req.user.id, "admin.role_change", {
        targetType: "user", targetId, ip: req.ip, meta: { role }
    });
    res.json({ ok: true });
}));

moderation.get("/admin/audit", requireRole("admin"), wrap((req, res) => {
    const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit, 10) || 100));
    const rows = all(
        "SELECT a.*, u.username FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id " +
            "ORDER BY a.id DESC LIMIT ?", [limit]);
    res.json({
        entries: rows.map((row) => ({
            id: row.id,
            actor: row.username || null,
            action: row.action,
            targetType: row.target_type,
            targetId: row.target_id,
            ip: row.ip,
            meta: row.meta ? JSON.parse(row.meta) : null,
            createdAt: row.created_at
        }))
    });
}));

moderation.get("/admin/stats", requireRole("moderator", "admin"), wrap((req, res) => {
    const count = (sql) => {
        const row = get(sql);
        return row ? row.n : 0;
    };
    res.json({
        users: count("SELECT COUNT(*) AS n FROM users WHERE deleted_at IS NULL"),
        levels: count("SELECT COUNT(*) AS n FROM levels WHERE deleted_at IS NULL"),
        publicLevels: count("SELECT COUNT(*) AS n FROM levels WHERE deleted_at IS NULL AND visibility = 'public'"),
        comments: count("SELECT COUNT(*) AS n FROM level_comments WHERE deleted_at IS NULL"),
        openReports: count("SELECT COUNT(*) AS n FROM reports WHERE status = 'open'"),
        sessions: count("SELECT COUNT(*) AS n FROM sessions")
    });
}));

