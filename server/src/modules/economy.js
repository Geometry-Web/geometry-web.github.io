/* =====================================================================
 * economy.js — wallet, ledger, daily reward, quests and the shop.
 *
 * The server is the only authority on balances. Every change goes through
 * credit() or debit(), which write a currency_transactions row with the
 * resulting balance in the same transaction, so the history always adds up and
 * a negative balance is impossible (the schema's CHECK also enforces it).
 * ===================================================================== */
import express from "express";
import { all, get, run, tx } from "../db.js";
import { requireAuth } from "../auth.js";
import { badRequest, conflict, id, wrap } from "../util.js";
import { wallet } from "./users.js";
import { notify } from "./notifications.js";

const CURRENCIES = ["stars", "diamonds", "secret_coins", "user_coins", "creator_points", "keys"];

export function credit(userId, currency, amount, reason, ref = null) {
    if (!CURRENCIES.includes(currency)) throw badRequest("invalid_currency", "Unknown currency.");
    if (!Number.isInteger(amount) || amount <= 0) throw badRequest("invalid_amount", "Invalid amount.");
    return tx(() => {
        const row = get("SELECT amount FROM currency_balances WHERE user_id = ? AND currency = ?",
            [userId, currency]);
        const next = (row ? row.amount : 0) + amount;
        if (!row) {
            run("INSERT INTO currency_balances (user_id, currency, amount) VALUES (?, ?, ?)",
                [userId, currency, next]);
        } else {
            run("UPDATE currency_balances SET amount = ? WHERE user_id = ? AND currency = ?",
                [next, userId, currency]);
        }
        run(
            "INSERT INTO currency_transactions (user_id, currency, delta, balance_after, reason, ref, created_at) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
            [userId, currency, amount, next, reason, ref, new Date().toISOString()]
        );
        return next;
    });
}

export function debit(userId, currency, amount, reason, ref = null) {
    return tx(() => {
        const row = get("SELECT amount FROM currency_balances WHERE user_id = ? AND currency = ?",
            [userId, currency]);
        if (!row || row.amount < amount) throw conflict("insufficient_funds", "Not enough " + currency + ".");
        const next = row.amount - amount;
        run("UPDATE currency_balances SET amount = ? WHERE user_id = ? AND currency = ?",
            [next, userId, currency]);
        run(
            "INSERT INTO currency_transactions (user_id, currency, delta, balance_after, reason, ref, created_at) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
            [userId, currency, -amount, next, reason, ref, new Date().toISOString()]
        );
        return next;
    });
}

/* --------------------------------------------------------------- daily login
 * Rewards grow with the streak and reset after a missed day. The day key is UTC
 * and the table's primary key is (user, day), so a double tap cannot claim twice
 * even if two requests race. */
function dayKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

function yesterdayKey() {
    return dayKey(new Date(Date.now() - 86_400_000));
}

function dailyStatus(userId) {
    const claimed = get("SELECT * FROM daily_rewards WHERE user_id = ? AND day = ?", [userId, dayKey()]);
    const streakRows = all(
        "SELECT day FROM daily_rewards WHERE user_id = ? ORDER BY day DESC LIMIT 60", [userId]);
    let streak = 0;
    let cursor = claimed ? dayKey() : yesterdayKey();
    for (const row of streakRows) {
        if (row.day !== cursor) break;
        streak += 1;
        const date = new Date(cursor + "T00:00:00Z");
        cursor = dayKey(new Date(date.getTime() - 86_400_000));
    }
    return {
        claimed: !!claimed,
        day: dayKey(),
        streak,
        reward: { currency: "diamonds", amount: Math.min(20, 2 + streak * 2) }
    };
}

export const economy = express.Router();

economy.get("/wallet", requireAuth, wrap((req, res) => {
    res.json({ wallet: wallet(req.user.id), daily: dailyStatus(req.user.id) });
}));

