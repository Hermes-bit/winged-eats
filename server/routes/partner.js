'use strict';

const express = require('express');
const { hashCode } = require('../seed');
const { getRestaurantMenu } = require('../services/catalog');
const orders = require('../services/orders');
const { ApiError } = require('../errors');

const router = express.Router();

// Authentification partenaire MVP : code remis au restaurant, stocké haché.
// À remplacer par des comptes utilisateurs avec mot de passe (phase 3).
function requirePartner(req, res, next) {
  const header = req.headers.authorization || '';
  const code = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const restaurant = code
    ? req.db.prepare('SELECT id, name FROM restaurants WHERE partner_code_hash = ?').get(hashCode(code))
    : null;
  if (!restaurant) return next(new ApiError(401, 'Code partenaire invalide'));
  req.restaurant = restaurant;
  return next();
}

router.post('/login', (req, res) => {
  const code = typeof (req.body || {}).code === 'string' ? req.body.code.trim() : '';
  const restaurant = code
    ? req.db.prepare('SELECT id, name FROM restaurants WHERE partner_code_hash = ?').get(hashCode(code))
    : null;
  if (!restaurant) throw new ApiError(401, 'Code partenaire invalide');
  res.json(restaurant);
});

router.use(requirePartner);

router.get('/menu', (req, res) => {
  res.json(getRestaurantMenu(req.db, req.restaurant.id));
});

router.get('/orders', (req, res) => {
  res.json(orders.listPartnerOrders(req.db, req.restaurant.id));
});

router.post('/orders/:id/status', (req, res) => {
  const status = (req.body || {}).status;
  res.json(orders.updatePartnerOrderStatus(req.db, req.restaurant.id, Number(req.params.id), status));
});

router.patch('/items/:id', (req, res) => {
  const available = (req.body || {}).available;
  if (typeof available !== 'boolean') throw new ApiError(400, 'available doit être un booléen');
  const info = req.db.prepare('UPDATE menu_items SET available = ? WHERE id = ? AND restaurant_id = ?')
    .run(available ? 1 : 0, Number(req.params.id), req.restaurant.id);
  if (info.changes === 0) throw new ApiError(404, 'Article introuvable');
  res.json({ id: Number(req.params.id), available });
});

router.patch('/restaurant', (req, res) => {
  const isOpen = (req.body || {}).is_open;
  if (typeof isOpen !== 'boolean') throw new ApiError(400, 'is_open doit être un booléen');
  req.db.prepare('UPDATE restaurants SET is_open = ? WHERE id = ?').run(isOpen ? 1 : 0, req.restaurant.id);
  res.json({ id: req.restaurant.id, is_open: isOpen });
});

module.exports = router;
