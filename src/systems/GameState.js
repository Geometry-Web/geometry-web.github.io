/**
 * Geometry Web — game state and lightweight progress persistence (original).
 */
window.GD = window.GD || {};

GD.GameState = (function () {
    function create() {
        return {
            level: null, levelIndex: 0,
            attempts: 0, coins: 0, totalCoins: 0,
            running: false, finished: false, dead: false,
            percent: 0
        };
    }

    function loadProgress() {
        try {
            return JSON.parse(localStorage.getItem(GD.C.saveKeyProgress)) || {};
        } catch (e) { return {}; }
    }

    function saveProgress(progress) {
        try { localStorage.setItem(GD.C.saveKeyProgress, JSON.stringify(progress)); }
        catch (e) { /* storage unavailable */ }
    }

    return { create: create, loadProgress: loadProgress, saveProgress: saveProgress };
})();
