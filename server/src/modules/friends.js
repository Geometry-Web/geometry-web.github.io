/* =====================================================================
 * friends.js — friend requests, friendships, blocking and following.
 *
 * A friendship is a single row keyed by the ordered pair (low id, high id),
 * which makes "are these two friends" one indexed lookup and makes a duplicate
 * friendship impossible. Blocking is checked from both sides: neither player can
 * message, request or share with the other.
 * ===================================================================== */
import express from "express";
import { all, get, run, tx } from "../db.js";
import { requireAuth } from "../auth.js";
import { badRequest, conflict, forbidden, id, notFound, wrap } from "../util.js";
import { userSummary } from "./users.js";
import { notify } from "./notifications.js";

export function isBlocked(a, b) {
    if (!a || !b) return false;
    return !!get(
        "SELECT 1 AS x FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) " +
            "OR (blocker_id = ? AND blocked_id = ?)",
        [a, b, b, a]
    );
}

export function areFriends(a, b) {
    return !!get("SELECT 1 AS x FROM friendships WHERE user_low = ? AND user_high = ?",
        [Math.min(a, b), Math.max(a, b)]);
}

function requireUserByName(raw) {
    const row = get(
        "SELECT id FROM users WHERE username_lower = ? AND deleted_at IS NULL AND disabled_at IS NULL",
        [String(raw || "").trim().toLowerCase()]
    );
    if (!row) throw notFound("No player with that username.");
    return row.id;
}

function friendIds(userId) {
    const rows = all(
        "SELECT CASE WHEN user_low = ? THEN user_high ELSE user_low END AS friend_id " +
            "FROM friendships WHERE user_low = ? OR user_high = ?",
        [userId, userId, userId]
    );
    return rows.map((row) => row.friend_id);
}

function nameOf(userId) {
    const row = get("SELECT username FROM users WHERE id = ?", [userId]);
    return row ? row.username : "player";
}

function acceptRequest(requestId, userId, res) {
    const request = get("SELECT * FROM friend_requests WHERE id = ?", [requestId]);
    if (!request || request.to_user !== userId) throw notFound("No such request.");
    if (request.status !== "pending") throw conflict("request_handled", "That request was already answered.");
    const stamp = new Date().toISOString();
    tx(() => {
        run("INSERT OR IGNORE INTO friendships (user_low, user_high, created_at) VALUES (?, ?, ?)",
            [Math.min(request.from_user, request.to_user),
             Math.max(request.from_user, request.to_user), stamp]);
        run("UPDATE friend_requests SET status = 'accepted', responded_at = ? WHERE id = ?",
            [stamp, request.id]);
    });
    notify(request.from_user, "friend_accept", "You and " + nameOf(userId) + " are now friends.", "friends");
    res.json({ ok: true, friend: userSummary(request.from_user) });
}

export const friends = express.Router();

friends.get("/friends", requireAuth, wrap((req, res) => {
    res.json({ friends: friendIds(req.user.id).map((friendId) => userSummary(friendId)).filter(Boolean) });
}));

friends.get("/friends/requests", requireAuth, wrap((req, res) => {
    const direction = req.query.direction === "outgoing" ? "outgoing" : "incoming";
    const column = direction === "incoming" ? "to_user" : "from_user";
    const other = direction === "incoming" ? "from_user" : "to_user";
    const rows = all(
        "SELECT r.*, u.username AS other_name FROM friend_requests r " +
            "JOIN users u ON u.id = r." + other + " " +
            "WHERE r." + column + " = ? AND r.status = 'pending' ORDER BY r.created_at DESC LIMIT 100",
        [req.user.id]
    );
    res.json({
        requests: rows.map((row) => ({
            id: row.id,
            user: { id: row[other], username: row.other_name },
            direction,
            createdAt: row.created_at
        }))
    });
}));

friends.post("/friends/requests", requireAuth, wrap((req, res) => {
    const targetId = requireUserByName(req.body && req.body.username);
    if (targetId === req.user.id) throw badRequest("friend_self", "You cannot add yourself.");
    if (isBlocked(req.user.id, targetId)) throw forbidden("That player is blocked.");
    if (areFriends(req.user.id, targetId)) throw conflict("already_friends", "You are already friends.");

    const pendingOut = get(
        "SELECT id FROM friend_requests WHERE from_user = ? AND to_user = ? AND status = 'pending'",
        [req.user.id, targetId]
    );
    if (pendingOut) throw conflict("request_pending", "You already sent that player a request.");

    /* A request to someone who already asked you is a yes, not a second row. */
    const incoming = get(
        "SELECT * FROM friend_requests WHERE from_user = ? AND to_user = ? AND status = 'pending'",
        [targetId, req.user.id]
    );
    if (incoming) return acceptRequest(incoming.id, req.user.id, res);

    const stamp = new Date().toISOString();
    run(
        "INSERT INTO friend_requests (from_user, to_user, status, created_at) VALUES (?, ?, 'pending', ?) " +
            "ON CONFLICT(from_user, to_user) DO UPDATE SET status = 'pending', " +
            "created_at = excluded.created_at, responded_at = NULL",
        [req.user.id, targetId, stamp]
    );
    notify(targetId, "friend_request", req.user.username + " sent you a friend request.", "friends:incoming");
    res.status(201).json({ ok: true, status: "pending" });
}));

friends.post("/friends/requests/:id/accept", requireAuth, wrap((req, res) => {
    acceptRequest(id(req.params.id, "request"), req.user.id, res);
}));

