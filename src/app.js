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

        // Auto-detect + load assets, then start the scene so real frames are
        // used when present (falls back to original artwork otherwise).
        var startScene = this.startScene;
        GD.Assets.loadAll(function () {
            director.runWithScene(new startScene());
        });
        return true;
    }
});
