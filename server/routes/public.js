'use strict';

const express = require('express');
const { listRestaurants, getRestaurantMenu } = require('../services/catalog');
const orders = require('../services/orders');
const { ApiError } = require('../errors');

const router = express.Router();

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
  res.json(listRestaurants(req.db, origin));
});

router.get('/restaurants/:id', (req, res) => {
  const menu = getRestaurantMenu(req.db, Number(req.params.id));
  if (!menu) throw new ApiError(404, 'Restaurant introuvable');
  res.json(menu);
});

router.post('/orders', (req, res) => {
  res.status(201).json(orders.createOrder(req.db, req.body || {}));
});

router.get('/orders/:id', (req, res) => {
  res.json(orders.getCustomerOrder(req.db, Number(req.params.id), req.query.phone));
});

router.post('/orders/:id/cancel', (req, res) => {
  res.json(orders.cancelCustomerOrder(req.db, Number(req.params.id), (req.body || {}).phone));
});

module.exports = router;
