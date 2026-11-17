/* =====================================================================
 * shares.js — sharing a level with specific, named players.
 *
 * The workflow is invitation based: the owner picks a username and a permission
 * set, the invitee accepts or declines, and only then is a level_permissions
 * row created. Revoking deletes that row immediately, so access is decided by
 * the database on every request - never by a hidden button in the client.
 * ===================================================================== */
import express from "express";
import { all, get, run, tx } from "../db.js";
import { requireAuth } from "../auth.js";
import { badRequest, forbidden, id, notFound, wrap } from "../util.js";
import { accessFor, levelCard, loadLevel, requireLevelAccess } from "./levels.js";
import { parsePermissionsBody, userSummary } from "./users.js";
import { notify } from "./notifications.js";

const DEFAULT_SHARE = { view: true, play: true, comment: false, copy: false, edit: false };

function usernameById(userId) {
    const row = get("SELECT username FROM users WHERE id = ?", [userId]);
    return row ? row.username : "unknown";
}

function permissionBits(row) {
    return {
        view: !!row.can_view,
        play: !!row.can_play,
        comment: !!row.can_comment,
        copy: !!row.can_copy,
        edit: !!row.can_edit
    };
}

function permissionView(levelId) {
    const rows = all(
        "SELECT p.*, u.username FROM level_permissions p JOIN users u ON u.id = p.user_id " +
            "WHERE p.level_id = ? ORDER BY u.username_lower",
        [levelId]
    );
    const invitations = all(
        "SELECT s.*, u.username AS to_username, f.username AS from_username FROM share_invitations s " +
            "JOIN users u ON u.id = s.to_user JOIN users f ON f.id = s.from_user " +
            "WHERE s.level_id = ? ORDER BY s.created_at DESC LIMIT 100",
        [levelId]
    );
    return {
        grants: rows.map((row) => ({
            userId: row.user_id,
            username: row.username,
            permissions: permissionBits(row),
            grantedAt: row.created_at,
            updatedAt: row.updated_at
        })),
        invitations: invitations.map((row) => ({
            id: row.id,
            to: { id: row.to_user, username: row.to_username },
            from: { id: row.from_user, username: row.from_username },
            permissions: permissionBits(row),
            status: row.status,
            createdAt: row.created_at,
            respondedAt: row.responded_at
        }))
    };
}


/* GET /levels/:id/permissions — the share dialog's data. Only the owner (or an
 * administrator) sees who else has access. */
export const shares = express.Router();
shares.get("/levels/:id/permissions", requireAuth, wrap((req, res) => {
    const levelId = id(req.params.id, "level");
    const level = loadLevel(levelId);
    if (!level) throw notFound("No such level.");
    if (level.owner_id !== req.user.id && req.user.role !== "admin") {
        throw forbidden("Only the owner can manage access.");
    }
    res.json({
        level: {
            id: level.id,
            name: level.name,
            visibility: level.visibility,
            revision: level.revision
        },
        ...permissionView(levelId)
    });
}));

/* POST /levels/:id/shares — invite a registered player.
 * Sharing a private level switches it to "shared", because a private level is
 * by definition owner-only; that switch is reported in the response. */
shares.post("/levels/:id/shares", requireAuth, wrap((req, res) => {
    const levelId = id(req.params.id, "level");
    const level = loadLevel(levelId);
    if (!level) throw notFound("No such level.");
    if (level.owner_id !== req.user.id && req.user.role !== "admin") {
        throw forbidden("Only the owner can share this level.");
    }
    const body = req.body || {};
    const wanted = String(body.username || "").trim().toLowerCase();
    const found = get(
        "SELECT id FROM users WHERE username_lower = ? AND deleted_at IS NULL AND disabled_at IS NULL",
        [wanted]
    );
    const target = found ? userSummary(found.id) : null;
    if (!target) throw notFound("No player with that username.");
    if (target.id === level.owner_id) throw badRequest("share_self", "You already own this level.");

    const perms = parsePermissionsBody(body.permissions || body, DEFAULT_SHARE);
    const stamp = new Date().toISOString();

    const result = tx(() => {
        const existingGrant = get(
            "SELECT * FROM level_permissions WHERE level_id = ? AND user_id = ?",
            [levelId, target.id]
        );
        if (existingGrant) {
            run(
                "UPDATE level_permissions SET can_view = ?, can_play = ?, can_comment = ?, can_copy = ?, " +
                    "can_edit = ?, updated_at = ? WHERE level_id = ? AND user_id = ?",
                [perms.view ? 1 : 0, perms.play ? 1 : 0, perms.comment ? 1 : 0, perms.copy ? 1 : 0,
                 perms.edit ? 1 : 0, stamp, levelId, target.id]
            );
            return { kind: "updated" };
        }

        const pending = get(
            "SELECT * FROM share_invitations WHERE level_id = ? AND to_user = ? AND status = 'pending'",
            [levelId, target.id]
        );
        if (pending) {
            run(
                "UPDATE share_invitations SET can_view = ?, can_play = ?, can_comment = ?, can_copy = ?, " +
                    "can_edit = ?, created_at = ? WHERE id = ?",
                [perms.view ? 1 : 0, perms.play ? 1 : 0, perms.comment ? 1 : 0, perms.copy ? 1 : 0,
                 perms.edit ? 1 : 0, stamp, pending.id]
            );
            return { kind: "reinvited", invitationId: pending.id };
        }

        const info = run(
            "INSERT INTO share_invitations (level_id, from_user, to_user, can_view, can_play, can_comment, " +
                "can_copy, can_edit, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)",
            [levelId, req.user.id, target.id, perms.view ? 1 : 0, perms.play ? 1 : 0,
             perms.comment ? 1 : 0, perms.copy ? 1 : 0, perms.edit ? 1 : 0, stamp]
        );
        return { kind: "invited", invitationId: info.lastInsertRowid };
    });

    let visibility = level.visibility;
    if (level.visibility === "private") {
        run("UPDATE levels SET visibility = 'shared', updated_at = ? WHERE id = ?", [stamp, levelId]);
        visibility = "shared";
    }

    notify(target.id, "share_invite",
        usernameById(req.user.id) + " shared \"" + level.name + "\" with you.", "share:" + levelId);

    res.status(result.kind === "invited" ? 201 : 200).json({
        ...result,
        visibility,
        share: permissionView(levelId)
    });
}));


