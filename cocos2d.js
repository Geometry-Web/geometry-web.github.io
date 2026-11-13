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
            'src/core/GD.js?v=2',
            'src/core/Save.js?v=1',
            'src/core/Audio.js?v=1',
            'src/core/UI.js?v=2',
            'src/resource.js?v=25',
            'src/MyApp.js?v=27',
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
