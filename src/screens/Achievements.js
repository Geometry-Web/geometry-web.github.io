/* =====================================================================
 * Achievements.js — the achievement list.
 *
 * One row per entry in `GD.Data.ACHIEVEMENTS`, painted from the counters the
 * play layer writes (`GD.Save.stats`), so progress here is always the real
 * value. Entering the screen also runs the unlock check, which is what pays out
 * an achievement the player has just met the goal of, and toasts it.
 *
 * Row anatomy (960x540, centres): icon, name over description, progress bar,
 * and the "UNLOCKED" / "x / y" state on the right.
 * ===================================================================== */
var ACH_LAYOUT = {
    list: { x: 480, top: 420, count: 6, pitch: 60, height: 54 },
    row:  { width: 744, height: 52, iconX: -342, nameX: -300, barX: 120,
            stateX: 348, barWidth: 170, barHeight: 12 },
    arrows: { up: { x: 900, y: 360, scale: 1.05 }, down: { x: 900, y: 128, scale: 1.05 } }
};

function achievementRow(row) {
    var R = ACH_LAYOUT.row;

    row.addChild(GD.UI.nine(GD.UI.PANEL.dark, R.width, R.height, GD.UI.PANEL_INSETS), 0);

    row.icon = GD.sprite("GJ_achImage_001.png");
    row.icon.setScale(0.62);
    row.icon.setPosition(R.iconX, 0);
    row.addChild(row.icon, 1);

    row.name = GD.label("", { scale: GD.UI.TEXT.small, anchor: [0, 0.5] });
    row.name.setPosition(R.nameX, 9);
    row.addChild(row.name, 1);

    row.desc = GD.label("", { scale: GD.UI.TEXT.tiny, anchor: [0, 0.5],
                              color: GD.UI.COLOR.dim });
    row.desc.setPosition(R.nameX, -12);
    row.addChild(row.desc, 1);

    row.bar = GD.UI.progress(row, { x: R.barX, y: 0, w: R.barWidth, h: R.barHeight, value: 0, z: 2 });

    row.state = GD.label("", { scale: GD.UI.TEXT.small, anchor: [1, 0.5],
                               color: GD.UI.COLOR.gold });
    row.state.setPosition(R.stateX, 0);
    row.addChild(row.state, 1);
}

function fillAchievementRow(row, ach) {
    var state = GD.Data.achievementState(ach);
    row.name.setString(ach.name);
    row.desc.setString(ach.desc);
    row.bar.setValue(state.percent);
    if (state.unlocked) {
        row.state.setString("UNLOCKED");
        row.state.setColor(GD.UI.COLOR.green);
    } else {
        row.state.setString(Math.min(state.value, state.target) + " / " + state.target);
        row.state.setColor(GD.UI.COLOR.dim);
    }
    row.icon.setColor(state.unlocked ? cc.c3b(255, 255, 255) : cc.c3b(130, 130, 130));
}

function AchievementsScene() {
    return GD.UI.screen({
        title: "ACHIEVEMENTS",
        titleY: 498,
        background: { top: [120, 70, 20], bottom: [40, 22, 8], ground: false },
        layout: function (layer) {
            var scene = layer.getParent();

            // Unlocks that are already due are paid on entry.
            var unlocked = GD.Data.checkAchievements(scene);

            var total = GD.Data.ACHIEVEMENTS.length;
            var done = 0;
            for (var i = 0; i < total; i++)
                if (GD.Data.achievementState(GD.Data.ACHIEVEMENTS[i]).unlocked) done++;

            var summary = GD.label("UNLOCKED " + done + " / " + total,
                                   { scale: GD.UI.TEXT.body, color: GD.UI.COLOR.gold });
            summary.setPosition(GD.W / 2, 458);
            layer.addChild(summary, 30);

            var list = GD.UI.list(layer, {
                x: ACH_LAYOUT.list.x, top: ACH_LAYOUT.list.top,
                count: ACH_LAYOUT.list.count, pitch: ACH_LAYOUT.list.pitch,
                height: ACH_LAYOUT.list.height,
                items: GD.Data.ACHIEVEMENTS,
                build: achievementRow,
                fill: fillAchievementRow,
                onSelect: function (ach) {
                    var state = GD.Data.achievementState(ach);
                    GD.UI.alert(scene, ach.name, ach.desc + "\n\n" +
                        (state.unlocked ? "Unlocked."
                                        : Math.min(state.value, state.target) + " of " + state.target));
                },
                z: 6
            });

            GD.UI.listArrows(layer, list, ACH_LAYOUT.arrows, 30);

            if (unlocked.length) {
                GD.UI.toast(scene, "Achievement: " + unlocked[unlocked.length - 1].name);
            }
        }
    });
}
