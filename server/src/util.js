/* =====================================================================
 * util.js — HTTP plumbing shared by every route module.
 *
 * Nothing here trusts the client: bodies are validated field by field, ids are
 * parsed to integers, unknown keys are ignored, and every failure becomes a
 * JSON error with a stable `code` the client can show verbatim.
 * ===================================================================== */
import crypto from "node:crypto";
import { config } from "./config.js";

export class HttpError extends Error {
    constructor(status, code, message, details) {
        super(message || code);
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

export function badRequest(code, message, details) {
    return new HttpError(400, code, message, details);
}

export function unauthorized(message = "Sign in to continue.") {
    return new HttpError(401, "unauthorized", message);
}

export function forbidden(message = "You do not have access to that.") {
    return new HttpError(403, "forbidden", message);
}

export function notFound(message = "Not found.") {
    return new HttpError(404, "not_found", message);
}

export function conflict(code, message, details) {
    return new HttpError(409, code, message, details);
}

/* Express 4 does not await handlers; this turns a rejected promise into next(). */
export function wrap(fn) {
    return function wrapped(req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/* ------------------------------------------------------------------ input */
export function requireObject(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw badRequest("invalid_body", "Expected a JSON object.");
    }
    return body;
}

export function id(value, name = "id") {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) throw badRequest("invalid_" + name, "Invalid " + name + ".");
    return n;
}

export function optionalId(value, name = "id") {
    if (value === undefined || value === null || value === "") return null;
    return id(value, name);
}

/* Strings are trimmed and length-checked in UTF-16 code units, which is what a
 * database limit counts and what the UI shows. */
export function text(value, name, { min = 0, max = 255, required = true, trim = true } = {}) {
    if (value === undefined || value === null) {
        if (required) throw badRequest("missing_" + name, name + " is required.");
        return null;
    }
    if (typeof value !== "string") throw badRequest("invalid_" + name, name + " must be text.");
    const out = trim ? value.trim() : value;
    if (out.length < min) {
        throw badRequest("invalid_" + name, name + " must be at least " + min + " characters.");
    }
    if (out.length > max) {
        throw badRequest("invalid_" + name, name + " must be at most " + max + " characters.");
    }
    return out;
}

export function oneOf(value, name, allowed) {
    if (!allowed.includes(value)) {
        throw badRequest("invalid_" + name, name + " must be one of: " + allowed.join(", ") + ".");
    }
    return value;
}

export function bool(value, name, fallback = false) {
    if (value === undefined || value === null) return fallback;
    if (typeof value !== "boolean") throw badRequest("invalid_" + name, name + " must be true or false.");
    return value;
}

export function pageParams(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
    return { page, limit, offset: (page - 1) * limit };
}

/* ------------------------------------------------------------- validation */
const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
/* Rejected because they are used by staff, or would let a name impersonate
 * the system in lists and notifications. */
const RESERVED = new Set([
    "admin", "administrator", "moderator", "mod", "system", "geometryweb", "gd",
    "support", "staff", "robtop", "official", "guest", "deleted", "null", "undefined"
]);

export function username(value, name = "username") {
    const out = text(value, name, { min: 3, max: 20 });
    if (!USERNAME_RE.test(out)) {
        throw badRequest("invalid_username", "Usernames use 3-20 letters, numbers or underscores.");
    }
    if (RESERVED.has(out.toLowerCase())) throw badRequest("reserved_username", "That username is reserved.");
    return out;
}

/* bcrypt only hashes the first 72 bytes; anything longer would silently be
 * truncated, so long passwords are rejected instead of quietly weakened. */
export function password(value, name = "password") {
    if (typeof value !== "string") throw badRequest("invalid_password", "Password must be text.");
    const bytes = Buffer.byteLength(value, "utf8");
    if (bytes < 8) throw badRequest("weak_password", "Passwords need at least 8 characters.");
    if (bytes > 72) throw badRequest("long_password", "Passwords can be at most 72 bytes.");
    return value;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function email(value, { required = true } = {}) {
    if (value === undefined || value === null || value === "") {
        if (required) throw badRequest("invalid_email", "Email is required.");
        return null;
    }
    const out = text(value, "email", { min: 3, max: 254 });
    if (!EMAIL_RE.test(out)) throw badRequest("invalid_email", "That email address looks wrong.");
    return out.toLowerCase();
}

/* Level data is the player's file, so it is only size-checked here and
 * validated by the play layer when it is loaded. */
export function levelData(value) {
    if (typeof value !== "string" && (typeof value !== "object" || value === null)) {
        throw badRequest("invalid_level_data", "Level data must be a string or an object.");
    }
    const raw = typeof value === "string" ? value : JSON.stringify(value);
    if (Buffer.byteLength(raw, "utf8") > config.maxLevelBytes) {
        throw badRequest("level_too_large", "That level is too large to upload.");
    }
    if (raw.length < 2) throw badRequest("empty_level", "The level has no objects yet.");
    return raw;
}

/* ------------------------------------------------------------------ time */
export function now() {
    return new Date().toISOString();
}

export function daysFromNow(days) {
    return new Date(Date.now() + days * 86_400_000).toISOString();
}

export function utcDay(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ crypto */
export function randomToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString("base64url");
}

export function sha256(value) {
    return crypto.createHash("sha256").update(String(value)).digest("hex");
}

export function safeEqual(a, b) {
    const ab = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
}

/* ------------------------------------------------------------------ cookies */
export function parseCookies(header) {
    const out = {};
    if (!header) return out;
    for (const part of String(header).split(";")) {
        const at = part.indexOf("=");
        if (at < 0) continue;
        const key = part.slice(0, at).trim();
        if (!key) continue;
        try {
            out[key] = decodeURIComponent(part.slice(at + 1).trim());
        } catch {
            out[key] = part.slice(at + 1).trim();
        }
    }
    return out;
}

function cookieAttributes(expires) {
    const bits = ["Path=/", "HttpOnly", "SameSite=Lax", "Expires=" + expires];
    if (config.cookieSecure) bits.push("Secure");
    return bits;
}

export function sessionCookie(token, expiresAt) {
    return [
        config.sessionCookie + "=" + encodeURIComponent(token),
        ...cookieAttributes(new Date(expiresAt).toUTCString())
    ].join("; ");
}

export function expiredSessionCookie() {
    return [config.sessionCookie + "=", ...cookieAttributes("Thu, 01 Jan 1970 00:00:00 GMT")].join("; ");
}

/* ------------------------------------------------------------------ limits */
/* A small fixed-window limiter. It is process-local, which is the right trade
 * for a single instance; a multi-instance deployment should front this with a
 * shared store (documented in server/README.md). */
const buckets = new Map();

export function rateLimit({ windowMs, max, key, message }) {
    return function limiter(req, res, next) {
        const bucketKey = key ? key(req) : req.ip;
        const nowMs = Date.now();
        let bucket = buckets.get(bucketKey);
        if (!bucket || bucket.reset <= nowMs) {
            bucket = { count: 0, reset: nowMs + windowMs };
            buckets.set(bucketKey, bucket);
        }
        bucket.count += 1;
        if (bucket.count > max) {
            const retry = Math.max(1, Math.ceil((bucket.reset - nowMs) / 1000));
            res.set("Retry-After", String(retry));
            return next(
                new HttpError(429, "rate_limited",
                    message || "Too many attempts. Try again in " + retry + " seconds.")
            );
        }
        next();
    };
}

/* Only needed by the tests, which reuse an in-memory app. */
export function resetRateLimits() {
    buckets.clear();
}

export function clientIp(req) {
    return req.ip || req.socket?.remoteAddress || "unknown";
}



