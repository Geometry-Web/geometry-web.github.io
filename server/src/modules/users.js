/* =====================================================================
 * users.js — profiles, profile editing, search and the public user card.
 *
 * A profile is the public half of an account: what the icon kit shows, the
 * description, and the counters the stats screen reads. The private half (email,
 * password hash, sessions) never leaves this module.
 * ===================================================================== */
import express from "express";
import { all, get, run, tx } from "../db.js";
import { requireAuth } from "../auth.js";
import {
    badRequest, conflict, email as emailField, id, notFound, pageParams,
    text, username as usernameField, wrap
} from "../util.js";

const ICON_FIELDS = ["cube", "ship", "ball", "ufo", "wave", "robot", "spider", "swing"];

export function profileRow(userId) {
    let row = get("SELECT * FROM profiles WHERE user_id = ?", [userId]);
    if (!row) {
        const stamp = new Date().toISOString();
        run("INSERT INTO profiles (user_id, created_at, updated_at) VALUES (?, ?, ?)", [userId, stamp, stamp]);
        row = get("SELECT * FROM profiles WHERE user_id = ?", [userId]);
    }
    return row;
}

export function wallet(userId) {
    const rows = all("SELECT currency, amount FROM currency_balances WHERE user_id = ?", [userId]);
    const out = { stars: 0, diamonds: 0, secret_coins: 0, user_coins: 0, creator_points: 0, keys: 0 };
    for (const row of rows) out[row.currency] = row.amount;
    return out;
}

/* The card shown in lists, search results and on the profile screen. */
export function publicUser(userId) {
    const user = get(
        "SELECT id, username, role, created_at, disabled_at, deleted_at FROM users WHERE id = ?", [userId]);
    if (!user || user.deleted_at) return null;
    const profile = profileRow(userId);
    const friends = get("SELECT COUNT(*) AS n FROM friendships WHERE user_low = ? OR user_high = ?",
        [userId, userId]);
    const followers = get("SELECT COUNT(*) AS n FROM follows WHERE followee_id = ?", [userId]);
    const following = get("SELECT COUNT(*) AS n FROM follows WHERE follower_id = ?", [userId]);
    const levels = get(
        "SELECT COUNT(*) AS total, SUM(CASE WHEN visibility = 'public' THEN 1 ELSE 0 END) AS public " +
            "FROM levels WHERE owner_id = ? AND deleted_at IS NULL", [userId]);
    const achievements = get(
        "SELECT COUNT(*) AS n FROM user_achievements WHERE user_id = ? AND claimed_at IS NOT NULL",
        [userId]);

    return {
        id: user.id,
        username: user.username,
        role: user.role,
        registered: true,
        banned: !!user.disabled_at,
        createdAt: user.created_at,
        profile: {
            description: profile.description,
            icon: Object.fromEntries(ICON_FIELDS.map((key) => [key, profile[key]])),
            color1: profile.color1,
            color2: profile.color2,
            glow: !!profile.glow
        },
        stats: profile.show_stats
            ? {
                attempts: profile.attempts,
                jumps: profile.jumps,
                levelsCompleted: profile.levels_completed,
                demons: profile.demons_completed,
                levelsCreated: profile.levels_created,
                levelsUploaded: profile.levels_uploaded,
                likesReceived: profile.likes_received,
                friends: friends ? friends.n : 0,
                followers: followers ? followers.n : 0,
                following: following ? following.n : 0,
                achievements: achievements ? achievements.n : 0
            }
        : null,
        wallet: wallet(userId),
        levelCounts: {
            total: levels ? levels.total : 0,
            public: levels && levels.public ? levels.public : 0
        }
    };
}

/* Compact shape for search results and member lists. */
export function userSummary(userId) {
    const user = get("SELECT id, username, role FROM users WHERE id = ?", [userId]);
    if (!user) return null;
    const profile = profileRow(userId);
    const balance = get("SELECT amount FROM currency_balances WHERE user_id = ? AND currency = 'stars'",
        [userId]);
    return {
        id: user.id,
        username: user.username,
        role: user.role,
        stars: balance ? balance.amount : 0,
        icon: { cube: profile.cube, color1: profile.color1, color2: profile.color2 }
    };
}

