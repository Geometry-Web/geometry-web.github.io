/* =====================================================================
 * test/helpers.js — boots the real Express app on an ephemeral port against
 * an in-memory database and hands back a cookie-aware client.
 *
 * Nothing is mocked: the tests talk HTTP to the same app the deploy runs.
 * ===================================================================== */
export async function startServer() {
    process.env.NODE_ENV = "test";
    process.env.SESSION_SECRET = "test-secret-".padEnd(48, "x");
    process.env.BCRYPT_ROUNDS = "10";
    process.env.AUTH_MAX_ATTEMPTS = "500";
    process.env.REGISTER_MAX_PER_IP = "5000";
    process.env.COOKIE_SECURE = "false";

    const { createApp } = await import("../src/app.js");
    const { resetRateLimits } = await import("../src/util.js");
    resetRateLimits();
    const app = createApp();
    const server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const base = "http://127.0.0.1:" + server.address().port + "/api/v1";
    return {
        server,
        base,
        client: () => makeClient(base),
        async close() {
            await new Promise((resolve) => server.close(resolve));
        }
    };
}

export function makeClient(base) {
    let cookie = null;

    async function request(method, path, body, extraHeaders = {}) {
        const headers = { "x-gd-client": "web", ...extraHeaders };
        if (cookie) headers.cookie = cookie;
        if (body !== undefined) headers["content-type"] = "application/json";
        const response = await fetch(base + path, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body)
        });

        const setCookies = typeof response.headers.getSetCookie === "function"
            ? response.headers.getSetCookie()
            : [];
        for (const header of setCookies) {
            const pair = header.split(";")[0];
            const value = pair.slice(pair.indexOf("=") + 1);
            cookie = value ? pair : null;
        }

        const raw = await response.text();
        let parsed = null;
        if (raw) {
            try { parsed = JSON.parse(raw); } catch { parsed = raw; }
        }
        return { status: response.status, body: parsed, headers: response.headers };
    }

    return {
        get: (path, headers) => request("GET", path, undefined, headers),
        post: (path, body, headers) => request("POST", path, body, headers),
        patch: (path, body, headers) => request("PATCH", path, body, headers),
        del: (path, body, headers) => request("DELETE", path, body, headers),
        raw: request,
        get cookie() { return cookie; },
        set cookie(value) { cookie = value; }
    };
}

export async function register(client, username, password = "CorrectHorse9") {
    const result = await client.post("/auth/register", { username, password });
    if (result.status !== 201) {
        throw new Error("register failed: " + result.status + " " + JSON.stringify(result.body));
    }
    return result.body.user;
}

export const SAMPLE_LEVEL = "kA2,1,kA3,10,kS29,0,255,255,kS30,255,255,0;" +
    "1,1,2,15,3,15;1,1,2,45,3,15;1,8,2,75,3,15;";

export async function publishLevel(client, overrides = {}) {
    const result = await client.post("/levels", {
        name: "Unit Test Level",
        description: "Level created by the API test suite.",
        data: SAMPLE_LEVEL,
        dataFormat: "gd",
        difficulty: 3,
        length: "short",
        visibility: "private",
        ...overrides
    });
    if (result.status !== 201) {
        throw new Error("publish failed: " + result.status + " " + JSON.stringify(result.body));
    }
    return result.body.level;
}
