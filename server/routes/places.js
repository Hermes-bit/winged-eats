'use strict';

const express = require('express');
const { ApiError } = require('../errors');
const { publicCategories } = require('../services/places');

// Express 4 ne transmet pas les erreurs des fonctions async : on les redirige vers le gestionnaire commun.
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

function readOrigin(query, required) {
  if (query.lat === undefined && query.lon === undefined && !required) return null;
  const latitude = Number(query.lat);
  const longitude = Number(query.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
    || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new ApiError(400, 'Paramètres lat et lon invalides');
  }
  return { latitude, longitude };
}

function createPlacesRouter(places, google) {
  const router = express.Router();

  // Configuration publique de l'interface. La clé navigateur est faite pour être visible :
  // elle doit être restreinte au domaine du site dans Google Cloud.
  router.get('/config', (req, res) => {
    res.json({
      google: {
        places: places.enabled,
        maps_key: google.browserKey,
        map_id: google.mapId,
      },
      categories: publicCategories(),
    });
  });

  router.get('/places/nearby', wrap(async (req, res) => {
    res.json(await places.nearby(readOrigin(req.query, true)));
  }));

  router.get('/places/search', wrap(async (req, res) => {
    const origin = readOrigin(req.query, true);
    res.json(await places.search(origin, {
      text: typeof req.query.q === 'string' ? req.query.q : '',
      category: typeof req.query.cat === 'string' && req.query.cat ? req.query.cat : null,
    }));
  }));

  // Redirige vers l'image hébergée par Google : toujours la photo actuelle de l'établissement.
  router.get('/places/photo', wrap(async (req, res) => {
    const uri = await places.photoUri(req.query.name, req.query.w);
    res.set('Cache-Control', 'no-store');
    res.redirect(302, uri);
  }));

  router.get('/places/:id', wrap(async (req, res) => {
    res.json(await places.details(req.params.id, readOrigin(req.query, false)));
  }));

  return router;
}

module.exports = { createPlacesRouter };
