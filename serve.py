#!/usr/bin/env python3
"""Geometry Web — local static server.

Run:  python serve.py
Then open http://localhost:8000/ in a browser.
The cocos2d-html5 loader needs HTTP (it loads engine modules via XHR).
"""
import http.server
import socketserver
import os

PORT = 8000
os.chdir(os.path.dirname(os.path.abspath(__file__)))

Handler = http.server.SimpleHTTPRequestHandler
Handler.extensions_map.update({
    '.wasm': 'application/wasm',
    '.js': 'application/javascript',
})

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving GeometryWeb at http://localhost:{PORT}/")
    httpd.serve_forever()
