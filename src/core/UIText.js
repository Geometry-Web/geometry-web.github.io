/* =====================================================================
 * UIText.js — the shared single-line text prompt.
 *
 * GD asks for text in a few places (level search, vault codes, level names,
 * comments). Typing has to reach a real focused DOM node, so the prompt lays a
 * transparent <input> exactly over the panel's text box, in CSS pixels mapped
 * from the canvas rect, and reports the value through `opts.onOk`.
 *
 * Enter = OK, Escape = cancel, clicking outside = cancel (the kit's popup
 * already closes on an outside press).
 * ===================================================================== */
GD.UI.textPrompt = function (scene, opts) {
    opts = opts || {};
    var value = opts.value || "";
    var label = null;
    var input = null;

    function canvasRect() {
        var canvas = document.getElementById("gameCanvas");
        return canvas ? canvas.getBoundingClientRect()
                      : { left: 0, top: 0, width: GD.W, height: GD.H };
    }

    function placeInput() {
        var rect = canvasRect();
        var size = cc.Director.getInstance().getWinSize();
        var scale = rect.height / size.height;

        var box = document.createElement("input");
        box.type = "text";
        box.maxLength = opts.maxLength || 20;
        box.value = value;
        box.setAttribute("autocomplete", "off");
        box.setAttribute("autocapitalize", "off");
        box.setAttribute("spellcheck", "false");

        // The field sits over the popup's text box: centred, one row above the
        // button row (see the layout below).
        var s = box.style;
        s.position = "fixed";
        s.left = (rect.left + rect.width / 2 - 150 * scale) + "px";
        s.top = (rect.top + (GD.H / 2 - 10) / GD.H * rect.height - 22 * scale) + "px";
        s.width = (300 * scale) + "px";
        s.height = (44 * scale) + "px";
        s.margin = "0";
        s.padding = "0";
        s.border = "0";
        s.outline = "0";
        s.background = "transparent";
        s.color = "transparent";
        s.caretColor = "transparent";
        s.fontSize = (1 * scale) + "px";
        s.zIndex = "1000";
        document.body.appendChild(box);

        setTimeout(function () { if (input === box) box.focus(); }, 0);
        return box;
    }

    var handle = GD.UI.popup(scene, {
        title: opts.title || "ENTER TEXT",
        w: 470, h: 240,
        style: opts.style || "brown",
        content: function (content) {
            var box = GD.UI.nine(GD.UI.PANEL.dark, 360, 60, GD.UI.PANEL_INSETS);
            box.setPosition(0, 4);
            content.addChild(box, 0);

            label = GD.label(value || (opts.placeholder || ""), {
                scale: GD.UI.TEXT.body,
                color: value ? GD.UI.COLOR.text : GD.UI.COLOR.locked
            });
            label.setPosition(0, 4);
            content.addChild(label, 1);
        },
        buttons: [
            { text: "OK", style: "green", close: false, onClick: function (h) { submit(); } },
            { text: "CANCEL", style: "grey", close: false, onClick: function () { cancel(); } }
        ]
    });

    function paint() {
        if (!label) return;
        label.setString(value === "" ? (opts.placeholder || "") : value);
        label.setColor(value === "" ? GD.UI.COLOR.locked : GD.UI.COLOR.text);
    }

    function submit() {
        var text = ("" + value).replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
        teardown();
        if (opts.allowEmpty === false && !text) return;
        handle.close(true);
        if (opts.onOk) opts.onOk(text);
    }

    function cancel() {
        teardown();
        handle.close(true);
        if (opts.onCancel) opts.onCancel();
    }

    function teardown() {
        if (!input) return;
        var box = input;
        input = null;
        box.removeEventListener("input", onInput, false);
        box.removeEventListener("keydown", onKey, false);
        if (box.parentNode) box.parentNode.removeChild(box);
    }

    function onInput() { value = input.value; paint(); }
    function onKey(event) {
        var key = event.key || "";
        if (event.keyCode === 13 || key === "Enter") { event.preventDefault(); submit(); }
        else if (event.keyCode === 27 || key === "Escape") { event.preventDefault(); cancel(); }
    }

    input = placeInput();
    input.addEventListener("input", onInput, false);
    input.addEventListener("keydown", onKey, false);

    handle.input = input;
    return handle;
};
