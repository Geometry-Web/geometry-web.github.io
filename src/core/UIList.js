/* =====================================================================
 * UIList.js — the scrolling list every list screen shares.
 *
 * GD's browsers (levels, online, packs, achievements, comments, shops, lists)
 * are all the same widget: a column of rows that scrolls by drag or by the two
 * arrow buttons and reacts to a tap on a row. Only the row *content* differs,
 * so the rows are built once by the caller and this module owns the scrolling,
 * the virtual window and the hit testing.
 *
 * A list is virtual: exactly `opts.count` row nodes ever exist, and `fill()`
 * repaints them from `items` as the scroll moves — a 2000-level browser costs
 * the same as a 6-level one.
 *
 *   GD.UI.list(parent, {
 *       x, top, count: 6, pitch: 60, height: 52,
 *       build: function (row) { ... add children to row ... },
 *       fill:  function (row, item, index) { ... },
 *       items: [...],
 *       onSelect: function (item, index) { ... },
 *       priority: 1,        // touch priority (buttons use 0, so they win)
 *       z: 4
 *   }) -> { setItems, refresh, page, scrollTo, pageCount,
 *           getScroll, setScroll, rows, items }
 * ===================================================================== */
GD.UI.list = function (parent, opts) {
    opts = opts || {};

    var count = opts.count || 6;
    var pitch = opts.pitch || 60;
    var top = opts.top === undefined ? 452 : opts.top;
    var x = opts.x === undefined ? GD.W / 2 : opts.x;

    var layer = cc.Layer.create();
    layer.setPosition(0, 0);
    parent.addChild(layer, opts.z === undefined ? 4 : opts.z);

    var handle = {
        rows: [],
        items: opts.items || [],
        _scroll: 0,
        _drag: null,
        layer: layer
    };

    for (var i = 0; i < count; i++) {
        var row = cc.Node.create();
        layer.addChild(row, 1);
        handle.rows.push(row);
        if (opts.build) opts.build(row, i);
    }

    handle.maxScroll = function () {
        return Math.max(0, handle.items.length - count);
    };

    handle.refresh = function () {
        var base = Math.floor(handle._scroll);
        var offset = (handle._scroll - base) * pitch;
        for (var i = 0; i < handle.rows.length; i++) {
            var row = handle.rows[i];
            var item = handle.items[base + i];
            row.setVisible(!!item);
            if (!item) continue;
            row.setPosition(x, top - i * pitch - offset);
            if (opts.fill) opts.fill(row, item, base + i);
        }
        if (opts.onScroll) opts.onScroll(handle);
    };

    handle.setItems = function (list, keepScroll) {
        handle.items = list || [];
        if (!keepScroll) handle._scroll = 0;
        handle.setScroll(handle._scroll);
    };

    handle.setScroll = function (value) {
        handle._scroll = GD.clamp(value, 0, handle.maxScroll());
        handle.refresh();
    };

    handle.getScroll = function () { return handle._scroll; };

    handle.page = function (direction) {
        var step = Math.max(1, count - 1);
        handle.setScroll(Math.round(handle._scroll) + direction * step);
    };

    handle.pageCount = function () {
        return Math.max(1, Math.ceil(handle.items.length / count));
    };

    handle.scrollTo = function (index) {
        handle.setScroll(Math.floor(index / count) * count);
    };


    /* Row band hit test, matching the maths in refresh(): rows are centred on
     * their slot and the slot moves with the fractional scroll. */
    handle.indexAt = function (y) {
        if (!opts.height) return -1;
        var base = Math.floor(handle._scroll);
        var offset = (handle._scroll - base) * pitch;
        for (var i = 0; i < handle.rows.length; i++) {
            var centre = top - i * pitch - offset;
            if (y <= centre + opts.height / 2 && y >= centre - opts.height / 2)
                return handle.items[base + i] ? base + i : -1;
        }
        return -1;
    };

    /* --------------------------------------------------------------- input
     * The list is one touch target: a drag scrolls, a clean tap selects. Rows
     * do not need their own handlers, which keeps a page to one hit test. */
    layer.onTouchBegan = function (touch) {
        handle._drag = { startY: touch.getLocation().y, scroll: handle._scroll, moved: false };
        return true;
    };
    layer.onTouchMoved = function (touch) {
        if (!handle._drag) return;
        var dy = touch.getLocation().y - handle._drag.startY;
        if (Math.abs(dy) > 8) handle._drag.moved = true;
        handle._scroll = GD.clamp(handle._drag.scroll + dy / pitch, 0, handle.maxScroll());
        handle.refresh();
    };
    layer.onTouchEnded = function (touch) {
        var drag = handle._drag;
        handle._drag = null;
        if (!drag) return;
        if (drag.moved) { handle.setScroll(Math.round(handle._scroll)); return; }

        var index = handle.indexAt(touch.getLocation().y);
        if (index >= 0 && opts.onSelect) {
            GD.Audio.sfx("click");
            opts.onSelect(handle.items[index], index);
        }
    };
    layer.onTouchCancelled = function () { handle._drag = null; };

    layer.setTouchMode(cc.TOUCH_ONE_BY_ONE);
    layer.setTouchPriority(opts.priority === undefined ? 1 : opts.priority);
    layer.setTouchEnabled(opts.enabled !== false);

    handle.refresh();
    return handle;
};

/* The two scroll arrows every list screen shows on its right edge. `spec` is
 * { up: {x, y, scale}, down: {x, y, scale} }. */
GD.UI.listArrows = function (parent, handle, spec, z) {
    var up = GD.UI.iconButton(parent, {
        frame: "GJ_arrow_03_001.png", x: spec.up.x, y: spec.up.y,
        scale: spec.up.scale || 1.1, z: z === undefined ? 20 : z,
        onClick: function () { handle.page(-1); }
    });
    if (up._sprite) up._sprite.setRotation(90);

    var down = GD.UI.iconButton(parent, {
        frame: "GJ_arrow_03_001.png", x: spec.down.x, y: spec.down.y,
        scale: spec.down.scale || 1.1, z: z === undefined ? 20 : z,
        onClick: function () { handle.page(1); }
    });
    if (down._sprite) down._sprite.setRotation(-90);
    return { up: up, down: down };
};
