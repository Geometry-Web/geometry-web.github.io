/* Application bootstrap. Mirrors the Cocos2d-x 2.x CCDirector / CCEGLView /
   CCApplication startup sequence recovered from Geometry Dash. */

var cocos2dApp = cc.Application.extend({
    config: document['ccConfig'],
    ctor: function (scene) {
        this._super();
        this.startScene = scene;
        cc.COCOS2D_DEBUG = this.config['COCOS2D_DEBUG'];
        cc.initDebugSetting();
        cc.setup(this.config['tag']);
        cc.AppController.shareAppController().didFinishLaunchingWithOptions();
    },
    applicationDidFinishLaunching: function () {
        var director = cc.Director.getInstance();

        cc.EGLView.getInstance()._adjustSizeToBrowser();
        var screenSize = cc.EGLView.getInstance().getFrameSize();

        // Geometry Dash on PC runs landscape; use a 16:9 design resolution.
        var designSize = cc.size(960, 540);

        var searchPaths = [];
        searchPaths.push("res");
        cc.FileUtils.getInstance().setSearchPaths(searchPaths);

        cc.FileUtils.getInstance().setSearchResolutionsOrder([]);
        director.setContentScaleFactor(1.0);
        // SHOW_ALL keeps the full 16:9 frame and letterboxes (instead of
        // cropping), so the game stays landscape no matter the window size.
        cc.EGLView.getInstance().setDesignResolutionSize(
            designSize.width, designSize.height, cc.RESOLUTION_POLICY.SHOW_ALL);
        cc.EGLView.getInstance().resizeWithBrowserSize(true);

        director.setDisplayStats(this.config['showFPS']);
        director.setAnimationInterval(1.0 / this.config['frameRate']);

        cc.LoaderScene.preload(g_resources, function () {
            director.replaceScene(new this.startScene());
        }, this);

        return true;
    }
});

var myApp = new cocos2dApp(MyScene);
