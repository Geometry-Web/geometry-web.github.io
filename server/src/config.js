/* =====================================================================
 * config.js — every environment knob in one place.
 *
 * Secrets come from the environment only. There is no default password, no
 * default admin account and no credential in this file: a deployment that
 * forgets SESSION_SECRET still works, but it gets a random secret at boot and
 * logs a warning that sessions will not survive a restart.
 * ===================================================================== */
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

function bool(value, fallback) {
    if (value === undefined || value === "") return fallback;
    return /^(1|true|yes|on)$/i.test(value);
}

function int(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function list(value) {
    return String(value || "")
        .split(",")
        .map((s) => s.trim().replace(/\/+$/, ""))
        .filter(Boolean);
}

const production = (process.env.NODE_ENV || "development") === "production";

/* A random session secret keeps a forgotten .env from weakening hashes; it is
 * noisy on purpose so the operator notices sessions reset on restart. */
let sessionSecret = process.env.SESSION_SECRET || "";
let ephemeralSecret = false;
if (sessionSecret.length < 32) {
    if (production) {
        throw new Error("SESSION_SECRET must be set to at least 32 characters in production");
    }
    sessionSecret = crypto.randomBytes(48).toString("hex");
    ephemeralSecret = true;
}

export const config = {
    env: process.env.NODE_ENV || "development",
    production,
    port: int(process.env.PORT, 8787),
    host: process.env.HOST || "0.0.0.0",
    databaseFile:
        process.env.DATABASE_FILE ||
        (process.env.NODE_ENV === "test" ? ":memory:" : path.join(here, "..", "data", "geometry-web.sqlite")),
    sessionSecret,
    ephemeralSecret,
    sessionCookie: process.env.SESSION_COOKIE_NAME || "gd_session",
    sessionTtlDays: int(process.env.SESSION_TTL_DAYS, 30),
    cookieSecure: bool(process.env.COOKIE_SECURE, production),
    bcryptRounds: Math.min(14, Math.max(10, int(process.env.BCRYPT_ROUNDS, 12))),
    /* The Pages site and the local dev server are allowed by default; add the
     * deployed Pages origin (https://<user>.github.io) via ALLOWED_ORIGINS. */
    allowedOrigins: list(
        process.env.ALLOWED_ORIGINS ||
            "http://localhost:8137,http://127.0.0.1:8137,http://localhost:8787,http://127.0.0.1:8787"
    ),
    trustProxy: bool(process.env.TRUST_PROXY, production),
    maxLevelBytes: int(process.env.MAX_LEVEL_BYTES, 2 * 1024 * 1024),
    maxAvatarBytes: int(process.env.MAX_AVATAR_BYTES, 256 * 1024),
    /* Login/registration throttling, per IP + username. */
    authRateLimit: {
        windowMs: int(process.env.AUTH_WINDOW_MS, 60_000),
        max: int(process.env.AUTH_MAX_ATTEMPTS, 10)
    },
    registerRateLimit: {
        windowMs: int(process.env.REGISTER_WINDOW_MS, 60 * 60_000),
        max: int(process.env.REGISTER_MAX_PER_IP, 30)
    }
};

export default config;
