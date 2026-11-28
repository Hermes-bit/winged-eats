'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createModeration } = require('../server/services/moderation');
const { createApp } = require('../server/app');
const { openDatabase } = require('../server/db');
const { ApiError } = require('../server/errors');

const ID = 'ChIJ_test_place_0001';
const PHOTO = `places/${ID}/photos/photo_000000`;
const ADMIN = 'b1b8c5b5-956f-4ae3-907c-55fef6b9f011';
const cfg = { url: 'https://winged-test.supabase.co', anonKey: 'anon', serviceKey: 'private', adminUserId: ADMIN };

test('Supabase : authentification et erreurs de stockage explicites', async () => {
  const calls = [];
  const mod = createModeration(cfg, { fetchImpl: async (url, init) => {
    calls.push({ url, init });
    if (url.includes('/auth/v1/token')) return Response.json({ access_token: 'admin-token' });
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: init.headers.Authorization === 'Bearer admin-token' ? ADMIN : 'other' });
    if (url.includes('/rest/v1/')) return Response.json([{ place_id: ID, hidden: true, photos_hidden: false }]);
    throw new Error('unexpected');
  } });
  assert.deepEqual(await mod.login('admin@example.test', 'test'), { access_token: 'admin-token' });
  await assert.rejects(mod.authenticate('other'), (e) => e.status === 403);
  assert.equal((await mod.decisions([ID])).get(ID).hidden, true);
  await mod.save(ID, true, false);
  assert.equal(calls.find((c) => c.url.includes('/rest/v1/')).init.headers.Authorization, 'Bearer private');
  assert.throws(() => createModeration({ ...cfg, serviceKey: '' }), /incomplète/);
  const broken = createModeration(cfg, { fetchImpl: async () => { throw new Error('network'); } });
  await assert.rejects(broken.decisions([ID]), (e) => e.status === 503);
});

test('API : accès protégé, masquage et restauration sur toutes les routes Google', async () => {
  const state = new Map();
  const mod = {
    login: async () => ({ access_token: 'valid' }),
    authenticate: async (token) => { if (token !== 'valid') throw new ApiError(401, 'Non autorisé'); },
    decisions: async (ids) => new Map(ids.filter((id) => state.has(id)).map((id) => [id, state.get(id)])),
    list: async () => [...state.values()],
    save: async (id, hidden, photosHidden) => state.set(id, { place_id: id, hidden, photos_hidden: photosHidden }),
  };
  const place = { id: ID, name: 'Restaurant', photo: { name: PHOTO }, photos: [{ name: PHOTO }] };
  const places = {
    enabled: true, nearby: async () => [place], search: async () => [place],
    neighborhood: async () => ({ places: [place], nextPageToken: 'next' }),
    mapSearch: async () => ({ places: [place], nextPageToken: 'next' }),
    details: async () => place, photoUri: async () => 'https://images.example.test/photo',
  };
  const db = openDatabase(':memory:');
  const server = createApp(db, { places, moderation: mod, google: {} }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const write = (body, token = 'valid') => fetch(`${base}/admin/restaurants/${ID}`, {
    method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  try {
    assert.equal((await write({ hidden: true, photos_hidden: true }, 'wrong')).status, 401);
    assert.equal((await write({ hidden: true, photos_hidden: 'yes' })).status, 400);
    assert.equal((await write({ hidden: false, photos_hidden: true })).status, 200);
    const nearby = await (await fetch(`${base}/places/nearby?lat=12&lon=-1`)).json();
    assert.equal(nearby[0].photo, null);
    assert.deepEqual((await (await fetch(`${base}/places/${ID}`)).json()).photos, []);
    assert.equal((await fetch(`${base}/places/photo?name=${encodeURIComponent(PHOTO)}`)).status, 404);
    assert.equal((await write({ hidden: true, photos_hidden: true })).status, 200);
    assert.deepEqual(await (await fetch(`${base}/places/nearby?lat=12&lon=-1`)).json(), []);
    assert.deepEqual((await (await fetch(`${base}/places/neighborhood?name=Zogona`)).json()).places, []);
    assert.deepEqual((await (await fetch(`${base}/places/map?lat=12&lon=-1`)).json()).places, []);
    assert.equal((await fetch(`${base}/places/${ID}`)).status, 404);
    const admin = await (await fetch(`${base}/admin/restaurants?name=Zogona`, { headers: { Authorization: 'Bearer valid' } })).json();
    assert.equal(admin.places[0].moderation.hidden, true);
    assert.equal((await write({ hidden: false, photos_hidden: false })).status, 200);
    assert.equal((await (await fetch(`${base}/places/${ID}`)).json()).photo.name, PHOTO);
    mod.decisions = async () => { throw new ApiError(503, 'Base indisponible'); };
    assert.equal((await fetch(`${base}/places/nearby?lat=12&lon=-1`)).status, 503);
    assert.equal((await fetch(`${base}/places/photo?name=${encodeURIComponent(PHOTO)}`)).status, 503);
  } finally { server.close(); db.close(); }
});
