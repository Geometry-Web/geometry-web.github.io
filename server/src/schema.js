/* =====================================================================
 * schema.js — the database, as SQL.
 *
 * One migration today (schema_version 1). Every table has a primary key, every
 * relation a foreign key with an explicit ON DELETE, and the uniqueness the
 * product depends on (one account per username, one permission row per
 * (level, user), one vote per (level, user)) is enforced by the database.
 * ===================================================================== */

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    username       TEXT    NOT NULL,
    username_lower TEXT    NOT NULL,
    password_hash  TEXT    NOT NULL,
    email          TEXT,
    email_lower    TEXT,
    role           TEXT    NOT NULL DEFAULT 'player'
                           CHECK (role IN ('player','moderator','admin')),
    disabled_at    TEXT,
    disable_reason TEXT,
    deleted_at     TEXT,
    created_at     TEXT    NOT NULL,
    updated_at     TEXT    NOT NULL,
    last_login_at  TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_username ON users (username_lower);
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email ON users (email_lower)
    WHERE email_lower IS NOT NULL;

CREATE TABLE IF NOT EXISTS sessions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash   TEXT    NOT NULL,
    created_at   TEXT    NOT NULL,
    expires_at   TEXT    NOT NULL,
    last_used_at TEXT    NOT NULL,
    ip           TEXT,
    user_agent   TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_sessions_token ON sessions (token_hash);
CREATE INDEX IF NOT EXISTS ix_sessions_user ON sessions (user_id);

