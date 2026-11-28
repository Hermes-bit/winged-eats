'use strict';

const express = require('express');
const { listRestaurants, getRestaurantMenu } = require('../services/catalog');
const orders = require('../services/orders');
const { ApiError } = require('../errors');

const router = express.Router();
const isDemo = (name) => /\(démo\)\s*$/i.test(name || '');
function checkDemoRestaurant(req, id) {
  const parsed = Number(id);
  if (!req.hideDemo || !Number.isSafeInteger(parsed) || parsed < 1) return;
  const row = req.db.prepare('SELECT name FROM restaurants WHERE id = ?').get(parsed);
  if (row && isDemo(row.name)) throw new ApiError(404, 'Restaurant introuvable');
}
function checkDemoOrder(req, id) {
  const parsed = Number(id);
  if (!req.hideDemo || !Number.isSafeInteger(parsed) || parsed < 1) return;
  const row = req.db.prepare('SELECT r.name FROM orders o JOIN restaurants r ON r.id = o.restaurant_id WHERE o.id = ?').get(parsed);
  if (row && isDemo(row.name)) throw new ApiError(404, 'Commande introuvable');
}

router.get('/restaurants', (req, res) => {
  const lat = req.query.lat;
  const lon = req.query.lon;
  let origin = null;
  if (lat !== undefined || lon !== undefined) {
    const latitude = Number(lat);
    const longitude = Number(lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new ApiError(400, 'Paramètres lat et lon invalides');
    }
    origin = { latitude, longitude };
  }
  const list = listRestaurants(req.db, origin);
  res.json(req.hideDemo ? list.filter((r) => !isDemo(r.name)) : list);
});

router.get('/restaurants/:id', (req, res) => {
  checkDemoRestaurant(req, req.params.id);
  const menu = getRestaurantMenu(req.db, Number(req.params.id));
  if (!menu) throw new ApiError(404, 'Restaurant introuvable');
  res.json(menu);
});

router.post('/orders', (req, res) => {
  checkDemoRestaurant(req, (req.body || {}).restaurant_id);
  res.status(201).json(orders.createOrder(req.db, req.body || {}));
});

router.get('/orders/:id', (req, res) => {
  checkDemoOrder(req, req.params.id);
  res.json(orders.getCustomerOrder(req.db, Number(req.params.id), req.query.phone));
});

router.post('/orders/:id/cancel', (req, res) => {
  checkDemoOrder(req, req.params.id);
  res.json(orders.cancelCustomerOrder(req.db, Number(req.params.id), (req.body || {}).phone));
});

module.exports = router;
