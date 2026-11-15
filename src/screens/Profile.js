/* =====================================================================
 * Profile.js — the player profile.
 *
 * GD's profile screen is a card: icon and name on the left, the counter columns
 * on the right, the achievement strip under them. This one reads everything
 * from `GD.Save` (profile, stats, levels, achievements), so it can never show a
 * number the game has not actually recorded.
 *
 * `ProfileScene({ player: {...} })` renders a read-only card for a simulated
 * creator (the online browser's "view profile"), with a banner saying so.
 * ===================================================================== */
var PROFILE_LAYOUT = {
    icon:  { x: 250, y: 330, scale: 2.6 },
    name:  { x: 250, y: 428, scale: 0.85 },
    stats: { x: 566, top: 424, pitch: 36 },
    ach:   { x: 480, y: 92, w: 700, h: 72 }
};

/* The player's icon for a mode, tinted with their colour 1. The sheet frame is
 * drawn first and upgraded to the loose SD icon once its atlas decodes. */
function profileIcon(parent, pool, number, x, y, scale) {
    var sprite = GD.sprite(iconFrameName(pool, number) || "player_01_001.png");
    if (!sprite) return null;

    sprite.setScale(scale);
    sprite.setPosition(x, y);
    parent.addChild(sprite, 5);

    /* No tint here: the sheet frame this starts from is the dark body/detail
     * layer, and multiplying it by the player's colour turns it black. The
     * loose icon (swapped in by applyIcon once decoded) already carries its own
     * colour. */
    GD.applyIcon(sprite, pool, number);

    if (GD.Save.profile.glow()) {
        var glow = GD.sprite("player_01_001.png");
        if (glow) {
            glow.setScale(scale * 1.1);
            glow.setPosition(x, y);
            glow.setOpacity(60);
            parent.addChild(glow, 4);
        }
    }
    return sprite;
}

/* One labelled counter row: icon, caption, right-aligned number. */
function profileStat(parent, x, y, frame, label, value) {
    var icon = GD.sprite(frame);
    if (icon) {
        icon.setScale(0.6);
        icon.setPosition(x, y);
        parent.addChild(icon, 6);
    }

    var caption = GD.label(label, { scale: GD.UI.TEXT.tiny, anchor: [0, 0.5],
                                    color: GD.UI.COLOR.dim });
    caption.setPosition(x + 22, y);
    parent.addChild(caption, 6);

    var number = GD.label(GD.fmt(value), { scale: GD.UI.TEXT.small, anchor: [1, 0.5],
                                           color: GD.UI.COLOR.gold });
    number.setPosition(x + 280, y);
    parent.addChild(number, 6);
    return number;
}


