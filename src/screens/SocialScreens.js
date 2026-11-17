/* =====================================================================
 * SocialScreens.js — shared levels, friends, messages and notifications.
 * All four use socialList() from Social.js; they only say which endpoint feeds
 * the list, what a row says, and what a tap does.
 * ===================================================================== */
function SharedScene(opts) {
    opts = opts || {};
    var tab = opts.tab || "withMe";
    return GD.UI.screen({
        title: "SHARED LEVELS",
        subtitle: "SHARED WITH YOU, SHARED BY YOU, AND PENDING INVITES",
        layout: function (layer) {
            var scene = layer.getParent();
            if (!GD.Account.state.user) {
                GD.Account.openAuth(scene, "login", function () {
                    GD.Nav.go(SharedScene({ tab: tab }), { force: true });
                });
                var hint = GD.label("Sign in to manage level sharing.", {
                    scale: GD.UI.TEXT.body, color: GD.UI.COLOR.dim
                });
                hint.setPosition(GD.W / 2, 300);
                layer.addChild(hint, 20);
                return;
            }

            var tabs = [{ id: "withMe", text: "WITH ME" }, { id: "byMe", text: "BY ME" },
                        { id: "invites", text: "INVITES" }];
            for (var i = 0; i < tabs.length; i++) {
                (function (def, index) {
                    GD.UI.button(layer, {
                        x: 330 + index * 170, y: 452, w: 158, h: 34, text: def.text,
                        style: tab === def.id ? "green" : "slate",
                        textScale: GD.UI.TEXT.tiny, z: 21,
                        onClick: function () {
                            if (tab !== def.id) GD.Nav.go(SharedScene({ tab: def.id }), { force: true });
                        }
                    });
                })(tabs[i], i);
            }

            function reload() { GD.Nav.go(SharedScene({ tab: tab }), { force: true }); }

            socialList(layer, {
                endpoint: function (done, fail) {
                    var path = tab === "withMe" ? "/shares/shared-with-me"
                        : tab === "byMe" ? "/shares/shared-by-me"
                        : "/shares/invitations?status=pending";
                    GD.Api.get(path).then(function (response) {
                        if (tab === "invites") {
                            done(response.invitations.map(function (invite) {
                                return {
                                    id: invite.id, title: invite.level.name, from: invite.from.username,
                                    permissions: invite.permissions,
                                    subtitle: "from " + invite.from.username + " - " +
                                        sharePermissionText(invite.permissions)
                                };
                            }));
                            return;
                        }
                        done(response.levels.map(function (level) {
                            return tab === "withMe"
                                ? { id: level.id, title: level.name, owner: level.owner,
                                    permissions: level.permissions,
                                    subtitle: "by " + level.owner + " - " +
                                        sharePermissionText(level.permissions) }
                                : { id: level.id, title: level.name,
                                    subtitle: level.grants.length + " with access - " + level.visibility };
                        }));
                    }, fail);
                },
                empty: tab === "withMe" ? "No levels shared with you yet."
                     : tab === "byMe" ? "You have not shared a level yet."
                     : "No pending invitations.",
                onSelect: function (item) {
                    if (tab === "invites") {
                        GD.UI.confirm(scene, {
                            title: "INVITATION",
                            message: item.from + " invited you to \"" + item.title + "\" (" +
                                sharePermissionText(item.permissions) + ").",
                            okText: "ACCEPT", cancelText: "DECLINE",
                            onOk: function () {
                                GD.Api.post("/shares/invitations/" + item.id + "/accept").then(function () {
                                    GD.UI.toast(scene, "Accepted");
                                    reload();
                                }, function (err) { GD.UI.alert(scene, "ERROR", err.message); });
                            },
                            onCancel: function () {
                                GD.Api.post("/shares/invitations/" + item.id + "/decline")
                                    .then(reload, function () {});
                            }
                        });
                    } else if (tab === "withMe") {
                        GD.UI.confirm(scene, {
                            title: item.title,
                            message: "Shared by " + item.owner + "\n" +
                                sharePermissionText(item.permissions) + "\n\nPlay it now?",
                            okText: "PLAY", cancelText: "LATER",
                            onOk: function () { GD.OnlineServer.play(item, scene); }
                        });
                    } else {
                        openShareDialog(scene, item.id, item.title, reload);
                    }
                }
            });
        }
    });
}

