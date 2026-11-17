/* =====================================================================
 * auth.test.js — the account rules the spec calls out: unique usernames,
 * validation, real login/logout, session handling and CSRF protection.
 * ===================================================================== */
import test from "node:test";
import assert from "node:assert/strict";
import { startServer, makeClient, register } from "./helpers.js";

let host;

test.before(async () => { host = await startServer(); });
test.after(async () => { await host.close(); });

test("registration creates a session and never returns secrets", async () => {
    const client = makeClient(host.base);
    const result = await client.post("/auth/register", {
        username: "alice", password: "CorrectHorse9", email: "alice@example.com"
    });

    assert.equal(result.status, 201);
    assert.equal(result.body.user.username, "alice");
    assert.equal(result.body.user.wallet.stars, 0);
    assert.equal(result.body.passwordHash, undefined);
    assert.ok(!JSON.stringify(result.body).includes("$2"));
    const cookies = result.headers.getSetCookie();
    assert.ok(cookies.length >= 1);
    assert.match(cookies[0], /HttpOnly/);
    assert.match(cookies[0], /SameSite=Lax/);

    const me = await client.get("/auth/me");
    assert.equal(me.status, 200);
    assert.equal(me.body.user.username, "alice");
});

test("usernames are unique regardless of case", async () => {
    const first = makeClient(host.base);
    await register(first, "bobby");
    const second = makeClient(host.base);
    const result = await second.post("/auth/register", { username: "BoBBy", password: "CorrectHorse9" });
    assert.equal(result.status, 409);
    assert.equal(result.body.error.code, "username_taken");
});

test("registration rejects weak and malformed input", async () => {
    const client = makeClient(host.base);
    const short = await client.post("/auth/register", { username: "carol", password: "short" });
    assert.equal(short.status, 400);
    assert.equal(short.body.error.code, "weak_password");

    const badName = await client.post("/auth/register", { username: "no spaces", password: "CorrectHorse9" });
    assert.equal(badName.status, 400);

    const reserved = await client.post("/auth/register", { username: "admin", password: "CorrectHorse9" });
    assert.equal(reserved.status, 400);
    assert.equal(reserved.body.error.code, "reserved_username");

    const huge = await client.post("/auth/register", { username: "dave", password: "x".repeat(80) });
    assert.equal(huge.status, 400);
    assert.equal(huge.body.error.code, "long_password");
});

test("login needs the right password and logout ends the session", async () => {
    const owner = makeClient(host.base);
    await register(owner, "erin");
    await owner.post("/auth/logout");

    const guest = makeClient(host.base);
    const wrong = await guest.post("/auth/login", { username: "erin", password: "WrongPassword1" });
    assert.equal(wrong.status, 401);
    assert.equal(wrong.body.error.code, "unauthorized");

    const missing = await guest.post("/auth/login", { username: "nobody_here", password: "CorrectHorse9" });
    assert.equal(missing.status, 401);
    assert.equal(missing.body.error.message, "That username or password is wrong.");

    const ok = await guest.post("/auth/login", { username: "erin", password: "CorrectHorse9" });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.user.username, "erin");
    assert.equal((await guest.get("/auth/me")).body.user.username, "erin");

    await guest.post("/auth/logout");
    const after = await guest.get("/auth/me");
    assert.equal(after.body.user, null);
    assert.equal(after.body.guest, true);
});

test("state-changing requests without the client header are refused", async () => {
    const client = makeClient(host.base);
    const result = await client.raw("POST", "/auth/register",
        { username: "frank", password: "CorrectHorse9" }, { "x-gd-client": "" });
    assert.equal(result.status, 403);
    assert.equal(result.body.error.code, "csrf_required");

test("password change requires the current password and ends other sessions", async () => {
    const client = makeClient(host.base);
    await register(client, "grace");

    const other = makeClient(host.base);
    await other.post("/auth/login", { username: "grace", password: "CorrectHorse9" });

    const wrong = await client.post("/auth/password", {
        currentPassword: "NotThePassword", newPassword: "AnotherHorse7"
    });
    assert.equal(wrong.status, 401);

    const ok = await client.post("/auth/password", {
        currentPassword: "CorrectHorse9", newPassword: "AnotherHorse7"
    });
    assert.equal(ok.status, 200);

    /* The session that made the change survives; the other one was destroyed. */
    assert.equal((await client.get("/auth/me")).status, 200);
    assert.equal((await other.get("/auth/me")).body.user, null);

    const oldPassword = await makeClient(host.base)
        .post("/auth/login", { username: "grace", password: "CorrectHorse9" });
    assert.equal(oldPassword.status, 401);
    const newPassword = await makeClient(host.base)
        .post("/auth/login", { username: "grace", password: "AnotherHorse7" });
    assert.equal(newPassword.status, 200);
});

test("username availability answers without leaking accounts", async () => {
    const client = makeClient(host.base);
    await register(client, "heidi");
    assert.equal((await client.get("/auth/username-available?username=heidi")).body.available, false);
    assert.equal((await client.get("/auth/username-available?username=ivan")).body.available, true);
});

test("account deletion frees the username and needs the password", async () => {
    const client = makeClient(host.base);
    await register(client, "judy");
    const wrong = await client.del("/auth/account", { password: "WrongPassword1" });
    assert.equal(wrong.status, 401);

    const ok = await client.del("/auth/account", { password: "CorrectHorse9" });
    assert.equal(ok.status, 200);
    assert.equal((await client.get("/auth/me")).body.user, null);

    const reuse = await makeClient(host.base)
        .post("/auth/register", { username: "judy", password: "CorrectHorse9" });
    assert.equal(reuse.status, 201);
    const login = await makeClient(host.base)
        .post("/auth/login", { username: "judy", password: "CorrectHorse9" });
    assert.equal(login.status, 200);
});

});
