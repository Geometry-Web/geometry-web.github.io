/* =====================================================================
 * Social.js — the account-backed screens: shared levels, friends, messages,
 * notifications, and the server-backed level sheet.
 *
 * Every screen has the same three states and shows which one it is in:
 *   signed out -> a sign-in prompt, never a fake list
 *   loading    -> a "LOADING" line
 *   loaded     -> rows, or an honest "nothing here yet"
 * ===================================================================== */
var SHARE_PERMISSIONS = [
    { key: "view", label: "VIEW" },
    { key: "play", label: "PLAY" },
    { key: "comment", label: "COMMENT" },
    { key: "copy", label: "COPY" },
    { key: "edit", label: "EDIT" }
];

function sharePermissionText(perms) {
    if (!perms) return "no access";
    var list = [];
    for (var i = 0; i < SHARE_PERMISSIONS.length; i++) {
        if (perms[SHARE_PERMISSIONS[i].key]) list.push(SHARE_PERMISSIONS[i].label);
    }
    return list.length ? list.join(" / ") : "no access";
}

/* Username search goes through the server, so the picker only offers accounts
 * that actually exist. */
function pickPlayer(scene, onPick) {
    GD.UI.textPrompt(scene, {
        title: "FIND A PLAYER",
        placeholder: "username",
        maxLength: 20,
        allowEmpty: false,
        onOk: function (name) {
            GD.Api.get("/users/search?q=" + encodeURIComponent(name)).then(function (response) {
                if (!response.users.length) {
                    GD.UI.alert(scene, "NOT FOUND", "No player matches \"" + name + "\".");
                    return;
                }
                if (response.users.length === 1 ||
                        name.toLowerCase() === response.users[0].username.toLowerCase()) {
                    onPick(response.users[0]);
                    return;
                }
                var list = GD.UI.popup(scene, {
                    title: "CHOOSE A PLAYER",
                    w: 460, h: 300,
                    content: function (content) {
                        var rows = response.users.slice(0, 5);
                        for (var i = 0; i < rows.length; i++) {
                            (function (user, index) {
                                GD.UI.button(content, {
                                    x: 0, y: 70 - index * 46, w: 320, h: 38,
                                    text: user.username, style: "slate",
                                    textScale: GD.UI.TEXT.small,
                                    onClick: function () { list.close(true); onPick(user); }
                                });
                            })(rows[i], i);
                        }
                    },
                    buttons: [{ text: "CANCEL", style: "grey", onClick: function (h) { h.close(); } }]
                });
            }, function (error) {
                GD.UI.alert(scene, "SEARCH FAILED", error.message);
            });
        }
    });
}

/* The share dialog: pick a player, tick permissions, send. The server turns it
 * into a pending invitation; nothing is granted until the invitee accepts. */
function openShareDialog(scene, levelId, levelName, onDone) {
    var chosen = null;
    var perms = { view: true, play: true, comment: false, copy: false, edit: false };
    var status = null;

    return GD.UI.popup(scene, {
        title: "SHARE " + String(levelName || "").toUpperCase(),
        w: 620, h: 400,
        content: function (content) {
            status = GD.label("No player chosen yet.", {
                scale: GD.UI.TEXT.small, color: GD.UI.COLOR.dim
            });
            status.setPosition(0, 118);
            content.addChild(status, 1);

            for (var i = 0; i < SHARE_PERMISSIONS.length; i++) {
                (function (perm, index) {
                    var toggle = GD.UI.toggle(content, {
                        x: -150, y: 72 - index * 40,
                        value: !!perms[perm.key],
                        text: perm.label,
                        textScale: GD.UI.TEXT.small,
                        onChange: function (on) { perms[perm.key] = on; }
                    });
                })(SHARE_PERMISSIONS[i], i);
            }
        },
        buttons: [
            { text: "PICK PLAYER", style: "blue", close: false, onClick: function () {
                pickPlayer(scene, function (user) {
                    chosen = user;
                    if (status) {
                        status.setString("Sharing with " + user.username + " (#" + user.id + ")");
                        status.setColor(GD.UI.COLOR.text);
                    }
                });
            } },
            { text: "SEND", style: "green", close: false, onClick: function (h) {
                if (!chosen) {
                    if (status) {
                        status.setString("Choose a player first.");
                        status.setColor(GD.UI.COLOR.red);
                    }
                    return;
                }
                GD.Account.require(scene, function () {
                    GD.Api.post("/levels/" + levelId + "/shares",
                        { username: chosen.username, permissions: perms }).then(function (response) {
                        GD.UI.toast(scene, response.kind === "invited"
                            ? "Invitation sent to " + chosen.username
                            : "Access updated for " + chosen.username);
                        h.close(true);
                        if (onDone) onDone(response);
                    }, function (error) {
                        if (status) {
                            status.setString(error.message);
                            status.setColor(GD.UI.COLOR.red);
                        }
                    });
                });
            } },
            { text: "CANCEL", style: "grey", onClick: function (h) { h.close(); } }
        ]
    });
}
