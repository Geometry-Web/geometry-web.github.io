/* =====================================================================
 * leaderboards.js — stars, creator points, demons and the weekly board.
 *
 * Every board is a SQL aggregate over rows the rest of the API wrote, with
 * server-side pagination. The friends board is the same query with a membership
 * filter, so it cannot drift from the global one.
 * ===================================================================== */
import express from "express";
import { all, get } from "../db.js";
import { requireAuth } from "../auth.js";
import { badRequest, pageParams, wrap } from "../util.js";

const KINDS = ["stars", "creators", "demons", "weekly"];

export const leaderboards = express.Router();

leaderboards.get("/leaderboards", wrap((req, res) => {
    const kind = req.query.kind || "stars";
    if (!KINDS.includes(kind)) throw badRequest("invalid_kind", "Unknown leaderboard.");
    const { page, limit, offset } = pageParams(req.query, { defaultLimit: 25, maxLimit: 100 });
    const friendsOnly = req.query.friends === "1";
    if (friendsOnly && !req.user) throw badRequest("login_required", "Sign in to see the friends board.");

    let rows;
    if (kind === "weekly") {
        const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
        rows = all(
            "SELECT u.id, u.username, COALESCE(SUM(t.delta), 0) AS value FROM users u " +
                "LEFT JOIN currency_transactions t ON t.user_id = u.id AND t.currency = 'stars' " +
                "AND t.delta > 0 AND t.created_at >= ? " +
                "WHERE u.deleted_at IS NULL AND u.disabled_at IS NULL " +
                (friendsOnly ? "AND (u.id = ? OR u.id IN (" + friendSql() + ")) " : "") +
                "GROUP BY u.id ORDER BY value DESC, u.username_lower ASC LIMIT ? OFFSET ?",
            friendsOnly
                ? [since, req.user.id, req.user.id, req.user.id, limit, offset]
                : [since, limit, offset]
        );
    } else {
        const expression = {
            stars: "COALESCE(b.amount, 0)",
            creators: "COALESCE(cp.amount, 0)",
            demons: "COALESCE(p.demons_completed, 0)"
        }[kind];
        const join = kind === "creators"
            ? "LEFT JOIN currency_balances cp ON cp.user_id = u.id AND cp.currency = 'creator_points'"
            : "LEFT JOIN currency_balances b ON b.user_id = u.id AND b.currency = 'stars'";
        rows = all(
            "SELECT u.id, u.username, " + expression + " AS value FROM users u " +
                "LEFT JOIN profiles p ON p.user_id = u.id " + join + " " +
                "WHERE u.deleted_at IS NULL AND u.disabled_at IS NULL " +
                (friendsOnly ? "AND (u.id = ? OR u.id IN (" + friendSql() + ")) " : "") +
                "ORDER BY value DESC, u.username_lower ASC LIMIT ? OFFSET ?",
            friendsOnly
                ? [req.user.id, req.user.id, req.user.id, limit, offset]
                : [limit, offset]
        );
    }

    const total = get("SELECT COUNT(*) AS n FROM users WHERE deleted_at IS NULL AND disabled_at IS NULL");
    res.json({
        kind,
        friends: friendsOnly,
        page,
        total: total ? total.n : 0,
        rows: rows.map((row, index) => ({
            rank: offset + index + 1,
            id: row.id,
            username: row.username,
            value: row.value,
            you: !!req.user && row.id === req.user.id
        }))
    });
}));

function friendSql() {
    return "SELECT CASE WHEN f.user_low = ? THEN f.user_high ELSE f.user_low END FROM friendships f " +
        "WHERE f.user_low = ? OR f.user_high = ?";
}
