// Geometry Dash Recreation backend — Node's built-in http + node:sqlite + scrypt.
// Zero npm dependencies. Provides accounts, sessions, profiles, online levels
// with 4 visibility modes, per-user sharing with granular permissions, friends,
// comments and notifications. All permission checks are enforced server-side.

import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { openDb } from './db.js';
import { hashPassword, verifyPassword, newToken, hashToken, SESSION_TTL_MS } from './auth.js';

const db = openDb();

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const VISIBILITIES = new Set(['private', 'specific', 'unlisted', 'public']);
const PERMISSION_KEYS = ['view', 'play', 'comment', 'copy', 'edit'];

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    icon: row.icon,
    color1: row.color1,
    color2: row.color2,
    description: row.description,
    stars: row.stars,
    diamonds: row.diamonds,
    userCoins: row.user_coins,
    creatorPoints: row.creator_points,
    createdAt: row.created_at,
  };
}

function notify(userId, type, text) {
  db.prepare('INSERT INTO notifications (user_id, type, text, read, created_at) VALUES (?, ?, ?, 0, ?)').run(
    userId,
    type,
    text,
    Date.now(),
  );
}

function getLevel(id) {
  return db.prepare('SELECT * FROM levels WHERE id = ?').get(id);
}

function effectivePermissions(level, userId) {
  if (!level) return null;
  if (level.owner_id === userId) return { view: true, play: true, comment: true, copy: true, edit: true };
  const p = db.prepare('SELECT * FROM level_permissions WHERE level_id = ? AND user_id = ?').get(level.id, userId);
  if (p) {
    return { view: !!p.can_view, play: !!p.can_play, comment: !!p.can_comment, copy: !!p.can_copy, edit: !!p.can_edit };
  }
  if (level.visibility === 'public' || level.visibility === 'unlisted') {
    return { view: true, play: true, comment: true, copy: false, edit: false };
  }
  return { view: false, play: false, comment: false, copy: false, edit: false };
}

function parsePermissions(obj) {
  const out = { view: false, play: false, comment: false, copy: false, edit: false };
  if (obj && typeof obj === 'object') {
    for (const k of PERMISSION_KEYS) if (obj[k] === true) out[k] = true;
  }
  if (out.play || out.comment || out.copy || out.edit) out.view = true;
  return out;
}

function levelSummary(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    difficulty: row.difficulty,
    visibility: row.visibility,
    version: row.version,
    ownerId: row.owner_id,
    owner: (db.prepare('SELECT username FROM users WHERE id = ?').get(row.owner_id) || {}).username,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    downloads: row.downloads,
    likes: row.likes,
  };
}

// ---- tiny HTTP framework (no Express) ----

const routes = [];

function route(method, pattern, ...handlers) {
  const keys = [];
  const reParts = pattern.split('/').map((p) => {
    if (p.startsWith(':')) {
      keys.push(p.slice(1));
      return '([^/]+)';
    }
    return p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  routes.push({ method, re: new RegExp('^' + reParts.join('/') + '/?$'), keys, handlers });
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 2 * 1024 * 1024) req.destroy();
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function respond(raw) {
  return {
    statusCode: 200,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(obj) {
      raw.statusCode = this.statusCode;
      raw.setHeader('content-type', 'application/json');
      raw.end(JSON.stringify(obj));
    },
    sendStatus(c) {
      raw.statusCode = c;
      raw.end();
    },
  };
}

function run(handlers, req, res, i) {
  const h = handlers[i];
  if (!h) return;
  h(req, res, () => run(handlers, req, res, i + 1));
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'authentication required' });
  const row = db.prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?').get(hashToken(token));
  if (!row) return res.status(401).json({ error: 'invalid session' });
  if (row.expires_at < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
    return res.status(401).json({ error: 'session expired' });
  }
  req.user = db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id);
  if (!req.user) return res.status(401).json({ error: 'account not found' });
  next();
}

