/* =====================================================================
 * app.js — the Express application, assembled in one readable place.
 *
 * Middleware order matters and is deliberate:
 *   1. CORS for the configured front-end origins only (credentials on),
 *   2. a coarse per-IP request limit,
 *   3. JSON body parsing with a hard size cap,
 *   4. the session cookie -> req.user,
 *   5. a CSRF guard for every state-changing request,
 *   6. the feature routers,
 *   7. one error handler that never leaks a stack or a password.
 * ===================================================================== */
import express from "express";
import { config } from "./config.js";
import { attachUser } from "./auth.js";
import { HttpError, clientIp, rateLimit } from "./util.js";
import { auth } from "./modules/authRoutes.js";
import { users } from "./modules/users.js";
import { levels } from "./modules/levels.js";
import { shares } from "./modules/shares.js";
import { comments } from "./modules/comments.js";
import { friends } from "./modules/friends.js";
import { messages } from "./modules/messages.js";
import { notifications } from "./modules/notifications.js";
import { leaderboards } from "./modules/leaderboards.js";
import { economy } from "./modules/economy.js";
import { achievements } from "./modules/achievements.js";
import { moderation } from "./modules/moderation.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function createApp() {
    const app = express();
    app.disable("x-powered-by");
    app.set("trust proxy", config.trustProxy);

    app.use((req, res, next) => {
        const origin = req.get("origin");
        if (origin && config.allowedOrigins.includes(origin)) {
            res.setHeader("Access-Control-Allow-Origin", origin);
            res.setHeader("Access-Control-Allow-Credentials", "true");
            res.setHeader("Vary", "Origin");
            res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-GD-Client");
            res.setHeader("Access-Control-Max-Age", "600");
        }
        if (req.method === "OPTIONS") return res.status(204).end();
        next();
    });

    app.use(rateLimit({ windowMs: 60_000, max: 300 }));
    app.use(express.json({ limit: Math.ceil(config.maxLevelBytes * 1.4) }));

    app.get("/api/v1/health", (req, res) => {
        res.json({ ok: true, service: "geometry-web-api", time: new Date().toISOString() });
    });

    app.use("/api/v1", attachUser);

    /* CSRF: the session is a cookie, so a cross-site form post would otherwise
     * carry it. Requiring a custom header (which a cross-origin form cannot set
     * without a preflight the CORS policy refuses) blocks that class of attack. */
    app.use("/api/v1", (req, res, next) => {
        if (SAFE_METHODS.has(req.method)) return next();
        if (String(req.get("x-gd-client") || "") !== "web") {
            return next(new HttpError(403, "csrf_required",
                "This request is missing the client header."));
        }
        const origin = req.get("origin");
        if (origin && !config.allowedOrigins.includes(origin)) {
            return next(new HttpError(403, "origin_not_allowed", "Origin not allowed."));
        }
        next();
    });

    app.use("/api/v1", auth);
    app.use("/api/v1", users);
    app.use("/api/v1", levels);
    app.use("/api/v1", shares);
    app.use("/api/v1", comments);
    app.use("/api/v1", friends);
    app.use("/api/v1", messages);
    app.use("/api/v1", notifications);
    app.use("/api/v1", leaderboards);
    app.use("/api/v1", economy);
    app.use("/api/v1", achievements);
    app.use("/api/v1", moderation);

    app.use("/api", (req, res, next) => next(new HttpError(404, "no_route", "No such endpoint.")));

    /* eslint-disable no-unused-vars */
    app.use((error, req, res, next) => {
        if (res.headersSent) return;
        if (error instanceof HttpError) {
            return res.status(error.status).json({
                error: { code: error.code, message: error.message, details: error.details || null }
            });
        }
        if (error && error.type === "entity.too.large") {
            return res.status(413).json({
                error: { code: "payload_too_large", message: "That upload is too large." }
            });
        }
        if (error instanceof SyntaxError) {
            return res.status(400).json({
                error: { code: "invalid_json", message: "Malformed JSON body." }
            });
        }
        if (error && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return res.status(409).json({
                error: { code: "conflict", message: "That already exists." }
            });
        }
        console.error("[" + clientIp(req) + "] " + req.method + " " + req.originalUrl, error);
        res.status(500).json({
            error: { code: "server_error", message: "The server hit an unexpected error." }
        });
    });

    return app;
}
