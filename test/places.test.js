'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { openDatabase } = require('../server/db');
const { createApp } = require('../server/app');
const {
  createPlacesService, categorize, isValidPlaceId, isValidPhotoName, createLimiter,
} = require('../server/services/places');

const ORIGIN = { latitude: 12.365, longitude: -1.51 };
const GOOGLE = {
  placesKey: 'cle-de-test', browserKey: 'cle-navigateur', mapId: 'DEMO_MAP_ID',
  placesBaseUrl: 'https://google.test/v1', maxCallsPerMinute: 100, maxCallsPerDay: 100, searchRadiusM: 5000,
};
const PLACE_ID = 'ChIJ_test_maquis_0001';
const PHOTO = `places/${PLACE_ID}/photos/AXCi2Q_photo_0001`;

const fakePlace = (over = {}) => ({
  id: PLACE_ID,
  displayName: { text: 'Maquis du Rond-Point' },
  shortFormattedAddress: 'Ouaga 2000',
  location: { latitude: 12.37, longitude: -1.51 },
  types: ['bar', 'restaurant'],
  primaryType: 'bar',
  rating: 4.4,
  userRatingCount: 210,
  currentOpeningHours: { openNow: true },
  photos: [{ name: PHOTO, authorAttributions: [{ displayName: 'Awa', uri: 'https://maps.google.com/u/1' }] }],
  googleMapsUri: 'https://maps.google.com/?cid=1',
  businessStatus: 'OPERATIONAL',
  ...over,
});

// Faux Google : enregistre les requêtes et répond comme l'API Places (New).
function fakeFetch(log) {
  return async (url, init) => {
    log.push({ url, init });
    const json = (status, body) => ({ ok: status < 400, status, json: async () => body });
    if (url.endsWith('/places:searchNearby')) {
      return json(200, { places: [fakePlace(), fakePlace({ id: 'ChIJ_closed_000001', businessStatus: 'CLOSED_PERMANENTLY' })] });
    }
    if (url.endsWith('/places:searchText')) {
      return json(200, { places: [fakePlace({ id: 'ChIJ_far_away_00001', location: { latitude: 11.17, longitude: -4.29 } }), fakePlace()] });
    }
    if (url.includes('/media?')) return json(200, { photoUri: 'https://lh3.googleusercontent.test/photo.jpg' });
    if (url.includes(`/places/${PLACE_ID}`)) return json(200, fakePlace({ nationalPhoneNumber: '70 00 00 00', regularOpeningHours: { weekdayDescriptions: ['lundi: 10:00 – 23:00'] } }));
    return json(404, { error: { message: 'Not found' } });
  };
}

let server;
let base;
let db;
const log = [];

before(async () => {
  db = openDatabase(':memory:');
  const places = createPlacesService(GOOGLE, { fetchImpl: fakeFetch(log) });
  server = createApp(db, { places, google: GOOGLE }).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  db.close();
});

test('catégorisation façon plateforme de livraison', () => {
  assert.equal(categorize({ primaryType: 'pizza_restaurant', types: ['restaurant'] }).key, 'pizza');
  assert.equal(categorize({ types: ['bar', 'restaurant'] }).key, 'maquis');
  assert.equal(categorize({ types: ['restaurant'], displayName: { text: 'Chawarma Express' } }).key, 'chawarma');
  assert.equal(categorize({ types: ['restaurant'], displayName: { text: 'Poulet Braisé de la Gare' } }).key, 'grillades');
  assert.equal(categorize({ types: ['restaurant'], displayName: { text: 'Le Verdoyant' } }).key, 'restaurant');
});

test('identifiants Google validés (pas d’injection de chemin)', () => {
  assert.ok(isValidPlaceId(PLACE_ID));
  assert.ok(!isValidPlaceId('../../etc/passwd'));
  assert.ok(isValidPhotoName(PHOTO));
  assert.ok(!isValidPhotoName('places/x/photos/y/../../admin'));
  assert.ok(!isValidPhotoName('https://evil.test/photo'));
});