function FriendsScene(opts) {
    opts = opts || {};
    var mode = opts.mode || "friends";
    return GD.UI.screen({
        title: "FRIENDS",
        subtitle: "FRIENDS, REQUESTS AND BLOCKED PLAYERS",
        layout: function (layer) {
            var scene = layer.getParent();
            if (!GD.Account.state.user) {
                GD.Account.openAuth(scene, "login", function () {
                    GD.Nav.go(FriendsScene(), { force: true });
                });
                return;
            }

            socialList(layer, {
                endpoint: function (done, fail) {
                    if (mode === "friends") {
                        GD.Api.get("/friends").then(function (response) {
                            done(response.friends.map(function (user) {
                                return { id: user.id, username: user.username, title: user.username,
                                         subtitle: "player #" + user.id + " - tap to message" };
                            }));
                        }, fail);
                    } else if (mode === "requests") {
                        GD.Api.get("/friends/requests?direction=incoming").then(function (response) {
                            done(response.requests.map(function (request) {
                                return { id: request.id, title: request.user.username,
                                         subtitle: "wants to be friends - tap to accept" };
                            }));
                        }, fail);
                    } else {
                        GD.Api.get("/blocks").then(function (response) {
                            done(response.blocked.map(function (user) {
                                return { id: user.id, title: user.username,
                                         subtitle: "blocked - tap to unblock" };
                            }));
                        }, fail);
                    }
                },
                empty: mode === "friends" ? "No friends yet. Add one with ADD FRIEND."
                     : mode === "requests" ? "No pending requests." : "Nobody is blocked.",
                onSelect: function (item) {
                    if (mode === "requests") {
                        GD.Api.post("/friends/requests/" + item.id + "/accept").then(function () {
                            GD.UI.toast(scene, "You and " + item.title + " are friends");
                            GD.Nav.go(FriendsScene({ mode: mode }), { force: true });
                        }, function (err) { GD.UI.alert(scene, "ERROR", err.message); });
                    } else if (mode === "blocked") {
                        GD.Api.del("/blocks/" + item.id).then(function () {
                            GD.Nav.go(FriendsScene({ mode: mode }), { force: true });
                        }, function () {});
                    } else {
                        GD.Api.post("/conversations", { username: item.username })
                            .then(function (response) {
                                GD.Nav.go(MessagesScene({
                                    conversationId: response.conversation.id,
                                    with: item.username
                                }), { force: true });
                            }, function (err) { GD.UI.alert(scene, "ERROR", err.message); });
                    }
                }
            });

            var defs = [{ id: "friends", text: "FRIENDS" }, { id: "requests", text: "REQUESTS" },
                        { id: "blocked", text: "BLOCKED" }];
            for (var i = 0; i < defs.length; i++) {
                (function (def, index) {
                    GD.UI.button(layer, {
                        x: 300 + index * 170, y: 452, w: 158, h: 34, text: def.text,
                        style: mode === def.id ? "green" : "slate",
                        textScale: GD.UI.TEXT.tiny, z: 21,
                        onClick: function () {
                            if (mode !== def.id) {
                                GD.Nav.go(FriendsScene({ mode: def.id }), { force: true });
                            }
                        }
                    });
                })(defs[i], i);
            }

            GD.UI.button(layer, {
                x: 800, y: 452, w: 170, h: 34, text: "ADD FRIEND", style: "green",
                textScale: GD.UI.TEXT.tiny, z: 21,
                onClick: function () {
                    pickPlayer(scene, function (user) {
                        GD.Api.post("/friends/requests", { username: user.username }).then(function () {
                            GD.UI.toast(scene, "Request sent to " + user.username);
                        }, function (err) { GD.UI.alert(scene, "ERROR", err.message); });
                    });
                }
            });
        }
    });
}

function MessagesScene(opts) {
    opts = opts || {};
    return GD.UI.screen({
        title: "MESSAGES",
        subtitle: "DIRECT MESSAGES WITH OTHER PLAYERS",
        layout: function (layer) {
            var scene = layer.getParent();
            if (!GD.Account.state.user) {
                GD.Account.openAuth(scene, "login", function () {
                    GD.Nav.go(MessagesScene(), { force: true });
                });
                return;
            }
            if (opts.conversationId) {
                openThread(scene, opts.conversationId, opts.with || "player");
                return;
            }
            socialList(layer, {
                endpoint: function (done, fail) {
                    GD.Api.get("/conversations").then(function (response) {
                        done(response.conversations.map(function (conversation) {
                            return {
                                id: conversation.id, with: conversation.with.username,
                                title: conversation.with.username,
                                subtitle: (conversation.unread ? conversation.unread + " unread - " : "") +
                                    (conversation.lastMessage || "no messages yet")
                            };
                        }));
                    }, fail);
                },
                empty: "No conversations yet. Open a friend to start one.",
                onSelect: function (item) {
                    GD.Nav.go(MessagesScene({ conversationId: item.id, with: item.with }),
                              { force: true });
                }
            });
        }
    });
}

