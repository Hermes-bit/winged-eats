'use strict';

const crypto = require('crypto');
const { DELIVERY, DEFAULT_COMMISSION_RATE, PICKUP_CODE_DIGITS } = require('../config');
const { distanceKm, deliveryFee } = require('./geo');
const { ApiError } = require('../errors');

const TRANSITIONS = {
  PENDING: ['ACCEPTED', 'REFUSED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY'],
  READY: ['DELIVERED'],
};
const ACTIVE_STATUSES = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'];
const MAX_QUANTITY = 20;
const MAX_LINES = 30;

// Numéro burkinabè : 8 chiffres, avec ou sans indicatif +226.
function normalizePhone(raw) {
  if (typeof raw !== 'string') return null;
  let digits = raw.replace(/[\s.-]/g, '');
  if (digits.startsWith('+226')) digits = digits.slice(4);
  else if (digits.startsWith('00226')) digits = digits.slice(5);
  return /^\d{8}$/.test(digits) ? `+226${digits}` : null;
}

function requireText(value, field, max) {
  if (typeof value !== 'string' || value.trim() === '' || value.trim().length > max) {
    throw new ApiError(400, `Champ invalide : ${field}`);
  }
  return value.trim();
}

function requireCoordinates(body) {
  const lat = Number(body.latitude);
  const lon = Number(body.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new ApiError(400, 'Coordonnées GPS invalides');
  }
  return { latitude: lat, longitude: lon };
}

function formatOrder(db, row, { internal = false } = {}) {
  const items = db.prepare(`SELECT item_name, unit_price, quantity, options_label, line_total
    FROM order_items WHERE order_id = ? ORDER BY id`).all(row.id);
  const order = {
    id: row.id,
    restaurant_id: row.restaurant_id,
    status: row.status,
    customer_name: row.customer_name,
    latitude: row.latitude,
    longitude: row.longitude,
    repere: row.repere,
    note: row.note,
    distance_km: row.distance_km,
    subtotal: row.subtotal,
    delivery_fee: row.delivery_fee,
    total: row.total,
    payment_method: row.payment_method,
    pickup_code: row.pickup_code,
    created_at: row.created_at,
    updated_at: row.updated_at,
    items,
  };
  if (internal) {
    order.commission = row.commission;
    order.net_to_restaurant = row.subtotal - row.commission;
    order.customer_phone = row.customer_phone;
  }
  return order;
}

function getOrderRow(db, id) {
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
}

