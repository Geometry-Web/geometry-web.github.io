/* =====================================================================
 * achievements.js — the catalogue and claiming.
 *
 * Achievement progress is derived from the profile counters the server already
 * owns, so "Complete 10 levels" cannot be claimed by a client that merely says
 * it did. Claiming writes the unlock row and the reward through the same ledger
 * as every other currency change.
 * ===================================================================== */
import express from "express";
import { all, get, run, tx } from "../db.js";
import { requireAuth } from "../auth.js";
import { conflict, notFound, wrap } from "../util.js";
import { credit } from "./economy.js";
import { profileRow, wallet } from "./users.js";
import { notify } from "./notifications.js";

const STAT_FIELDS = new Set([
    "attempts", "jumps", "levels_completed", "demons_completed",
    "levels_created", "levels_uploaded", "likes_received"
]);

function statValue(userId, stat) {
    if (!STAT_FIELDS.has(stat)) return 0;
    const profile = profileRow(userId);
    return profile[stat] || 0;
}

export const achievements = express.Router();

achievements.get("/achievements", requireAuth, wrap((req, res) => {
    const catalogue = all("SELECT * FROM achievements ORDER BY points ASC, id ASC");
    const mine = all("SELECT * FROM user_achievements WHERE user_id = ?", [req.user.id]);
    const byId = Object.fromEntries(mine.map((row) => [row.achievement_id, row]));

    res.json({
        achievements: catalogue.map((row) => {
            const progress = Math.min(statValue(req.user.id, row.stat), row.target);
            const record = byId[row.id];
            return {
                id: row.id,
                name: row.name,
                description: row.description,
                target: row.target,
                progress,
                unlocked: progress >= row.target,
                claimed: !!(record && record.claimed_at),
                points: row.points,
                reward: row.reward_currency ? { currency: row.reward_currency, amount: row.reward_amount } : null,
                unlockedAt: record ? record.unlocked_at : null
            };
        }),
        wallet: wallet(req.user.id)
    });
}));

achievements.post("/achievements/:id/claim", requireAuth, wrap((req, res) => {
    const achievement = get("SELECT * FROM achievements WHERE id = ?", [String(req.params.id)]);
    if (!achievement) throw notFound("No such achievement.");
    const progress = statValue(req.user.id, achievement.stat);
    if (progress < achievement.target) {
        throw conflict("achievement_locked", "You have not reached that yet.");
    }
    const existing = get("SELECT * FROM user_achievements WHERE user_id = ? AND achievement_id = ?",
        [req.user.id, achievement.id]);
    if (existing && existing.claimed_at) throw conflict("already_claimed", "That reward is already claimed.");

    const stamp = new Date().toISOString();
    tx(() => {
        if (existing) {
            run("UPDATE user_achievements SET progress = ?, unlocked_at = COALESCE(unlocked_at, ?), " +
                "claimed_at = ? WHERE user_id = ? AND achievement_id = ?",
                [progress, stamp, stamp, req.user.id, achievement.id]);
        } else {
            run("INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at, claimed_at) " +
                "VALUES (?, ?, ?, ?, ?)", [req.user.id, achievement.id, progress, stamp, stamp]);
        }
        if (achievement.reward_currency && achievement.reward_amount > 0) {
            credit(req.user.id, achievement.reward_currency, achievement.reward_amount,
                "achievement_reward", achievement.id);
        }
    });
    notify(req.user.id, "achievement", "Achievement unlocked: " + achievement.name + ".", "achievements");
    res.json({
        claimed: true,
        achievement: { id: achievement.id, name: achievement.name },
        wallet: wallet(req.user.id)
    });
}));
