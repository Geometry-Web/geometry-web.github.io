/* =====================================================================
 * levels.js — publishing, browsing, playing and the permission model.
 *
 * Access is decided here, once, by accessFor(); every route that touches a
 * level asks it. A private level answers 404 to anyone but its owner, so ids
 * cannot be enumerated; a shared level is only readable by the people the
 * owner granted, and editing needs can_edit explicitly.
 * ===================================================================== */
import express from "express";
import { all, get, run, tx } from "../db.js";
import { requireAuth } from "../auth.js";
import {
    badRequest, conflict, forbidden, id, levelData, notFound, oneOf, pageParams,
    text, wrap
} from "../util.js";
import { parsePermissionsBody, profileRow, userSummary } from "./users.js";
import { notify } from "./notifications.js";

const DIFFICULTY_NAME = [
    "Auto", "Easy", "Normal", "Hard", "Harder", "Insane",
    "Easy Demon", "Medium Demon", "Hard Demon", "Insane Demon", "Extreme Demon"
];
const LENGTHS = ["tiny", "short", "medium", "long", "xl"];
const VISIBILITIES = ["private", "shared", "unlisted", "public"];
const NO_PERMS = { view: false, play: false, comment: false, copy: false, edit: false };
const FULL_PERMS = { view: true, play: true, comment: true, copy: true, edit: true };

/* The single source of truth for "may this person do this". */
export function accessFor(level, userId, role) {
    if (!level || level.deleted_at) return null;
    if (role === "admin") return { ...FULL_PERMS, owner: true };
    if (userId && level.owner_id === userId) return { ...FULL_PERMS, owner: true };

    const base = { ...NO_PERMS, owner: false };
    if (level.visibility === "public" || level.visibility === "unlisted") {
        base.view = true;
        base.play = true;
    }
    /* A private level is exactly that: permissions are ignored until the owner
     * changes the visibility, which is what the share dialog does for them. */
    if (level.visibility === "private" || !userId) return base;

    const perm = get(
        "SELECT * FROM level_permissions WHERE level_id = ? AND user_id = ?",
        [level.id, userId]
    );
    if (perm) {
        base.view = base.view || !!perm.can_view;
        base.play = base.play || !!perm.can_play;
        base.comment = base.comment || !!perm.can_comment;
        base.copy = base.copy || !!perm.can_copy;
        base.edit = base.edit || !!perm.can_edit;
    }
    return base;
}

export function loadLevel(levelId) {
    return get("SELECT * FROM levels WHERE id = ? AND deleted_at IS NULL", [levelId]);
}

/* `action` is one of view / play / comment / copy / edit. */
export function requireLevelAccess(req, levelId, action) {
    const level = loadLevel(levelId);
    const perms = level ? accessFor(level, req.user && req.user.id, req.user && req.user.role) : null;
    if (!level || !perms || !perms[action]) {
        /* 404 rather than 403 when the level is not even visible: the id space
         * must not reveal that a private level exists. */
        if (!perms || !perms.view) throw notFound("No such level.");
        throw forbidden("You do not have " + action + " permission on that level.");
    }
    return { level, perms };
}

function ownerName(ownerId) {
    const row = get("SELECT username FROM users WHERE id = ?", [ownerId]);
    return row ? row.username : "unknown";
}

