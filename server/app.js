'use strict';

const path = require('path');
const express = require('express');
const { ApiError } = require('./errors');
const publicRoutes = require('./routes/public');
const partnerRoutes = require('./routes/partner');
const { createPlacesRouter } = require('./routes/places');
const { createPlacesService } = require('./services/places');
const config = require('./config');

// `options.places` permet aux tests d'injecter un service Google simulé.
function createApp(db, options = {}) {
  const app = express();
  const places = options.places || createPlacesService(config.GOOGLE);
  app.use(express.json({ limit: '100kb' }));
  app.use((req, res, next) => {
    req.db = db;
    next();
  });

  app.use('/api/partner', partnerRoutes);
  app.use('/api', createPlacesRouter(places, options.google || config.GOOGLE));
  app.use('/api', publicRoutes);

  const webRoot = path.join(__dirname, '..', 'web');
  app.use('/client', express.static(path.join(webRoot, 'client')));
  app.use('/partner', express.static(path.join(webRoot, 'partner')));

  app.use('/api', (req, res) => res.status(404).json({ error: 'Route introuvable' }));

  // Gestionnaire d'erreurs unique : messages lisibles, aucune trace interne exposée.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
      return res.status(err.status).json({ error: err.message, ...(err.details && { details: err.details }) });
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'JSON invalide' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Erreur interne' });
  });

  return app;
}

module.exports = { createApp };