function requirePerm(perm) {
  return (req, res, next) => {
    const level = getLevel(req.params.id);
    if (!level) return res.status(404).json({ error: 'level not found' });
    const p = effectivePermissions(level, req.user.id);
    if (!p[perm]) return res.status(403).json({ error: `missing permission: ${perm}` });
    req.level = level;
    req.perm = p;
    next();
  };
}

route('POST', '/api/register', (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'username must be 3-20 chars (letters, numbers, underscore)' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' });
  }
  if (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) {
    return res.status(409).json({ error: 'username already taken' });
  }
  const info = db
    .prepare('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)')
    .run(username, hashPassword(password), Date.now());
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = newToken();
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
    hashToken(token),
    user.id,
    Date.now() + SESSION_TTL_MS,
    Date.now(),
  );
  res.status(201).json({ token, user: publicUser(user) });
});

route('POST', '/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username ?? ''));
  if (!user || !verifyPassword(String(password ?? ''), user.password_hash)) {
    return res.status(401).json({ error: 'invalid username or password' });
  }
  const token = newToken();
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
    hashToken(token),
    user.id,
    Date.now() + SESSION_TTL_MS,
    Date.now(),
  );
  res.json({ token, user: publicUser(user) });
});

route('POST', '/api/logout', auth, (req, res) => {
  const header = req.headers.authorization || '';
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(header.slice(7)));
  res.json({ ok: true });
});

route('GET', '/api/me', auth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

route('PATCH', '/api/me', auth, (req, res) => {
  const { icon, color1, color2, description } = req.body || {};
  const iconVal = Number.isInteger(icon) ? icon : req.user.icon;
  const c1 = Number.isInteger(color1) ? color1 : req.user.color1;
  const c2 = Number.isInteger(color2) ? color2 : req.user.color2;
  const desc = typeof description === 'string' ? description.slice(0, 200) : req.user.description;
  db.prepare('UPDATE users SET icon = ?, color1 = ?, color2 = ?, description = ? WHERE id = ?').run(
    iconVal,
    c1,
    c2,
    desc,
    req.user.id,
  );
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
});

route('GET', '/api/users/search', auth, (req, res) => {
  const q = String(req.query.q || '');
  if (!q) return res.json({ users: [] });
  const rows = db.prepare('SELECT * FROM users WHERE username LIKE ? LIMIT 20').all(`%${q}%`);
  res.json({ users: rows.map(publicUser) });
});

route('GET', '/api/levels', auth, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;
  const q = String(req.query.q || '').trim();
  let rows;
  let total;
  if (q) {
    rows = db.prepare('SELECT * FROM levels WHERE visibility = ? AND name LIKE ? ORDER BY updated_at DESC LIMIT ? OFFSET ?').all('public', `%${q}%`, limit, offset);
    total = db.prepare('SELECT COUNT(*) AS c FROM levels WHERE visibility = ? AND name LIKE ?').get('public', `%${q}%`).c;
  } else {
    rows = db.prepare('SELECT * FROM levels WHERE visibility = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?').all('public', limit, offset);
    total = db.prepare('SELECT COUNT(*) AS c FROM levels WHERE visibility = ?').get('public').c;
  }
  res.json({ levels: rows.map(levelSummary), page, total, hasMore: offset + rows.length < total });
});

route('POST', '/api/levels', auth, (req, res) => {
  const { name, description = '', difficulty = 'normal', visibility = 'private', data } = req.body || {};
  if (typeof name !== 'string' || name.trim().length === 0) return res.status(400).json({ error: 'name is required' });
  if (!VISIBILITIES.has(visibility)) return res.status(400).json({ error: 'invalid visibility' });
  const id = randomUUID();
  const now = Date.now();
  db.prepare(
    'INSERT INTO levels (id, owner_id, name, description, difficulty, visibility, data, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)',
  ).run(id, req.user.id, name.trim(), String(description), difficulty, visibility, JSON.stringify(data ?? {}), now, now);
  res.status(201).json({ level: levelSummary(getLevel(id)) });
});

route('GET', '/api/levels/:id', auth, requirePerm('view'), (req, res) => {
  db.prepare('UPDATE levels SET downloads = downloads + 1 WHERE id = ?').run(req.level.id);
  res.json({ level: levelSummary(req.level), data: JSON.parse(req.level.data) });
});