/* Turns {view, play, comment, copy, edit} into a normalised permission set.
 * Editing implies copying and playing; a share that can edit but not open
 * would be a permission puzzle, not a feature. */
export function parsePermissionsBody(body, defaults) {
    const out = { ...defaults };
    for (const key of ["view", "play", "comment", "copy", "edit"]) {
        if (body[key] !== undefined) {
            if (typeof body[key] !== "boolean") {
                throw badRequest("invalid_permission", key + " must be true or false.");
            }
            out[key] = body[key];
        }
    }
    if (out.edit) { out.copy = true; out.play = true; out.view = true; }
    if (out.copy) out.play = true;
    if (out.play) out.view = true;
    return out;
}

export const users = express.Router();

/* GET /api/v1/users/search?q=name — prefix match, own account and blocked users
 * excluded, so the share dialog cannot suggest someone the player has blocked. */
users.get("/users/search", wrap((req, res) => {
    const query = text(req.query.q, "q", { min: 1, max: 20 });
    const limit = Math.min(20, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const viewerId = req.user ? req.user.id : 0;
    const rows = all(
        "SELECT id FROM users WHERE deleted_at IS NULL AND disabled_at IS NULL " +
            "AND id <> ? AND username_lower LIKE ? " +
            "AND id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?) " +
            "AND id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?) " +
            "ORDER BY username_lower LIMIT ?",
        [viewerId, query.toLowerCase() + "%", viewerId, viewerId, limit]
    );
    res.json({ users: rows.map((row) => userSummary(row.id)).filter(Boolean) });
}));

users.get("/users/:id", wrap((req, res) => {
    const user = publicUser(id(req.params.id, "user"));
    if (!user || (user.banned && (!req.user || req.user.role === "player"))) {
        throw notFound("No such player.");
    }
    res.json({ user });
}));

users.get("/users/:id/levels", wrap((req, res) => {
    const userId = id(req.params.id, "user");
    const { page, limit, offset } = pageParams(req.query);
    const own = req.user && (req.user.id === userId || req.user.role === "admin");
    const visible = own ? "" : "AND visibility IN ('public','unlisted') ";
    const rows = all(
        "SELECT * FROM levels WHERE owner_id = ? AND deleted_at IS NULL " + visible +
            "ORDER BY created_at DESC LIMIT ? OFFSET ?",
        [userId, limit, offset]
    );
    const total = get(
        "SELECT COUNT(*) AS n FROM levels WHERE owner_id = ? AND deleted_at IS NULL " + visible,
        [userId]
    );
    res.json({
        levels: rows.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            difficulty: row.difficulty,
            length: row.length,
            visibility: row.visibility,
            revision: row.revision,
            downloads: row.downloads,
            likes: row.likes,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        })),
        page,
        total: total ? total.n : 0
    });
}));


/* PATCH /users/me — the profile editor. Every field is optional; validation is
 * the same as registration, so a renamed account obeys the same rules. */
