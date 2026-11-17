/* =====================================================================
 * config.js — where the game looks for its API.
 *
 * This build is a static site, so it cannot carry a backend URL that is right
 * for every deployment. Resolution order:
 *
 *   1. ?api=https://api.example.com   (also remembered in localStorage)
 *   2. a URL saved earlier with GD.CONFIG.setApi()
 *   3. window.GD_API_URL, set by an optional api-config.js next to index.html
 *   4. http://localhost:8787 when the page is served from localhost
 *   5. nothing - the game runs offline and every online screen says so.
 *
 * No production host is hard-coded: deploying the API means setting one of the
 * three configuration points above.
 * ===================================================================== */
window.GD = window.GD || {};

GD.CONFIG = (function () {
    var KEY = "geometryweb.api";

    function queryParam(name) {
        try { return new URLSearchParams(window.location.search).get(name); }
        catch (e) { return null; }
    }
    function readStored() {
        try { return window.localStorage.getItem(KEY) || ""; }
        catch (e) { return ""; }
    }
    function writeStored(value) {
        try {
            if (value) window.localStorage.setItem(KEY, value);
            else window.localStorage.removeItem(KEY);
        } catch (e) { /* private mode: the query parameter still works */ }
    }

    var host = (window.location.hostname || "").toLowerCase();
    var local = host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "";
    var fromQuery = queryParam("api");
    if (fromQuery) writeStored(fromQuery);

    var base = (fromQuery || readStored() || window.GD_API_URL || (local ? "http://localhost:8787" : ""))
        .replace(/\/+$/, "");
    if (base && !/^https?:\/\//i.test(base)) base = window.location.origin + base;

    return {
        apiBase: base ? base + "/api/v1" : "",
        configured: !!base,
        local: local,
        storageKey: KEY,
        /* Lets the settings screen point a deployed front-end at a deployed
         * API without rebuilding the site. */
        setApi: function (url) {
            writeStored(url || "");
            window.location.reload();
        }
    };
})();
