/**
 * Geometry Web — cocos2d-html5 loader configuration.
 * This file configures the cocos2d-html5 (v2.2.2) engine loader, which is the
 * MIT-licensed open-source game framework. It loads the engine modules from
 * frameworks/cocos2d-html5/ and then our application files (src/*), followed
 * by main.js.
 */
(function () {
    var d = document;
    var c = {
        COCOS2D_DEBUG: 0,       // 0 = off, 1 = basic, 2 = full
        box2d: false,           // custom physics is used instead
        chipmunk: false,
        showFPS: true,
        frameRate: 60,
        loadExtension: false,
        renderMode: 0,          // 0 = auto (WebGL where supported; matches cc.DrawNode)
        tag: 'gameCanvas',
        engineDir: 'frameworks/cocos2d-html5/',
        appFiles: [
            'src/config.js',
            'src/math.js',
            'src/input.js',
            'src/audio.js',
            'src/level.js',
            'src/sim/Simulation.js',
            'src/rendering/Renderer.js',
            'src/rendering/Textures.js',
            'src/core/Assets.js',
            'src/objects/GameObject.js',
            'src/objects/Player.js',
            'src/triggers/Triggers.js',
            'src/systems/Collision.js',
            'src/systems/Camera.js',
            'src/systems/GameState.js',
            'src/systems/LevelLoader.js',
            'src/systems/Particles.js',
            'src/editor/Editor.js',
            'src/menus/MenuScene.js',
            'src/scenes/GameScene.js',
            'src/scenes/EditorScene.js',
            'src/bridge.js',
            'src/app.js',
            'src/core/Architecture.js'
        ]
    };

    if (!d.createElement('canvas').getContext) {
        d.body.innerHTML = '<h2>Your browser does not support HTML5 canvas.</h2>';
        return;
    }

    window.addEventListener('DOMContentLoaded', function () {
        this.removeEventListener('DOMContentLoaded', arguments.callee, false);
        var s = d.createElement('script');
        if (c.engineDir) {
            s.src = c.engineDir + 'jsloader.js';
        } else {
            alert('No engine directory specified in cocos2d.js');
            return;
        }
        document.ccConfig = c;
        s.id = 'cocos2d-html5';
        d.body.appendChild(s);
    });
})();
