/**
 * Geometry Web — player node (original).
 * Wraps the simulation state with a cocos2d node whose shape changes with the
 * current mode. sync() writes the sim state into the node each frame.
 */
window.GD = window.GD || {};

GD.Player = (function () {
    var R = GD.Renderer, C = GD.C, M = GD.Mode, T = GD.Textures;

    function shapeFor(mode) {
        var S = C.playerSize;
        var A = GD.Assets;
        switch (mode) {
            case M.SHIP: return A.sizedSprite(A.FRAMES.ship, C.shipWidth) || T.sprite('ship', C.shipWidth, C.shipHeight, T.shipIcon);
            case M.BALL: return A.sizedSprite(A.FRAMES.ball, S) || T.sprite('ball', S, S, T.ballIcon);
            case M.UFO: return A.sizedSprite(A.FRAMES.ufo, S) || T.sprite('ufo', S, S, T.ufoIcon);
            case M.WAVE: return A.sizedSprite(A.FRAMES.wave, S) || T.sprite('wave', S, S, T.waveIcon);
            case M.ROBOT: return A.sizedSprite(A.FRAMES.robot, S) || T.sprite('robot', S, S, T.robotFace);
            case M.SPIDER: return A.sizedSprite(A.FRAMES.spider, S) || T.sprite('spider', S, S, T.spiderIcon);
            case M.SWING: return A.sizedSprite(A.FRAMES.swing, S) || T.sprite('swing', S, S, T.swingIcon);
            default: return A.sizedSprite(A.FRAMES.cube, S) || T.sprite('cube', S, S, T.cubeFace);
        }
    }

    function glowColorFor(mode) {
        if (mode === M.BALL) return C.colorBall;
        if (mode === M.SHIP) return C.colorShip;
        return C.colorPlayerGlow;
    }

    function create(state) {
        var node = new cc.Node();
        var glow = R.glow((state.mode === M.SHIP) ? 30 : C.playerSize * 0.9, glowColorFor(state.mode), 60);
        var shape = shapeFor(state.mode);
        node.addChild(glow, 0);
        node.addChild(shape, 1);
        return { state: state, node: node, shape: shape, glow: glow };
    }

    function setMode(player, mode) {
        player.node.removeChild(player.shape, true);
        player.node.removeChild(player.glow, true);
        player.shape = shapeFor(mode);
        player.glow = R.glow((mode === M.SHIP) ? 30 : C.playerSize * 0.9, glowColorFor(mode), 60);
        player.node.addChild(player.glow, 0);
        player.node.addChild(player.shape, 1);
    }

    function sync(player) {
        var s = player.state;
        player.node.setPosition(cc.p(s.x, s.y));
        player.node.setRotation(s.rotation);
        player.node.setVisible(!s.dead);
    }

    return { create: create, setMode: setMode, sync: sync };
})();
