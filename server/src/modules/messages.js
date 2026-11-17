/* =====================================================================
 * messages.js — direct conversations between two players.
 *
 * A conversation is keyed by the ordered id pair, so there is exactly one thread
 * per pair of players no matter who starts it. Only the two members can read or
 * write; a block in either direction closes the thread to new messages.
 * ===================================================================== */
import express from "express";
import { all, get, run } from "../db.js";
import { requireAuth } from "../auth.js";
import { badRequest, forbidden, id, notFound, text, wrap } from "../util.js";
import { isBlocked } from "./friends.js";
import { notify } from "./notifications.js";

function pairOf(a, b) {
    return { low: Math.min(a, b), high: Math.max(a, b) };
}

function conversationFor(userId, otherId) {
    const pair = pairOf(userId, otherId);
    return get("SELECT * FROM conversations WHERE user_low = ? AND user_high = ?", [pair.low, pair.high]);
}

function requireMember(conversationId, userId) {
    const row = get("SELECT * FROM conversations WHERE id = ?", [conversationId]);
    if (!row || (row.user_low !== userId && row.user_high !== userId)) {
        throw notFound("No such conversation.");
    }
    return row;
}

function otherOf(conversation, userId) {
    const otherId = conversation.user_low === userId ? conversation.user_high : conversation.user_low;
    const row = get("SELECT id, username FROM users WHERE id = ?", [otherId]);
    return row ? { id: row.id, username: row.username } : { id: otherId, username: "deleted" };
}

export const messages = express.Router();

messages.get("/conversations", requireAuth, wrap((req, res) => {
    const rows = all(
        "SELECT c.*, " +
            "(SELECT body FROM messages m WHERE m.conversation_id = c.id AND m.deleted_at IS NULL " +
            " ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS last_body, " +
            "(SELECT created_at FROM messages m WHERE m.conversation_id = c.id AND m.deleted_at IS NULL " +
            " ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS last_at, " +
            "(SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.read_at IS NULL " +
            " AND m.sender_id <> ? AND m.deleted_at IS NULL) AS unread " +
            "FROM conversations c WHERE c.user_low = ? OR c.user_high = ? " +
            "ORDER BY c.last_message_at DESC LIMIT 100",
        [req.user.id, req.user.id, req.user.id]
    );
    res.json({
        conversations: rows.map((row) => ({
            id: row.id,
            with: otherOf(row, req.user.id),
            lastMessage: row.last_body || null,
            lastMessageAt: row.last_at || row.last_message_at,
            unread: row.unread || 0
        }))
    });
}));

/* Starting a conversation is idempotent: the client can call this every time the
 * player taps "Message" without creating duplicate threads. */
messages.post("/conversations", requireAuth, wrap((req, res) => {
    const wanted = String((req.body && req.body.username) || "").trim().toLowerCase();
    const other = get(
        "SELECT id, username FROM users WHERE username_lower = ? AND deleted_at IS NULL AND disabled_at IS NULL",
        [wanted]
    );
    if (!other) throw notFound("No player with that username.");
    if (other.id === req.user.id) throw badRequest("message_self", "You cannot message yourself.");
    if (isBlocked(req.user.id, other.id)) throw forbidden("Messaging is blocked between you and that player.");

    const existing = conversationFor(req.user.id, other.id);
    if (existing) return res.json({ conversation: { id: existing.id, with: other } });

    const pair = pairOf(req.user.id, other.id);
    const stamp = new Date().toISOString();
    const info = run(
        "INSERT INTO conversations (user_low, user_high, created_at, last_message_at) VALUES (?, ?, ?, ?)",
        [pair.low, pair.high, stamp, stamp]
    );
    res.status(201).json({ conversation: { id: info.lastInsertRowid, with: other } });
}));

messages.get("/conversations/:id/messages", requireAuth, wrap((req, res) => {
    const conversation = requireMember(id(req.params.id, "conversation"), req.user.id);
    const before = Number.parseInt(req.query.before, 10);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const params = [conversation.id];
    let sql = "SELECT * FROM messages WHERE conversation_id = ? AND deleted_at IS NULL ";
    if (Number.isInteger(before) && before > 0) {
        sql += "AND id < ? ";
        params.push(before);
    }
    sql += "ORDER BY id DESC LIMIT ?";
    params.push(limit);
    const rows = all(sql, params).reverse();
    res.json({
        messages: rows.map((row) => ({
            id: row.id,
            from: row.sender_id === req.user.id ? "me" : "them",
            senderID: row.sender_id,
            body: row.body,
            createdAt: row.created_at,
            read: !!row.read_at
        })),
        hasMore: rows.length === limit
    });
}));

messages.post("/conversations/:id/messages", requireAuth, wrap((req, res) => {
    const conversation = requireMember(id(req.params.id, "conversation"), req.user.id);
    const other = otherOf(conversation, req.user.id);
    if (isBlocked(req.user.id, other.id)) {
        throw forbidden("Messaging is blocked between you and that player.");
    }
    const body = text(req.body && req.body.body, "body", { min: 1, max: 1000 });
    const stamp = new Date().toISOString();

    const info = run(
        "INSERT INTO messages (conversation_id, sender_id, body, created_at) VALUES (?, ?, ?, ?)",
        [conversation.id, req.user.id, body, stamp]
    );
    run("UPDATE conversations SET last_message_at = ? WHERE id = ?", [stamp, conversation.id]);
    notify(other.id, "message", req.user.username + " sent you a message.", "messages:" + conversation.id);

    res.status(201).json({
        message: {
            id: info.lastInsertRowid,
            from: "me",
            senderID: req.user.id,
            body,
            createdAt: stamp,
            read: false
        }
    });
}));

messages.post("/conversations/:id/read", requireAuth, wrap((req, res) => {
    const conversation = requireMember(id(req.params.id, "conversation"), req.user.id);
    const info = run(
        "UPDATE messages SET read_at = ? WHERE conversation_id = ? AND sender_id <> ? AND read_at IS NULL",
        [new Date().toISOString(), conversation.id, req.user.id]
    );
    res.json({ ok: true, read: info.changes });
}));

messages.delete("/messages/:id", requireAuth, wrap((req, res) => {
    const messageId = id(req.params.id, "message");
    const message = get("SELECT * FROM messages WHERE id = ?", [messageId]);
    if (!message) throw notFound("No such message.");
    if (message.sender_id !== req.user.id) throw forbidden("You can only delete your own messages.");
    run("UPDATE messages SET deleted_at = ?, body = '' WHERE id = ?",
        [new Date().toISOString(), messageId]);
    res.json({ ok: true });
}));