function openThread(scene, conversationId, withName) {
    var container = null;

    function refresh() {
        GD.Api.get("/conversations/" + conversationId + "/messages?limit=30").then(function (response) {
            if (!container || !container.getParent()) return;
            container.removeAllChildren(true);
            var messages = response.messages;
            for (var i = 0; i < messages.length && i < 6; i++) {
                var message = messages[messages.length - 1 - i];
                var label = GD.label((message.from === "me" ? "You: " : withName + ": ") + message.body, {
                    scale: GD.UI.TEXT.tiny, width: 480,
                    align: message.from === "me" ? cc.TEXT_ALIGNMENT_RIGHT : cc.TEXT_ALIGNMENT_LEFT,
                    color: message.from === "me" ? GD.UI.COLOR.green : GD.UI.COLOR.text
                });
                label.setPosition(0, 70 - i * 30);
                container.addChild(label, 1);
            }
            if (!messages.length) {
                var empty = GD.label("No messages yet.", {
                    scale: GD.UI.TEXT.small, color: GD.UI.COLOR.dim
                });
                empty.setPosition(0, 40);
                container.addChild(empty, 1);
            }
            GD.Api.post("/conversations/" + conversationId + "/read").catch(function () {});
        }, function () { /* an empty thread is better than an error loop */ });
    }

    GD.UI.popup(scene, {
        title: "CHAT WITH " + String(withName).toUpperCase(),
        w: 620, h: 360,
        content: function (content) {
            container = cc.Node.create();
            content.addChild(container, 1);
            refresh();
        },
        buttons: [
            { text: "WRITE", style: "green", close: false, onClick: function () {
                GD.UI.textPrompt(scene, {
                    title: "MESSAGE", placeholder: "say something", maxLength: 300,
                    allowEmpty: false,
                    onOk: function (text) {
                        GD.Api.post("/conversations/" + conversationId + "/messages", { body: text })
                            .then(refresh, function (error) {
                                GD.UI.alert(scene, "ERROR", error.message);
                            });
                    }
                });
            } },
            { text: "CLOSE", style: "grey", onClick: function (h) { h.close(); } }
        ]
    });
}



function NotificationsScene() {
    return GD.UI.screen({
        title: "NOTIFICATIONS",
        subtitle: "FRIEND REQUESTS, SHARES, COMMENTS AND REWARDS",
        layout: function (layer) {
            var scene = layer.getParent();
            if (!GD.Account.state.user) {
                GD.Account.openAuth(scene, "login", function () {
                    GD.Nav.go(NotificationsScene(), { force: true });
                });
                return;
            }

            socialList(layer, {
                endpoint: function (done, fail) {
                    GD.Api.get("/notifications").then(function (response) {
                        done(response.notifications.map(function (item) {
                            return {
                                id: item.id, read: item.read,
                                title: (item.read ? "" : "* ") +
                                    item.kind.replace(/_/g, " ").toUpperCase(),
                                subtitle: item.body
                            };
                        }));
                    }, fail);
                },
                empty: "No notifications yet.",
                onSelect: function (item) {
                    if (item.read) return;
                    GD.Api.post("/notifications/" + item.id + "/read").then(function () {
                        GD.Nav.go(NotificationsScene(), { force: true });
                    }, function () {});
                }
            });

            GD.UI.button(layer, {
                x: 800, y: 452, w: 170, h: 34, text: "READ ALL", style: "grey",
                textScale: GD.UI.TEXT.tiny, z: 21,
                onClick: function () {
                    GD.Api.post("/notifications/read-all").then(function () {
                        GD.Nav.go(NotificationsScene(), { force: true });
                    }, function () {});
                }
            });
        }
    });
}


/* The live level sheet. Simulated levels use onlineLevelPopup() in Online.js;
 * a server level comes here so its buttons talk to the API. */
