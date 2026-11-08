/**
 * Geometry Web — entry point.
 * Loaded last by the cocos2d-html5 loader. Instantiates the Application and
 * starts the game at the main menu.
 */
(function () {
    'use strict';

    // Guard against double boot (e.g. hot-reload).
    if (window.__GD_BOOTED__) { return; }
    window.__GD_BOOTED__ = true;

    var scene = (window.GD && GD.scenes && GD.scenes.MenuScene)
        ? GD.scenes.MenuScene
        : null;

    if (!window.GD || !GD.App) {
        // Should not happen if appFiles loaded correctly.
        document.body.innerHTML = '<h2 style="color:#eee;font-family:sans-serif;padding:24px">' +
            'Failed to load application modules. Serve this folder over HTTP ' +
            '(e.g. <code>python -m http.server</code>) and reload.</h2>';
        return;
    }

    new GD.App(scene);
})();
