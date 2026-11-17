/* =====================================================================
 * Api.js — the one HTTP client for the account server.
 *
 * Every call carries `x-gd-client: web` (the CSRF guard the server requires)
 * and `credentials: include` (the session is an HttpOnly cookie, so no token is
 * ever kept in JavaScript). Failures become ApiError objects with the server's
 * error code, which is what screens show verbatim.
 * ===================================================================== */
GD.Api = (function () {
    var base = GD.CONFIG.apiBase;
    var lastError = null;
    var online = null;              // null = not tested yet
    var listeners = [];

    function ApiError(status, code, message, details) {
        this.name = "ApiError";
        this.status = status;
        this.code = code;
        this.message = message;
        this.details = details || null;
    }
    ApiError.prototype = Object.create(Error.prototype);

    function emit() {
        for (var i = 0; i < listeners.length; i++) {
            try { listeners[i](online); } catch (e) { /* a listener must not break the call */ }
        }
    }

    function setOnline(value) {
        if (online === value) return;
        online = value;
        emit();
    }

    function request(method, path, body) {
        if (!base) {
            return Promise.reject(new ApiError(0, "not_configured",
                "Online play is not configured on this build."));
        }
        var options = {
            method: method,
            credentials: "include",
            headers: { "x-gd-client": "web" },
            cache: "no-store"
        };
        if (body !== undefined) {
            options.headers["content-type"] = "application/json";
            options.body = JSON.stringify(body);
        }

        return fetch(base + path, options).then(function (response) {
            setOnline(true);
            return response.text().then(function (text) {
                var data = null;
                if (text) {
                    try { data = JSON.parse(text); } catch (e) { data = null; }
                }
                if (!response.ok) {
                    var error = (data && data.error) || {};
                    var apiError = new ApiError(response.status,
                        error.code || "http_" + response.status,
                        error.message || "The server refused that request.",
                        error.details);
                    lastError = apiError;
                    if (response.status === 401) GD.Api.user = null;
                    throw apiError;
                }
                return data;
            });
        }, function () {
            setOnline(false);
            var offline = new ApiError(0, "network",
                "Cannot reach the Geometry Web server. Check your connection.");
            lastError = offline;
            throw offline;
        });
    }

    return {
        enabled: !!base,
        base: base,
        lastError: function () { return lastError; },
        online: function () { return online; },
        onChange: function (listener) { listeners.push(listener); },
        request: request,
        get: function (path) { return request("GET", path); },
        post: function (path, body) { return request("POST", path, body === undefined ? {} : body); },
        patch: function (path, body) { return request("PATCH", path, body); },
        del: function (path, body) { return request("DELETE", path, body); },
        /* A cheap reachability check the account screen can call on entry. */
        ping: function () {
            if (!base) return Promise.resolve(false);
            return request("GET", "/health").then(function () { return true; }, function () { return false; });
        },
        ApiError: ApiError
    };
})();
