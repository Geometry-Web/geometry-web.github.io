/* =====================================================================
 * Vaults.js — the Vault, the Vault of Secrets, the Chamber of Time and the
 * treasure room.
 *
 * Codes are typed into the kit's text prompt and checked against
 * `GD.Data.VAULTS` (see the honesty note in src/data/Unlocks.js: they are this
 * build's codes, not claims about RobTop's). A redeemed code pays its reward
 * once and is then listed as used.
 * ===================================================================== */
var VAULT_LAYOUT = {
    art:   { x: 480, y: 150 },
    codes: { x: 480, top: 360, pitch: 26 },
    enter: { x: 480, y: 104, w: 280, h: 46 }
};

function VaultScene(opts) {
    opts = opts || {};
    var vaultId = opts.vault || "vault";
    var vault = GD.Data.vault(vaultId);

    return GD.UI.screen({
        title: vault.name,
        titleY: 496,
        sheets: ["secret", "tower", "dungeon"],
        background: vault.background,
        layout: function (layer) {
            var scene = layer.getParent();
            var body = cc.Node.create();
            layer.addChild(body, 6);

            function paint() {
                body.removeAllChildren(true);

                // The room's own art, dimmed behind the panels.
                var art = GD.sprite(vault.art);
                if (art) {
                    var size = art.getContentSize();
                    art.setScale(size.width ? Math.min(300 / size.width, 190 / size.height) : 1);
                    art.setPosition(VAULT_LAYOUT.art.x, VAULT_LAYOUT.art.y);
                    if (art.setOpacity) art.setOpacity(150);
                    body.addChild(art, 1);
                }

                var note = GD.label(vault.note, { scale: GD.UI.TEXT.small,
                                                  color: GD.UI.COLOR.dim, width: 560,
                                                  align: cc.TEXT_ALIGNMENT_CENTER });
                note.setPosition(GD.W / 2, 412);
                body.addChild(note, 2);

                // The code list: used codes show their text, unused ones do not.
                for (var i = 0; i < vault.codes.length; i++) {
                    var entry = vault.codes[i];
                    var used = GD.Save.isUnlocked("vault:" + vault.id + ":" + entry.code);
                    var row = GD.label((used ? "- " + entry.code : "? ??????") + "   " + entry.text,
                                       { scale: GD.UI.TEXT.tiny,
                                         color: used ? GD.UI.COLOR.green : GD.UI.COLOR.locked });
                    row.setPosition(VAULT_LAYOUT.codes.x,
                                    VAULT_LAYOUT.codes.top - i * VAULT_LAYOUT.codes.pitch);
                    body.addChild(row, 2);
                }

                GD.UI.button(body, {
                    x: VAULT_LAYOUT.enter.x, y: VAULT_LAYOUT.enter.y,
                    w: VAULT_LAYOUT.enter.w, h: VAULT_LAYOUT.enter.h,
                    text: "ENTER CODE", style: "green", z: 4,
                    onClick: function () {
                        GD.UI.textPrompt(scene, {
                            title: "VAULT CODE", placeholder: "type a code", maxLength: 20,
                            onOk: function (text) {
                                var result = GD.Data.redeemCode(vault, text);
                                if (result.ok) GD.Audio.sfx("unlock");
                                GD.UI.alert(scene, result.ok ? "UNLOCKED" : "NO LUCK", result.text);
                                paint();
                            }
                        });
                    }
                });

                // The other rooms.
                var others = [];
                for (var v = 0; v < GD.Data.VAULTS.length; v++)
                    if (GD.Data.VAULTS[v].id !== vault.id) others.push(GD.Data.VAULTS[v]);

                for (var o = 0; o < others.length; o++) {
                    (function (other, index) {
                        GD.UI.button(body, {
                            x: 220 + index * 260, y: 40, w: 240, h: 40,
                            text: other.name, style: "grey",
                            textScale: GD.UI.TEXT.tiny, z: 4,
                            onClick: function () { GD.Nav.go(VaultScene({ vault: other.id })); }
                        });
                    })(others[o], o);
                }
            }

            paint();
        }
    });
}


