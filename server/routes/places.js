'use strict';

const express = require('express');
const { ApiError } = require('../errors');
const { publicCategories } = require('../services/places');
const { excluded_osm_ids: excludedOsmIds } = require('../moderation.json');
if (!Array.isArray(excludedOsmIds) || !excludedOsmIds.every((id) => typeof id === 'string' && /^(node|way|relation)\/[1-9]\d*$/.test(id))) {
  throw new Error('Liste de modération OpenStreetMap invalide');
}

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

function createPlacesRouter(places, google, moderation) {
  const router = express.Router();
  async function applyModeration(list) {
    const decisions = await moderation.decisions(list.map((p) => p.id));
    return list.filter((p) => !decisions.get(p.id)?.hidden).map((p) => {
      if (!decisions.get(p.id)?.photos_hidden) return p;
      return { ...p, photo: null, ...(p.photos ? { photos: [] } : {}) };
    });
  }

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
      moderation: { excluded_osm_ids: excludedOsmIds },
    });
  });

  router.get('/places/nearby', wrap(async (req, res) => {
    res.json(await applyModeration(await places.nearby(readOrigin(req.query, true))));
  }));

  router.get('/places/search', wrap(async (req, res) => {
    const origin = readOrigin(req.query, true);
    res.json(await applyModeration(await places.search(origin, {
      text: typeof req.query.q === 'string' ? req.query.q : '',
      category: typeof req.query.cat === 'string' && req.query.cat ? req.query.cat : null,
    })));
  }));

  router.get('/places/neighborhood', wrap(async (req, res) => {
    const data = await places.neighborhood(readOrigin(req.query, false), {
      name: req.query.name,
      pageToken: req.query.pageToken,
    });
    res.json({ ...data, places: await applyModeration(data.places) });
  }));

  router.get('/places/map', wrap(async (req, res) => {
    const data = await places.mapSearch(readOrigin(req.query, true), { pageToken: req.query.pageToken });
    res.json({ ...data, places: await applyModeration(data.places) });
  }));

  // Redirige vers l'image hébergée par Google : toujours la photo actuelle de l'établissement.
  router.get('/places/photo', wrap(async (req, res) => {
    const id = typeof req.query.name === 'string' ? req.query.name.split('/')[1] : '';
    const decisions = await moderation.decisions(id ? [id] : []);
    if (decisions.get(id)?.hidden || decisions.get(id)?.photos_hidden) throw new ApiError(404, 'Photo indisponible sur Winged Eats');
    const uri = await places.photoUri(req.query.name, req.query.w);
    res.set('Cache-Control', 'no-store');
    res.redirect(302, uri);
  }));

  router.get('/places/:id', wrap(async (req, res) => {
    const decisions = await moderation.decisions([req.params.id]);
    if (decisions.get(req.params.id)?.hidden) throw new ApiError(404, 'Établissement indisponible sur Winged Eats');
    let place = await places.details(req.params.id, readOrigin(req.query, false));
    if (decisions.get(req.params.id)?.photos_hidden) place = { ...place, photo: null, photos: [] };
    res.json(place);
  }));

  return router;
}

module.exports = { createPlacesRouter };