route('PUT', '/api/levels/:id', auth, requirePerm('edit'), (req, res) => {
  const { data, name, description, difficulty, expectedVersion } = req.body || {};
  if (Number.isInteger(expectedVersion) && expectedVersion !== req.level.version) {
    return res.status(409).json({ error: 'version conflict — someone else updated this level', currentVersion: req.level.version });
  }
  const nameVal = typeof name === 'string' && name.trim() ? name.trim() : req.level.name;
  const descVal = typeof description === 'string' ? description.slice(0, 500) : req.level.description;
  const diffVal = typeof difficulty === 'string' ? difficulty : req.level.difficulty;
  const dataVal = data !== undefined ? JSON.stringify(data) : req.level.data;
  db.prepare('UPDATE levels SET name = ?, description = ?, difficulty = ?, data = ?, version = version + 1, updated_at = ? WHERE id = ?').run(
    nameVal,
    descVal,
    diffVal,
    dataVal,
    Date.now(),
    req.level.id,
  );
  res.json({ level: levelSummary(getLevel(req.level.id)) });
});

route('DELETE', '/api/levels/:id', auth, requirePerm('edit'), (req, res) => {
  if (req.level.owner_id !== req.user.id) return res.status(403).json({ error: 'only the owner can delete this level' });
  db.prepare('DELETE FROM levels WHERE id = ?').run(req.level.id);
  db.prepare('DELETE FROM level_permissions WHERE level_id = ?').run(req.level.id);
  res.json({ ok: true });
});

route('POST', '/api/levels/:id/publish', auth, requirePerm('edit'), (req, res) => {
  if (req.level.owner_id !== req.user.id) return res.status(403).json({ error: 'only the owner can change visibility' });
  const { visibility } = req.body || {};
  if (!VISIBILITIES.has(visibility)) return res.status(400).json({ error: 'invalid visibility' });
  db.prepare('UPDATE levels SET visibility = ?, updated_at = ? WHERE id = ?').run(visibility, Date.now(), req.level.id);
  res.json({ level: levelSummary(getLevel(req.level.id)) });
});

route('GET', '/api/shared-with-me', auth, (req, res) => {
  const rows = db
    .prepare('SELECT l.* FROM level_permissions p JOIN levels l ON l.id = p.level_id WHERE p.user_id = ? ORDER BY l.updated_at DESC')
    .all(req.user.id);
  res.json({ levels: rows.map(levelSummary) });
});

route('POST', '/api/levels/:id/share', auth, requirePerm('edit'), (req, res) => {
  if (req.level.owner_id !== req.user.id) return res.status(403).json({ error: 'only the owner can share' });
  const { username, permissions } = req.body || {};
  const target = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username ?? ''));
  if (!target) return res.status(404).json({ error: 'user not found' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'cannot share with yourself' });
  const perms = parsePermissions(permissions);
  if (!perms.view && !perms.play && !perms.comment && !perms.copy && !perms.edit) {
    return res.status(400).json({ error: 'at least one permission is required' });
  }
  const info = db
    .prepare('INSERT INTO share_invitations (level_id, from_user_id, to_user_id, permissions, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.level.id, req.user.id, target.id, JSON.stringify(perms), 'pending', Date.now());
  notify(target.id, 'share_invite', `${req.user.username} shared "${req.level.name}" with you`);
  res.status(201).json({ invitationId: info.lastInsertRowid });
});

route('GET', '/api/levels/:id/invitations', auth, requirePerm('edit'), (req, res) => {
  if (req.level.owner_id !== req.user.id) return res.status(403).json({ error: 'only the owner can view invitations' });
  const rows = db
    .prepare('SELECT si.*, u.username FROM share_invitations si JOIN users u ON u.id = si.to_user_id WHERE si.level_id = ? ORDER BY si.created_at DESC')
    .all(req.level.id);
  res.json({ invitations: rows.map((r) => ({ id: r.id, username: r.username, status: r.status, permissions: JSON.parse(r.permissions) })) });
});

