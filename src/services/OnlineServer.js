/* =====================================================================
 * OnlineServer.js — the live browsing provider.
 *
 * GD.Online stays what it always was: an offline demo generator, clearly marked
 * as simulated. This module is the real thing: it asks the account server for
 * levels, downloads them, and turns a downloaded level into the same runtime
 * object the play layer runs. Every record it returns carries `source: "server"`
 * so a screen can label it and route its buttons correctly.
 * ===================================================================== */
GD.OnlineServer = (function () {
    var playableCache = {};
    var commentCache = {};
    var savedKey = "geometryweb.online.saved";

    function active() { return !!GD.Api.enabled; }

    function capitalise(text) {
        return String(text || "").charAt(0).toUpperCase() + String(text || "").slice(1);
    }

    function card(row) {
        return {
            id: row.id,
            name: row.name,
            author: row.author,
            authorID: row.authorID,
            diff: row.difficulty,
            difficulty: row.difficultyName,
            stars: row.stars || 0,
            moons: 0,
            coins: 0,
            downloads: row.downloads || 0,
            likes: row.likes || 0,
            length: capitalise(row.length),
            song: row.song || "StereoMadness",
            songName: row.song || "Stereo Madness",
            songAuthor: row.author,
            description: row.description || "",
            featured: !!row.featured,
            visibility: row.visibility,
            date: String(row.createdAt || "").slice(0, 10),
            source: "server"
        };
    }

    var CATEGORY_QUERY = {
        recent: "sort=recent",
        downloads: "sort=downloads",
        likes: "sort=likes",
        trending: "sort=trending",
        top: "sort=stars",
        featured: "sort=likes&featured=1",
        magic: "sort=likes&minStars=8",
        daily: "sort=recent&limit=1",
        weekly: "sort=trending&limit=1"
    };

    function search(opts) {
        opts = opts || {};
        var filters = opts.filters || {};
        var query = CATEGORY_QUERY[opts.category || "recent"] || "sort=recent";
        if (filters.text) query += "&q=" + encodeURIComponent(filters.text);
        if (filters.difficulty) query += "&difficulty=" + encodeURIComponent(filters.difficulty);
        if (filters.length) query += "&length=" + encodeURIComponent(String(filters.length).toLowerCase());
        return GD.Api.get("/levels?" + query).then(function (response) {
            return { levels: response.levels.map(card), total: response.total, page: response.page };
        });
    }

    /* Downloads a playable level. The download endpoint is also where the server
     * counts a play, so this is the only call that needs play permission. */
    function download(levelId) {
        return GD.Api.get("/levels/" + levelId + "/download").then(function (response) {
            return response.level;
        });
    }

    /* A server level is stored either as a GD level string ("gd") or as the
     * packed object list the editor writes ("json"); both become the runtime
     * level the play layer expects. */
    function runtime(level) {
        if (level.dataFormat === "json") {
            var packed = typeof level.data === "string" ? JSON.parse(level.data) : level.data;
            return GD.Levels.unpack(packed);
        }
        return GD.Levels.parse(level.data, {
            id: level.id,
            name: level.name,
            author: level.author,
            stars: level.stars,
            diff: level.difficulty,
            song: level.song
        });
    }

    function entry(level) {
        return {
            key: "server:" + level.id,
            online: level.id,
            level: runtime(level),
            name: level.name,
            stars: level.stars || 0,
            diff: level.difficulty || 0
        };
    }

    function play(level, scene) {
        var key = "server:" + level.id;
        var pending = playableCache[key] || download(level.id).then(function (full) {
            playableCache[key] = entry(full);
            return playableCache[key];
        });
        pending.then(function (playableEntry) {
            cc.Director.getInstance().replaceScene(new PlayScene(playableEntry));
        }, function (error) {
            GD.UI.toast(scene, error.message || "Could not download that level.");
        });
    }

    function like(level) {
        return level.liked
            ? GD.Api.del("/levels/" + level.id + "/like")
            : GD.Api.post("/levels/" + level.id + "/like");
    }

    function savedIds() {
        try { return JSON.parse(window.localStorage.getItem(savedKey) || "[]"); }
        catch (e) { return []; }
    }

    function toggleSave(level) {
        var list = savedIds();
        var at = list.indexOf(level.id);
        if (at >= 0) list.splice(at, 1); else list.push(level.id);
        try { window.localStorage.setItem(savedKey, JSON.stringify(list)); } catch (e) { /* ignore */ }
        return at < 0;
    }

    function isSaved(level) { return savedIds().indexOf(level.id) >= 0; }

    function comments(levelId) {
        return GD.Api.get("/levels/" + levelId + "/comments?limit=20").then(function (response) {
            var rows = response.comments.map(function (row) {
                return {
                    id: row.id, author: row.author.username, text: row.body,
                    likes: row.likes, liked: row.liked, mine: false
                };
            });
            commentCache[levelId] = rows;
            return rows;
        });
    }

    function cachedComments(levelId) { return commentCache[levelId] || []; }

    function postComment(levelId, body) {
        return GD.Api.post("/levels/" + levelId + "/comments", { body: body }).then(function (response) {
            var row = {
                id: response.comment.id,
                author: response.comment.author.username,
                text: response.comment.body,
                likes: 0, liked: false, mine: true
            };
            commentCache[levelId] = [row].concat(commentCache[levelId] || []);
            return row;
        });
    }

    return {
        active: active,
        search: search,
        download: download,
        play: play,
        entry: entry,
        runtime: runtime,
        like: like,
        toggleSave: toggleSave,
        isSaved: isSaved,
        comments: comments,
        cachedComments: cachedComments,
        postComment: postComment
    };
})();