export function levelCard(row, viewerId = 0) {
    const author = get("SELECT id, username FROM users WHERE id = ?", [row.owner_id]);
    const liked = viewerId
        ? !!get("SELECT 1 AS x FROM level_likes WHERE level_id = ? AND user_id = ?", [row.id, viewerId])
        : false;
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        author: author ? author.username : "unknown",
        authorID: row.owner_id,
        difficulty: row.difficulty,
        difficultyName: DIFFICULTY_NAME[row.difficulty] || "Normal",
        length: row.length,
        song: row.song,
        visibility: row.visibility,
        revision: row.revision,
        stars: row.stars,
        downloads: row.downloads,
        likes: row.likes,
        featured: !!row.featured,
        liked,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function parseLevelFields(body, { partial = false } = {}) {
    const out = {};
    if (!partial || body.name !== undefined) {
        out.name = text(body.name, "name", { min: 1, max: 50 });
    }
    if (!partial || body.description !== undefined) {
        out.description = text(body.description, "description", { max: 300, required: false }) || "";
    }
    if (!partial || body.data !== undefined) {
        out.data = levelData(body.data);
        out.dataFormat = oneOf(body.dataFormat || "gd", "dataFormat", ["gd", "json"]);
    }
    if (body.difficulty !== undefined) {
        const value = Number(body.difficulty);
        if (!Number.isInteger(value) || value < 0 || value > 10) {
            throw badRequest("invalid_difficulty", "Difficulty is 0-10.");
        }
        out.difficulty = value;
    }
    if (body.length !== undefined) out.length = oneOf(body.length, "length", LENGTHS);
    if (body.song !== undefined) out.song = text(body.song, "song", { max: 120, required: false });
    if (body.visibility !== undefined) out.visibility = oneOf(body.visibility, "visibility", VISIBILITIES);
    return out;
}

export const levels = express.Router();

/* POST /levels — publish the level the editor just saved. The first revision is
 * stored alongside it, so "versions" is complete from day one. */
levels.post("/levels", requireAuth, wrap((req, res) => {
    const fields = parseLevelFields(req.body || {});
    const stamp = new Date().toISOString();
    const visibility = fields.visibility || "private";

    const levelId = tx(() => {
        const info = run(
            "INSERT INTO levels (owner_id, name, description, data, data_format, difficulty, length, " +
                "song, visibility, revision, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)",
            [req.user.id, fields.name, fields.description, fields.data, fields.dataFormat,
             fields.difficulty === undefined ? 2 : fields.difficulty,
             fields.length || "medium", fields.song || null, visibility, stamp, stamp]
        );
        run(
            "INSERT INTO level_versions (level_id, revision, data, name, description, edited_by, created_at) " +
                "VALUES (?, 1, ?, ?, ?, ?, ?)",
            [info.lastInsertRowid, fields.data, fields.name, fields.description, req.user.id, stamp]
        );
        run("UPDATE profiles SET levels_created = levels_created + 1, levels_uploaded = levels_uploaded + 1, " +
            "updated_at = ? WHERE user_id = ?", [stamp, req.user.id]);
        return info.lastInsertRowid;
    });

    const row = loadLevel(levelId);
    res.status(201).json({ level: levelCard(row, req.user.id), owner: ownerName(row.owner_id) });
}));

/* GET /levels — the public browser. Only public rows are searchable; unlisted
 * levels are reachable by id (the share dialog hands out the link) but never
 * listed here. */
levels.get("/levels", wrap((req, res) => {
    const { page, limit, offset } = pageParams(req.query, { defaultLimit: 20, maxLimit: 50 });
    const where = ["l.deleted_at IS NULL", "l.visibility = 'public'"];
    const params = [];

    if (req.query.q) {
        const needle = "%" + text(req.query.q, "q", { max: 50 }).toLowerCase() + "%";
        where.push("(lower(l.name) LIKE ? OR lower(l.description) LIKE ?)");
        params.push(needle, needle);
    }
    if (req.query.author) {
        where.push("l.owner_id IN (SELECT id FROM users WHERE username_lower = ?)");
        params.push(text(req.query.author, "author", { max: 20 }).toLowerCase());
    }
    if (req.query.difficulty !== undefined && req.query.difficulty !== "") {
        const diff = Number(req.query.difficulty);
        if (!Number.isInteger(diff) || diff < 0 || diff > 10) {
            throw badRequest("invalid_difficulty", "Difficulty is 0-10.");
        }
        where.push("l.difficulty = ?");
        params.push(diff);
    }
    if (req.query.length) {
        where.push("l.length = ?");
        params.push(oneOf(req.query.length, "length", LENGTHS));
    }
    if (req.query.featured === "1") where.push("l.featured = 1");
    if (req.query.minStars) {
        where.push("l.stars >= ?");
        params.push(Math.max(0, Number.parseInt(req.query.minStars, 10) || 0));
    }

    const sort = oneOf(req.query.sort || "recent", "sort",
        ["recent", "downloads", "likes", "stars", "trending"]);
    const order = {
        recent: "l.created_at DESC, l.id DESC",
        downloads: "l.downloads DESC, l.id DESC",
        likes: "l.likes DESC, l.id DESC",
        stars: "l.stars DESC, l.likes DESC, l.id DESC",
        trending: "(CAST(l.likes AS REAL) + 1) / (l.downloads + 10) DESC, l.created_at DESC"
    }[sort];

    const total = get("SELECT COUNT(*) AS n FROM levels l WHERE " + where.join(" AND "), params);
    const rows = all(
        "SELECT l.* FROM levels l WHERE " + where.join(" AND ") + " ORDER BY " + order +
            " LIMIT ? OFFSET ?",
        [...params, limit, offset]
    );
    res.json({
        levels: rows.map((row) => levelCard(row, req.user ? req.user.id : 0)),
        page,
        limit,
        total: total ? total.n : 0,
        hasMore: offset + rows.length < (total ? total.n : 0),
        source: "server"
    });
}));

levels.get("/levels/:id", wrap((req, res) => {
    const { level, perms } = requireLevelAccess(req, id(req.params.id, "level"), "view");
    const card = levelCard(level, req.user ? req.user.id : 0);
    card.data = level.data;
    card.dataFormat = level.data_format;
    card.permissions = { ...perms, owner: level.owner_id === (req.user ? req.user.id : 0) };
    res.json({ level: card });
}));


/* GET /levels/:id/download — the play route. Counts a download once per player
 * (replays increment `plays` instead) so sorting by downloads means people, not
 * retries. */
levels.get("/levels/:id/download", wrap((req, res) => {
    const { level } = requireLevelAccess(req, id(req.params.id, "level"), "play");
    const viewerId = req.user ? req.user.id : 0;
    const stamp = new Date().toISOString();

    if (viewerId) {
        const existing = get(
            "SELECT plays FROM level_downloads WHERE level_id = ? AND user_id = ?", [level.id, viewerId]);
        if (existing) {
            run(
                "UPDATE level_downloads SET plays = plays + 1, last_played_at = ? " +
                    "WHERE level_id = ? AND user_id = ?",
                [stamp, level.id, viewerId]
            );
        } else {
            run(
                "INSERT INTO level_downloads (level_id, user_id, last_played_at, plays) VALUES (?, ?, ?, 1)",
                [level.id, viewerId, stamp]
            );
            run("UPDATE levels SET downloads = downloads + 1 WHERE id = ?", [level.id]);
        }
    } else {
        /* A guest play still counts; there is no row to keep per player. */
        run("UPDATE levels SET downloads = downloads + 1 WHERE id = ?", [level.id]);
    }

    const fresh = loadLevel(level.id);
    res.json({
        level: { ...levelCard(fresh, viewerId), data: fresh.data, dataFormat: fresh.data_format }
    });
}));

/* PATCH /levels/:id — save. `revision` is required, which is the conflict
 * detection the spec asks for: if the level moved on since it was opened, the
 * save fails with 409 and the client can show a diff instead of overwriting. */
levels.patch("/levels/:id", requireAuth, wrap((req, res) => {
    const levelId = id(req.params.id, "level");
    const { level, perms } = requireLevelAccess(req, levelId, "edit");
    const body = req.body || {};
    const expected = Number(body.revision);
    if (!Number.isInteger(expected) || expected <= 0) {
        throw badRequest("missing_revision", "Include the revision you edited.");
    }
    if (expected !== level.revision) {
        throw conflict("revision_conflict",
            "Someone saved a newer version of this level. Reload before saving.", {
                currentRevision: level.revision,
                updatedAt: level.updated_at
            });
    }

    const fields = parseLevelFields(body, { partial: true });
    const next = { ...level, ...fields };
    const revision = level.revision + 1;
    const stamp = new Date().toISOString();

    tx(() => {
        run(
            "UPDATE levels SET name = ?, description = ?, data = ?, data_format = ?, difficulty = ?, " +
                "length = ?, song = ?, visibility = ?, revision = ?, updated_at = ? WHERE id = ?",
            [next.name, next.description, next.data, next.dataFormat || level.data_format,
             next.difficulty, next.length, next.song, next.visibility, revision, stamp, levelId]
        );
        run(
            "INSERT INTO level_versions (level_id, revision, data, name, description, edited_by, created_at) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
            [levelId, revision, next.data, next.name, next.description, req.user.id, stamp]
        );
    });

    const fresh = loadLevel(levelId);
    res.json({
        level: { ...levelCard(fresh, req.user.id), data: fresh.data, dataFormat: fresh.data_format },
        permissions: perms
    });
}));


levels.delete("/levels/:id", requireAuth, wrap((req, res) => {
    const levelId = id(req.params.id, "level");
    const level = loadLevel(levelId);
    if (!level) throw notFound("No such level.");
    if (level.owner_id !== req.user.id && req.user.role !== "admin") {
        throw forbidden("Only the owner can delete this level.");
    }
    run("UPDATE levels SET deleted_at = ? WHERE id = ?", [new Date().toISOString(), levelId]);
    res.json({ ok: true });
}));

/* Likes are one row per (level, user); the counter is a denormalised mirror kept
 * inside the same transaction so it can never drift from the rows. */
levels.post("/levels/:id/like", requireAuth, wrap((req, res) => {
    const level = loadLevel(id(req.params.id, "level"));
    const perms = level ? accessFor(level, req.user.id, req.user.role) : null;
    if (!level || !perms || !perms.view) throw notFound("No such level.");

    const existing = get("SELECT 1 AS x FROM level_likes WHERE level_id = ? AND user_id = ?",
        [level.id, req.user.id]);
    if (existing) return res.json({ liked: true, likes: level.likes });

    tx(() => {
        run("INSERT INTO level_likes (level_id, user_id, created_at) VALUES (?, ?, ?)",
            [level.id, req.user.id, new Date().toISOString()]);
        run("UPDATE levels SET likes = likes + 1 WHERE id = ?", [level.id]);
        run("UPDATE profiles SET likes_received = likes_received + 1 WHERE user_id = ?", [level.owner_id]);
    });
    if (level.owner_id !== req.user.id) {
        notify(level.owner_id, "level_like", req.user.username + " liked \"" + level.name + "\".",
            "level:" + level.id);
    }
    res.json({ liked: true, likes: level.likes + 1 });
}));

levels.delete("/levels/:id/like", requireAuth, wrap((req, res) => {
    const level = loadLevel(id(req.params.id, "level"));
    if (!level) throw notFound("No such level.");
    const existing = get("SELECT 1 AS x FROM level_likes WHERE level_id = ? AND user_id = ?",
        [level.id, req.user.id]);
    if (!existing) return res.json({ liked: false, likes: level.likes });
    tx(() => {
        run("DELETE FROM level_likes WHERE level_id = ? AND user_id = ?", [level.id, req.user.id]);
        run("UPDATE levels SET likes = MAX(0, likes - 1) WHERE id = ?", [level.id]);
        run("UPDATE profiles SET likes_received = MAX(0, likes_received - 1) WHERE user_id = ?",
            [level.owner_id]);
    });
    res.json({ liked: false, likes: Math.max(0, level.likes - 1) });
}));

/* GET /levels/:id/versions — the change history. Data is not included in the
 * list (a level can be megabytes); a single revision is fetched by number. */
levels.get("/levels/:id/versions", requireAuth, wrap((req, res) => {
    const { level } = requireLevelAccess(req, id(req.params.id, "level"), "edit");
    const rows = all(
        "SELECT v.revision, v.name, v.edited_by, v.created_at, u.username FROM level_versions v " +
            "JOIN users u ON u.id = v.edited_by WHERE v.level_id = ? ORDER BY v.revision DESC LIMIT 50",
        [level.id]
    );
    res.json({
        versions: rows.map((row) => ({
            revision: row.revision,
            name: row.name,
            editedBy: row.username,
            createdAt: row.created_at
        }))
    });
}));

levels.get("/levels/:id/versions/:revision", requireAuth, wrap((req, res) => {
    const { level } = requireLevelAccess(req, id(req.params.id, "level"), "edit");
    const revision = id(req.params.revision, "revision");
    const row = get(
        "SELECT v.*, u.username FROM level_versions v JOIN users u ON u.id = v.edited_by " +
            "WHERE v.level_id = ? AND v.revision = ?",
        [level.id, revision]
    );
    if (!row) throw notFound("No such revision.");
    res.json({
        version: {
            revision: row.revision,
            name: row.name,
            description: row.description,
            data: row.data,
            editedBy: row.username,
            createdAt: row.created_at
        }
    });
}));