route('GET', '/api/invitations', auth, (req, res) => {
  const rows = db
    .prepare('SELECT si.*, u.username AS owner, l.name AS levelName FROM share_invitations si JOIN users u ON u.id = si.from_user_id JOIN levels l ON l.id = si.level_id WHERE si.to_user_id = ? AND si.status = ? ORDER BY si.created_at DESC')
    .all(req.user.id, 'pending');
  res.json({ invitations: rows.map((r) => ({ id: r.id, levelId: r.level_id, levelName: r.levelName, owner: r.owner, permissions: JSON.parse(r.permissions) })) });
});

route('POST', '/api/invitations/:id/accept', auth, (req, res) => {
  const inv = db.prepare('SELECT * FROM share_invitations WHERE id = ? AND to_user_id = ?').get(req.params.id, req.user.id);
  if (!inv) return res.status(404).json({ error: 'invitation not found' });
  if (inv.status !== 'pending') return res.status(400).json({ error: 'invitation already handled' });
  const perms = JSON.parse(inv.permissions);
  db.prepare('UPDATE share_invitations SET status = ? WHERE id = ?').run('accepted', inv.id);
  db.prepare(
    'INSERT OR REPLACE INTO level_permissions (level_id, user_id, can_view, can_play, can_comment, can_copy, can_edit) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(inv.level_id, inv.to_user_id, perms.view ? 1 : 0, perms.play ? 1 : 0, perms.comment ? 1 : 0, perms.copy ? 1 : 0, perms.edit ? 1 : 0);
  notify(inv.from_user_id, 'share_accepted', `${req.user.username} accepted your share invitation`);
  res.json({ ok: true });
});

route('POST', '/api/invitations/:id/reject', auth, (req, res) => {
  const inv = db.prepare('SELECT * FROM share_invitations WHERE id = ? AND to_user_id = ?').get(req.params.id, req.user.id);
  if (!inv) return res.status(404).json({ error: 'invitation not found' });
  db.prepare('UPDATE share_invitations SET status = ? WHERE id = ?').run('rejected', inv.id);
  res.json({ ok: true });
});

route('DELETE', '/api/levels/:id/share/:userId', auth, requirePerm('edit'), (req, res) => {
  if (req.level.owner_id !== req.user.id) return res.status(403).json({ error: 'only the owner can revoke access' });
  db.prepare('DELETE FROM level_permissions WHERE level_id = ? AND user_id = ?').run(req.level.id, req.params.userId);
  db.prepare('UPDATE share_invitations SET status = ? WHERE level_id = ? AND to_user_id = ? AND status = ?').run('revoked', req.level.id, req.params.userId, 'pending');
  res.json({ ok: true });
});

route('POST', '/api/friends/request', auth, (req, res) => {
  const { username } = req.body || {};
  const target = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username ?? ''));
  if (!target) return res.status(404).json({ error: 'user not found' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'cannot friend yourself' });
  const existing = db
    .prepare('SELECT * FROM friend_requests WHERE from_user_id = ? AND to_user_id = ? AND status = ?')
    .get(req.user.id, target.id, 'pending');
  if (existing) return res.status(409).json({ error: 'request already sent' });
  db.prepare('INSERT INTO friend_requests (from_user_id, to_user_id, status, created_at) VALUES (?, ?, ?, ?)').run(
    req.user.id,
    target.id,
    'pending',
    Date.now(),
  );
  notify(target.id, 'friend_request', `${req.user.username} sent you a friend request`);
  res.status(201).json({ ok: true });
});

