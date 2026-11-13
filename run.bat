@echo off
rem ============================================================
rem  Geometry Web - dev server launcher (cocos2d-html5)
rem  Starts a server on http://localhost:8080 and opens it.
rem  Close the "GeometryWeb server" window to stop the server.
rem ============================================================
cd /d "%~dp0"
start "GeometryWeb server" /min cmd /k "python -m http.server 8080"
timeout /t 2 >nul
start "" http://localhost:8080/
echo Server running on http://localhost:8080/
echo Close the "GeometryWeb server" window to stop it.