function onlineServerLevelPopup(scene, level) {
    return GD.UI.popup(scene, {
        title: level.name,
        w: 620, h: 360,
        content: function (content) {
            function line(text, y, scale, color) {
                var label = GD.label(text, {
                    scale: scale || GD.UI.TEXT.small, color: color || GD.UI.COLOR.text
                });
                label.setPosition(0, y);
                content.addChild(label, 1);
            }
            line("by " + level.author + "  -  #" + level.id, 104, GD.UI.TEXT.small, GD.UI.COLOR.gold);
            line(level.difficulty + "  -  " + level.length + "  -  " + level.stars + " stars",
                 76, GD.UI.TEXT.small, GD.UI.COLOR.gold);
            line(GD.short(level.downloads) + " downloads    " + GD.short(level.likes) + " likes",
                 48, GD.UI.TEXT.tiny, GD.UI.COLOR.dim);
            if (level.description) {
                var desc = GD.label(level.description, {
                    scale: GD.UI.TEXT.tiny, width: 480, align: cc.TEXT_ALIGNMENT_CENTER,
                    color: GD.UI.COLOR.dim
                });
                desc.setPosition(0, 4);
                content.addChild(desc, 1);
            }
            line("Live server level", -72, GD.UI.TEXT.tiny, GD.UI.COLOR.green);
        },
        buttons: [
            { text: "PLAY", style: "green", close: false, onClick: function (h) {
                h.close(true);
                GD.OnlineServer.play(level, scene);
            } },
            { text: level.liked ? "LIKED" : "LIKE", style: "cyan", close: false,
              onClick: function (h) {
                  GD.Account.require(scene, function () {
                      GD.OnlineServer.like(level).then(function (response) {
                          level.liked = response.liked;
                          level.likes = response.likes;
                          h.close(true);
                          onlineServerLevelPopup(scene, level);
                      }, function (error) { GD.UI.alert(scene, "ERROR", error.message); });
                  });
              } },
            { text: GD.OnlineServer.isSaved(level) ? "SAVED" : "SAVE", style: "purple",
              close: false, onClick: function (h) {
                  var now = GD.OnlineServer.toggleSave(level);
                  GD.UI.toast(scene, now ? "Saved to your list" : "Removed");
                  h.close(true);
                  onlineServerLevelPopup(scene, level);
              } },
            { text: "COMMENTS", style: "grey", close: false, onClick: function (h) {
                h.close(true);
                onlineServerComments(scene, level);
            } }
        ]
    });
}

function onlineServerComments(scene, level) {
    var container = null;

    function paint(comments) {
        if (!container || !container.getParent()) return;
        container.removeAllChildren(true);
        for (var i = 0; i < comments.length && i < 4; i++) {
            var author = GD.label(comments[i].author, {
                scale: GD.UI.TEXT.tiny, anchor: [0, 0.5], color: GD.UI.COLOR.gold
            });
            author.setPosition(-250, 78 - i * 46);
            container.addChild(author, 1);
            var text = GD.label(comments[i].text, {
                scale: GD.UI.TEXT.tiny, anchor: [0, 0.5], width: 470
            });
            text.setPosition(-250, 58 - i * 46);
            container.addChild(text, 1);
        }
        if (!comments.length) {
            var empty = GD.label("No comments yet.", {
                scale: GD.UI.TEXT.small, color: GD.UI.COLOR.dim
            });
            empty.setPosition(0, 40);
            container.addChild(empty, 1);
        }
    }

    function load() {
        GD.OnlineServer.comments(level.id).then(paint, function () { paint([]); });
    }

    var handle = GD.UI.popup(scene, {
        title: "COMMENTS",
        w: 580, h: 340,
        content: function (content) {
            container = cc.Node.create();
            content.addChild(container, 1);
            paint([]);
        },
        buttons: [
            { text: "POST", style: "green", close: false, onClick: function () {
                GD.Account.require(scene, function () {
                    GD.UI.textPrompt(scene, {
                        title: "COMMENT", placeholder: "say something", maxLength: 300,
                        allowEmpty: false,
                        onOk: function (text) {
                            GD.OnlineServer.postComment(level.id, text).then(load, function (error) {
                                GD.UI.alert(scene, "ERROR", error.message);
                            });
                        }
                    });
                });
            } },
            { text: "CLOSE", style: "grey", onClick: function (h) { h.close(); } }
        ]
    });
    load();
    return handle;
}

