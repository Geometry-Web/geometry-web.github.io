// Integration test for the backend: accounts, sessions, private levels,
// specific-user sharing, permissions, and revocation. Runs the real server on
// an ephemeral port with an in-memory database and exercises the API over HTTP.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const serverDir = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const PORT = 3210;
const BASE = `http://127.0.0.1:${PORT}`;

let server;

before(async () => {
  server = spawn(process.execPath, ['src/index.js'], {
    cwd: serverDir,
    env: { ...process.env, PORT: String(PORT), DB_PATH: ':memory:' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stderr.on('data', (d) => process.stderr.write(d));
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('server did not start in time');
});

after(() => {
  if (server) server.kill();
});

async function api(method, p, token, body) {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

async function register(username) {
  const r = await api('POST', '/api/register', null, { username, password: 'password123' });
  assert.equal(r.status, 201, `register ${username} failed: ${JSON.stringify(r.json)}`);
  return r.json.token;
}

test('registration and login', async () => {
  const token = await register('alice_1');
  const dup = await api('POST', '/api/register', null, { username: 'alice_1', password: 'password123' });
  assert.equal(dup.status, 409);
  const bad = await api('POST', '/api/login', null, { username: 'alice_1', password: 'wrongpass' });
  assert.equal(bad.status, 401);
  const ok = await api('POST', '/api/login', null, { username: 'alice_1', password: 'password123' });
  assert.equal(ok.status, 200);
  assert.ok(ok.json.token);
  const me = await api('GET', '/api/me', token);
  assert.equal(me.json.user.username, 'alice_1');
  const out = await api('POST', '/api/logout', token);
  assert.equal(out.status, 200);
  const afterLogout = await api('GET', '/api/me', token);
  assert.equal(afterLogout.status, 401);
});

test('specific-user sharing workflow', async () => {
  const alice = await register('alice_2');
  const bob = await register('bob_2');

  const created = await api('POST', '/api/levels', alice, {
    name: 'Secret Level',
    visibility: 'private',
    data: { objects: [{ id: 1, x: 15, y: 15 }] },
  });
  assert.equal(created.status, 201);
  const levelId = created.json.level.id;

  // Bob cannot access the private level.
  const denied = await api('GET', `/api/levels/${levelId}`, bob);
  assert.equal(denied.status, 403);

  // Alice shares with Bob.
  const share = await api('POST', `/api/levels/${levelId}/share`, alice, {
    username: 'bob_2',
    permissions: { view: true, play: true, comment: true },
  });
  assert.equal(share.status, 201);
  const invitationId = share.json.invitationId;

  // Bob accepts.
  const accept = await api('POST', `/api/invitations/${invitationId}/accept`, bob);
  assert.equal(accept.status, 200);

  // Bob can now access.
  const got = await api('GET', `/api/levels/${levelId}`, bob);
  assert.equal(got.status, 200);
  assert.equal(got.json.data.objects.length, 1);

  // Bob cannot edit (no edit permission).
  const editDenied = await api('PUT', `/api/levels/${levelId}`, bob, { data: {}, expectedVersion: 1 });
  assert.equal(editDenied.status, 403);

  // Alice revokes access.
  const bobUser = await api('GET', '/api/users/search?q=bob_2', alice);
  const bobId = bobUser.json.users.find((u) => u.username === 'bob_2').id;
  const revoke = await api('DELETE', `/api/levels/${levelId}/share/${bobId}`, alice);
  assert.equal(revoke.status, 200);

  // Bob loses access.
  const afterRevoke = await api('GET', `/api/levels/${levelId}`, bob);
  assert.equal(afterRevoke.status, 403);
});

test('edit permission enables collaboration with version conflict detection', async () => {
  const alice = await register('alice_3');
  const bob = await register('bob_3');

  const created = await api('POST', '/api/levels', alice, {
    name: 'Collab',
    visibility: 'specific',
    data: { objects: [] },
  });
  const levelId = created.json.level.id;

  const share = await api('POST', `/api/levels/${levelId}/share`, alice, {
    username: 'bob_3',
    permissions: { view: true, play: true, edit: true },
  });
  const invitationId = share.json.invitationId;
  await api('POST', `/api/invitations/${invitationId}/accept`, bob);

  const edit1 = await api('PUT', `/api/levels/${levelId}`, bob, { data: { objects: [{ id: 8, x: 300, y: 15 }] }, expectedVersion: 1 });
  assert.equal(edit1.status, 200);
  assert.equal(edit1.json.level.version, 2);

  const conflict = await api('PUT', `/api/levels/${levelId}`, bob, { data: { objects: [] }, expectedVersion: 1 });
  assert.equal(conflict.status, 409);
});

test('public levels are listed; unlisted are not', async () => {
  const alice = await register('alice_4');
  await api('POST', '/api/levels', alice, { name: 'Public One', visibility: 'public', data: {} });
  await api('POST', '/api/levels', alice, { name: 'Hidden One', visibility: 'unlisted', data: {} });

  const list = await api('GET', '/api/levels', alice);
  const names = list.json.levels.map((l) => l.name);
  assert.ok(names.includes('Public One'));
  assert.ok(!names.includes('Hidden One'));
});

test('friends and notifications', async () => {
  const alice = await register('alice_5');
  const bob = await register('bob_5');

  const req = await api('POST', '/api/friends/request', alice, { username: 'bob_5' });
  assert.equal(req.status, 201);

  const incoming = await api('GET', '/api/friend-requests', bob);
  assert.equal(incoming.json.requests.length, 1);
  const reqId = incoming.json.requests[0].id;

  await api('POST', `/api/friend-requests/${reqId}/accept`, bob);
  const friends = await api('GET', '/api/friends', alice);
  assert.equal(friends.json.friends.length, 1);
  assert.equal(friends.json.friends[0].username, 'bob_5');

  const notifs = await api('GET', '/api/notifications', alice);
  assert.ok(notifs.json.notifications.some((n) => n.type === 'friend_accepted'));
});

test('comments require permission', async () => {
  const alice = await register('alice_6');
  const created = await api('POST', '/api/levels', alice, { name: 'Commented', visibility: 'public', data: {} });
  const levelId = created.json.level.id;

  const post = await api('POST', `/api/levels/${levelId}/comments`, alice, { body: 'nice level!' });
  assert.equal(post.status, 201);
  const comments = await api('GET', `/api/levels/${levelId}/comments`, alice);
  assert.equal(comments.json.comments.length, 1);
  assert.equal(comments.json.comments[0].body, 'nice level!');
});