/* PATCH /levels/:id/shares/:userId — change an accepted grant in place. */
shares.patch("/levels/:id/shares/:userId", requireAuth, wrap((req, res) => {
    const levelId = id(req.params.id, "level");
    const userId = id(req.params.userId, "user");
    const level = loadLevel(levelId);
    if (!level) throw notFound("No such level.");
    if (level.owner_id !== req.user.id && req.user.role !== "admin") {
        throw forbidden("Only the owner can manage access.");
    }
    const grant = get("SELECT * FROM level_permissions WHERE level_id = ? AND user_id = ?",
        [levelId, userId]);
    if (!grant) throw notFound("That player does not have access.");
    const perms = parsePermissionsBody(req.body || {}, {
        view: !!grant.can_view, play: !!grant.can_play, comment: !!grant.can_comment,
        copy: !!grant.can_copy, edit: !!grant.can_edit
    });
    run(
        "UPDATE level_permissions SET can_view = ?, can_play = ?, can_comment = ?, can_copy = ?, " +
            "can_edit = ?, updated_at = ? WHERE level_id = ? AND user_id = ?",
        [perms.view ? 1 : 0, perms.play ? 1 : 0, perms.comment ? 1 : 0, perms.copy ? 1 : 0,
         perms.edit ? 1 : 0, new Date().toISOString(), levelId, userId]
    );
    notify(userId, "share_updated",
        "Your access to \"" + level.name + "\" was changed by " + req.user.username + ".",
        "share:" + levelId);
    res.json({ share: permissionView(levelId) });
}));

/* DELETE /levels/:id/shares/:userId — revoke immediately. The permission row is
 * deleted in the same transaction that records the revocation, so the next
 * request from that player is already refused. */
shares.delete("/levels/:id/shares/:userId", requireAuth, wrap((req, res) => {
    const levelId = id(req.params.id, "level");
    const userId = id(req.params.userId, "user");
    const level = loadLevel(levelId);
    if (!level) throw notFound("No such level.");
    if (level.owner_id !== req.user.id && req.user.role !== "admin") {
        throw forbidden("Only the owner can manage access.");
    }
    const stamp = new Date().toISOString();
    tx(() => {
        run("DELETE FROM level_permissions WHERE level_id = ? AND user_id = ?", [levelId, userId]);
        run(
            "UPDATE share_invitations SET status = 'revoked', responded_at = ? " +
                "WHERE level_id = ? AND to_user = ? AND status IN ('pending','accepted')",
            [stamp, levelId, userId]
        );
    });
    notify(userId, "share_revoked", "Your access to \"" + level.name + "\" was removed.",
        "share:" + levelId);
    res.json({ ok: true, share: permissionView(levelId) });
}));


/* GET /shares/invitations — the invitation inbox ("Shared with me" shows the
 * accepted side separately). */
shares.get("/shares/invitations", requireAuth, wrap((req, res) => {
    const status = req.query.status || "pending";
    if (!["pending", "accepted", "declined", "revoked", "all"].includes(status)) {
        throw badRequest("invalid_status", "Unknown invitation status.");
    }
    const rows = all(
        "SELECT s.*, l.name AS level_name, l.difficulty, l.visibility, u.username AS from_username " +
            "FROM share_invitations s JOIN levels l ON l.id = s.level_id " +
            "JOIN users u ON u.id = s.from_user " +
            "WHERE s.to_user = ? AND l.deleted_at IS NULL " +
            (status === "all" ? "" : "AND s.status = ? ") +
            "ORDER BY s.created_at DESC LIMIT 100",
        status === "all" ? [req.user.id] : [req.user.id, status]
    );
    res.json({
        invitations: rows.map((row) => ({
            id: row.id,
            level: {
                id: row.level_id,
                name: row.level_name,
                difficulty: row.difficulty,
                visibility: row.visibility
            },
            from: { id: row.from_user, username: row.from_username },
            permissions: permissionBits(row),
            status: row.status,
            createdAt: row.created_at,
            respondedAt: row.responded_at
        }))
    });
}));

