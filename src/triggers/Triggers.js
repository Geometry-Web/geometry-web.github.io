/**
 * Geometry Web — trigger system (original, simplified interpretation).
 *
 * A trigger is an object that fires when the player passes it, then animates
 * matching objects using cocos2d actions. Supported behaviors:
 *   move, rotate, pulse, alpha, toggle
 *
 * NOTE: this is an independent design, not a faithful reproduction of the
 * Geometry Dash trigger set. It demonstrates the trigger concept with real,
 * playable behavior.
 */
window.GD = window.GD || {};

GD.Triggers = (function () {
    var R = GD.Renderer, C = GD.C;

    function create(def) {
        var o = {
            type: 'trigger', x: def.x || 0, y: def.y || C.groundY,
            behavior: def.behavior || 'move',
            target: def.target || 'all',
            dx: def.dx || 0, dy: def.dy || 80, dur: def.dur || 0.6,
            fired: false, def: def
        };
        o.node = R.circle(6, [255, 110, 240]);
        o.node.setPosition(cc.p(o.x, o.y));
        return o;
    }

    function fire(trigger, objects) {
        if (trigger.fired) return;
        trigger.fired = true;
        for (var i = 0; i < objects.length; i++) {
            var o = objects[i];
            if (o.type === 'trigger') continue;
            if (trigger.target !== 'all' && o.type !== trigger.target) continue;
            apply(trigger, o);
        }
    }

    function apply(t, o) {
        var n = o.node;
        if (!n) return;
        switch (t.behavior) {
            case 'move':
                var targetY = (t.dy || 0);
                n.runAction(cc.MoveTo.create(t.dur, cc.p(n.getPositionX(), targetY)));
                break;
            case 'rotate':
                n.runAction(cc.RotateBy.create(t.dur, t.dx || 180));
                break;
            case 'pulse':
                n.runAction(cc.RepeatForever.create(cc.Sequence.create(
                    cc.ScaleTo.create(t.dur || 0.3, 1.25),
                    cc.ScaleTo.create(t.dur || 0.3, 1.0))));
                break;
            case 'alpha':
                n.runAction(cc.FadeTo.create(t.dur || 0.5, 120));
                break;
            case 'toggle':
                n.setVisible(!n.isVisible());
                break;
        }
    }

    return { create: create, fire: fire };
})();
