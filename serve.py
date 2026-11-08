#!/usr/bin/env python3
"""Web Dashers — local static server.

Serves the project's PARENT folder so both the game (GeometryWeb/) and the
local Geometry Dash Resources/ are reachable over HTTP. Then open
http://localhost:8000/GeometryWeb/
"""
import http.server
import socketserver
import os

PORT = 8000
# Serve the parent directory (E:\GDWEB) so Resources/ is reachable too.
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(root)

Handler = http.server.SimpleHTTPRequestHandler
Handler.extensions_map.update({
    '.wasm': 'application/wasm',
    '.js': 'application/javascript',
})

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving {root} at http://localhost:{PORT}/")
    print("Open http://localhost:8000/GeometryWeb/")
    httpd.serve_forever()
