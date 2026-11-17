/* =====================================================================
 * Account.js (screen) — the account hub.
 *
 * This is the one place that talks about identity, so the rest of the UI can
 * stay a game: sign in, see the server-side profile, manage sessions, change
 * the password, or delete the account. When no API is configured the screen
 * says exactly that instead of pretending a login failed.
 * ===================================================================== */
function AccountScene() {
    return GD.UI.screen({
        title: "ACCOUNT",
        subtitle: "SIGN IN TO UPLOAD, SHARE AND KEEP YOUR PROFILE",
        layout: function (layer) {
            var scene = layer.getParent();
            var state = GD.Account.state;

            function rebuild() { GD.Nav.go(AccountScene(), { force: true }); }

            function line(text, y, color, scale) {
                var label = GD.label(text, {
                    scale: scale || GD.UI.TEXT.small,
                    color: color || GD.UI.COLOR.dim
                });
                label.setPosition(GD.W / 2, y);
                layer.addChild(label, 20);
                return label;
            }

            function pill(text, x, y, w, style, onClick) {
                return GD.UI.button(layer, {
                    x: x, y: y, w: w, h: 44, text: text, style: style,
                    textScale: GD.UI.TEXT.small, z: 20, onClick: onClick
                });
            }

            if (!GD.Api.enabled) {
                GD.UI.panel(layer, {
                    x: GD.W / 2, y: 300, w: 640, h: 220, style: "brown", title: "OFFLINE"
                });
                line("No account server is configured for this build.", 340,
                     GD.UI.COLOR.text, GD.UI.TEXT.body);
                line("Everything that does not need an account still works.", 312);
                line("To connect one, open the game with  ?api=https://your-api-host", 284);
                line("and start the server in /server (see server/README.md).", 260);
                pill("LOCAL PROFILE", GD.W / 2, 200, 260, "blue", function () {
                    GD.Nav.go(ProfileScene());
                });
                return;
            }

            if (!state.user) {
                var message = state.online === false
                    ? "The account server cannot be reached right now."
                    : "You are playing as a guest. A local save is still kept on this device.";
                line(message, 396, state.online === false ? GD.UI.COLOR.red : GD.UI.COLOR.dim);
                line("Signing in links your stars, levels and shared levels to your name.", 368);

                pill("LOG IN", GD.W / 2 - 150, 300, 260, "green", function () {
                    GD.Account.openAuth(scene, "login", function () { rebuild(); });
                });
                pill("CREATE ACCOUNT", GD.W / 2 + 150, 300, 260, "blue", function () {
                    GD.Account.openAuth(scene, "register", function () { rebuild(); });
                });
                line("Guest progress stays on this device; account progress follows you.", 236,
                     GD.UI.COLOR.locked);
                return;
            }

            var user = state.user;
            var stats = user.stats || {};
            var wallet = user.wallet || {};

            GD.UI.panel(layer, {
                x: GD.W / 2, y: 372, w: 760, h: 156, style: "blue", title: "SIGNED IN"
            });
            line(user.username, 404, GD.UI.COLOR.gold, GD.UI.TEXT.big);
            line("Player #" + user.id + "  -  joined " + String(user.createdAt || "").slice(0, 10)
                 + "  -  " + (user.role === "player" ? "player" : user.role), 374);
            line("STARS " + (wallet.stars || 0) + "    DIAMONDS " + (wallet.diamonds || 0)
                 + "    DEMONS " + (stats.demons || 0) + "    LEVELS "
                 + (user.levelCounts ? user.levelCounts.total : 0), 340, GD.UI.COLOR.text);
            line("FRIENDS " + (stats.friends || 0) + "    ACHIEVEMENTS "
                 + (stats.achievements || 0), 316);

            pill("SHARED", 250, 236, 200, "purple", function () { GD.Nav.go(SharedScene()); });
            pill("FRIENDS", 470, 236, 200, "purple", function () { GD.Nav.go(FriendsScene()); });
            pill("MESSAGES", 690, 236, 200, "purple", function () { GD.Nav.go(MessagesScene()); });
            pill("NOTIFICATIONS", 897, 236, 220, "grey", function () { GD.Nav.go(NotificationsScene()); });

            pill("MY PROFILE", 250, 172, 200, "blue", function () { GD.Nav.go(ProfileScene()); });
            pill("PASSWORD", 470, 172, 200, "grey", function () {
                GD.UI.form(scene, {
                    title: "CHANGE PASSWORD",
                    okText: "SAVE",
                    fields: [
                        { key: "current", label: "CURRENT PASSWORD", password: true, maxLength: 72 },
                        { key: "next", label: "NEW PASSWORD", password: true, maxLength: 72 },
                        { key: "confirm", label: "REPEAT NEW PASSWORD", password: true, maxLength: 72 }
                    ],
                    onSubmit: function (values, form) {
                        if (values.next !== values.confirm) {
                            form.setError("The two new passwords do not match.");
                            return true;
                        }
                        return GD.Account.changePassword(values.current, values.next).then(function () {
                            GD.UI.toast(scene, "Password changed");
                            return false;
                        }, function (error) {
                            form.setError(error.message);
                            return true;
                        });
                    }
                });
            });
            pill("LOG OUT", 690, 172, 200, "grey", function () {
                GD.Account.logout().then(rebuild);
            });
            pill("LOG OUT ELSEWHERE", 897, 172, 220, "red", function () {
                GD.Account.logoutOthers().then(function () {
                    GD.UI.toast(scene, "Other sessions ended");
                });
            });

            pill("DELETE ACCOUNT", GD.W / 2, 100, 260, "red", function () {
                GD.UI.form(scene, {
                    title: "DELETE ACCOUNT",
                    okText: "DELETE",
                    okStyle: "red",
                    message: "This removes your profile, uploads and access.",
                    fields: [{ key: "password", label: "PASSWORD", password: true, maxLength: 72 }],
                    onSubmit: function (values, form) {
                        return GD.Account.deleteAccount(values.password).then(function () {
                            GD.UI.toast(scene, "Account deleted");
                            rebuild();
                            return false;
                        }, function (error) {
                            form.setError(error.message);
                            return true;
                        });
                    }
                });
            });
        }
    });
}

