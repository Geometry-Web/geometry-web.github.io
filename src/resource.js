/* Resource list for cc.LoaderScene.preload().
   Assets for the Geometry Dash main menu. */

var g_resources = [
    // GD 1.0 menu sprite sheets (social icons, round buttons, play/build/daily).
    { type: "image", src: "res/gd/GJ_GameSheet03.png" },
    { type: "plist", src: "res/gd/GJ_GameSheet03.plist" },
    { type: "image", src: "res/gd/GJ_GameSheet04.png" },
    { type: "plist", src: "res/gd/GJ_GameSheet04.plist" },
    // Player icon sheet (cube / ship / UFO / wave frames for the Icon Kit grid).
    { type: "image", src: "res/gd/GJ_GameSheetIcons.png" },
    { type: "plist", src: "res/gd/GJ_GameSheetIcons.plist" },
    // Main in-game sheet: spikes, blocks and jump rings for the play layer.
    { type: "image", src: "res/gd/GJ_GameSheet.png" },
    { type: "plist", src: "res/gd/GJ_GameSheet.plist" },
    // Portals, jump pads and secret coins — the play layer draws all three.
    { type: "image", src: "res/gd/GJ_GameSheet02.png" },
    { type: "plist", src: "res/gd/GJ_GameSheet02.plist" },
    // Secondary sheets: the gauntlet islands, the shop shelves, the treasure
    // room, the vault doors and the tower. They are ~1.4 MB together and only
    // four screens use them, but they belong in the preload: a screen that is
    // opened later cannot block on a synchronous plist read (see
    // GD.ensureSheets), so the frames have to be registered up front.
    { type: "image", src: "res/gd/GauntletSheet.png" },
    { type: "plist", src: "res/gd/GauntletSheet.plist" },
    { type: "image", src: "res/gd/GJ_ShopSheet.png" },
    { type: "plist", src: "res/gd/GJ_ShopSheet.plist" },
    { type: "image", src: "res/gd/GJ_ShopSheet01.png" },
    { type: "plist", src: "res/gd/GJ_ShopSheet01.plist" },
    { type: "image", src: "res/gd/TreasureRoomSheet.png" },
    { type: "plist", src: "res/gd/TreasureRoomSheet.plist" },
    { type: "image", src: "res/gd/SecretSheet.png" },
    { type: "plist", src: "res/gd/SecretSheet.plist" },
    { type: "image", src: "res/gd/TowerSheet.png" },
    { type: "plist", src: "res/gd/TowerSheet.plist" },
    { type: "image", src: "res/gd/DungeonSheet.png" },
    { type: "plist", src: "res/gd/DungeonSheet.plist" },

    // Font for the "Geometry Dash" logo.
    { type: "image", src: "res/gd/bigFont.png" },
    { src: "res/gd/bigFont.fnt" },
    // Gold (Pusab) font for the Stats counters and the brown stats backdrop.
    { type: "image", src: "res/gd/goldFont.png" },
    { src: "res/gd/goldFont.fnt" },
    { type: "image", src: "res/gd/game_bg_01_001.png" },

    // Loose UI art used by the GD.UI widget kit. These are standalone PNGs, not
    // sheet frames, so GD.frameSprite() resolves them through GD.looseSize().
    // Loading them here keeps the first frame of the first screen complete.
    { type: "image", src: "res/gd/GJ_gradientBG.png" },
    { type: "image", src: "res/gd/GJ_progressBar_001.png" },
    { type: "image", src: "res/gd/loadingCircle.png" },
    { type: "image", src: "res/gd/slidergroove.png" },
    { type: "image", src: "res/gd/sliderBar.png" },
    { type: "image", src: "res/gd/sliderthumb.png" },
    { type: "image", src: "res/gd/sliderthumbsel.png" },
    { type: "image", src: "res/gd/GJ_button_01.png" },
    { type: "image", src: "res/gd/GJ_button_02.png" },
    { type: "image", src: "res/gd/GJ_button_03.png" },
    { type: "image", src: "res/gd/GJ_button_04.png" },
    { type: "image", src: "res/gd/GJ_button_05.png" },
    { type: "image", src: "res/gd/GJ_button_06.png" },
    { type: "image", src: "res/gd/GJ_square01.png" },
    { type: "image", src: "res/gd/GJ_square02.png" },
    { type: "image", src: "res/gd/GJ_square03.png" },
    { type: "image", src: "res/gd/GJ_square04.png" },
    { type: "image", src: "res/gd/GJ_square05.png" },
    { type: "image", src: "res/gd/GJ_square06.png" },
    { type: "image", src: "res/gd/GJ_square07.png" },
    { type: "image", src: "res/gd/GJ_squareB_01.png" },
    { type: "image", src: "res/gd/groundSquare_01_001.png" },
    { type: "image", src: "res/gd/groundSquare_02_001.png" },
    { type: "image", src: "res/gd/groundSquare_03_001.png" },
    { type: "image", src: "res/gd/groundSquare_04_001.png" },
    { type: "image", src: "res/gd/groundSquare_05_001.png" },
    { type: "image", src: "res/gd/groundSquare_06_001.png" }
];

