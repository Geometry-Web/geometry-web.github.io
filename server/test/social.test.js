/* =====================================================================
 * social.test.js — friends, messaging, blocking and notifications, with the
 * same two-account setup the sharing test uses.
 * ===================================================================== */
import test from "node:test";
import assert from "node:assert/strict";
import { startServer, makeClient, register } from "./helpers.js";

let host;
let ana;
let ben;

test.before(async () => {
    host = await startServer();
    ana = makeClient(host.base);
    ben = makeClient(host.base);
    await register(ana, "ana_social");
    await register(ben, "ben_social");
});
test.after(async () => { await host.close(); });

test("user search finds an account and excludes the searcher", async () => {
    const found = await ana.get("/users/search?q=ben");
    assert.equal(found.status, 200);
    assert.equal(found.body.users.length, 1);
    assert.equal(found.body.users[0].username, "ben_social");

    const self = await ana.get("/users/search?q=ana_social");
    assert.equal(self.body.users.length, 0);
});

test("a friend request must be accepted before it counts", async () => {
    const before = await ana.get("/friends");
    assert.equal(before.body.friends.length, 0);

    const sent = await ana.post("/friends/requests", { username: "ben_social" });
    assert.equal(sent.status, 201);

    const duplicate = await ana.post("/friends/requests", { username: "ben_social" });
    assert.equal(duplicate.status, 409);

    const inbox = await ben.get("/friends/requests?direction=incoming");
    assert.equal(inbox.body.requests.length, 1);
    const requestId = inbox.body.requests[0].id;

    const accept = await ben.post("/friends/requests/" + requestId + "/accept");
    assert.equal(accept.status, 200);
    assert.equal(accept.body.friend.username, "ana_social");

    assert.equal((await ana.get("/friends")).body.friends[0].username, "ben_social");
    assert.equal((await ben.get("/friends")).body.friends[0].username, "ana_social");

    const benId = (await ana.get("/users/search?q=ben_social")).body.users[0].id;
    const relationship = await ana.get("/users/" + benId + "/relationship");
    assert.equal(relationship.body.friends, true);
});

test("messages are delivered, unread until read, and only to members", async () => {
    const start = await ana.post("/conversations", { username: "ben_social" });
    assert.ok([200, 201].includes(start.status));
    const conversationId = start.body.conversation.id;

    const sent = await ana.post("/conversations/" + conversationId + "/messages",
        { body: "hey, play my level" });
    assert.equal(sent.status, 201);
    assert.equal(sent.body.message.from, "me");

    const list = await ben.get("/conversations");
    assert.equal(list.status, 200);
    assert.equal(list.body.conversations.length, 1);
    assert.equal(list.body.conversations[0].unread, 1);
    assert.equal(list.body.conversations[0].lastMessage, "hey, play my level");

    const thread = await ben.get("/conversations/" + conversationId + "/messages");
    assert.equal(thread.body.messages.length, 1);
    assert.equal(thread.body.messages[0].from, "them");

    await ben.post("/conversations/" + conversationId + "/read");
    assert.equal((await ben.get("/conversations")).body.conversations[0].unread, 0);

    const outsider = makeClient(host.base);
    await register(outsider, "cara_social");
    assert.equal((await outsider.get("/conversations/" + conversationId + "/messages")).status, 404);
    assert.equal((await outsider.post("/conversations/" + conversationId + "/messages",
        { body: "hi" })).status, 404);
});

test("blocking stops messaging and clears the friendship", async () => {
    const benId = (await ana.get("/users/search?q=ben_social")).body.users[0].id;
    const block = await ana.post("/blocks/" + benId);
    assert.equal(block.status, 200);

    assert.equal((await ana.get("/friends")).body.friends.length, 0);
    assert.equal((await ana.post("/conversations", { username: "ben_social" })).status, 403);
    assert.equal((await ben.get("/users/search?q=ana")).body.users.length, 0);

    const unblock = await ana.del("/blocks/" + benId);
    assert.equal(unblock.status, 200);
    assert.equal((await ana.post("/conversations", { username: "ben_social" })).status, 200);
});

test("notifications record what happened and can be marked read", async () => {
    const inbox = await ben.get("/notifications");
    assert.equal(inbox.status, 200);
    assert.ok(inbox.body.notifications.length >= 2);
    assert.ok(inbox.body.notifications.some((item) => item.kind === "friend_request"));
    assert.ok(inbox.body.notifications.some((item) => item.kind === "message"));
    assert.ok(inbox.body.unread >= 1);

    const first = inbox.body.notifications[0];
    await ben.post("/notifications/" + first.id + "/read");
    const after = await ben.get("/notifications");
    assert.ok(after.body.unread < inbox.body.unread);

    await ben.post("/notifications/read-all");
    assert.equal((await ben.get("/notifications")).body.unread, 0);
});

test("following is tracked separately from friendship", async () => {
    const benId = (await ana.get("/users/search?q=ben_social")).body.users[0].id;
    const follow = await ana.post("/follows/" + benId);
    assert.equal(follow.status, 200);
    assert.equal((await ana.get("/users/" + benId + "/relationship")).body.following, true);
    assert.equal((await ben.get("/users/" + benId + "/followers")).body.users.length, 1);
    await ana.del("/follows/" + benId);
    assert.equal((await ana.get("/users/" + benId + "/relationship")).body.following, false);
});
