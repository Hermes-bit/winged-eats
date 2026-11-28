'use strict';

const express = require('express');
const { ApiError } = require('../errors');
const { isValidPlaceId } = require('../services/places');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

function createAdminRouter(places, moderation) {
  const router = express.Router();
  let loginAttempts = [];
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.post('/login', wrap(async (req, res) => {
    const now = Date.now();
    loginAttempts = loginAttempts.filter((time) => now - time < 60000);
    if (loginAttempts.length >= 10) throw new ApiError(429, 'Trop de tentatives de connexion. Réessayez dans une minute.');
    loginAttempts.push(now);
    res.json(await moderation.login(req.body?.email, req.body?.password));
  }));
  router.use(wrap(async (req, res, next) => {
    const match = /^Bearer ([^\s]+)$/.exec(req.get('Authorization') || '');
    await moderation.authenticate(match?.[1]);
    next();
  }));
  router.get('/restaurants', wrap(async (req, res) => {
    const data = await places.neighborhood(null, { name: req.query.name, pageToken: req.query.pageToken });
    const decisions = await moderation.decisions(data.places.map((p) => p.id));
    res.json({ ...data, places: data.places.map((p) => ({ ...p, moderation: decisions.get(p.id) || { hidden: false, photos_hidden: false } })) });
  }));
  router.get('/decisions', wrap(async (req, res) => {
    const offset = req.query.offset === undefined ? 0 : Number(req.query.offset);
    const rows = await moderation.list(offset);
    res.json({ rows, nextOffset: rows.length === 100 ? offset + 100 : null });
  }));
  router.get('/restaurants/:id', wrap(async (req, res) => {
    const place = await places.details(req.params.id, null);
    const decisions = await moderation.decisions([place.id]);
    res.json({ ...place, moderation: decisions.get(place.id) || { hidden: false, photos_hidden: false } });
  }));
  router.put('/restaurants/:id', wrap(async (req, res) => {
    if (!isValidPlaceId(req.params.id)) throw new ApiError(400, 'Identifiant Google invalide.');
    const { hidden, photos_hidden: photosHidden } = req.body || {};
    if (typeof hidden !== 'boolean' || typeof photosHidden !== 'boolean') throw new ApiError(400, 'Décision de modération invalide.');
    await moderation.save(req.params.id, hidden, photosHidden);
    res.json({ saved: true });
  }));
  return router;
}

module.exports = { createAdminRouter };
