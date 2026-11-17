/* =====================================================================
 * auth.js — passwords, sessions and the request identity.
 *
 * Passwords are hashed with bcrypt (cost from config; 12 by default) and the
 * plaintext never leaves this function's argument list. Sessions are opaque
 * random tokens: the browser holds the token in an HttpOnly, SameSite=Lax
 * cookie, while the database only stores its SHA-256, so a leaked table dump
 * cannot be replayed as a login.
 * ===================================================================== */
import bcrypt from "bcryptjs";
import { config } from "./config.js";
import { get, run, tx } from "./db.js";
import {
    daysFromNow,
    expiredSessionCookie,
    parseCookies,
    randomToken,
    sessionCookie,
    sha256,
    unauthorized,
    forbidden,
    HttpError
} from "./util.js";

/* ---------------------------------------------------------------- passwords */
export function hashPassword(plain) {
    return bcrypt.hash(plain, config.bcryptRounds);
}

export function verifyPassword(plain, hash) {
    return bcrypt.compare(plain, hash);
}

/* Timing equalisation: a login for a username that does not exist must cost the
 * same wall-clock time as a wrong password, or the response time turns the API
 * into a username oracle. */
const DUMMY_HASH = bcrypt.hashSync("geometry-web-dummy-password", config.bcryptRounds);
export function burnPasswordCheck(plain) {
    bcrypt.compareSync(String(plain || ""), DUMMY_HASH);
}

/* ----------------------------------------------------------------- sessions */
const RENEW_BEFORE_MS = 7 * 86_400_000;

export function createSession(userId, req) {
    const token = randomToken(32);
    const expiresAt = daysFromNow(config.sessionTtlDays);
    const stamp = new Date().toISOString();
    run(
        "INSERT INTO sessions (user_id, token_hash, created_at, expires_at, last_used_at, ip, user_agent) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
        [userId, sha256(token), stamp, expiresAt, stamp,
         req.ip || null, String(req.get("user-agent") || "").slice(0, 200)]
    );
    return { token, expiresAt };
}

export function setSessionCookie(res, session) {
    res.setHeader("Set-Cookie", sessionCookie(session.token, session.expiresAt));
}

export function clearSessionCookie(res) {
    res.setHeader("Set-Cookie", expiredSessionCookie());
}

export function destroyToken(token) {
    if (!token) return;
    run("DELETE FROM sessions WHERE token_hash = ?", [sha256(token)]);
}

export function destroyAllSessions(userId, keepSessionId = null) {
    if (keepSessionId) {
        run("DELETE FROM sessions WHERE user_id = ? AND id <> ?", [userId, keepSessionId]);
    } else {
        run("DELETE FROM sessions WHERE user_id = ?", [userId]);
    }
}

export function sessionFromRequest(req) {
    const cookies = parseCookies(req.headers.cookie);
    return cookies[config.sessionCookie] || null;
}

/* --------------------------------------------------------------- middleware
 * Runs on every /api request. It resolves the cookie to a user (or nobody),
 * slides an expiring session forward, and leaves req.user / req.session for
 * the route modules. A banned account loses its sessions immediately. */
export function attachUser(req, res, next) {
    const token = sessionFromRequest(req);
    if (!token) return next();

    const session = get(
        "SELECT s.*, u.username, u.role, u.disabled_at, u.deleted_at " +
            "FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?",
        [sha256(token)]
    );
    if (!session) return next();

    if (session.deleted_at || session.disabled_at) {
        destroyToken(token);
        clearSessionCookie(res);
        return next();
    }
    if (new Date(session.expires_at).getTime() <= Date.now()) {
        destroyToken(token);
        clearSessionCookie(res);
        return next();
    }

    req.token = token;
    req.session = session;
    req.user = { id: session.user_id, username: session.username, role: session.role };

    if (new Date(session.expires_at).getTime() - Date.now() < RENEW_BEFORE_MS) {
        const expiresAt = daysFromNow(config.sessionTtlDays);
        run("UPDATE sessions SET expires_at = ?, last_used_at = ? WHERE id = ?",
            [expiresAt, new Date().toISOString(), session.id]);
        res.setHeader("Set-Cookie", sessionCookie(token, expiresAt));
    } else {
        run("UPDATE sessions SET last_used_at = ? WHERE id = ?", [new Date().toISOString(), session.id]);
    }
    next();
}

export function requireAuth(req, res, next) {
    if (!req.user) return next(unauthorized());
    next();
}

export function requireRole(...roles) {
    return function roleCheck(req, res, next) {
        if (!req.user) return next(unauthorized());
        if (!roles.includes(req.user.role)) return next(forbidden("Staff only."));
        next();
    };
}

/* ------------------------------------------------------------------ account */
export function findUserByUsername(name) {
    return get("SELECT * FROM users WHERE username_lower = ?", [String(name).toLowerCase()]);
}

export function findUserById(id) {
    return get("SELECT * FROM users WHERE id = ?", [id]);
}

/* Creates the identity, its profile row and its starting wallet in one
 * transaction, so an interrupted registration cannot leave a half account. */
export function createUser({ username, passwordHash, email = null, role = "player" }) {
    return tx(() => {
        const stamp = new Date().toISOString();
        const info = run(
            "INSERT INTO users (username, username_lower, password_hash, email, email_lower, role, " +
                "created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [username, username.toLowerCase(), passwordHash, email, email ? email.toLowerCase() : null,
             role, stamp, stamp]
        );
        const userId = info.lastInsertRowid;
        run("INSERT INTO profiles (user_id, created_at, updated_at) VALUES (?, ?, ?)",
            [userId, stamp, stamp]);
        for (const currency of ["stars", "diamonds", "secret_coins", "user_coins", "creator_points", "keys"]) {
            run("INSERT INTO currency_balances (user_id, currency, amount) VALUES (?, ?, 0)",
                [userId, currency]);
        }
        return userId;
    });
}

export function recordAudit(actorId, action, { targetType = null, targetId = null, ip = null, meta = null } = {}) {
    run(
        "INSERT INTO audit_logs (actor_id, action, target_type, target_id, ip, meta, created_at) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
        [actorId, action, targetType, targetId === null ? null : String(targetId), ip,
         meta ? JSON.stringify(meta) : null, new Date().toISOString()]
    );
}

export { HttpError };