/* ------------------------------------------------------------- treasure room
 * Chests cost keys and pay diamonds back. The daily chest has its own button in
 * the quests tab; these run through the same `GD.Data.payReward` path so the
 * wallet stays the single source of truth. */
var TREASURE_CHESTS = [
    { id: "t1", frame: "chest_01_02_001.png", keys: 1, diamonds: 10 },
    { id: "t2", frame: "chest_02_02_001.png", keys: 2, diamonds: 25 },
    { id: "t3", frame: "chest_03_02_001.png", keys: 3, diamonds: 45 },
    { id: "t4", frame: "chest_04_02_001.png", keys: 5, diamonds: 80 },
    { id: "t5", frame: "chest_05_02_001.png", keys: 8, diamonds: 140 }
];

function TreasureScene() {
    return GD.UI.screen({
        title: "TREASURE ROOM",
        titleY: 496,
        background: { top: [80, 50, 26], bottom: [24, 12, 6], ground: false },
        sheets: ["treasure", "shop"],
        back: function () { return new CreatorScene(); },
        layout: function (layer) {
            var scene = layer.getParent();

            var floor = GD.sprite("treasureRoomGround_001.png");
            if (floor) {
                var fs = floor.getContentSize();
                floor.setScale(fs.width ? Math.min(900 / fs.width, 160 / fs.height) : 1);
                floor.setPosition(GD.W / 2, 120);
                layer.addChild(floor, 2);
            }

            var title = GD.sprite("treasureRoomLabel_001.png");
            if (title) {
                var ls = title.getContentSize();
                title.setScale(ls.width ? Math.min(300 / ls.width, 90 / ls.height) : 1);
                title.setPosition(GD.W / 2, 430);
                layer.addChild(title, 3);
            }

            var keys = GD.label("KEYS: " + GD.Save.wallet().keys,
                                { scale: GD.UI.TEXT.small, color: GD.UI.COLOR.gold });
            keys.setPosition(GD.W / 2, 392);
            layer.addChild(keys, 30);

            for (var i = 0; i < TREASURE_CHESTS.length; i++) {
                (function (chest, index) {
                    var x = 190 + index * 145;
                    var art = GD.sprite(chest.frame);
                    var size = art.getContentSize();
                    art.setScale(size.width ? Math.min(110 / size.width, 90 / size.height) : 1);
                    art.setPosition(x, 250);
                    layer.addChild(art, 5);

                    var price = GD.label(chest.keys + " keys",
                                         { scale: GD.UI.TEXT.tiny, color: GD.UI.COLOR.gold });
                    price.setPosition(x, 190);
                    layer.addChild(price, 6);

                    GD.UI.button(layer, {
                        x: x, y: 158, w: 120, h: 40, text: "OPEN", style: "green",
                        textScale: GD.UI.TEXT.tiny, z: 8,
                        onClick: function () {
                            if (GD.Save.wallet().keys < chest.keys) {
                                GD.UI.alert(scene, "NO KEYS",
                                    "You need " + chest.keys + " keys for this chest.");
                                return;
                            }
                            GD.Data.spend(chest.keys, "keys");
                            GD.Data.payReward({ diamonds: chest.diamonds });
                            GD.Audio.sfx("chestOpen");
                            GD.UI.alert(scene, "YOU FOUND", "+" + chest.diamonds + " diamonds");
                            GD.Nav.go(TreasureScene());
                        }
                    });
                })(TREASURE_CHESTS[i], i);
            }

            var note = GD.label("Keys come from quests, the daily chest and the diamond shop",
                                { scale: GD.UI.TEXT.tiny, color: GD.UI.COLOR.locked });
            note.setPosition(GD.W / 2, 44);
            layer.addChild(note, 30);
        }
    });
}
