'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { openDatabase } = require('../server/db');
const { seedDemoData } = require('../server/seed');
const { createApp } = require('../server/app');
const { distanceKm, deliveryFee } = require('../server/services/geo');
const { DELIVERY } = require('../server/config');

const ROSE_POINT = { latitude: 12.3655, longitude: -1.5095 };
const FAR_POINT = { latitude: 11.1771, longitude: -4.2979 }; // Bobo-Dioulasso, hors zone

let server;
let base;
let db;
let restaurants;

async function call(method, path, body, headers = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

before(async () => {
  db = openDatabase(':memory:');
  restaurants = seedDemoData(db);
  server = createApp(db).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  db.close();
});

const rose = () => restaurants.find((r) => r.name.startsWith('Chez Maman Rose'));
const baobab = () => restaurants.find((r) => r.name.startsWith('Le Baobab'));

async function menuOf(restaurantId) {
  const { data } = await call('GET', `/api/restaurants/${restaurantId}`);
  return data;
}

function findItem(menu, name) {
  return menu.categories.flatMap((c) => c.items).find((i) => i.name === name);
}

const customer = { customer_name: 'Aminata', customer_phone: '70 12 34 56', repere: 'Portail bleu', ...ROSE_POINT };

test('calcul de distance et frais de livraison', () => {
  assert.equal(distanceKm(12.3, -1.5, 12.3, -1.5), 0);
  const km = distanceKm(12.0, -1.0, 12.1, -1.0);
  assert.ok(Math.abs(km - 11.12) < 0.05, `distance attendue ~11,1 km, obtenue ${km}`);
  assert.equal(deliveryFee(0, DELIVERY), 300);
  assert.equal(deliveryFee(2.1, DELIVERY), 850);
  assert.equal(deliveryFee(2.0, DELIVERY), 800);
});

test('liste triée par distance avec zone de livraison', async () => {
  const { data } = await call('GET', `/api/restaurants?lat=${ROSE_POINT.latitude}&lon=${ROSE_POINT.longitude}`);
  assert.equal(data.length, 3);
  assert.equal(data[0].name, 'Chez Maman Rose (démo)');
  assert.ok(data.every((r, i) => i === 0 || data[i - 1].distance_km <= r.distance_km));
  assert.ok(data.every((r) => r.in_delivery_zone === true));
});

test('hors zone : restaurants signalés hors livraison', async () => {
  const { data } = await call('GET', `/api/restaurants?lat=${FAR_POINT.latitude}&lon=${FAR_POINT.longitude}`);
  assert.ok(data.every((r) => r.in_delivery_zone === false));
});

test('commande : les prix sont recalculés côté serveur', async () => {
  const menu = await menuOf(rose().id);
  const demi = findItem(menu, 'Demi-poulet braisé');
  const attieke = demi.option_groups[0].options.find((o) => o.name === 'Attiéké');
  const alloco = demi.option_groups[1].options.find((o) => o.name === 'Œuf');

  const { status, data } = await call('POST', '/api/orders', {
    ...customer,
    restaurant_id: rose().id,
    items: [{ item_id: demi.id, quantity: 2, option_ids: [attieke.id, alloco.id], price: 1 }],
  });
  assert.equal(status, 201);
  // 2 × (3 500 + 0 + 300) = 7 600, quel que soit le prix envoyé par le client
  assert.equal(data.subtotal, 7600);
  assert.equal(data.items[0].options_label, 'Attiéké + Œuf');
  assert.equal(data.total, data.subtotal + data.delivery_fee);
  assert.equal(data.status, 'PENDING');
  assert.equal(data.pickup_code.length, 4);
  assert.equal(data.commission, undefined, 'la commission ne doit pas être visible du client');
});

test('commande refusée : variante obligatoire manquante', async () => {
  const menu = await menuOf(rose().id);
  const brochettes = findItem(menu, 'Brochettes de bœuf (x5)');
  const { status, data } = await call('POST', '/api/orders', {
    ...customer,
    restaurant_id: rose().id,
    items: [{ item_id: brochettes.id, quantity: 1, option_ids: [] }],
  });
  assert.equal(status, 400);
  assert.match(data.error, /Choix obligatoire/);
});

test('commande refusée : option d\'un autre article', async () => {
  const menu = await menuOf(rose().id);
  const brochettes = findItem(menu, 'Brochettes de bœuf (x5)');
  const demi = findItem(menu, 'Demi-poulet braisé');
  const { status } = await call('POST', '/api/orders', {
    ...customer,
    restaurant_id: rose().id,
    items: [{ item_id: brochettes.id, quantity: 1, option_ids: [demi.option_groups[0].options[0].id] }],
  });
  assert.equal(status, 400);
});

test('commande refusée : hors zone et quantité invalide', async () => {
  const menu = await menuOf(rose().id);
  const jus = findItem(menu, 'Jus de bissap 50 cl');
  const far = await call('POST', '/api/orders', {
    ...customer, latitude: FAR_POINT.latitude, longitude: FAR_POINT.longitude,
    restaurant_id: rose().id, items: [{ item_id: jus.id, quantity: 1, option_ids: [] }],
  });
  assert.equal(far.status, 422);

  const badQty = await call('POST', '/api/orders', {
    ...customer, restaurant_id: rose().id, items: [{ item_id: jus.id, quantity: 0, option_ids: [] }],
  });
  assert.equal(badQty.status, 400);
});

test('téléphone invalide refusé', async () => {
  const menu = await menuOf(baobab().id);
  const tô = findItem(menu, 'Tô et sauce gombo');
  const { status } = await call('POST', '/api/orders', {
    ...customer, customer_phone: '123', restaurant_id: baobab().id,
    items: [{ item_id: tô.id, quantity: 1, option_ids: [] }],
  });
  assert.equal(status, 400);
});

test('suivi client protégé par le numéro de téléphone', async () => {
  const menu = await menuOf(baobab().id);
  const tô = findItem(menu, 'Tô et sauce gombo');
  const created = await call('POST', '/api/orders', {
    ...customer, restaurant_id: baobab().id, items: [{ item_id: tô.id, quantity: 1, option_ids: [] }],
  });
  const id = created.data.id;

  const ok = await call('GET', `/api/orders/${id}?phone=70123456`);
  assert.equal(ok.status, 200);
  const wrong = await call('GET', `/api/orders/${id}?phone=76000000`);
  assert.equal(wrong.status, 404);
});

test('partenaire : authentification et cycle de statuts', async () => {
  const bad = await call('POST', '/api/partner/login', { code: 'FAUX' });
  assert.equal(bad.status, 401);

  const auth = { Authorization: `Bearer ${rose().partner_code}` };
  const menu = await menuOf(rose().id);
  const jus = findItem(menu, 'Jus de bissap 50 cl');
  const created = await call('POST', '/api/orders', {
    ...customer, restaurant_id: rose().id, items: [{ item_id: jus.id, quantity: 1, option_ids: [] }],
  });
  const id = created.data.id;

  const list = await call('GET', '/api/partner/orders', undefined, auth);
  assert.equal(list.status, 200);
  assert.ok(list.data.some((o) => o.id === id && o.commission >= 0));

  const skip = await call('POST', `/api/partner/orders/${id}/status`, { status: 'READY' }, auth);
  assert.equal(skip.status, 409, 'on ne peut pas sauter une étape');

  for (const step of ['ACCEPTED', 'PREPARING', 'READY']) {
    const r = await call('POST', `/api/partner/orders/${id}/status`, { status: step }, auth);
    assert.equal(r.status, 200);
    assert.equal(r.data.status, step);
  }

  const other = await call('POST', `/api/partner/orders/${id}/status`, { status: 'ACCEPTED' },
    { Authorization: `Bearer ${baobab().partner_code}` });
  assert.equal(other.status, 404, 'un restaurant ne voit pas les commandes d\'un autre');
});

test('client : annulation possible uniquement avant acceptation', async () => {
  const menu = await menuOf(baobab().id);
  const tô = findItem(menu, 'Tô et sauce gombo');
  const created = await call('POST', '/api/orders', {
    ...customer, restaurant_id: baobab().id, items: [{ item_id: tô.id, quantity: 1, option_ids: [] }],
  });
  const cancel = await call('POST', `/api/orders/${created.data.id}/cancel`, { phone: customer.customer_phone });
  assert.equal(cancel.status, 200);
  assert.equal(cancel.data.status, 'CANCELLED');
});

test('partenaire : rupture et fermeture', async () => {
  const auth = { Authorization: `Bearer ${baobab().partner_code}` };
  const menu = await menuOf(baobab().id);
  const poisson = findItem(menu, 'Poisson braisé');

  const off = await call('PATCH', `/api/partner/items/${poisson.id}`, { available: false }, auth);
  assert.equal(off.status, 200);
  const order = await call('POST', '/api/orders', {
    ...customer, restaurant_id: baobab().id, items: [{ item_id: poisson.id, quantity: 1, option_ids: [] }],
  });
  assert.equal(order.status, 409, 'un article en rupture ne peut pas être commandé');

  await call('PATCH', `/api/partner/items/${poisson.id}`, { available: true }, auth);
  await call('PATCH', '/api/partner/restaurant', { is_open: false }, auth);
  const closed = await call('POST', '/api/orders', {
    ...customer, restaurant_id: baobab().id, items: [{ item_id: poisson.id, quantity: 1, option_ids: [] }],
  });
  assert.equal(closed.status, 409, 'restaurant fermé : commande refusée');
  await call('PATCH', '/api/partner/restaurant', { is_open: true }, auth);
});
