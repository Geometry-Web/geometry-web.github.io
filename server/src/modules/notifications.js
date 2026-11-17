/* =====================================================================
 * notifications.js — the inbox every feature writes into.
 *
 * A notification is deliberately a plain row (kind + text + link) rather than
 * a typed payload, so adding a new event never needs a schema change. Routes
 * only ever read their own user's rows: the user id comes from the session,
 * never from the query string.
 * ===================================================================== */
import express from "express";
import { all, get, run } from "../db.js";
import { requireAuth } from "../auth.js";
import { id, wrap } from "../util.js";

export function notify(userId, kind, body, link = null) {
    if (!userId) return;
    run(
        "INSERT INTO notifications (user_id, kind, body, link, created_at) VALUES (?, ?, ?, ?, ?)",
        [userId, kind, String(body).slice(0, 500), link, new Date().toISOString()]
    );
}

function serialize(row) {
    return {
        id: row.id,
        kind: row.kind,
        body: row.body,
        link: row.link,
        read: !!row.read_at,
        createdAt: row.created_at
    };
}

export const notifications = express.Router();

notifications.get("/notifications", requireAuth, wrap((req, res) => {
    const rows = all(
        "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 100",
        [req.user.id]
    );
    const unread = get("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL",
        [req.user.id]);
    res.json({ notifications: rows.map(serialize), unread: unread ? unread.n : 0 });
}));

notifications.post("/notifications/:id/read", requireAuth, wrap((req, res) => {
    const notificationId = id(req.params.id);
    const info = run(
        "UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL",
        [new Date().toISOString(), notificationId, req.user.id]
    );
    res.json({ ok: true, changed: info.changes });
}));

notifications.post("/notifications/read-all", requireAuth, wrap((req, res) => {
    const info = run(
        "UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL",
        [new Date().toISOString(), req.user.id]
    );
    res.json({ ok: true, changed: info.changes });
}));
