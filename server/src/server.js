/* =====================================================================
 * server.js — process entry point.
 *
 * `node src/server.js` starts the API; `node src/server.js --migrate-only`
 * creates the schema and exits, which is what a deploy host should run once
 * before starting the service.
 * ===================================================================== */
import http from "node:http";
import { config } from "./config.js";
import { createApp } from "./app.js";

if (process.argv.includes("--migrate-only")) {
    /* Importing db.js applies the schema; there is nothing else to do. */
    await import("./db.js");
    console.log("Database schema is up to date:", config.databaseFile);
    process.exit(0);
}

const app = createApp();
const server = http.createServer(app);

server.listen(config.port, config.host, () => {
    console.log("Geometry Web API listening on http://" + config.host + ":" + config.port);
    console.log("Environment:", config.env);
    console.log("Database:", config.databaseFile);
    if (config.ephemeralSecret) {
        console.warn("SESSION_SECRET was not set: using a random secret, sessions end on restart.");
    }
    if (!config.production) {
        console.log("Allowed origins:", config.allowedOrigins.join(", "));
    }
});

function shutdown(signal) {
    console.log(signal + " received, closing the server.");
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