function createOrder(db, body) {
  const restaurantId = Number(body.restaurant_id);
  if (!Number.isInteger(restaurantId)) throw new ApiError(400, 'restaurant_id invalide');

  const customerName = requireText(body.customer_name, 'customer_name', 80);
  const phone = normalizePhone(body.customer_phone);
  if (!phone) throw new ApiError(400, 'Numéro de téléphone invalide (8 chiffres, +226)');
  const repere = requireText(body.repere, 'repere', 200);
  const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 300) : null;
  const point = requireCoordinates(body);

  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > MAX_LINES) {
    throw new ApiError(400, 'Le panier doit contenir entre 1 et 30 lignes');
  }

  const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(restaurantId);
  if (!restaurant) throw new ApiError(404, 'Restaurant introuvable');
  if (restaurant.is_open !== 1) throw new ApiError(409, 'Restaurant fermé pour le moment');

  const km = distanceKm(point.latitude, point.longitude, restaurant.latitude, restaurant.longitude);
  if (km > DELIVERY.maxRadiusKm) {
    throw new ApiError(422, `Hors zone de livraison (maximum ${DELIVERY.maxRadiusKm} km)`);
  }

  // Les prix sont toujours recalculés ici : le client ne transmet jamais de montant.
  const lines = body.items.map((line) => {
    const itemId = Number(line.item_id);
    const quantity = Number(line.quantity);
    if (!Number.isInteger(itemId)) throw new ApiError(400, 'item_id invalide');
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw new ApiError(400, `Quantité invalide (1 à ${MAX_QUANTITY})`);
    }
    const selectedIds = [...new Set(Array.isArray(line.option_ids) ? line.option_ids.map(Number) : [])];

    const item = db.prepare('SELECT * FROM menu_items WHERE id = ? AND restaurant_id = ?').get(itemId, restaurantId);
    if (!item) throw new ApiError(400, `Article ${itemId} absent de ce restaurant`);
    if (item.available !== 1) throw new ApiError(409, `${item.name} est en rupture`);

    const groups = db.prepare('SELECT * FROM option_groups WHERE item_id = ?').all(itemId);
    const options = db.prepare(`SELECT o.* FROM options o JOIN option_groups g ON g.id = o.group_id
      WHERE g.item_id = ?`).all(itemId);

    const chosen = selectedIds.map((optId) => {
      const opt = options.find((o) => o.id === optId);
      if (!opt) throw new ApiError(400, `Option ${optId} invalide pour ${item.name}`);
      return opt;
    });

    for (const g of groups) {
      const count = chosen.filter((o) => o.group_id === g.id).length;
      if (g.required === 1 && count === 0) throw new ApiError(400, `Choix obligatoire : ${g.name} (${item.name})`);
      if (count > g.max_choices) throw new ApiError(400, `Trop de choix pour ${g.name} (${item.name})`);
    }

    const unitPrice = item.price + chosen.reduce((sum, o) => sum + o.price_delta, 0);
    return {
      item_id: item.id,
      item_name: item.name,
      unit_price: unitPrice,
      quantity,
      options_label: chosen.map((o) => o.name).join(' + '),
      line_total: unitPrice * quantity,
    };
  });

  const subtotal = lines.reduce((sum, l) => sum + l.line_total, 0);
  const fee = deliveryFee(km, DELIVERY);
  const rate = restaurant.commission_rate ?? DEFAULT_COMMISSION_RATE;
  const commission = Math.round(subtotal * rate);
  const pickupCode = String(crypto.randomInt(0, 10 ** PICKUP_CODE_DIGITS)).padStart(PICKUP_CODE_DIGITS, '0');

  db.exec('BEGIN');
  try {
    const orderId = Number(db.prepare(`INSERT INTO orders
      (restaurant_id, customer_name, customer_phone, latitude, longitude, repere, note, distance_km,
       subtotal, delivery_fee, total, commission, pickup_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      restaurantId, customerName, phone, point.latitude, point.longitude, repere, note,
      Math.round(km * 100) / 100, subtotal, fee, subtotal + fee, commission, pickupCode,
    ).lastInsertRowid);

    const insertLine = db.prepare(`INSERT INTO order_items
      (order_id, item_id, item_name, unit_price, quantity, options_label, line_total)
      VALUES (?, ?, ?, ?, ?, ?, ?)`);
    for (const l of lines) {
      insertLine.run(orderId, l.item_id, l.item_name, l.unit_price, l.quantity, l.options_label, l.line_total);
    }
    db.exec('COMMIT');
    return formatOrder(db, getOrderRow(db, orderId));
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function getCustomerOrder(db, id, rawPhone) {
  const row = getOrderRow(db, id);
  const phone = normalizePhone(rawPhone);
  if (!row || !phone || row.customer_phone !== phone) throw new ApiError(404, 'Commande introuvable');
  return formatOrder(db, row);
}

function cancelCustomerOrder(db, id, rawPhone) {
  const current = getCustomerOrder(db, id, rawPhone);
  if (current.status !== 'PENDING') {
    throw new ApiError(409, 'Commande déjà acceptée : annulation impossible');
  }
  db.prepare("UPDATE orders SET status = 'CANCELLED', updated_at = datetime('now') WHERE id = ?").run(id);
  return getCustomerOrder(db, id, rawPhone);
}

function listPartnerOrders(db, restaurantId) {
  const rows = db.prepare(`SELECT * FROM orders WHERE restaurant_id = ?
    ORDER BY (status IN (${ACTIVE_STATUSES.map(() => '?').join(',')})) DESC, id DESC LIMIT 100`)
    .all(restaurantId, ...ACTIVE_STATUSES);
  return rows.map((r) => formatOrder(db, r, { internal: true }));
}

function updatePartnerOrderStatus(db, restaurantId, id, nextStatus) {
  const row = getOrderRow(db, id);
  if (!row || row.restaurant_id !== restaurantId) throw new ApiError(404, 'Commande introuvable');
  const allowed = TRANSITIONS[row.status] || [];
  if (!allowed.includes(nextStatus)) {
    throw new ApiError(409, `Transition interdite : ${row.status} → ${nextStatus}`);
  }
  db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(nextStatus, id);
  return formatOrder(db, getOrderRow(db, id), { internal: true });
}

module.exports = {
  createOrder,
  getCustomerOrder,
  cancelCustomerOrder,
  listPartnerOrders,
  updatePartnerOrderStatus,
  normalizePhone,
  TRANSITIONS,
};
