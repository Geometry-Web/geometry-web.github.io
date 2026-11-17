/* =====================================================================
 * sharing.test.js — the exact workflow from the specification:
 * A creates a level, keeps it private, B cannot reach it, A shares it,
 * B accepts, B can play it, A revokes, B loses access. Plus the permission
 * bits being enforced independently.
 * ===================================================================== */
import test from "node:test";
import assert from "node:assert/strict";
import { startServer, makeClient, register, publishLevel } from "./helpers.js";

let host;
let alice;
let bob;
let level;

test.before(async () => {
    host = await startServer();
    alice = makeClient(host.base);
    bob = makeClient(host.base);
    await register(alice, "alice_share");
    await register(bob, "bob_share");
    level = await publishLevel(alice, { name: "Alice Private", visibility: "private" });
});

test.after(async () => { await host.close(); });

test("a private level is invisible to another account and to guests", async () => {
    const asBob = await bob.get("/levels/" + level.id);
    assert.equal(asBob.status, 404);
    assert.equal(asBob.body.error.code, "not_found");

    const asGuest = await makeClient(host.base).get("/levels/" + level.id);
    assert.equal(asGuest.status, 404);

    const asOwner = await alice.get("/levels/" + level.id);
    assert.equal(asOwner.status, 200);
    assert.equal(asOwner.body.level.permissions.owner, true);
});

test("private levels never appear in the public browser", async () => {
    const list = await bob.get("/levels?q=Alice");
    assert.equal(list.status, 200);
    assert.equal(list.body.levels.length, 0);
});

test("the owner can invite a specific user", async () => {
    const invite = await alice.post("/levels/" + level.id + "/shares", {
        username: "bob_share",
        permissions: { view: true, play: true, comment: false, copy: false, edit: false }
    });
    assert.equal(invite.status, 201);
    assert.equal(invite.body.kind, "invited");
    /* Sharing a private level moves it to "shared", because a private level is
     * owner-only by definition. */
    assert.equal(invite.body.visibility, "shared");

    const inbox = await bob.get("/shares/invitations?status=pending");
    assert.equal(inbox.status, 200);
    assert.equal(inbox.body.invitations.length, 1);
    assert.equal(inbox.body.invitations[0].from.username, "alice_share");
    assert.equal(inbox.body.invitations[0].level.name, "Alice Private");
});

test("an unanswered invitation does not grant access", async () => {
    assert.equal((await bob.get("/levels/" + level.id)).status, 404);
});

test("accepting the invitation grants exactly the shared permissions", async () => {
    const inbox = await bob.get("/shares/invitations?status=pending");
    const invitationId = inbox.body.invitations[0].id;
    const accept = await bob.post("/shares/invitations/" + invitationId + "/accept");
    assert.equal(accept.status, 200);
    assert.equal(accept.body.permissions.play, true);
    assert.equal(accept.body.permissions.edit, false);

    const view = await bob.get("/levels/" + level.id);
    assert.equal(view.status, 200);
    assert.equal(view.body.level.name, "Alice Private");
    assert.ok(view.body.level.data.includes("kA2"));

    const download = await bob.get("/levels/" + level.id + "/download");
    assert.equal(download.status, 200);
    assert.ok(download.body.level.data.length > 10);
});

test("permissions that were not granted are refused", async () => {
    assert.equal((await bob.post("/levels/" + level.id + "/comments", { body: "nice" })).status, 403);
    assert.equal((await bob.patch("/levels/" + level.id, {
        revision: 1, name: "Hijacked", data: "1,1,2,15,3,15;"
    })).status, 403);
    assert.equal((await bob.get("/levels/" + level.id + "/permissions")).status, 403);
});

test("granting edit allows a save, and revision conflicts are refused", async () => {
    const grant = await alice.post("/levels/" + level.id + "/shares", {
        username: "bob_share",
        permissions: { view: true, play: true, comment: true, copy: true, edit: true }
    });
    assert.equal(grant.status, 200);
    assert.equal(grant.body.kind, "updated");

    const expected = grant.status === 200 ? 1 : 1;
    /* The level is still at revision 1, so this save succeeds and bumps it. */
    const first = await bob.patch("/levels/" + level.id, {
        revision: expected, name: "Edited By Bob", data: "1,1,2,15,3,15;1,1,2,45,3,15;"
    });
    assert.equal(first.status, 200);
    assert.equal(first.body.level.revision, 2);

    /* A client that still thinks it is on revision 1 must not overwrite. */
    const stale = await bob.patch("/levels/" + level.id, {
        revision: 1, name: "Overwrite attempt", data: "1,1,2,15,3,15;"
    });
    assert.equal(stale.status, 409);
    assert.equal(stale.body.error.code, "revision_conflict");
    assert.equal(stale.body.error.details.currentRevision, 2);

    const versions = await alice.get("/levels/" + level.id + "/versions");
    assert.equal(versions.status, 200);
    assert.equal(versions.body.versions.length, 2);
    assert.equal(versions.body.versions[0].editedBy, "bob_share");
});

test("revoking access removes it immediately", async () => {
    const perms = await alice.get("/levels/" + level.id + "/permissions");
    const bobId = perms.body.grants.find((grant) => grant.username === "bob_share").userId;

    const revoke = await alice.del("/levels/" + level.id + "/shares/" + bobId);
    assert.equal(revoke.status, 200);
    assert.equal(revoke.body.share.grants.length, 0);

    assert.equal((await bob.get("/levels/" + level.id)).status, 404);
    assert.equal((await bob.get("/levels/" + level.id + "/download")).status, 404);
});

test("an unlisted level is reachable by id but absent from search", async () => {
    const unlisted = await publishLevel(alice, {
        name: "Secret Link Level", visibility: "unlisted"
    });
    assert.equal((await bob.get("/levels/" + unlisted.id)).status, 200);
    const search = await bob.get("/levels?q=Secret Link");
    assert.equal(search.body.levels.some((row) => row.id === unlisted.id), false);
});

test("a public level is searchable, playable and likeable once", async () => {
    const publicLevel = await publishLevel(alice, {
        name: "Public Playground", visibility: "public", difficulty: 4, length: "long"
    });

    const search = await bob.get("/levels?q=Public Playground");
    assert.equal(search.status, 200);
    assert.equal(search.body.levels.length, 1);
    assert.equal(search.body.levels[0].author, "alice_share");

    assert.equal((await bob.get("/levels/" + publicLevel.id + "/download")).status, 200);

    const like = await bob.post("/levels/" + publicLevel.id + "/like");
    assert.equal(like.status, 200);
    assert.equal(like.body.likes, 1);
    assert.equal((await bob.post("/levels/" + publicLevel.id + "/like")).body.likes, 1);

    const unlike = await bob.del("/levels/" + publicLevel.id + "/like");
    assert.equal(unlike.body.likes, 0);
});

test("only the owner can delete a level, and deletion hides it", async () => {
    assert.equal((await bob.del("/levels/" + level.id)).status, 403);
    assert.equal((await alice.del("/levels/" + level.id)).status, 200);
    assert.equal((await alice.get("/levels/" + level.id)).status, 404);
});

