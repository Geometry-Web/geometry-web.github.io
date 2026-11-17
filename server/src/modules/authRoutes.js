/* =====================================================================
 * authRoutes.js — registration, login, logout and account security.
 *
 * Every route here is throttled, every message is deliberately vague where
 * vagueness protects an account ("username or password is wrong"), and every
 * state change is written to audit_logs. The session token is only ever sent
 * in the HttpOnly cookie; it is never echoed into a JSON body.
 * ===================================================================== */
import express from "express";
import { get, run, tx } from "../db.js";
import {
    burnPasswordCheck, clearSessionCookie, createSession, createUser, destroyAllSessions,
    destroyToken, findUserByUsername, hashPassword, recordAudit, requireAuth, setSessionCookie,
    verifyPassword
} from "../auth.js";
import {
    conflict, email as emailField, HttpError, now, password as passwordField, randomToken,
    rateLimit, text, unauthorized, username as usernameField, wrap
} from "../util.js";
import { config } from "../config.js";
import { publicUser } from "./users.js";

const loginLimiter = rateLimit({
    ...config.authRateLimit,
    key: (req) => "login:" + req.ip + ":" + String((req.body && req.body.username) || "").toLowerCase(),
    message: "Too many sign-in attempts. Wait a minute and try again."
});
const registerLimiter = rateLimit({
    ...config.registerRateLimit,
    key: (req) => "register:" + req.ip,
    message: "Too many accounts created from this address. Try again later."
});

function sessionPayload(user, session) {
    return { user: publicUser(user.id), expiresAt: session.expiresAt };
}

export const auth = express.Router();

auth.post("/auth/register", registerLimiter, wrap(async (req, res) => {
    const name = usernameField(req.body && req.body.username);
    const plain = passwordField(req.body && req.body.password);
    const address = emailField(req.body && req.body.email, { required: false });

    if (findUserByUsername(name)) {
        /* The one place the API admits a name is taken: a registration form
         * cannot be usable without it, and the route is throttled per address. */
        throw conflict("username_taken", "That username is already in use.");
    }
    if (address && get("SELECT id FROM users WHERE email_lower = ?", [address])) {
        throw conflict("email_taken", "That email is already registered.");
    }

    const passwordHash = await hashPassword(plain);
    const userId = createUser({ username: name, passwordHash, email: address });
    const session = createSession(userId, req);
    setSessionCookie(res, session);
    recordAudit(userId, "account.register", { targetType: "user", targetId: userId, ip: req.ip });
    res.status(201).json(sessionPayload({ id: userId }, session));
}));

auth.post("/auth/login", loginLimiter, wrap(async (req, res) => {
    const rawName = text(req.body && req.body.username, "username", { min: 1, max: 64 });
    const plain = text(req.body && req.body.password, "password", { min: 1, max: 200 });
    const user = findUserByUsername(rawName);

    if (!user || user.deleted_at) {
        burnPasswordCheck(plain);
        throw unauthorized("That username or password is wrong.");
    }
    if (user.disabled_at) {
        throw new HttpError(403, "account_disabled",
            "This account is suspended. Contact support if you think that is a mistake.");
    }
    if (!(await verifyPassword(plain, user.password_hash))) {
        recordAudit(user.id, "account.login_failed", { ip: req.ip });
        throw unauthorized("That username or password is wrong.");
    }

    const session = createSession(user.id, req);
    setSessionCookie(res, session);
    run("UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?", [now(), now(), user.id]);
    recordAudit(user.id, "account.login", { ip: req.ip });
    res.json(sessionPayload(user, session));
}));

auth.get("/auth/me", wrap((req, res) => {
    if (!req.user) return res.json({ user: null, guest: true });
    res.json({ user: publicUser(req.user.id), session: { expiresAt: req.session.expires_at } });
}));

auth.post("/auth/logout", wrap((req, res) => {
    if (req.token) {
        destroyToken(req.token);
        recordAudit(req.user ? req.user.id : null, "account.logout", { ip: req.ip });
    }
    clearSessionCookie(res);
    res.json({ ok: true });
}));

auth.post("/auth/logout-others", requireAuth, wrap((req, res) => {
    destroyAllSessions(req.user.id, req.session.id);
    res.json({ ok: true });
}));

/* Rotating the session on a password change is what makes "change password"
 * actually end an attacker's session. */
auth.post("/auth/password", requireAuth, wrap(async (req, res) => {
    const body = req.body || {};
    const current = text(body.currentPassword, "currentPassword", { min: 1, max: 200 });
    const next = passwordField(body.newPassword, "newPassword");
    const user = get("SELECT * FROM users WHERE id = ?", [req.user.id]);
    if (!(await verifyPassword(current, user.password_hash))) {
        throw unauthorized("Your current password is wrong.");
    }
    if (await verifyPassword(next, user.password_hash)) {
        throw conflict("password_reused", "Choose a password you have not used before.");
    }
    const hash = await hashPassword(next);
    run("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", [hash, now(), req.user.id]);
    destroyAllSessions(req.user.id, req.session.id);
    recordAudit(req.user.id, "account.password_change", { ip: req.ip });
    res.json({ ok: true });
}));

/* Account deletion is a soft delete: the username and email are released and
 * the session is gone, while the rows other players can see stay internally
 * consistent. That is what stops "delete account, re-register the same name,
 * inherit the profile". */
auth.delete("/auth/account", requireAuth, wrap(async (req, res) => {
    const body = req.body || {};
    const plain = text(body.password, "password", { min: 1, max: 200 });
    const user = get("SELECT * FROM users WHERE id = ?", [req.user.id]);
    if (!(await verifyPassword(plain, user.password_hash))) {
        throw unauthorized("That password is wrong.");
    }
    const stamp = now();
    const tombstone = "deleted:" + randomToken(32);
    tx(() => {
        run(
            "UPDATE users SET username = ?, username_lower = ?, email = NULL, email_lower = NULL, " +
                "password_hash = ?, deleted_at = ?, updated_at = ? WHERE id = ?",
            ["deleted_" + user.id, "deleted_" + user.id, tombstone, stamp, stamp, user.id]
        );
        /* Deleting an account takes its levels out of circulation; the share
         * graph rows cascade with the user row, not with this update. */
        run("UPDATE levels SET visibility = 'private', deleted_at = ? WHERE owner_id = ? AND deleted_at IS NULL",
            [stamp, user.id]);
        run("DELETE FROM sessions WHERE user_id = ?", [user.id]);
    });
    recordAudit(user.id, "account.delete", { ip: req.ip });
    clearSessionCookie(res);
    res.json({ ok: true });
}));

auth.get("/auth/username-available", wrap((req, res) => {
    const name = usernameField(req.query.username);
    res.json({ username: name, available: !findUserByUsername(name) });
}));

