'use strict';

const fs = require('fs');
const path = require('path');

// Clés et réglages locaux : fichier .env à la racine du projet (jamais versionné, voir .env.example).
// Les variables déjà définies dans l'environnement restent prioritaires.
const ENV_FILE = path.join(__dirname, '..', '.env');
if (!process.env.WE_SKIP_DOTENV && fs.existsSync(ENV_FILE)) {
  process.loadEnvFile(ENV_FILE);
}

const clean = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

module.exports = {
  PORT: Number(process.env.PORT) || 3000,
  DB_PATH: process.env.DB_PATH || 'data/winged_eats.db',
  // Hypothèses de tarification à valider (voir docs/CADRAGE_MVP.md)
  DELIVERY: {
    baseFee: 300,
    perKm: 250,
    roundTo: 50,
    maxRadiusKm: 6,
  },
  DEFAULT_COMMISSION_RATE: 0.15,
  PICKUP_CODE_DIGITS: 4,

  // Google Maps Platform (facultatif : sans clé, l'application fonctionne avec ses seules données).
  GOOGLE: {
    // Clé serveur : Places API (New). Ne quitte jamais le serveur.
    placesKey: clean(process.env.GOOGLE_PLACES_API_KEY),
    // Clé navigateur : Maps JavaScript API (fond de carte). Visible dans le navigateur, à restreindre au domaine.
    browserKey: clean(process.env.GOOGLE_MAPS_BROWSER_KEY),
    // Identifiant de carte (Map ID) requis pour les repères avancés. DEMO_MAP_ID suffit pour tester.
    mapId: clean(process.env.GOOGLE_MAPS_MAP_ID) || 'DEMO_MAP_ID',
    placesBaseUrl: clean(process.env.GOOGLE_PLACES_BASE_URL) || 'https://places.googleapis.com/v1',
    // Garde-fous de facturation : au-delà, l'API répond 429 jusqu'à la minute / au jour suivant.
    maxCallsPerMinute: Number(process.env.GOOGLE_MAX_CALLS_PER_MINUTE) || 120,
    maxCallsPerDay: Number(process.env.GOOGLE_MAX_CALLS_PER_DAY) || 3000,
    searchRadiusM: 5000,
  },
};