CREATE TABLE IF NOT EXISTS profiles (
    user_id           INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    description       TEXT    NOT NULL DEFAULT '',
    cube              INTEGER NOT NULL DEFAULT 1,
    ship              INTEGER NOT NULL DEFAULT 1,
    ball              INTEGER NOT NULL DEFAULT 1,
    ufo               INTEGER NOT NULL DEFAULT 1,
    wave              INTEGER NOT NULL DEFAULT 1,
    robot             INTEGER NOT NULL DEFAULT 1,
    spider            INTEGER NOT NULL DEFAULT 1,
    swing             INTEGER NOT NULL DEFAULT 1,
    color1            TEXT    NOT NULL DEFAULT '0,255,255',
    color2            TEXT    NOT NULL DEFAULT '255,255,0',
    glow              INTEGER NOT NULL DEFAULT 0,
    attempts          INTEGER NOT NULL DEFAULT 0,
    jumps             INTEGER NOT NULL DEFAULT 0,
    levels_completed  INTEGER NOT NULL DEFAULT 0,
    demons_completed  INTEGER NOT NULL DEFAULT 0,
    levels_created    INTEGER NOT NULL DEFAULT 0,
    levels_uploaded   INTEGER NOT NULL DEFAULT 0,
    likes_received    INTEGER NOT NULL DEFAULT 0,
    show_stats        INTEGER NOT NULL DEFAULT 1,
    created_at        TEXT    NOT NULL,
    updated_at        TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS friend_requests (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status       TEXT    NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','accepted','declined','cancelled')),
    created_at   TEXT    NOT NULL,
    responded_at TEXT,
    CHECK (from_user <> to_user)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_friend_requests_pair
    ON friend_requests (from_user, to_user);

CREATE TABLE IF NOT EXISTS friendships (
    user_low   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_high  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT    NOT NULL,
    PRIMARY KEY (user_low, user_high),
    CHECK (user_low < user_high)
);

CREATE TABLE IF NOT EXISTS blocks (
    blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT    NOT NULL,
    PRIMARY KEY (blocker_id, blocked_id),
    CHECK (blocker_id <> blocked_id)
);

CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TEXT    NOT NULL,
    PRIMARY KEY (follower_id, followee_id),
    CHECK (follower_id <> followee_id)
);
`;
/* Level content and the sharing graph. */
export const SCHEMA2 = `
CREATE TABLE IF NOT EXISTS levels (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    data        TEXT    NOT NULL,
    data_format TEXT    NOT NULL DEFAULT 'gd' CHECK (data_format IN ('gd','json')),
    difficulty  INTEGER NOT NULL DEFAULT 2 CHECK (difficulty BETWEEN 0 AND 10),
    length      TEXT    NOT NULL DEFAULT 'medium'
                        CHECK (length IN ('tiny','short','medium','long','xl')),
    song        TEXT,
    visibility  TEXT    NOT NULL DEFAULT 'private'
                        CHECK (visibility IN ('private','shared','unlisted','public')),
    revision    INTEGER NOT NULL DEFAULT 1,
    downloads   INTEGER NOT NULL DEFAULT 0,
    likes       INTEGER NOT NULL DEFAULT 0,
    stars       INTEGER NOT NULL DEFAULT 0,
    featured    INTEGER NOT NULL DEFAULT 0,
    rating      INTEGER NOT NULL DEFAULT 0,
    deleted_at  TEXT,
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_levels_owner ON levels (owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS ix_levels_public ON levels (visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_levels_downloads ON levels (downloads DESC);
CREATE INDEX IF NOT EXISTS ix_levels_likes ON levels (likes DESC);

CREATE TABLE IF NOT EXISTS level_versions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    level_id    INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    revision    INTEGER NOT NULL,
    data        TEXT    NOT NULL,
    name        TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    edited_by   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TEXT    NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_level_versions ON level_versions (level_id, revision);

CREATE TABLE IF NOT EXISTS level_permissions (
    level_id    INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    can_view    INTEGER NOT NULL DEFAULT 1,
    can_play    INTEGER NOT NULL DEFAULT 1,
    can_comment INTEGER NOT NULL DEFAULT 0,
    can_copy    INTEGER NOT NULL DEFAULT 0,
    can_edit    INTEGER NOT NULL DEFAULT 0,
    granted_by  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL,
    PRIMARY KEY (level_id, user_id)
);
CREATE INDEX IF NOT EXISTS ix_permissions_user ON level_permissions (user_id);

CREATE TABLE IF NOT EXISTS share_invitations (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    level_id     INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    from_user    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    can_view     INTEGER NOT NULL DEFAULT 1,
    can_play     INTEGER NOT NULL DEFAULT 0,
    can_comment  INTEGER NOT NULL DEFAULT 0,
    can_copy     INTEGER NOT NULL DEFAULT 0,
    can_edit     INTEGER NOT NULL DEFAULT 0,
    status       TEXT    NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','accepted','declined','revoked')),
    created_at   TEXT    NOT NULL,
    responded_at TEXT,
    CHECK (from_user <> to_user)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_share_pending
    ON share_invitations (level_id, to_user) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS ix_share_inbox ON share_invitations (to_user, status);
`;


/* Comments, votes, play records and the social inbox. */
export const SCHEMA3 = `
CREATE TABLE IF NOT EXISTS level_comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    level_id   INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body       TEXT    NOT NULL,
    likes      INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_comments_level ON level_comments (level_id, created_at DESC);

CREATE TABLE IF NOT EXISTS comment_likes (
    comment_id INTEGER NOT NULL REFERENCES level_comments(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT    NOT NULL,
    PRIMARY KEY (comment_id, user_id)
);

CREATE TABLE IF NOT EXISTS level_likes (
    level_id   INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT    NOT NULL,
    PRIMARY KEY (level_id, user_id)
);

CREATE TABLE IF NOT EXISTS level_downloads (
    level_id       INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_played_at TEXT    NOT NULL,
    plays          INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (level_id, user_id)
);

CREATE TABLE IF NOT EXISTS conversations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_low        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_high       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TEXT    NOT NULL,
    last_message_at TEXT    NOT NULL,
    UNIQUE (user_low, user_high),
    CHECK (user_low < user_high)
);

CREATE TABLE IF NOT EXISTS messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body            TEXT    NOT NULL,
    created_at      TEXT    NOT NULL,
    read_at         TEXT,
    deleted_at      TEXT
);
CREATE INDEX IF NOT EXISTS ix_messages_conversation
    ON messages (conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind       TEXT    NOT NULL,
    body       TEXT    NOT NULL,
    link       TEXT,
    read_at    TEXT,
    created_at TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_notifications_user ON notifications (user_id, created_at DESC);
`;

/* Progression, economy and moderation. */
export const SCHEMA4 = `
CREATE TABLE IF NOT EXISTS achievements (
    id              TEXT    PRIMARY KEY,
    name            TEXT    NOT NULL,
    description     TEXT    NOT NULL,
    stat            TEXT    NOT NULL,
    target          INTEGER NOT NULL,
    points          INTEGER NOT NULL DEFAULT 0,
    reward_currency TEXT,
    reward_amount   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_achievements (
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id TEXT    NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    progress       INTEGER NOT NULL DEFAULT 0,
    unlocked_at    TEXT,
    claimed_at     TEXT,
    PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS currency_balances (
    user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency TEXT    NOT NULL,
    amount   INTEGER NOT NULL DEFAULT 0 CHECK (amount >= 0),
    PRIMARY KEY (user_id, currency)
);

CREATE TABLE IF NOT EXISTS currency_transactions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency      TEXT    NOT NULL,
    delta         INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reason        TEXT    NOT NULL,
    ref           TEXT,
    created_at    TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_transactions_user ON currency_transactions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS purchases (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id    TEXT    NOT NULL,
    price      INTEGER NOT NULL,
    currency   TEXT    NOT NULL,
    created_at TEXT    NOT NULL,
    PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS quest_progress (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quest_id   TEXT    NOT NULL,
    progress   INTEGER NOT NULL DEFAULT 0,
    target     INTEGER NOT NULL,
    claimed_at TEXT,
    updated_at TEXT    NOT NULL,
    PRIMARY KEY (user_id, quest_id)
);

CREATE TABLE IF NOT EXISTS daily_rewards (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day        TEXT    NOT NULL,
    currency   TEXT    NOT NULL,
    amount     INTEGER NOT NULL,
    claimed_at TEXT    NOT NULL,
    PRIMARY KEY (user_id, day)
);

CREATE TABLE IF NOT EXISTS reports (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type TEXT    NOT NULL CHECK (target_type IN ('user','level','comment')),
    target_id   INTEGER NOT NULL,
    reason      TEXT    NOT NULL,
    details     TEXT,
    status      TEXT    NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','resolved','dismissed')),
    created_at  TEXT    NOT NULL,
    resolved_at TEXT,
    resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS ix_reports_status ON reports (status, created_at DESC);

CREATE TABLE IF NOT EXISTS moderation_actions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action      TEXT    NOT NULL,
    target_type TEXT    NOT NULL,
    target_id   INTEGER NOT NULL,
    notes       TEXT,
    created_at  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action      TEXT    NOT NULL,
    target_type TEXT,
    target_id   TEXT,
    ip          TEXT,
    meta        TEXT,
    created_at  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
`;
