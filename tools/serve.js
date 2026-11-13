/* Minimal static file server for local preview and screenshot harnesses.
 *
 *   node tools/serve.js [port] [root]
 *
 * Why not `python -m http.server`: the game needs correct MIME types for .fnt
 * and .plist and no-cache headers while iterating, and Windows often has no
 * python on PATH. This has no dependencies.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const port = Number(process.argv[2] || 8080);
const root = path.resolve(process.argv[3] || path.join(__dirname, ".."));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".plist": "text/xml; charset=utf-8",
  ".fnt": "text/plain; charset=utf-8",
  ".xml": "text/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf"
};

http.createServer((req, res) => {
  let pathname = decodeURIComponent(url.parse(req.url).pathname);
  if (pathname.endsWith("/")) pathname += "index.html";

  const file = path.join(root, path.normalize(pathname).replace(/^([/\\])+/, ""));
  if (!file.startsWith(root)) { res.writeHead(403); res.end("forbidden"); return; }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 " + pathname);
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*"
    });
    res.end(data);
  });
}).listen(port, () => {
  console.log("serving " + root + " on http://127.0.0.1:" + port + "/");
});