function ProfileScene(opts) {
    opts = opts || {};
    var other = opts.player || null;            // simulated creator card
    var displayName = other ? other.name : GD.Save.profile.name();

    return GD.UI.screen({
        title: "PROFILE",
        titleY: 498,
        background: { top: [70, 40, 120], bottom: [18, 10, 36], ground: false },
        back: function () { return new MyScene(); },
        layout: function (layer) {
            var scene = layer.getParent();
            layer.addQuad(96, 452, 768, 280, [0, 0, 0, 80], 2);

            profileIcon(layer, "player", GD.Save.profile.icon("cube"),
                        PROFILE_LAYOUT.icon.x, PROFILE_LAYOUT.icon.y,
                        PROFILE_LAYOUT.icon.scale);

            var nameLabel = GD.label(displayName, { scale: PROFILE_LAYOUT.name.scale });
            nameLabel.setPosition(PROFILE_LAYOUT.name.x, PROFILE_LAYOUT.name.y);
            layer.addChild(nameLabel, 6);

            var S = PROFILE_LAYOUT.stats;
            var stats = GD.Save.stats.all();
            var rows = [
                ["GJ_starsIcon_001.png", "Stars", stats.collectedStars],
                ["GJ_moonsIcon_001.png", "Moons", stats.collectedMoons],
                ["GJ_diamondsIcon_001.png", "Diamonds", GD.Save.wallet().diamonds],
                ["currencyOrbIcon_001.png", "Orbs", GD.Save.wallet().orbs],
                ["GJ_coinsIcon_001.png", "Secret coins", stats.collectedSecretCoins],
                ["GJ_completesIcon_001.png", "Levels completed", stats.completedLevels],
                ["GJ_demonIcon_001.png", "Demons", stats.completedDemonLevels]
            ];
            for (var i = 0; i < rows.length; i++) {
                profileStat(layer, S.x, S.top - i * S.pitch, rows[i][0], rows[i][1], rows[i][2]);
            }

            /* Achievement strip. */
            var strip = GD.UI.nine(GD.UI.PANEL.dark, PROFILE_LAYOUT.ach.w,
                                   PROFILE_LAYOUT.ach.h, GD.UI.PANEL_INSETS);
            strip.setPosition(PROFILE_LAYOUT.ach.x, PROFILE_LAYOUT.ach.y);
            layer.addChild(strip, 4);

            var unlocked = 0;
            for (var a = 0; a < GD.Data.ACHIEVEMENTS.length; a++)
                if (GD.Data.achievementState(GD.Data.ACHIEVEMENTS[a]).unlocked) unlocked++;

            var achLabel = GD.label("ACHIEVEMENTS  " + unlocked + " / " +
                                    GD.Data.ACHIEVEMENTS.length,
                                    { scale: GD.UI.TEXT.small, color: GD.UI.COLOR.gold });
            achLabel.setPosition(PROFILE_LAYOUT.ach.x, PROFILE_LAYOUT.ach.y + 22);
            layer.addChild(achLabel, 6);

            GD.UI.progress(layer, {
                x: PROFILE_LAYOUT.ach.x, y: PROFILE_LAYOUT.ach.y - 4, w: 620, h: 14,
                value: unlocked / GD.Data.ACHIEVEMENTS.length * 100, z: 6
            });

            var hint = GD.label(other ? "Simulated creator profile - not a real player"
                                      : "Rename here, then open the Icon Kit for icons and colours",
                                { scale: GD.UI.TEXT.tiny, color: GD.UI.COLOR.locked });
            hint.setPosition(PROFILE_LAYOUT.ach.x, 40);
            layer.addChild(hint, 6);

            profileActions(layer, scene, nameLabel, other);


        }
    });
}

/* ------------------------------------------------------------ profile actions
 * Two rows of two buttons under the icon, so the counter column on the right
 * stays clear whatever the player's numbers are. */
function profileActions(layer, scene, nameLabel, other) {
    if (!other) {
        GD.UI.button(layer, {
            x: 150, y: 252, w: 190, h: 44, text: "RENAME", style: "cyan",
            textScale: GD.UI.TEXT.small, z: 10,
            onClick: function () {
                GD.UI.textPrompt(scene, {
                    title: "PLAYER NAME", value: GD.Save.profile.name(),
                    maxLength: GD.Save.maxNameLength,
                    onOk: function (text) {
                        GD.Save.profile.setName(text);
                        nameLabel.setString(GD.Save.profile.name());
                    }
                });
            }
        });
    }

    GD.UI.button(layer, {
        x: 360, y: 252, w: 190, h: 44, text: "ICON KIT", style: "green",
        textScale: GD.UI.TEXT.small, z: 10,
        onClick: function () { cc.Director.getInstance().replaceScene(new GarageScene()); }
    });

    GD.UI.button(layer, {
        x: 150, y: 200, w: 190, h: 42, text: "ACHIEVEMENTS", style: "purple",
        textScale: GD.UI.TEXT.tiny, z: 10,
        onClick: function () { openScreen("AchievementsScene", "ACHIEVEMENTS"); }
    });

    GD.UI.button(layer, {
        x: 360, y: 200, w: 190, h: 42, text: "STATS TABLE", style: "grey",
        textScale: GD.UI.TEXT.tiny, z: 10,
        onClick: function () { cc.Director.getInstance().replaceScene(new StatsScene()); }
    });

    GD.UI.button(layer, {
        x: 250, y: 148, w: 400, h: 40, text: "COLOURS & GLOW", style: "cyan",
        textScale: GD.UI.TEXT.small, z: 10,
        onClick: function () { openScreen("ColorScene", "COLOURS"); }
    });
}