friends.post("/friends/requests/:id/decline", requireAuth, wrap((req, res) => {
    const request = get("SELECT * FROM friend_requests WHERE id = ?", [id(req.params.id, "request")]);
    if (!request || request.to_user !== req.user.id) throw notFound("No such request.");
    if (request.status !== "pending") throw conflict("request_handled", "That request was already answered.");
    run("UPDATE friend_requests SET status = 'declined', responded_at = ? WHERE id = ?",
        [new Date().toISOString(), request.id]);
    notify(request.from_user, "friend_decline", nameOf(req.user.id) + " declined your friend request.",
        "friends");
    res.json({ ok: true });
}));

friends.delete("/friends/:userId", requireAuth, wrap((req, res) => {
    const other = id(req.params.userId, "user");
    tx(() => {
        run("DELETE FROM friendships WHERE user_low = ? AND user_high = ?",
            [Math.min(req.user.id, other), Math.max(req.user.id, other)]);
        run(
            "UPDATE friend_requests SET status = 'cancelled' WHERE status = 'pending' AND " +
                "((from_user = ? AND to_user = ?) OR (from_user = ? AND to_user = ?))",
            [req.user.id, other, other, req.user.id]
        );
    });
    res.json({ ok: true });
}));

/* ------------------------------------------------------------------ blocking */
friends.get("/blocks", requireAuth, wrap((req, res) => {
    const rows = all(
        "SELECT u.id, u.username FROM blocks b JOIN users u ON u.id = b.blocked_id " +
            "WHERE b.blocker_id = ? ORDER BY b.created_at DESC",
        [req.user.id]
    );
    res.json({ blocked: rows.map((row) => ({ id: row.id, username: row.username })) });
}));

friends.post("/blocks/:userId", requireAuth, wrap((req, res) => {
    const other = id(req.params.userId, "user");
    if (other === req.user.id) throw badRequest("block_self", "You cannot block yourself.");
    if (!get("SELECT id FROM users WHERE id = ?", [other])) throw notFound("No such player.");
    tx(() => {
        run("INSERT OR IGNORE INTO blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)",
            [req.user.id, other, new Date().toISOString()]);
        run("DELETE FROM friendships WHERE user_low = ? AND user_high = ?",
            [Math.min(req.user.id, other), Math.max(req.user.id, other)]);
        run("UPDATE friend_requests SET status = 'cancelled' WHERE status = 'pending' AND " +
            "((from_user = ? AND to_user = ?) OR (from_user = ? AND to_user = ?))",
            [req.user.id, other, other, req.user.id]);
    });
    res.json({ ok: true });
}));

friends.delete("/blocks/:userId", requireAuth, wrap((req, res) => {
    run("DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?",
        [req.user.id, id(req.params.userId, "user")]);
    res.json({ ok: true });
}));


/* ----------------------------------------------------------------- following */
friends.post("/follows/:userId", requireAuth, wrap((req, res) => {
    const other = id(req.params.userId, "user");
    if (other === req.user.id) throw badRequest("follow_self", "You cannot follow yourself.");
    if (isBlocked(req.user.id, other)) throw forbidden("That player is blocked.");
    run("INSERT OR IGNORE INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)",
        [req.user.id, other, new Date().toISOString()]);
    res.json({ ok: true, following: true });
}));

friends.delete("/follows/:userId", requireAuth, wrap((req, res) => {
    run("DELETE FROM follows WHERE follower_id = ? AND followee_id = ?",
        [req.user.id, id(req.params.userId, "user")]);
    res.json({ ok: true, following: false });
}));

friends.get("/users/:id/followers", wrap((req, res) => {
    const userId = id(req.params.id, "user");
    const rows = all("SELECT follower_id FROM follows WHERE followee_id = ? ORDER BY created_at DESC LIMIT 100",
        [userId]);
    res.json({ users: rows.map((row) => userSummary(row.follower_id)).filter(Boolean) });
}));

friends.get("/users/:id/following", wrap((req, res) => {
    const userId = id(req.params.id, "user");
    const rows = all("SELECT followee_id FROM follows WHERE follower_id = ? ORDER BY created_at DESC LIMIT 100",
        [userId]);
    res.json({ users: rows.map((row) => userSummary(row.followee_id)).filter(Boolean) });
}));

/* GET /users/:id/relationship — one call for the profile screen: are we friends,
 * is there a pending request, am I following, have I blocked them. */
friends.get("/users/:id/relationship", requireAuth, wrap((req, res) => {
    const other = id(req.params.id, "user");
    const outgoing = get(
        "SELECT status FROM friend_requests WHERE from_user = ? AND to_user = ?", [req.user.id, other]);
    const incoming = get(
        "SELECT id, status FROM friend_requests WHERE from_user = ? AND to_user = ?", [other, req.user.id]);
    res.json({
        friends: areFriends(req.user.id, other),
        outgoing: outgoing ? outgoing.status : null,
        incoming: incoming && incoming.status === "pending" ? { id: incoming.id } : null,
        following: !!get("SELECT 1 AS x FROM follows WHERE follower_id = ? AND followee_id = ?",
            [req.user.id, other]),
        blocked: !!get("SELECT 1 AS x FROM blocks WHERE blocker_id = ? AND blocked_id = ?",
            [req.user.id, other]),
        blockedBy: !!get("SELECT 1 AS x FROM blocks WHERE blocker_id = ? AND blocked_id = ?",
            [other, req.user.id])
    });
}));

