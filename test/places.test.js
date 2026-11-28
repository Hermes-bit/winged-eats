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
    if (url.includes(`/places/${PLACE_ID}`)) return json(200, fakePlace({ nationalPhoneNumber: '70 00 00 00', websiteUri: 'https://restaurant.example/menu', regularOpeningHours: { weekdayDescriptions: ['lundi: 10:00 – 23:00'] } }));
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

test('GitHub Pages peut consulter Places mais pas les API de commande', async () => {
  const headers = { Origin: 'https://hermes-bit.github.io' };
  const config = await fetch(`${base}/api/config`, { headers });
  assert.equal(config.headers.get('access-control-allow-origin'), headers.Origin);
  const places = await fetch(`${base}/api/places/nearby?lat=${ORIGIN.latitude}&lon=${ORIGIN.longitude}`, { headers });
  assert.equal(places.headers.get('access-control-allow-origin'), headers.Origin);
  const other = await fetch(`${base}/api/config`, { headers: { Origin: 'https://example.com' } });
  assert.equal(other.headers.get('access-control-allow-origin'), null);
  const orders = await fetch(`${base}/api/orders/1`, { headers });
  assert.equal(orders.headers.get('access-control-allow-origin'), null);
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

test('recherche par quartier : pagination et validation avant appel Google', async () => {
  const requests = [];
  const service = createPlacesService(GOOGLE, {
    fetchImpl: async (url, init) => {
      requests.push(JSON.parse(init.body));
      assert.match(init.headers['X-Goog-FieldMask'], /nextPageToken/);
      return { ok: true, status: 200, json: async () => ({
        places: [fakePlace(), fakePlace({ businessStatus: 'CLOSED_PERMANENTLY' })],
        nextPageToken: requests.length === 1 ? 'page-suivante' : undefined,
      }) };
    },
  });
  const first = await service.neighborhood(ORIGIN, { name: 'Zogona' });
  assert.equal(first.places.length, 1);
  assert.equal(first.nextPageToken, 'page-suivante');
  assert.match(requests[0].textQuery, /Zogona, Ouagadougou/);
  assert.equal(requests[0].includedType, 'restaurant');
  const next = await service.neighborhood(ORIGIN, { name: 'Zogona', pageToken: first.nextPageToken });
  assert.equal(requests[1].pageToken, 'page-suivante');
  assert.equal(next.nextPageToken, null);
  await assert.rejects(service.neighborhood(ORIGIN, { name: ' ' }), (e) => e.status === 400);
  await assert.rejects(service.neighborhood(ORIGIN, { name: 'Zogona', pageToken: 'x'.repeat(2049) }), (e) => e.status === 400);
  assert.equal(requests.length, 2);
});

test('route quartier renvoie les résultats et accepte l’origine GitHub Pages', async () => {
  const res = await fetch(`${base}/api/places/neighborhood?name=Zogona&lat=12.365&lon=-1.51`, {
    headers: { Origin: 'https://hermes-bit.github.io' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://hermes-bit.github.io');
  assert.ok(Array.isArray((await res.json()).places));
  const invalid = await fetch(`${base}/api/places/neighborhood?name=`);
  assert.equal(invalid.status, 400);
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
  assert.equal(data.website, 'https://restaurant.example/menu');
  assert.equal(data.maps_uri, 'https://maps.google.com/?cid=1');
});

test('fiche détaillée : les liens externes invalides ne sont pas exposés', async () => {
  const service = createPlacesService(GOOGLE, {
    fetchImpl: async () => ({
      ok: true, status: 200,
      json: async () => fakePlace({ websiteUri: 'javascript:alert(1)', googleMapsUri: 'https://user:password@example.com/' }),
    }),
  });
  const data = await service.details(PLACE_ID, ORIGIN);
  assert.equal(data.website, null);
  assert.equal(data.maps_uri, null);
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