shares.post("/shares/invitations/:id/accept", requireAuth, wrap((req, res) => {
    const invitation = get("SELECT * FROM share_invitations WHERE id = ?", [id(req.params.id, "invitation")]);
    if (!invitation || invitation.to_user !== req.user.id) throw notFound("No such invitation.");
    if (invitation.status !== "pending") {
        throw conflict("invitation_handled", "That invitation has already been answered.");
    }
    const level = loadLevel(invitation.level_id);
    if (!level) throw notFound("That level no longer exists.");

    const stamp = new Date().toISOString();
    tx(() => {
        const grant = get("SELECT * FROM level_permissions WHERE level_id = ? AND user_id = ?",
            [level.id, req.user.id]);
        if (grant) {
            run(
                "UPDATE level_permissions SET can_view = ?, can_play = ?, can_comment = ?, can_copy = ?, " +
                    "can_edit = ?, updated_at = ? WHERE level_id = ? AND user_id = ?",
                [invitation.can_view, invitation.can_play, invitation.can_comment, invitation.can_copy,
                 invitation.can_edit, stamp, level.id, req.user.id]
            );
        } else {
            run(
                "INSERT INTO level_permissions (level_id, user_id, can_view, can_play, can_comment, " +
                    "can_copy, can_edit, granted_by, created_at, updated_at) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [level.id, req.user.id, invitation.can_view, invitation.can_play, invitation.can_comment,
                 invitation.can_copy, invitation.can_edit, invitation.from_user, stamp, stamp]
            );
        }
        run("UPDATE share_invitations SET status = 'accepted', responded_at = ? WHERE id = ?",
            [stamp, invitation.id]);
        if (level.visibility === "private") {
            run("UPDATE levels SET visibility = 'shared', updated_at = ? WHERE id = ?", [stamp, level.id]);
        }
    });

    notify(invitation.from_user, "share_accepted",
        req.user.username + " accepted your invite to \"" + level.name + "\".",
        "level:" + level.id);
    res.json({
        ok: true,
        level: levelCard(loadLevel(level.id), req.user.id),
        permissions: permissionBits(invitation)
    });
}));

shares.post("/shares/invitations/:id/decline", requireAuth, wrap((req, res) => {
    const invitation = get("SELECT * FROM share_invitations WHERE id = ?", [id(req.params.id, "invitation")]);
    if (!invitation || invitation.to_user !== req.user.id) throw notFound("No such invitation.");
    if (invitation.status !== "pending") {
        throw conflict("invitation_handled", "That invitation has already been answered.");
    }
    run("UPDATE share_invitations SET status = 'declined', responded_at = ? WHERE id = ?",
        [new Date().toISOString(), invitation.id]);
    res.json({ ok: true });
}));


/* GET /shares/shared-with-me — levels another player has granted this account
 * access to, with the exact permission set that was granted. */
shares.get("/shares/shared-with-me", requireAuth, wrap((req, res) => {
    const rows = all(
        "SELECT l.*, p.can_view, p.can_play, p.can_comment, p.can_copy, p.can_edit, " +
            "u.username AS owner_name FROM level_permissions p " +
            "JOIN levels l ON l.id = p.level_id JOIN users u ON u.id = l.owner_id " +
            "WHERE p.user_id = ? AND l.deleted_at IS NULL ORDER BY p.updated_at DESC LIMIT 100",
        [req.user.id]
    );
    res.json({
        levels: rows.map((row) => ({
            ...levelCard(row, req.user.id),
            owner: row.owner_name,
            permissions: permissionBits(row)
        }))
    });
}));

/* GET /shares/shared-by-me — the owner's grants and outstanding invitations,
 * which is the access-management screen. */
shares.get("/shares/shared-by-me", requireAuth, wrap((req, res) => {
    const rows = all(
        "SELECT * FROM levels WHERE owner_id = ? AND deleted_at IS NULL " +
            "AND (visibility = 'shared' OR id IN (SELECT level_id FROM level_permissions)) " +
            "ORDER BY updated_at DESC LIMIT 100",
        [req.user.id]
    );
    res.json({
        levels: rows.map((row) => ({
            ...levelCard(row, req.user.id),
            ...permissionView(row.id)
        }))
    });
}));

/* GET /shares/access/:levelId — what this account may do with a level. The
 * client asks this before drawing "edit" buttons; the server enforces the same
 * answer on the write routes, so the UI is a convenience, not the gate. */
shares.get("/shares/access/:levelId", requireAuth, wrap((req, res) => {
    const levelId = id(req.params.levelId, "level");
    const level = loadLevel(levelId);
    const perms = level ? accessFor(level, req.user.id, req.user.role) : null;
    if (!level || !perms || !perms.view) throw notFound("No such level.");
    res.json({
        level: levelCard(level, req.user.id),
        permissions: perms,
        owner: level.owner_id === req.user.id
    });
}));

