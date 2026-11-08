/**
 * Geometry Web — unified keyboard + pointer input (original).
 * The game reads two values each frame:
 *   GD.Input.pressed — a jump/action was pressed this frame (edge)
 *   GD.Input.held    — the jump/action is currently held (for ship/wave)
 */
window.GD = window.GD || {};

GD.Input = (function () {
    var heldKeys = {};
    var justKeys = {};
    var pointerHeld = false;
    var pointerJust = false;
    var jumpCodes = GD.C.keyJump;

    function isJumpKey(code) { return jumpCodes.indexOf(code) !== -1; }

    function onKeyDown(e) {
        var c = e.keyCode;
        if (!heldKeys[c]) justKeys[c] = true;
        heldKeys[c] = true;
        if (isJumpKey(c)) e.preventDefault();
    }
    function onKeyUp(e) {
        heldKeys[e.keyCode] = false;
    }
    function onPointerDown() { if (!pointerHeld) pointerJust = true; pointerHeld = true; }
    function onPointerUp() { pointerHeld = false; }

    var pressed = false, held = false, restartPressed = false, escapePressed = false;

    function init() {
        window.addEventListener('keydown', onKeyDown, false);
        window.addEventListener('keyup', onKeyUp, false);
        var canvas = document.getElementById('gameCanvas') || document;
        canvas.addEventListener('mousedown', onPointerDown, false);
        canvas.addEventListener('mouseup', onPointerUp, false);
        canvas.addEventListener('touchstart', onPointerDown, { passive: false });
        canvas.addEventListener('touchend', onPointerUp, false);
        // prevent default touch scrolling
        document.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
    }

    // Call once per frame before the sim reads state.
    function poll() {
        var anyKey = false, anyJust = false;
        for (var i = 0; i < jumpCodes.length; i++) {
            if (heldKeys[jumpCodes[i]]) anyKey = true;
            if (justKeys[jumpCodes[i]]) anyJust = true;
        }
        held = anyKey || pointerHeld;
        pressed = anyJust || pointerJust;
        restartPressed = !!justKeys[82];
        escapePressed = !!justKeys[27];
    }

    function clear() {
        justKeys = {};
        pointerJust = false;
    }

    function keyPressed(code) { return !!justKeys[code]; }
    function keyHeld(code) { return !!heldKeys[code]; }

    return {
        init: init,
        poll: poll,
        clear: clear,
        keyPressed: keyPressed,
        keyHeld: keyHeld,
        get pressed() { return pressed; },
        get held() { return held; },
        get restartPressed() { return restartPressed; },
        get escapePressed() { return escapePressed; }
    };
})();
