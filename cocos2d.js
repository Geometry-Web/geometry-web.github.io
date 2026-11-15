/* Cocos2d-HTML5 v2.2.3 boot configuration.
   This mirrors the Geometry Dash engine (Cocos2d-x 2.2.3) on the web. */
(function () {
    var d = document;
    var c = {
        COCOS2D_DEBUG: 2,   // 0 = off, 1 = basic, 2 = full
        box2d: false,
        chipmunk: false,
        showFPS: false,
        loadExtension: false,
        frameRate: 60,
        renderMode: 1,      // 0 = auto, 1 = Canvas only, 2 = WebGL only
        tag: 'gameCanvas',
        engineDir: 'cocos2d/',
        appFiles: [
            // Shared core, loaded in dependency order: namespace/art helpers,
            // save file, audio, then the widget kit that builds on all three.
            'src/core/GD.js?v=8',
            'src/core/Save.js?v=2',
            'src/core/Audio.js?v=1',
            'src/core/Levels.js?v=4',
            'src/core/UI.js?v=5',
            'src/core/Nav.js?v=2',
            'src/core/UIList.js?v=1',
            'src/core/UIText.js?v=1',
            // Static game data (official level metadata, unlocks, collections).
            'src/data/Official.js?v=1',
            'src/data/Unlocks.js?v=2',
            // Local service layer: the simulated online provider and the level
            // generator that makes its levels playable.
            'src/services/Generate.js?v=1',
            'src/services/Online.js?v=1',
            'src/resource.js?v=29',
            'src/MyApp.js?v=33',
            // Screens built on the kit, on top of the menu/level select/play
            // scenes in MyApp.js.
            'src/screens/Settings.js?v=2',
            'src/screens/Achievements.js?v=1',
            'src/screens/Online.js?v=2',
            'src/screens/Collections.js?v=4',
            'src/screens/Routes.js?v=1',
            'src/screens/Shops.js?v=3',
            'src/screens/Vaults.js?v=4',
            'src/screens/Profile.js?v=7',
            'src/screens/Colors.js?v=1',
            'src/screens/Editor.js?v=3',
            'src/dev/KitShowcase.js?v=1'
        ]
    };

    if (!d.createElement('canvas').getContext) {
        var s = d.createElement('div');
        s.innerHTML = '<h2>Your browser does not support HTML5 canvas!</h2>';
        var p = d.getElementById(c.tag).parentNode;
        p.insertBefore(s, d.getElementById(c.tag));
        d.body.style.background = '#ffffff';
        return;
    }

    var fn;
    window.addEventListener('DOMContentLoaded', fn = function () {
        this.removeEventListener('DOMContentLoaded', fn, false);
        var s = d.createElement('script');
        if (c.SingleEngineFile && !c.engineDir) {
            s.src = c.SingleEngineFile;
        }
        else if (c.engineDir && !c.SingleEngineFile) {
            s.src = c.engineDir + 'jsloader.js?v=15';
        }
        else {
            alert('You must specify either the single engine file OR the engine directory in "cocos2d.js"');
        }
        d.body.appendChild(s);
        document.ccConfig = c;
        s.id = 'cocos2d-html5';
    });
})();








