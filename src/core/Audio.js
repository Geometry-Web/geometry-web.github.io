/* =====================================================================
 * Audio.js — music and sound through the engine's cc.AudioEngine.
 *
 * Browsers refuse to start audio before the first user gesture, so nothing is
 * played until a touch happens (`unlock()` is wired to the first canvas press).
 * Volumes always come from the save file, so the Settings sliders and the pause
 * menu stay in sync.
 * ===================================================================== */
GD.Audio = (function () {
    var DIR = "res/gd/audio/";

    /* Sound-effect names used across the UI, mapped to the shipped clips. */
    var SFX = {
        click: "playSound_01.ogg",
        back: "quitSound_01.ogg",
        buy: "buyItem01.ogg",
        buySlot: "buyItem03.ogg",
        achievement: "achievement_01.ogg",
        explode: "explode_11.ogg",
        gold: "gold01.ogg",
        gold2: "gold02.ogg",
        crystal: "crystal01.ogg",
        chestOpen: "chestOpen01.ogg",
        chestClick: "chestClick.ogg",
        chestLand: "chestLand.ogg",
        unlock: "unlockGauntlet.ogg",
        highscore: "highscoreGet02.ogg",
        reward: "reward01.ogg",
        door: "door001.ogg",
        door2: "door01.ogg",
        door3: "door02.ogg",
        key: "secretKey.ogg",
        counter: "counter003.ogg",
        endStart: "endStart_02.ogg",
        magic: "magicExplosion.ogg",
        grunt1: "grunt01.ogg",
        grunt2: "grunt02.ogg",
        grunt3: "grunt03.ogg",
        chest07: "chest07.ogg",
        chest08: "chest08.ogg"
    };

    /* Songs of the official levels, by the name stored in the level metadata. */
    var MUSIC = {
        menu: "StayInsideMe.mp3",
        StereoMadness: "StereoMadness.mp3",
        BackOnTrack: "BackOnTrack.mp3",
        Polargeist: "Polargeist.mp3",
        DryOut: "DryOut.mp3",
        BaseAfterBase: "BaseAfterBase.mp3",
        CantLetGo: "CantLetGo.mp3",
        Jumper: "Jumper.mp3",
        TimeMachine: "TimeMachine.mp3",
        Cycles: "Cycles.mp3",
        xStep: "xStep.mp3",
        Clutterfunk: "Clutterfunk.mp3",
        TheoryOfEverything: "TheoryOfEverything.mp3",
        Electroman: "Electroman.mp3",
        Clubstep: "Clubstep.mp3",
        Electrodynamix: "Electrodynamix.mp3",
        HexagonForce: "HexagonForce.mp3",
        BlastProcessing: "BlastProcessing.mp3",
        TheoryOfEverything2: "TheoryOfEverything2.mp3",
        GeometricalDominator: "GeometricalDominator.mp3",
        Deadlocked: "Deadlocked.mp3",
        Fingerdash: "Fingerdash.mp3",
        Dash: "Dash.mp3",
        PowerTrip: "PowerTrip.mp3",
        shop: "shop.mp3",
        shop4: "shop4.mp3",
        secretShop: "secretShop.mp3",
        secretLoop: "secretLoop.mp3",
        dangerLoop: "dangerLoop.mp3",
        tower01: "tower01.mp3"
    };

    var unlocked = false;
    var currentMusic = null;
    var pendingMusic = null;
    var engine = null;

    function audio() {
        if (engine) return engine;
        try {
            engine = cc.AudioEngine.getInstance();
            // cc.AudioEngine applies the volume at play time; keep them pushed.
            engine.setMusicVolume(GD.Save.settings.get("musicVolume"));
            engine.setEffectsVolume(GD.Save.settings.get("sfxVolume"));
        } catch (e) {
            cc.log("GD.Audio: no audio engine (" + e + ")");
            engine = null;
        }
        return engine;
    }

    return {
        sfxNames: SFX,
        musicNames: MUSIC,
        pathForMusic: function (name) { return DIR + (MUSIC[name] || MUSIC.menu); },

        /* Called on the first touch: browsers only allow audio after a gesture. */
        unlock: function () {
            if (unlocked) return;
            unlocked = true;
            var e = audio();
            if (!e) return;
            if (pendingMusic) {
                var name = pendingMusic;
                pendingMusic = null;
                this.music(name);
            }
        },

        isUnlocked: function () { return unlocked; },

        /* Background music. Repeating the same track is a no-op. */
        music: function (name, opts) {
            opts = opts || {};
            if (!unlocked) { pendingMusic = name; return; }
            if (currentMusic === name && !opts.restart) return;
            var e = audio();
            if (!e) return;
            try {
                if (currentMusic) e.stopMusic();
                e.setMusicVolume(GD.Save.settings.get("musicVolume"));
                e.playMusic(this.pathForMusic(name), opts.loop === false ? false : true);
                currentMusic = name;
            } catch (err) { cc.log("GD.Audio.music(" + name + "): " + err); }
        },

        stopMusic: function () {
            var e = audio();
            if (!e) return;
            try { e.stopMusic(); } catch (err) { /* nothing was playing */ }
            currentMusic = null;
            pendingMusic = null;
        },

        currentMusic: function () { return currentMusic; },

        /* One-shot sound effect by short name (see the SFX table). */
        sfx: function (name) {
            if (!unlocked) return;
            var file = SFX[name];
            if (!file) { cc.log("GD.Audio.sfx: unknown sound " + name); return; }
            var e = audio();
            if (!e) return;
            try { e.playEffect(DIR + file); }
            catch (err) { cc.log("GD.Audio.sfx(" + name + "): " + err); }
        },

        /* Re-applies the saved volumes (Settings and the pause menu call this). */
        applyVolumes: function () {
            var e = audio();
            if (!e) return;
            try {
                e.setMusicVolume(GD.Save.settings.get("musicVolume"));
                e.setEffectsVolume(GD.Save.settings.get("sfxVolume"));
            } catch (err) { /* engine not started yet */ }
        }
    };
})();