route('GET', '/api/friends', auth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.* FROM friend_requests fr JOIN users u ON u.id = CASE WHEN fr.from_user_id = ? THEN fr.to_user_id ELSE fr.from_user_id END
       WHERE fr.status = 'accepted' AND (fr.from_user_id = ? OR fr.to_user_id = ?)`,
    )
    .all(req.user.id, req.user.id, req.user.id);
  res.json({ friends: rows.map(publicUser) });
});

route('GET', '/api/friend-requests', auth, (req, res) => {
  const rows = db
    .prepare('SELECT fr.*, u.username FROM friend_requests fr JOIN users u ON u.id = fr.from_user_id WHERE fr.to_user_id = ? AND fr.status = ?')
    .all(req.user.id, 'pending');
  res.json({ requests: rows.map((r) => ({ id: r.id, username: r.username })) });
});

route('POST', '/api/friend-requests/:id/accept', auth, (req, res) => {
  const fr = db.prepare('SELECT * FROM friend_requests WHERE id = ? AND to_user_id = ?').get(req.params.id, req.user.id);
  if (!fr) return res.status(404).json({ error: 'request not found' });
  db.prepare('UPDATE friend_requests SET status = ? WHERE id = ?').run('accepted', fr.id);
  notify(fr.from_user_id, 'friend_accepted', `${req.user.username} accepted your friend request`);
  res.json({ ok: true });
});

route('POST', '/api/friend-requests/:id/reject', auth, (req, res) => {
  const fr = db.prepare('SELECT * FROM friend_requests WHERE id = ? AND to_user_id = ?').get(req.params.id, req.user.id);
  if (!fr) return res.status(404).json({ error: 'request not found' });
  db.prepare('UPDATE friend_requests SET status = ? WHERE id = ?').run('rejected', fr.id);
  res.json({ ok: true });
});

route('POST', '/api/levels/:id/comments', auth, requirePerm('comment'), (req, res) => {
  const body = String((req.body || {}).body || '').trim();
  if (!body) return res.status(400).json({ error: 'comment is empty' });
  if (body.length > 500) return res.status(400).json({ error: 'comment too long' });
  db.prepare('INSERT INTO comments (level_id, user_id, body, created_at) VALUES (?, ?, ?, ?)').run(
    req.level.id,
    req.user.id,
    body,
    Date.now(),
  );
  res.status(201).json({ ok: true });
});

route('GET', '/api/levels/:id/comments', auth, requirePerm('view'), (req, res) => {
  const rows = db
    .prepare('SELECT c.*, u.username FROM comments c JOIN users u ON u.id = c.user_id WHERE c.level_id = ? ORDER BY c.created_at DESC LIMIT 100')
    .all(req.level.id);
  res.json({ comments: rows.map((r) => ({ id: r.id, username: r.username, body: r.body, createdAt: r.created_at })) });
});

route('GET', '/api/notifications', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
  res.json({ notifications: rows.map((r) => ({ id: r.id, type: r.type, text: r.text, read: !!r.read, createdAt: r.created_at })) });
});

route('POST', '/api/notifications/read', auth, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

route('GET', '/api/health', (req, res) => {
  res.json({ ok: true, service: 'gdr-server' });
});

const server = createServer((rawReq, rawRes) => {
  rawRes.setHeader('Access-Control-Allow-Origin', '*');
  rawRes.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  rawRes.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (rawReq.method === 'OPTIONS') {
    rawRes.statusCode = 204;
    rawRes.end();
    return;
  }

  const url = new URL(rawReq.url, 'http://localhost');
  const path = url.pathname;
  const method = rawReq.method.toUpperCase();

  for (const r of routes) {
    if (r.method !== method) continue;
    const m = path.match(r.re);
    if (!m) continue;
    const req = { ...rawReq, headers: rawReq.headers, params: {}, query: Object.fromEntries(url.searchParams), body: {} };
    r.keys.forEach((k, i) => {
      req.params[k] = decodeURIComponent(m[i + 1]);
    });
    readBody(rawReq).then((body) => {
      req.body = body;
      run(r.handlers, req, respond(rawRes), 0);
    });
    return;
  }

  rawRes.statusCode = 404;
  rawRes.setHeader('content-type', 'application/json');
  rawRes.end(JSON.stringify({ error: 'not found' }));
});

const PORT = parseInt(process.env.PORT || '3000', 10);
server.listen(PORT, () => console.log(`[gdr-server] listening on http://localhost:${PORT}`));

export { server, db };
