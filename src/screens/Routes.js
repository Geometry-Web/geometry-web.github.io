/* =====================================================================
 * Routes.js — the Create hub's destinations.
 *
 * The hub's fifteen tiles are declared in `CREATE_LAYOUT.buttons` (MyApp.js) by
 * the title of the screen they open; this file is the table that turns those
 * titles into real scenes. Keeping it in one place means the hub never has to
 * know where a screen lives, and a screen that is not built yet (or is out of
 * scope, like the 2.2 platformer world map) answers with an honest "coming
 * soon" panel instead of an empty placeholder.
 * ===================================================================== */
var CREATOR_ROUTES = {
    "CREATE LEVEL":  { screen: "EditorScene" },
    "SAVED LEVELS":  { screen: "OnlineScene", opts: { category: "saved" } },
    "SCORES":        { screen: "LeaderboardScene" },
    "QUESTS":        { screen: "DailyScene", opts: { tab: "quests" } },
    "DAILY LEVEL":   { screen: "DailyScene", opts: { tab: "daily" } },
    "WEEKLY LEVEL":  { screen: "DailyScene", opts: { tab: "weekly" } },
    "EVENT LEVEL":   { screen: "DailyScene", opts: { tab: "event" } },
    "GAUNTLETS":     { screen: "GauntletsScene" },
    "FEATURED":      { screen: "OnlineScene", opts: { category: "featured" } },
    "LISTS":         { screen: "ListsScene" },
    "MAP PACKS":     { screen: "PacksScene" },
    "SEARCH":        { screen: "OnlineScene" },
    "VERSUS":        { screen: "ComingSoonScene", opts: {
        title: "VERSUS MODE",
        note: "Two-player versus needs a real-time server. GitHub Pages is a static host, so this screen is not implemented." } },
    "THE MAP":       { screen: "ComingSoonScene", opts: {
        title: "THE MAP",
        note: "The 2.2 world map runs on the platformer level set (levels 3001 and 5001+). Import it with\nnode tools/level-import.js ../gdstuffs/Resources/levels --out levels --all\nand a platformer physics mode - not implemented yet." } },
    "PATHS":         { screen: "ComingSoonScene", opts: {
        title: "PATHS",
        note: "Shard paths arrived with 2.2's platformer content and are not part of this build." } }
};

function openCreatorCategory(title) {
    var route = CREATOR_ROUTES[title];
    if (!route) {
        openScreen("ComingSoonScene", title);
        return;
    }
    var factory = window[route.screen];
    if (typeof factory !== "function") {
        GD.Nav.go(makePlaceholderScene(title));
        return;
    }
    GD.Nav.go(factory(route.opts || {}));
}

/* The honest dead end: a title, an explanation of what is missing and why, and
 * a way back. Used for the handful of systems that need infrastructure this
 * build does not have. */
function ComingSoonScene(opts) {
    opts = opts || {};
    return GD.UI.screen({
        title: opts.title || "NOT AVAILABLE",
        titleY: 420,
        background: { top: [40, 44, 60], bottom: [12, 14, 22], ground: false },
        back: function () { return new CreatorScene(); },
        layout: function (layer) {
            var scene = layer.getParent();
            layer.addQuad(140, 360, 680, 150, [0, 0, 0, 90], 2);

            var note = GD.label(opts.note || "Not implemented in this build.", {
                scale: GD.UI.TEXT.small, width: 600, align: cc.TEXT_ALIGNMENT_CENTER,
                color: GD.UI.COLOR.dim
            });
            note.setPosition(GD.W / 2, 286);
            layer.addChild(note, 6);

            GD.UI.button(layer, {
                x: GD.W / 2, y: 180, w: 220, h: 50, text: "BACK", style: "green",
                z: 30,
                onClick: function () { GD.Nav.back(new CreatorScene()); }
            });
        }
    });
}