test('plafond d’appels Google par minute', () => {
  let t = 0;
  const limiter = createLimiter({ perMinute: 2, perDay: 10, now: () => t });
  limiter.take();
  limiter.take();
  assert.throws(() => limiter.take(), (e) => e.status === 429);
  t = 61000;
  assert.doesNotThrow(() => limiter.take());
});

test('configuration publique : catégories et clé navigateur, jamais la clé serveur', async () => {
  const res = await fetch(`${base}/api/config`);
  const data = await res.json();
  assert.equal(data.google.places, true);
  assert.equal(data.google.maps_key, 'cle-navigateur');
  assert.ok(data.categories.some((c) => c.key === 'maquis'));
  assert.ok(!JSON.stringify(data).includes('cle-de-test'));
});

test('restaurants à proximité : normalisés, catégorisés, fermés définitivement exclus', async () => {
  const res = await fetch(`${base}/api/places/nearby?lat=${ORIGIN.latitude}&lon=${ORIGIN.longitude}`);
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.length, 1);
  assert.equal(data[0].category, 'maquis');
  assert.equal(data[0].photo.author, 'Awa');
  assert.ok(data[0].distance_km < 1);
  const sent = log.find((l) => l.url.endsWith('/places:searchNearby'));
  assert.equal(sent.init.headers['X-Goog-Api-Key'], 'cle-de-test');
  assert.ok(sent.init.headers['X-Goog-FieldMask'].includes('places.photos'));
});

test('recherche par catégorie : établissements trop éloignés écartés', async () => {
  const res = await fetch(`${base}/api/places/search?lat=${ORIGIN.latitude}&lon=${ORIGIN.longitude}&cat=pizza`);
  const data = await res.json();
  assert.equal(data.length, 1);
  assert.equal(data[0].category, 'pizza');
  const bad = await fetch(`${base}/api/places/search?lat=${ORIGIN.latitude}&lon=${ORIGIN.longitude}&cat=inconnue`);
  assert.equal(bad.status, 400);
});

test('photo : redirection vers l’image Google actuelle, non mise en cache', async () => {
  const res = await fetch(`${base}/api/places/photo?name=${encodeURIComponent(PHOTO)}&w=400`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), 'https://lh3.googleusercontent.test/photo.jpg');
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const bad = await fetch(`${base}/api/places/photo?name=${encodeURIComponent('../secret')}`, { redirect: 'manual' });
  assert.equal(bad.status, 400);
});

test('fiche détaillée : téléphone et horaires', async () => {
  const res = await fetch(`${base}/api/places/${PLACE_ID}?lat=${ORIGIN.latitude}&lon=${ORIGIN.longitude}`);
  const data = await res.json();
  assert.equal(data.phone_display, '70 00 00 00');
  assert.deepEqual(data.hours, ['lundi: 10:00 – 23:00']);
});

test('sans clé Google : réponse 503 explicite', async () => {
  const off = createApp(db, { places: createPlacesService({ ...GOOGLE, placesKey: null }), google: { ...GOOGLE, browserKey: null } }).listen(0);
  await new Promise((r) => off.once('listening', r));
  const url = `http://127.0.0.1:${off.address().port}`;
  const res = await fetch(`${url}/api/places/nearby?lat=12&lon=-1.5`);
  assert.equal(res.status, 503);
  const cfg = await (await fetch(`${url}/api/config`)).json();
  assert.equal(cfg.google.places, false);
  off.close();
});

test('refus Google : seul le code diagnostique valide est transmis', async () => {
  const service = createPlacesService(GOOGLE, {
    fetchImpl: async () => ({
      ok: false, status: 403,
      json: async () => ({
        error: {
          message: 'Permission denied on the service.',
          details: [{
            '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
            reason: 'API_KEY_SERVICE_BLOCKED',
            metadata: { credential: 'secret-a-ne-pas-afficher' },
          }],
        },
      }),
    }),
  });
  await assert.rejects(service.nearby(ORIGIN), (err) => {
    assert.match(err.message, /code Google : API_KEY_SERVICE_BLOCKED/);
    assert.doesNotMatch(err.message, /secret-a-ne-pas-afficher/);
    return true;
  });
});
