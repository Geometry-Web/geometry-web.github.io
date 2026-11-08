/**
 * Geometry Web — cocos2d-html5 application bootstrap (original).
 * Mirrors the standard cocos2d-html5 v2.2 Application pattern.
 */
window.GD = window.GD || {};

GD.App = cc.Application.extend({
    config: document['ccConfig'],

    ctor: function (scene) {
        this._super();
        this.startScene = scene || GD.scenes.MenuScene;
        cc.COCOS2D_DEBUG = this.config['COCOS2D_DEBUG'];
        cc.initDebugSetting();
        cc.setup(this.config['tag']);
        cc.AppController.shareAppController().didFinishLaunchingWithOptions();
    },

    applicationDidFinishLaunching: function () {
        if (cc.RenderDoesnotSupport()) {
            alert("This browser does not support the required rendering.");
            return false;
        }

        var director = cc.Director.getInstance();
        var view = cc.EGLView.getInstance();
        view.resizeWithBrowserSize(true);
        view.setDesignResolutionSize(GD.C.designW, GD.C.designH, cc.RESOLUTION_POLICY.SHOW_ALL);

        director.setDisplayStats(this.config['showFPS']);
        director.setAnimationInterval(1.0 / this.config['frameRate']);

        // Initialize input and (optionally) the WASM runtime, then start.
        GD.Input.init();
        GD.bridge.init();

        // Load the original Geometry Dash assets from your local installation
        // (personal, local use; see src/core/Assets.js and docs/ASSETS.md).
        GD.Assets.setRoot(GD.C.assetsRoot);
        GD.Assets.loadAll();
        if (GD.C.assetsRoot) { GD.Assets.playMusic('StereoMadness.mp3', true); }

        director.runWithScene(new this.startScene());
        return true;
    }
});
