/* =====================================================================
 * Account.js — the signed-in identity, shared by every screen.
 *
 * The server owns the session (HttpOnly cookie); this module only caches the
 * public user object so a screen can draw a name without a request. Nothing
 * secret is stored in localStorage: a reload re-reads /auth/me.
 *
 * Two modes, always explicit:
 *   offline  - no API is configured, or it cannot be reached. Local play works,
 *              and every account button explains why it cannot sign in.
 *   online   - the account server answered. Guest means "not signed in yet".
 * ===================================================================== */
GD.Account = (function () {
    var state = {
        user: null,
        ready: false,
        loading: false,
        online: GD.Api.enabled ? null : false,
        error: null
    };
    var listeners = [];

    function emit() {
        for (var i = 0; i < listeners.length; i++) {
            try { listeners[i](state.user, state); } catch (e) { /* keep the UI alive */ }
        }
    }

    /* Applies the server profile to the local save file, which is what makes a
     * profile follow the player from one device to another. */
    function applyToSave(user) {
        if (!user || !user.profile) return;
        var save = GD.Save.data().profile;
        GD.Save.set("profile.name", user.username);
        GD.Save.set("profile.registered", true);
        GD.Save.set("profile.accountID", user.id);
        GD.Save.set("profile.userID", user.id);
        var icon = user.profile.icon || {};
        for (var key in icon) {
            if (icon.hasOwnProperty(key) && save[key] !== undefined) {
                GD.Save.set("profile." + key, icon[key]);
            }
        }
        if (user.profile.color1) {
            GD.Save.set("profile.color1", user.profile.color1.split(",").map(Number));
        }
        if (user.profile.color2) {
            GD.Save.set("profile.color2", user.profile.color2.split(",").map(Number));
        }
    }

    function adopt(response) {
        state.user = response && response.user ? response.user : null;
        state.error = null;
        state.online = true;
        if (state.user) applyToSave(state.user);
        emit();
        return state.user;
    }

    var API = {
        state: state,
        onChange: function (listener) { listeners.push(listener); },
        isGuest: function () { return !state.user; },
        canSignIn: function () { return GD.Api.enabled; },
        displayName: function () { return state.user ? state.user.username : "Guest"; },

        /* Called once at boot; resolves with the user or null. */
        init: function () {
            if (!GD.Api.enabled) {
                state.ready = true;
                state.online = false;
                state.error = { code: "not_configured", message: "Online play is not configured." };
                emit();
                return Promise.resolve(null);
            }
            state.loading = true;
            return GD.Api.get("/auth/me").then(function (response) {
                state.ready = true;
                state.loading = false;
                return adopt(response);
            }, function (error) {
                state.ready = true;
                state.loading = false;
                state.online = error.code === "network" ? false : true;
                state.error = error;
                emit();
                return null;
            });
        },

        refresh: function () {
            if (!GD.Api.enabled) return Promise.resolve(null);
            return GD.Api.get("/auth/me").then(adopt, function (error) {
                if (error.code === "network") state.online = false;
                throw error;
            });
        },

        register: function (username, password, email) {
            return GD.Api.post("/auth/register",
                { username: username, password: password, email: email || null }).then(adopt);
        },

        login: function (username, password) {
            return GD.Api.post("/auth/login", { username: username, password: password }).then(adopt);
        },

        logout: function () {
            return GD.Api.post("/auth/logout").then(function () {
                state.user = null;
                GD.Save.set("profile.registered", false);
                emit();
            });
        },

        logoutOthers: function () {
            return GD.Api.post("/auth/logout-others");
        },

        changePassword: function (currentPassword, newPassword) {
            return GD.Api.post("/auth/password",
                { currentPassword: currentPassword, newPassword: newPassword });
        },

        deleteAccount: function (password) {
            return GD.Api.del("/auth/account", { password: password }).then(function (result) {
                state.user = null;
                GD.Save.set("profile.registered", false);
                emit();
                return result;
            });
        },

        updateProfile: function (patch) {
            return GD.Api.patch("/users/me", patch).then(function (response) {
                state.user = response.user;
                emit();
                return response.user;
            });
        },

        /* Sends the icon and colour choices the Icon Kit wrote to the save file. */
        pushProfile: function () {
            if (!state.user) return Promise.resolve(null);
            var profile = GD.Save.data().profile;
            return API.updateProfile({
                username: profile.name,
                color1: profile.color1.join(","),
                color2: profile.color2.join(","),
                glow: !!profile.glow,
                icon: {
                    cube: profile.cube, ship: profile.ship, ball: profile.ball, ufo: profile.ufo,
                    wave: profile.wave, robot: profile.robot, spider: profile.spider,
                    swing: profile.swing
                }
            }).catch(function () { return null; });
        },

        /* Reports local play progress so server stats and the star ledger stay in
         * step with the save file. */
        reportProgress: function (patch) {
            if (!state.user) return Promise.resolve(null);
            return GD.Api.post("/users/me/progress", patch).then(function (response) {
                state.user = response.user;
                emit();
                return response.user;
            }, function () { return null; });
        },


        /* Opens the sign-in dialog; `onDone` runs once the player is signed in.
         * `mode` is "login" or "register". */
        openAuth: function (scene, mode, onDone) {
            if (!GD.Api.enabled) {
                GD.UI.alert(scene, "ONLINE OFFLINE",
                    "This build has no account server configured, so you are playing as a guest.");
                return null;
            }
            var registering = mode === "register";
            var fields = [
                { key: "username", label: "USERNAME", maxLength: 20, placeholder: "3-20 letters" },
                { key: "password", label: "PASSWORD", password: true, maxLength: 72,
                  placeholder: "at least 8 characters" }
            ];
            if (registering) {
                fields.push({ key: "confirm", label: "CONFIRM PASSWORD", password: true, maxLength: 72 });
                fields.push({ key: "email", label: "EMAIL (OPTIONAL)", maxLength: 120 });
            }

            return GD.UI.form(scene, {
                title: registering ? "CREATE ACCOUNT" : "LOG IN",
                okText: registering ? "REGISTER" : "LOG IN",
                fields: fields,
                onSubmit: function (values, form) {
                    if (registering && values.password !== values.confirm) {
                        form.setError("The two passwords do not match.");
                        return true;
                    }
                    var action = registering
                        ? API.register(values.username, values.password, values.email)
                        : API.login(values.username, values.password);
                    return action.then(function (user) {
                        GD.Audio.sfx("button");
                        GD.UI.toast(scene, "Signed in as " + user.username);
                        if (onDone) onDone(user);
                        return false;
                    }, function (error) {
                        form.setError(error.message || "Could not sign in.");
                        return true;
                    });
                }
            });
        },

        /* Every account-dependent action funnels through this: a guest gets the
         * sign-in dialog, a signed-in player continues immediately. */
        require: function (scene, onReady) {
            if (state.user) { onReady(state.user); return true; }
            API.openAuth(scene, "login", function (user) { if (onReady) onReady(user); });
            return false;
        }
    };

    return API;
})();

/* Load the session as soon as this file runs; screens read the cached state. */
if (GD.Api.enabled) GD.Account.init();