economy.get("/wallet/transactions", requireAuth, wrap((req, res) => {
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const rows = all(
        "SELECT * FROM currency_transactions WHERE user_id = ? ORDER BY id DESC LIMIT ?",
        [req.user.id, limit]
    );
    res.json({
        transactions: rows.map((row) => ({
            id: row.id,
            currency: row.currency,
            delta: row.delta,
            balanceAfter: row.balance_after,
            reason: row.reason,
            ref: row.ref,
            createdAt: row.created_at
        }))
    });
}));

economy.post("/wallet/daily", requireAuth, wrap((req, res) => {
    const status = dailyStatus(req.user.id);
    if (status.claimed) throw conflict("already_claimed", "Today's reward is already claimed.");
    const amount = status.reward.amount;
    run("INSERT INTO daily_rewards (user_id, day, currency, amount, claimed_at) VALUES (?, ?, ?, ?, ?)",
        [req.user.id, status.day, status.reward.currency, amount, new Date().toISOString()]);
    credit(req.user.id, status.reward.currency, amount, "daily_reward", status.day);
    notify(req.user.id, "daily_reward", "Daily reward claimed: " + amount + " diamonds.", "daily");
    res.json({ claimed: true, amount, currency: status.reward.currency, wallet: wallet(req.user.id) });
}));

/* -------------------------------------------------------------------- quests
 * Quest definitions live on the server because their targets and rewards are
 * part of the rules. The client may only report progress; claiming checks the
 * stored progress against the stored target. */
const QUESTS = {
    "daily_jumps": { name: "Jump 500 times", target: 500, currency: "diamonds", amount: 3 },
    "daily_attempts": { name: "Make 50 attempts", target: 50, currency: "diamonds", amount: 2 },
    "daily_likes": { name: "Like 3 levels", target: 3, currency: "diamonds", amount: 2 },
    "weekly_completes": { name: "Complete 5 levels", target: 5, currency: "diamonds", amount: 10 },
    "weekly_creator": { name: "Upload a level", target: 1, currency: "diamonds", amount: 5 }
};

function questState(userId) {
    const rows = all("SELECT * FROM quest_progress WHERE user_id = ?", [userId]);
    const byId = Object.fromEntries(rows.map((row) => [row.quest_id, row]));
    return Object.entries(QUESTS).map(([questId, def]) => {
        const row = byId[questId];
        return {
            id: questId,
            name: def.name,
            target: def.target,
            progress: row ? Math.min(row.progress, def.target) : 0,
            claimed: !!(row && row.claimed_at),
            reward: { currency: def.currency, amount: def.amount }
        };
    });
}

economy.get("/quests", requireAuth, wrap((req, res) => {
    res.json({ quests: questState(req.user.id) });
}));

economy.post("/quests/:id/progress", requireAuth, wrap((req, res) => {
    const questId = String(req.params.id);
    const def = QUESTS[questId];
    if (!def) throw badRequest("unknown_quest", "Unknown quest.");
    const raw = Math.floor(Number(req.body && req.body.amount) || 0);
    if (raw <= 0 || raw > 200) throw badRequest("invalid_amount", "Report between 1 and 200.");
    const stamp = new Date().toISOString();
    const existing = get("SELECT * FROM quest_progress WHERE user_id = ? AND quest_id = ?",
        [req.user.id, questId]);
    if (existing && existing.claimed_at) {
        return res.json({ quest: questState(req.user.id).find((q) => q.id === questId) });
    }
    const progress = Math.min(def.target, (existing ? existing.progress : 0) + raw);
    if (existing) {
        run("UPDATE quest_progress SET progress = ?, updated_at = ? WHERE user_id = ? AND quest_id = ?",
            [progress, stamp, req.user.id, questId]);
    } else {
        run("INSERT INTO quest_progress (user_id, quest_id, progress, target, updated_at) " +
            "VALUES (?, ?, ?, ?, ?)", [req.user.id, questId, progress, def.target, stamp]);
    }
    res.json({ quest: questState(req.user.id).find((q) => q.id === questId) });
}));

