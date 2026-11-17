# Geometry Web API

The account server for the Geometry Dash recreation in this repository. It owns
the things a static GitHub Pages site cannot: accounts, sessions, persistent
profiles, uploaded levels, **per-user level sharing**, comments, friends,
messages, notifications, achievements, the currency ledger and moderation.

The front-end keeps working without it (guest play and the clearly-labelled
simulated level browser), but every account feature above needs this service.

## Requirements

- Node.js **22.5 or newer** (the database uses the built-in `node:sqlite`).
- Two npm packages: `express` and `bcryptjs`. No native build step.

## Run it locally

```bash
cd server
npm install
cp .env.example .env        # then set SESSION_SECRET
node --env-file=.env src/server.js
```

The API listens on `http://localhost:8787`; the health check is
`GET /api/v1/health`.

Point the game at it — any one of these:

1. open the site as `http://localhost:8137/?api=http://localhost:8787`
   (remembered in localStorage, and the default when served from localhost);
2. add `api-config.js` next to `index.html` containing
   `window.GD_API_URL = "https://api.example.com";`
3. call `GD.CONFIG.setApi("https://api.example.com")` from the console.

**Never hard-code a production host into the repository.** Deployments set one
of the three points above.

## Tests

```bash
npm test
```

The suite boots the real Express app on an ephemeral port against an in-memory
database and drives it over HTTP with a cookie jar. 33 tests currently cover:

| File | What it proves |
| --- | --- |
| `test/auth.test.js` | unique usernames, password rules, login/logout, CSRF header, password change ends other sessions, account deletion frees the name |
| `test/sharing.test.js` | private level invisible, invitation → accept → play, ungranted permissions refused, revision conflicts, revoke removes access immediately, unlisted/public search |
| `test/social.test.js` | friend requests, messaging and unread state, blocking, notifications, following |
| `test/economy.test.js` | progress → stats/ledger, capped increments, daily reward once a day, achievement gating, quests, shop purchases, leaderboard |

## Security

- **Passwords**: bcrypt (cost 12 by default). Passwords over 72 bytes are
  rejected instead of silently truncated. Login burns a dummy hash for unknown
  usernames so timing cannot enumerate accounts.
- **Sessions**: 32 random bytes, stored as SHA-256. The browser holds the token
  in an `HttpOnly`, `SameSite=Lax`, `Secure` (in production) cookie. Password
  changes and bans delete the account's sessions.
- **CSRF**: state-changing requests need `x-gd-client: web`; a present `Origin`
  must be in `ALLOWED_ORIGINS`.
- **Authorisation**: every level route resolves permissions through
  `accessFor()`. A private level answers 404 to anyone but its owner, so ids
  cannot be probed. Nothing is enforced by hiding a button.
- **Input**: every field is validated and length-limited, JSON bodies are
  capped, and level data is capped by `MAX_LEVEL_BYTES`.
- **Rate limits**: login (per IP + username), registration (per IP) and a coarse
  global limit. The limiter is in-process; multi-instance deployments should put
  a shared limiter in front.
- **Audit**: registration, login, failed logins, password changes, account
  deletion, moderation actions and role changes are written to `audit_logs`.

## Data model (SQLite, `src/schema.js`)

`users`, `sessions`, `profiles`, `friend_requests`, `friendships`, `blocks`,
`follows`, `levels`, `level_versions`, `level_permissions`,
`share_invitations`, `level_comments`, `comment_likes`, `level_likes`,
`level_downloads`, `conversations`, `messages`, `notifications`,
`achievements`, `user_achievements`, `currency_balances`,
`currency_transactions`, `purchases`, `quest_progress`, `daily_rewards`,
`reports`, `moderation_actions`, `audit_logs`.

Uniqueness the product depends on is enforced by the database: one account per
username (case-insensitive), one permission row per (level, user), one vote per
(level, user), one pending invitation per (level, invitee), one purchase per
(user, item), one daily reward per (user, day).

## Endpoint map

```
POST   /auth/register | /auth/login | /auth/logout | /auth/logout-others
GET    /auth/me | /auth/username-available
POST   /auth/password        DELETE /auth/account

GET    /users/search?q=      GET /users/:id      GET /users/:id/levels
PATCH  /users/me             POST /users/me/progress     GET /users/me/sessions
GET    /users/:id/relationship | /users/:id/followers | /users/:id/following

POST   /levels               GET /levels?sort=&q=&difficulty=&length=&page=
GET    /levels/:id | /levels/:id/download | /levels/:id/versions
PATCH  /levels/:id           DELETE /levels/:id
POST   /levels/:id/like      DELETE /levels/:id/like

GET    /levels/:id/permissions
POST   /levels/:id/shares    PATCH /levels/:id/shares/:userId
DELETE /levels/:id/shares/:userId
GET    /shares/invitations   POST /shares/invitations/:id/accept|decline
GET    /shares/shared-with-me | /shares/shared-by-me | /shares/access/:levelId

GET/POST /levels/:id/comments     DELETE /comments/:id
POST/DELETE /comments/:id/like

GET    /friends              GET/POST /friends/requests
POST   /friends/requests/:id/accept|decline     DELETE /friends/:userId
GET    /blocks               POST/DELETE /blocks/:userId
POST/DELETE /follows/:userId

GET    /conversations        POST /conversations
GET/POST /conversations/:id/messages     POST /conversations/:id/read
DELETE /messages/:id

GET    /notifications        POST /notifications/:id/read | /notifications/read-all
GET    /leaderboards?kind=stars|creators|demons|weekly&friends=1
GET    /wallet | /wallet/transactions | /quests | /shop | /shop/owned
POST   /wallet/daily | /quests/:id/progress | /quests/:id/claim | /shop/purchase
GET    /achievements         POST /achievements/:id/claim

POST   /reports              GET /admin/reports
POST   /admin/reports/:id/resolve
POST   /admin/users/:id/suspend|unsuspend|role
DELETE /admin/levels/:id     GET /admin/audit | /admin/stats
```

## Revisions and collaborative editing

`PATCH /levels/:id` requires the `revision` the client edited. If the level moved
on, the server answers `409 revision_conflict` with the current revision, and
every save is stored in `level_versions` with its editor. That is what stops one
player silently overwriting another's newer save; a true real-time editor would
add presence and live patches on top of the same revision checks.

## Deployment notes

- **Host**: any Node host (Fly.io, Render, Railway, a VPS). Run
  `node src/server.js --migrate-only` once, then `node src/server.js`.
- **Database**: keep `data/geometry-web.sqlite` on a persistent volume. Moving
  to Postgres later is a route-module change; the SQL is plain.
- **HTTPS**: required in production, because the session cookie is `Secure`.
- **Environment**: set `SESSION_SECRET`, `COOKIE_SECURE=true`,
  `TRUST_PROXY=1` behind a proxy, and `ALLOWED_ORIGINS` to the Pages origin.
- **Backups**: copy the SQLite file on a schedule; it holds every account and
  level.

## Known limits

- `POST /users/me/progress` trusts the client's attempt/jump/completion counts
  (capped per request). The server cannot re-simulate a run without a replay
  format, so star totals earned this way are client-reported.
- Messages and comments are plain text with length limits; there is no profanity
  filter beyond the report queue.
- The rate limiter is per process.