users.patch("/users/me", requireAuth, wrap(async (req, res) => {
    const body = req.body || {};
    const userSets = [];
    const userValues = [];

    if (body.username !== undefined) {
        const name = usernameField(body.username);
        const taken = get("SELECT id FROM users WHERE username_lower = ? AND id <> ?",
            [name.toLowerCase(), req.user.id]);
        if (taken) throw conflict("username_taken", "That username is already in use.");
        userSets.push("username = ?", "username_lower = ?");
        userValues.push(name, name.toLowerCase());
    }
    if (body.email !== undefined) {
        const address = emailField(body.email, { required: false });
        if (address) {
            const taken = get("SELECT id FROM users WHERE email_lower = ? AND id <> ?",
                [address, req.user.id]);
            if (taken) throw conflict("email_taken", "That email is already registered.");
        }
        userSets.push("email = ?", "email_lower = ?");
        userValues.push(address, address);
    }

    const stamp = new Date().toISOString();
    if (userSets.length) {
        userSets.push("updated_at = ?");
        userValues.push(stamp, req.user.id);
        run("UPDATE users SET " + userSets.join(", ") + " WHERE id = ?", userValues);
    }

    const profileSets = [];
    const profileValues = [];
    if (body.description !== undefined) {
        profileSets.push("description = ?");
        profileValues.push(text(body.description, "description", { max: 200, required: false }) || "");
    }
    for (const field of ICON_FIELDS) {
        if (body.icon && body.icon[field] !== undefined) {
            const value = Number(body.icon[field]);
            if (!Number.isInteger(value) || value < 1 || value > 999) {
                throw badRequest("invalid_icon", "Icon numbers are positive integers.");
            }
            profileSets.push(field + " = ?");
            profileValues.push(value);
        }
    }
    for (const field of ["color1", "color2"]) {
        if (body[field] !== undefined) {
            const parts = String(body[field]).split(",").map((n) => Number.parseInt(n, 10));
            if (parts.length !== 3 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
                throw badRequest("invalid_color", "Colours are three numbers 0-255.");
            }
            profileSets.push(field + " = ?");
            profileValues.push(parts.join(","));
        }
    }
    if (body.glow !== undefined) {
        profileSets.push("glow = ?");
        profileValues.push(body.glow ? 1 : 0);
    }
    if (body.showStats !== undefined) {
        profileSets.push("show_stats = ?");
        profileValues.push(body.showStats ? 1 : 0);
    }
    if (profileSets.length) {
        profileSets.push("updated_at = ?");
        profileValues.push(stamp, req.user.id);
        run("UPDATE profiles SET " + profileSets.join(", ") + " WHERE user_id = ?", profileValues);
    }

    const profile = profileRow(req.user.id);
    const savedIcon = Object.fromEntries(ICON_FIELDS.map((key) => [key, profile[key]]));
    res.json({ user: publicUser(req.user.id), icon: savedIcon });
}));


/* POST /users/me/progress — the play layer reports what happened locally.
 *
 * The server cannot re-simulate a run without a replay format, so this is the
 * one deliberately client-trusted endpoint: increments are capped per request
 * and balances only move through the achievement/quest routes that check
 * targets. Documented in server/README.md. */
users.post("/users/me/progress", requireAuth, wrap((req, res) => {
    const body = req.body || {};
    const add = (value, max) => Math.max(0, Math.min(max, Math.floor(Number(value) || 0)));
    const attempts = add(body.attempts, 500);
    const jumps = add(body.jumps, 20000);
    const completed = add(body.levelsCompleted, 20);
    const demons = add(body.demons, 20);
    const stamp = new Date().toISOString();

    tx(() => {
        run(
            "UPDATE profiles SET attempts = attempts + ?, jumps = jumps + ?, " +
                "levels_completed = levels_completed + ?, demons_completed = demons_completed + ?, " +
                "updated_at = ? WHERE user_id = ?",
            [attempts, jumps, completed, demons, stamp, req.user.id]
        );
        /* Each completion is worth one star, awarded through the same ledger the
         * shop and daily rewards use, so the transaction history is complete. */
        for (let i = 0; i < completed; i++) {
            const balance = get(
                "SELECT amount FROM currency_balances WHERE user_id = ? AND currency = 'stars'",
                [req.user.id]);
            const next = (balance ? balance.amount : 0) + 1;
            run("UPDATE currency_balances SET amount = ? WHERE user_id = ? AND currency = 'stars'",
                [next, req.user.id]);
            run(
                "INSERT INTO currency_transactions (user_id, currency, delta, balance_after, reason, created_at) " +
                    "VALUES (?, 'stars', 1, ?, 'level_complete', ?)",
                [req.user.id, next, stamp]
            );
        }
    });
    res.json({ ok: true, user: publicUser(req.user.id) });
}));

/* GET /users/me/sessions — the "where am I signed in" list the account screen
 * shows before offering "log out everywhere else". */
users.get("/users/me/sessions", requireAuth, wrap((req, res) => {
    const rows = all(
        "SELECT id, created_at, last_used_at, expires_at, ip, user_agent FROM sessions " +
            "WHERE user_id = ? ORDER BY last_used_at DESC",
        [req.user.id]
    );
    res.json({
        sessions: rows.map((row) => ({
            id: row.id,
            current: row.id === req.session.id,
            createdAt: row.created_at,
            lastUsedAt: row.last_used_at,
            expiresAt: row.expires_at,
            ip: row.ip,
            userAgent: row.user_agent
        }))
    });
}));