economy.post("/quests/:id/claim", requireAuth, wrap((req, res) => {
    const questId = String(req.params.id);
    const def = QUESTS[questId];
    if (!def) throw badRequest("unknown_quest", "Unknown quest.");
    const row = get("SELECT * FROM quest_progress WHERE user_id = ? AND quest_id = ?",
        [req.user.id, questId]);
    if (!row || row.progress < def.target) throw conflict("quest_incomplete", "That quest is not finished yet.");
    if (row.claimed_at) throw conflict("already_claimed", "That reward is already claimed.");
    run("UPDATE quest_progress SET claimed_at = ? WHERE user_id = ? AND quest_id = ?",
        [new Date().toISOString(), req.user.id, questId]);
    credit(req.user.id, def.currency, def.amount, "quest_reward", questId);
    notify(req.user.id, "quest_reward", "Quest reward: " + def.amount + " " + def.currency + ".", "quests");
    res.json({ claimed: true, quest: questState(req.user.id).find((q) => q.id === questId),
               wallet: wallet(req.user.id) });
}));


/* ---------------------------------------------------------------------- shop
 * A small, honest catalogue: cosmetic unlocks and currency bundles bought with
 * a currency the player actually earned. The (user, item) primary key in
 * `purchases` makes a double purchase impossible even if the button is tapped
 * twice. */
const SHOP = [
    { id: "icon_pack_neon", name: "Neon Icon Pack", description: "Unlocks the neon cube set.",
      price: 25, currency: "diamonds", kind: "icon", unlock: "icon:neon" },
    { id: "trail_fire", name: "Fire Trail", description: "A burning trail behind every icon.",
      price: 40, currency: "diamonds", kind: "trail", unlock: "trail:fire" },
    { id: "death_explosion", name: "Big Explosion", description: "A louder death effect.",
      price: 30, currency: "diamonds", kind: "death", unlock: "death:big" },
    { id: "color_pack_pastel", name: "Pastel Colours", description: "Twelve pastel colour pairings.",
      price: 20, currency: "diamonds", kind: "color", unlock: "color:pastel" },
    { id: "key_chest", name: "Treasure Key", description: "One key for the Treasure Room.",
      price: 5, currency: "diamonds", kind: "key", unlock: "key:1" }
];

function ownedItems(userId) {
    return all("SELECT item_id FROM purchases WHERE user_id = ?", [userId]).map((row) => row.item_id);
}

economy.get("/shop", requireAuth, wrap((req, res) => {
    const owned = new Set(ownedItems(req.user.id));
    res.json({
        items: SHOP.map((item) => ({ ...item, owned: owned.has(item.id) })),
        wallet: wallet(req.user.id)
    });
}));

economy.post("/shop/purchase", requireAuth, wrap((req, res) => {
    const itemId = String((req.body && req.body.itemId) || "");
    const item = SHOP.find((entry) => entry.id === itemId);
    if (!item) throw badRequest("unknown_item", "No such item.");
    if (get("SELECT 1 AS x FROM purchases WHERE user_id = ? AND item_id = ?", [req.user.id, itemId])) {
        throw conflict("already_owned", "You already own that.");
    }
    tx(() => {
        debit(req.user.id, item.currency, item.price, "purchase", item.id);
        run("INSERT INTO purchases (user_id, item_id, price, currency, created_at) VALUES (?, ?, ?, ?, ?)",
            [req.user.id, item.id, item.price, item.currency, new Date().toISOString()]);
        if (item.currency === "diamonds" && item.kind === "key") {
            credit(req.user.id, "keys", 1, "purchase_bonus", item.id);
        }
    });
    notify(req.user.id, "purchase", "Purchased " + item.name + ".", "shop");
    res.status(201).json({ ok: true, item, wallet: wallet(req.user.id), owned: ownedItems(req.user.id) });
}));

/* GET /shop/owned — the unlock list the icon kit reads. */
economy.get("/shop/owned", requireAuth, wrap((req, res) => {
    const rows = all(
        "SELECT p.item_id, p.created_at FROM purchases p WHERE p.user_id = ? ORDER BY p.created_at DESC",
        [req.user.id]
    );
    res.json({
        purchases: rows.map((row) => {
            const item = SHOP.find((entry) => entry.id === row.item_id);
            return {
                itemId: row.item_id,
                unlock: item ? item.unlock : null,
                purchasedAt: row.created_at
            };
        })
    });
}));

