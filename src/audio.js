/**
 * Geometry Web — WebAudio sound engine (original).
 * All audio is synthesized in code (no copyrighted assets). Effects are short
 * oscillator envelopes; the music is a tiny scheduled arpeggio loop.
 */
window.GD = window.GD || {};

GD.Audio = (function () {
    var ctx = null, muted = false, music = null, musicOn = false;

    function ensure() {
        if (!ctx) {
            try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
            catch (e) { return null; }
        }
        if (ctx && ctx.state === 'suspended') { ctx.resume(); }
        return ctx;
    }

    function tone(freq, dur, type, vol, slideTo) {
        var c = ensure();
        if (!c || muted) return;
        var t = c.currentTime;
        var osc = c.createOscillator();
        var g = c.createGain();
        osc.type = type || 'square';
        osc.frequency.setValueAtTime(freq, t);
        if (slideTo) { osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur); }
        g.gain.setValueAtTime(vol || 0.4, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(g); g.connect(c.destination);
        osc.start(t); osc.stop(t + dur + 0.02);
    }

    function play(name) {
        if (muted) return;
        switch (name) {
            case 'jump':    tone(460, 0.10, 'square', 0.35, 700); break;
            case 'orb':     tone(880, 0.12, 'square', 0.35, 1300); break;
            case 'pad':     tone(200, 0.18, 'sawtooth', 0.4, 900); break;
            case 'coin':    tone(1200, 0.10, 'square', 0.3, 1800); break;
            case 'death':   tone(300, 0.45, 'sawtooth', 0.45, 70); break;
            case 'portal':  tone(600, 0.12, 'triangle', 0.4, 1200); break;
            case 'win':     tone(660, 0.15, 'triangle', 0.4, 990); break;
            case 'gravity': tone(500, 0.12, 'triangle', 0.35, 300); break;
        }
    }

    // Minimal looping music: a repeating 8-step bass/arp pattern.
    var steps = [220, 0, 277, 0, 330, 277, 0, 262];
    var idx = 0;

    function musicTick() {
        if (!musicOn || muted) return;
        var c = ensure();
        if (!c) return;
        var f = steps[idx % steps.length];
        if (f) tone(f, 0.18, 'triangle', 0.18);
        idx++;
    }

    function startMusic() {
        musicOn = true;
        ensure();
        if (music) return;
        music = setInterval(musicTick, 260);
    }
    function stopMusic() { musicOn = false; }

    function setMuted(m) {
        muted = m;
        if (ctx) { /* gain master could be set here */ }
    }
    function isMuted() { return muted; }

    return {
        play: play,
        startMusic: startMusic,
        stopMusic: stopMusic,
        setMuted: setMuted,
        isMuted: isMuted
    };
})();
