/* =====================================================================
 * economy.test.js — the wallet, ledger, daily reward, quests, achievements
 * and the shop all being server-authoritative.
 * ===================================================================== */
import test from "node:test";
import assert from "node:assert/strict";
import { startServer, makeClient, register } from "./helpers.js";

let host;
let player;

test.before(async () => {
    host = await startServer();
    player = makeClient(host.base);
    await register(player, "wallet_user");
});
test.after(async () => { await host.close(); });

test("play progress updates stats and writes a ledger row per completion", async () => {
    const before = await player.get("/wallet");
    assert.equal(before.body.wallet.stars, 0);

    const report = await player.post("/users/me/progress", {
        attempts: 5, jumps: 1200, levelsCompleted: 2, demons: 1
    });
    assert.equal(report.status, 200);
    assert.equal(report.body.user.stats.attempts, 5);
    assert.equal(report.body.user.stats.jumps, 1200);
    assert.equal(report.body.user.stats.levelsCompleted, 2);
    assert.equal(report.body.user.wallet.stars, 2);

    const ledger = await player.get("/wallet/transactions");
    assert.equal(ledger.body.transactions.length, 2);
    assert.ok(ledger.body.transactions.every((row) => row.reason === "level_complete"));
});

test("progress increments are capped so one request cannot invent a career", async () => {
    const report = await player.post("/users/me/progress", { levelsCompleted: 5000, jumps: 99999999 });
    assert.equal(report.body.user.stats.levelsCompleted, 22);
    assert.equal(report.body.user.stats.jumps, 21200);
});

test("the daily reward can only be claimed once a day", async () => {
    const first = await player.post("/wallet/daily", {});
    assert.equal(first.status, 200);
    assert.equal(first.body.claimed, true);
    assert.equal(first.body.currency, "diamonds");
    assert.ok(first.body.amount >= 2);

    const second = await player.post("/wallet/daily", {});
    assert.equal(second.status, 409);
    assert.equal(second.body.error.code, "already_claimed");

    const wallet = await player.get("/wallet");
    assert.equal(wallet.body.daily.claimed, true);
    assert.equal(wallet.body.wallet.diamonds, first.body.amount);
});

test("an achievement needs the real stat before it pays out", async () => {
    const list = await player.get("/achievements");
    assert.equal(list.status, 200);
    const jump = list.body.achievements.find((row) => row.id === "jump_1000");
    assert.equal(jump.progress, 1000);
    assert.equal(jump.unlocked, true);

    const locked = await player.post("/achievements/complete_50/claim");
    assert.equal(locked.status, 409);
    assert.equal(locked.body.error.code, "achievement_locked");

    const claim = await player.post("/achievements/jump_1000/claim");
    assert.equal(claim.status, 200);
    assert.equal(claim.body.claimed, true);

    const again = await player.post("/achievements/jump_1000/claim");
    assert.equal(again.status, 409);
    assert.equal(again.body.error.code, "already_claimed");
});

test("quests track reported progress and pay once", async () => {
    const state = await player.get("/quests");
    assert.equal(state.body.quests.length, 5);

    for (let i = 0; i < 3; i += 1) {
        await player.post("/quests/daily_jumps/progress", { amount: 200 });
    }
    const after = await player.get("/quests");
    const jumps = after.body.quests.find((quest) => quest.id === "daily_jumps");
    assert.equal(jumps.progress, 500);

    const claim = await player.post("/quests/daily_jumps/claim");
    assert.equal(claim.status, 200);
    assert.equal(claim.body.quest.claimed, true);

    const again = await player.post("/quests/daily_jumps/claim");
    assert.equal(again.status, 409);
});

test("the shop charges through the ledger and refuses duplicates", async () => {
    const shop = await player.get("/shop");
    assert.equal(shop.status, 200);
    const key = shop.body.items.find((item) => item.id === "key_chest");
    assert.equal(key.price, 5);

    const poor = await player.get("/wallet");
    if (poor.body.wallet.diamonds < key.price) {
        /* Top up through the quest reward, which is a legitimate server payout. */
        await player.post("/quests/daily_attempts/progress", { amount: 50 });
        await player.post("/quests/daily_attempts/claim");
    }

    const purchase = await player.post("/shop/purchase", { itemId: "key_chest" });
    assert.equal(purchase.status, 201);
    assert.ok(purchase.body.owned.includes("key_chest"));
    assert.equal(purchase.body.wallet.keys, 1);

    const duplicate = await player.post("/shop/purchase", { itemId: "key_chest" });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error.code, "already_owned");

    const unknown = await player.post("/shop/purchase", { itemId: "not_a_real_item" });
    assert.equal(unknown.status, 400);
});

test("a player appears on the star leaderboard with their own row marked", async () => {
    const board = await player.get("/leaderboards?kind=stars");
    assert.equal(board.status, 200);
    const row = board.body.rows.find((entry) => entry.username === "wallet_user");
    assert.ok(row);
    assert.equal(row.you, true);
    assert.ok(row.value >= 2);

    const creators = await player.get("/leaderboards?kind=creators");
    assert.equal(creators.body.kind, "creators");
    const weekly = await player.get("/leaderboards?kind=weekly");
    assert.equal(weekly.status, 200);

    const bad = await player.get("/leaderboards?kind=nope");
    assert.equal(bad.status, 400);
});
