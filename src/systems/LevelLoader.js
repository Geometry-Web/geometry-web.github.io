/**
 * Geometry Web — level loader (original).
 * Turns a level definition ({name, speed, objects}) into live game objects with
 * cocos2d nodes, parented to the given world layer.
 */
window.GD = window.GD || {};

GD.LevelLoader = (function () {
    var C = GD.C;

    function load(levelDef, worldLayer) {
        var objects = [];
        var finishX = 0;
        for (var i = 0; i < levelDef.objects.length; i++) {
            var def = levelDef.objects[i];
            var o = (def.type === 'trigger') ? GD.Triggers.create(def) : GD.Objects.create(def);
            if (worldLayer) { worldLayer.addChild(o.node); }
            objects.push(o);
            if (def.type === 'finish') { finishX = def.x; }
        }
        return {
            objects: objects,
            finishX: finishX,
            spawnX: 120,
            spawnY: C.groundY + C.playerSize / 2,
            totalCoins: countCoins(objects)
        };
    }

    function countCoins(objects) {
        var n = 0;
        for (var i = 0; i < objects.length; i++) if (objects[i].type === 'coin') n++;
        return n;
    }

    return { load: load };
})();
