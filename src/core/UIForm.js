/* =====================================================================
 * UIForm.js — a popup with several real text fields.
 *
 * GD.UI.textPrompt handles one line (search boxes, level names). Accounts need
 * more than that: a username and a password, or a current and a new password,
 * plus an error line the server's message can be written into. This widget
 * draws the rows on the canvas and lays a transparent DOM <input> over each one,
 * exactly like textPrompt does, so typing, paste, IME and mobile keyboards all
 * behave normally.
 *
 *   var form = GD.UI.form(scene, {
 *       title: "LOG IN",
 *       fields: [
 *           { key: "username", label: "USERNAME", maxLength: 20 },
 *           { key: "password", label: "PASSWORD", password: true }
 *       ],
 *       okText: "LOG IN",
 *       onSubmit: function (values, form) { ... }
 *   });
 *
 * onSubmit may return a Promise; `form.setError(...)` shows a failure and
 * calling `form.close()` dismisses the dialog on success.
 * ===================================================================== */
GD.UI.form = function (scene, opts) {
    opts = opts || {};
    var fields = opts.fields || [];
    var values = {};
    var inputs = {};
    var labels = {};
    var errorLabel = null;
    var busy = false;

    var pitch = 58;
    var rowWidth = 400;
    var rowHeight = 44;
    var rowsHeight = Math.max(0, (fields.length - 1) * pitch);
    var h = 150 + Math.max(1, fields.length) * pitch + (fields.length > 2 ? 0 : 16);

    for (var i = 0; i < fields.length; i++) {
        values[fields[i].key] = fields[i].value === undefined ? "" : fields[i].value;
    }

    function canvasRect() {
        var canvas = document.getElementById("gameCanvas");
        return canvas ? canvas.getBoundingClientRect()
                      : { left: 0, top: 0, width: GD.W, height: GD.H };
    }

    function rowY(index) {
        return rowsHeight / 2 - index * pitch;
    }

    function placeInputs() {
        var rect = canvasRect();
        var scale = rect.height / GD.H;

        for (var i = 0; i < fields.length; i++) {
            var field = fields[i];
            var box = document.createElement("input");
            box.type = field.password ? "password" : "text";
            box.maxLength = field.maxLength || 40;
            box.value = values[field.key];
            box.setAttribute("autocomplete", field.password ? "current-password" : "username");
            box.setAttribute("autocapitalize", "off");
            box.setAttribute("spellcheck", "false");
            box.setAttribute("aria-label", field.label || field.key);

            var style = box.style;
            style.position = "fixed";
            style.left = (rect.left + rect.width / 2 - (rowWidth / 2 - 16) * scale) + "px";
            style.top = (rect.top + rect.height / 2 -
                         (rowY(i) + rowHeight / 2 - 6) * scale) + "px";
            style.width = ((rowWidth - 32) * scale) + "px";
            style.height = (rowHeight * scale) + "px";
            style.margin = "0";
            style.padding = "0";
            style.border = "0";
            style.outline = "0";
            style.background = "transparent";
            style.color = "transparent";
            style.caretColor = "transparent";
            style.fontSize = Math.max(1, scale) + "px";
            style.zIndex = "1000";
            document.body.appendChild(box);

            inputs[field.key] = box;
            (function (key, input) {
                input.addEventListener("input", function () {
                    values[key] = input.value;
                    paint(key);
                });
                input.addEventListener("keydown", function (event) {
                    var code = event.keyCode || 0;
                    if (code === 13 || event.key === "Enter") { event.preventDefault(); submit(); }
                    else if (code === 27 || event.key === "Escape") { event.preventDefault(); cancel(); }
                });
            })(field.key, box);
        }

        var firstKey = fields.length ? fields[0].key : null;
        if (firstKey && inputs[firstKey]) {
            setTimeout(function () { if (inputs[firstKey]) inputs[firstKey].focus(); }, 30);
        }
    }

    function paint(key) {
        var label = labels[key];
        if (!label) return;
        var field = null;
        for (var i = 0; i < fields.length; i++) if (fields[i].key === key) field = fields[i];
        var shown = values[key];
        if (field && field.password) shown = shown ? new Array(shown.length + 1).join("*") : "";
        label.setString(shown || (field && field.placeholder) || "");
        label.setColor(shown ? GD.UI.COLOR.text : GD.UI.COLOR.locked);
    }

    function teardown() {
        for (var key in inputs) {
            if (!inputs.hasOwnProperty(key)) continue;
            var box = inputs[key];
            if (box.parentNode) box.parentNode.removeChild(box);
        }
        inputs = {};
    }

    var handle = GD.UI.popup(scene, {
        title: opts.title || "SIGN IN",
        w: 520,
        h: h,
        style: opts.style || "brown",
        onClose: teardown,
        content: function (content) {
            for (var i = 0; i < fields.length; i++) {
                var field = fields[i];
                var strip = GD.UI.nine(GD.UI.PANEL.dark, rowWidth, rowHeight, GD.UI.PANEL_INSETS);
                strip.setPosition(0, rowY(i));
                content.addChild(strip, 0);

                labels[field.key] = GD.label("", {
                    scale: GD.UI.TEXT.small,
                    color: GD.UI.COLOR.locked
                });
                labels[field.key].setPosition(0, rowY(i));
                content.addChild(labels[field.key], 1);
                paint(field.key);
            }

            errorLabel = GD.label(opts.message || "", {
                scale: GD.UI.TEXT.tiny,
                color: GD.UI.COLOR.red,
                width: rowWidth,
                align: cc.TEXT_ALIGNMENT_CENTER
            });
            errorLabel.setPosition(0, rowY(fields.length - 1) - 42);
            content.addChild(errorLabel, 2);
        },
        buttons: [
            { text: opts.okText || "OK", style: opts.okStyle || "green", close: false,
              onClick: function () { submit(); } },
            { text: opts.cancelText || "CANCEL", style: "grey", close: false,
              onClick: function () { cancel(); } }
        ]
    });

    function submit() {
        if (busy) return;
        busy = true;
        var result;
        try {
            result = opts.onSubmit ? opts.onSubmit(values, api) : undefined;
        } catch (error) {
            busy = false;
            api.setError(error && error.message ? error.message : "Something went wrong.");
            return;
        }
        if (result && typeof result.then === "function") {
            result.then(function (keepOpen) {
                busy = false;
                if (keepOpen !== true) api.close();
            }, function (error) {
                busy = false;
                api.setError(error && error.message ? error.message : "Something went wrong.");
            });
        } else if (result !== true) {
            api.close();
        } else {
            busy = false;
        }
    }

    function cancel() {
        teardown();
        handle.close(true);
        if (opts.onCancel) opts.onCancel();
    }

    var api = {
        close: function () { teardown(); handle.close(true); },
        setError: function (message) {
            if (errorLabel) errorLabel.setString(message || "");
        },
        values: values,
        focus: function (key) {
            var box = inputs[key];
            if (box) box.focus();
        }
    };
    handle.form = api;

    placeInputs();
    return handle;
};

