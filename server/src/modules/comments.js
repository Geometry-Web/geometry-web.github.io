/* =====================================================================
 * comments.js — level comments, with likes and moderation.
 *
 * Writing needs a login and a level the author is allowed to comment on; the
 * author of the level can delete any comment on it, which is the moderation a
 * creator actually needs. Deleted comments are soft-deleted so a report can
 * still be reviewed.
 * ===================================================================== */
import express from "express";
import { all, get, run, tx } from "../db.js";
import { requireAuth } from "../auth.js";
import { forbidden, id, notFound, pageParams, text, wrap } from "../util.js";
import { accessFor, loadLevel } from "./levels.js";
import { notify } from "./notifications.js";

function commentView(row, viewerId) {
    return {
        id: row.id,
        body: row.body,
        likes: row.likes,
        liked: viewerId
            ? !!get("SELECT 1 AS x FROM comment_likes WHERE comment_id = ? AND user_id = ?",
                [row.id, viewerId])
            : false,
        author: { id: row.user_id, username: row.username },
        createdAt: row.created_at
    };
}

export const comments = express.Router();

comments.get("/levels/:id/comments", wrap((req, res) => {
    const levelId = id(req.params.id, "level");
    const level = loadLevel(levelId);
    const perms = level ? accessFor(level, req.user && req.user.id, req.user && req.user.role) : null;
    if (!level || !perms || !perms.view) throw notFound("No such level.");

    const { page, limit, offset } = pageParams(req.query, { defaultLimit: 20, maxLimit: 50 });
    const rows = all(
        "SELECT c.*, u.username FROM level_comments c JOIN users u ON u.id = c.user_id " +
            "WHERE c.level_id = ? AND c.deleted_at IS NULL ORDER BY c.created_at DESC LIMIT ? OFFSET ?",
        [levelId, limit, offset]
    );
    const total = get("SELECT COUNT(*) AS n FROM level_comments WHERE level_id = ? AND deleted_at IS NULL",
        [levelId]);
    res.json({
        comments: rows.map((row) => commentView(row, req.user ? req.user.id : 0)),
        page,
        total: total ? total.n : 0
    });
}));

comments.post("/levels/:id/comments", requireAuth, wrap((req, res) => {
    const levelId = id(req.params.id, "level");
    const level = loadLevel(levelId);
    const perms = level ? accessFor(level, req.user.id, req.user.role) : null;
    if (!level || !perms || !perms.view) throw notFound("No such level.");

    const canComment = perms.comment || level.visibility === "public" || level.visibility === "unlisted";
    if (!canComment) throw forbidden("You do not have comment permission on that level.");

    const body = text(req.body && req.body.body, "body", { min: 1, max: 500 });
    const stamp = new Date().toISOString();
    const info = run(
        "INSERT INTO level_comments (level_id, user_id, body, created_at) VALUES (?, ?, ?, ?)",
        [levelId, req.user.id, body, stamp]
    );
    if (level.owner_id !== req.user.id) {
        notify(level.owner_id, "comment",
            req.user.username + " commented on \"" + level.name + "\".", "level:" + levelId);
    }
    const row = get(
        "SELECT c.*, u.username FROM level_comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?",
        [info.lastInsertRowid]
    );
    res.status(201).json({ comment: commentView(row, req.user.id) });
}));

comments.delete("/comments/:id", requireAuth, wrap((req, res) => {
    const row = get("SELECT * FROM level_comments WHERE id = ? AND deleted_at IS NULL",
        [id(req.params.id, "comment")]);
    if (!row) throw notFound("No such comment.");
    const level = loadLevel(row.level_id);
    const allowed = row.user_id === req.user.id || req.user.role === "admin" ||
        (level && level.owner_id === req.user.id);
    if (!allowed) throw forbidden("You cannot delete that comment.");
    run("UPDATE level_comments SET deleted_at = ?, body = '' WHERE id = ?",
        [new Date().toISOString(), row.id]);
    res.json({ ok: true });
}));

comments.post("/comments/:id/like", requireAuth, wrap((req, res) => {
    const comment = get("SELECT * FROM level_comments WHERE id = ? AND deleted_at IS NULL",
        [id(req.params.id, "comment")]);
    if (!comment) throw notFound("No such comment.");
    if (get("SELECT 1 AS x FROM comment_likes WHERE comment_id = ? AND user_id = ?",
        [comment.id, req.user.id])) {
        return res.json({ liked: true, likes: comment.likes });
    }
    tx(() => {
        run("INSERT INTO comment_likes (comment_id, user_id, created_at) VALUES (?, ?, ?)",
            [comment.id, req.user.id, new Date().toISOString()]);
        run("UPDATE level_comments SET likes = likes + 1 WHERE id = ?", [comment.id]);
    });
    res.json({ liked: true, likes: comment.likes + 1 });
}));

comments.delete("/comments/:id/like", requireAuth, wrap((req, res) => {
    const comment = get("SELECT * FROM level_comments WHERE id = ?", [id(req.params.id, "comment")]);
    if (!comment) throw notFound("No such comment.");
    tx(() => {
        run("DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?", [comment.id, req.user.id]);
        run("UPDATE level_comments SET likes = MAX(0, likes - 1) WHERE id = ?", [comment.id]);
    });
    res.json({ liked: false, likes: Math.max(0, comment.likes - 1) });
}));
