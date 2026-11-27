'use strict';

// Restaurants réels via l'API officielle Google Places (New).
//
// Règles Google Maps Platform respectées ici :
// - aucune donnée Google n'est enregistrée en base : chaque affichage interroge l'API en direct,
//   ce qui garde les photos, notes et horaires à jour automatiquement ;
// - la clé serveur ne quitte jamais le serveur (les photos passent par /api/places/photo) ;
// - l'interface affiche la mention « Google Maps » et l'auteur de chaque photo.

const { ApiError } = require('../errors');
const { distanceKm } = require('./geo');

// Catégorisation façon plateforme de livraison. `query` sert à la recherche par catégorie,
// `types` et `words` à classer un établissement d'après ses types Google et son nom.
const CATEGORIES = [
  { key: 'maquis', label: 'Maquis', emoji: '🍻', query: 'maquis', types: ['bar', 'pub', 'night_club'], words: ['maquis', 'buvette', 'cabaret', 'dolo', 'lounge'] },
  { key: 'grillades', label: 'Grillades', emoji: '🍖', query: 'grillades poulet braisé', types: ['barbecue_restaurant', 'steak_house'], words: ['grill', 'braise', 'brochette', 'dibi', 'rotisserie', 'poulet', 'choukouya', 'porc au four'] },
  { key: 'africaine', label: 'Africaine', emoji: '🍲', query: 'restaurant cuisine africaine', types: ['african_restaurant'], words: ['africain', 'africa', 'afrik', 'riz gras', 'attieke', 'garba', 'chez maman', 'tantie', 'sauce', 'faso', 'burkina', 'ivoirien', 'senegal', 'tieb'] },
  { key: 'fastfood', label: 'Fast-food', emoji: '🍔', query: 'fast food burger', types: ['fast_food_restaurant', 'hamburger_restaurant', 'sandwich_shop', 'meal_takeaway', 'food_court'], words: ['burger', 'fast', 'tacos', 'sandwich', 'snack', 'chicken', 'food'] },
  { key: 'pizza', label: 'Pizza', emoji: '🍕', query: 'pizzeria', types: ['pizza_restaurant'], words: ['pizza', 'pizzeria'] },
  { key: 'chawarma', label: 'Chawarma', emoji: '🌯', query: 'chawarma libanais', types: ['lebanese_restaurant', 'middle_eastern_restaurant', 'turkish_restaurant', 'mediterranean_restaurant', 'greek_restaurant'], words: ['chawarma', 'shawarma', 'libanais', 'liban', 'kebab', 'falafel'] },
  { key: 'asiatique', label: 'Asiatique', emoji: '🍜', query: 'restaurant asiatique chinois', types: ['asian_restaurant', 'chinese_restaurant', 'japanese_restaurant', 'thai_restaurant', 'sushi_restaurant', 'vietnamese_restaurant', 'korean_restaurant', 'indian_restaurant', 'ramen_restaurant'], words: ['chinois', 'china', 'asia', 'sushi', 'wok', 'thai', 'indien', 'india', 'japon'] },
  { key: 'europeenne', label: 'Européenne', emoji: '🍝', query: 'restaurant français italien', types: ['french_restaurant', 'italian_restaurant', 'fine_dining_restaurant', 'spanish_restaurant', 'brunch_restaurant', 'breakfast_restaurant'], words: ['bistro', 'brasserie', 'trattoria', 'gourmet', 'italien', 'francais'] },
  { key: 'cafe', label: 'Café', emoji: '☕', query: 'café salon de thé', types: ['cafe', 'coffee_shop', 'tea_house', 'cafeteria'], words: ['cafe', 'coffee', 'the '] },
  { key: 'boulangerie', label: 'Boulangerie', emoji: '🥐', query: 'boulangerie pâtisserie', types: ['bakery', 'confectionery'], words: ['boulangerie', 'patisserie', 'pain', 'viennoiserie'] },
  { key: 'desserts', label: 'Desserts', emoji: '🍦', query: 'glacier desserts', types: ['ice_cream_shop', 'dessert_shop', 'dessert_restaurant', 'juice_shop', 'chocolate_shop'], words: ['glace', 'glacier', 'yaourt', 'dessert', 'jus', 'smoothie'] },
];
const GENERIC = { key: 'restaurant', label: 'Restaurant', emoji: '🍽️' };
const CATEGORY_BY_KEY = new Map(CATEGORIES.map((c) => [c.key, c]));

// Types Google utilisés pour « populaires autour de vous » (types historiques, toujours acceptés).
const NEARBY_TYPES = ['restaurant', 'fast_food_restaurant', 'cafe', 'bar', 'bakery', 'meal_takeaway'];

const LIST_FIELDS = [
  'id', 'displayName', 'shortFormattedAddress', 'formattedAddress', 'location', 'types', 'primaryType',
  'primaryTypeDisplayName', 'rating', 'userRatingCount', 'currentOpeningHours', 'photos', 'googleMapsUri', 'businessStatus',
];
const DETAIL_FIELDS = [
  ...LIST_FIELDS, 'regularOpeningHours', 'nationalPhoneNumber', 'internationalPhoneNumber', 'websiteUri', 'editorialSummary',
];

const PLACE_ID_RE = /^[A-Za-z0-9_-]{8,300}$/;
const PHOTO_NAME_RE = /^places\/[A-Za-z0-9_-]{8,300}\/photos\/[A-Za-z0-9_-]{8,1200}$/;

const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function categorize(place) {
  const types = [place.primaryType, ...(place.types || [])].filter(Boolean);
  for (const t of types) {
    const hit = CATEGORIES.find((c) => c.types.includes(t));
    if (hit) return hit;
  }
  const name = ` ${fold(place.displayName?.text || place.name)} `;
  const byName = CATEGORIES.find((c) => c.words.some((w) => name.includes(fold(w))));
  return byName || GENERIC;
}

const isValidPlaceId = (id) => typeof id === 'string' && PLACE_ID_RE.test(id);
const isValidPhotoName = (name) => typeof name === 'string' && PHOTO_NAME_RE.test(name);

function photoOf(p) {
  const author = (p.authorAttributions || [])[0] || {};
  return { name: p.name, author: author.displayName || null, author_uri: author.uri || null };
}

function normalize(place, origin) {
  const cat = categorize(place);
  const loc = place.location || {};
  const hasLoc = Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude);
  const km = origin && hasLoc ? distanceKm(origin.latitude, origin.longitude, loc.latitude, loc.longitude) : null;
  return {
    id: place.id,
    name: place.displayName?.text || 'Établissement',
    address: place.shortFormattedAddress || place.formattedAddress || null,
    latitude: hasLoc ? loc.latitude : null,
    longitude: hasLoc ? loc.longitude : null,
    distance_km: km === null ? null : Math.round(km * 10) / 10,
    category: cat.key,
    category_label: cat.label,
    type_label: place.primaryTypeDisplayName?.text || null,
    rating: typeof place.rating === 'number' ? place.rating : null,
    rating_count: place.userRatingCount || 0,
    open_now: typeof place.currentOpeningHours?.openNow === 'boolean' ? place.currentOpeningHours.openNow : null,
    photo: place.photos && place.photos[0] ? photoOf(place.photos[0]) : null,
    maps_uri: place.googleMapsUri || null,
  };
}

function normalizeDetails(place, origin) {
  return {
    ...normalize(place, origin),
    address_full: place.formattedAddress || null,
    phone: place.internationalPhoneNumber || place.nationalPhoneNumber || null,
    phone_display: place.nationalPhoneNumber || place.internationalPhoneNumber || null,
    website: place.websiteUri || null,
    summary: place.editorialSummary?.text || null,
    hours: place.regularOpeningHours?.weekdayDescriptions || [],
    photos: (place.photos || []).slice(0, 6).map(photoOf),
  };
}

// Compteur d'appels : protège la facturation en cas de boucle ou d'abus.
function createLimiter({ perMinute, perDay, now = () => Date.now() }) {
  let minute = { start: 0, count: 0 };
  let day = { key: '', count: 0 };
  return {
    take() {
      const t = now();
      if (t - minute.start >= 60000) minute = { start: t, count: 0 };
      const dayKey = new Date(t).toISOString().slice(0, 10);
      if (day.key !== dayKey) day = { key: dayKey, count: 0 };
      if (day.count >= perDay) throw new ApiError(429, 'Limite quotidienne d’appels Google atteinte. Réessayez demain ou relevez GOOGLE_MAX_CALLS_PER_DAY.');
      if (minute.count >= perMinute) throw new ApiError(429, 'Trop de requêtes Google en une minute. Réessayez dans un instant.');
      minute.count += 1;
      day.count += 1;
    },
    stats: () => ({ today: day.count, minute: minute.count }),
  };
}

function createPlacesService(google, { fetchImpl = globalThis.fetch } = {}) {
  const enabled = Boolean(google && google.placesKey);
  const limiter = createLimiter({ perMinute: google?.maxCallsPerMinute || 120, perDay: google?.maxCallsPerDay || 3000 });
  const radius = google?.searchRadiusM || 5000;

  function ensureEnabled() {
    if (!enabled) throw new ApiError(503, 'Google Places non configuré : ajoutez GOOGLE_PLACES_API_KEY dans le fichier .env');
  }

  async function call(path, { method = 'GET', body, fields } = {}) {
    ensureEnabled();
    limiter.take();
    let res;
    try {
      res = await fetchImpl(`${google.placesBaseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': google.placesKey,
          ...(fields ? { 'X-Goog-FieldMask': fields } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError(502, 'Google Places injoignable. Vérifiez la connexion du serveur.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = data?.error?.message || `HTTP ${res.status}`;
      const errorInfo = Array.isArray(data?.error?.details)
        ? data.error.details.find((entry) => entry?.['@type'] === 'type.googleapis.com/google.rpc.ErrorInfo')
        : null;
      const reason = errorInfo?.reason;
      const code = typeof reason === 'string' && /^[A-Z][A-Z0-9_]{0,79}$/.test(reason) ? reason : null;
      const diagnostic = code ? ` [code Google : ${code}]` : '';
      console.error(`[google-places] ${method} ${path.split('?')[0]} → ${res.status} ${detail}${diagnostic}`);
      if (res.status === 404) throw new ApiError(404, 'Établissement introuvable sur Google');
      throw new ApiError(502, `Google Places a refusé la requête : ${detail}${diagnostic}`);
    }
    return data;
  }

  const circle = (origin, r = radius) => ({ circle: { center: { latitude: origin.latitude, longitude: origin.longitude }, radius: r } });
  const keepOpenBusinesses = (places) => (places || []).filter((p) => p.businessStatus !== 'CLOSED_PERMANENTLY');

  return {
    enabled,
    stats: () => limiter.stats(),

    // Établissements populaires autour d'un point (20 au maximum par appel, limite Google).
    async nearby(origin) {
      const data = await call('/places:searchNearby', {
        method: 'POST',
        fields: LIST_FIELDS.map((f) => `places.${f}`).join(','),
        body: {
          includedTypes: NEARBY_TYPES,
          maxResultCount: 20,
          rankPreference: 'POPULARITY',
          languageCode: 'fr',
          regionCode: 'BF',
          locationRestriction: circle(origin),
        },
      });
      return keepOpenBusinesses(data.places).map((p) => normalize(p, origin));
    },

    // Recherche libre ou par catégorie, centrée sur l'adresse du client.
    async search(origin, { text, category }) {
      const cat = category ? CATEGORY_BY_KEY.get(category) : null;
      if (category && !cat) throw new ApiError(400, 'Catégorie inconnue');
      const textQuery = cat ? cat.query : String(text || '').trim().slice(0, 120);
      if (textQuery.length < 2) throw new ApiError(400, 'Recherche trop courte');
      const data = await call('/places:searchText', {
        method: 'POST',
        fields: LIST_FIELDS.map((f) => `places.${f}`).join(','),
        body: { textQuery, pageSize: 20, languageCode: 'fr', regionCode: 'BF', locationBias: circle(origin) },
      });
      let list = keepOpenBusinesses(data.places).map((p) => normalize(p, origin));
      // La recherche Google est « orientée » vers la zone, pas limitée : on écarte ce qui est trop loin.
      list = list.filter((p) => p.distance_km === null || p.distance_km <= 15);
      if (cat) list = list.map((p) => ({ ...p, category: cat.key, category_label: cat.label }));
      return list;
    },

    async details(placeId, origin) {
      if (!isValidPlaceId(placeId)) throw new ApiError(400, 'Identifiant Google invalide');
      const place = await call(`/places/${encodeURIComponent(placeId)}?languageCode=fr&regionCode=BF`, { fields: DETAIL_FIELDS.join(',') });
      return normalizeDetails(place, origin);
    },

    // Renvoie l'URL temporaire de l'image hébergée par Google (rien n'est téléchargé ni stocké ici).
    async photoUri(photoName, width) {
      if (!isValidPhotoName(photoName)) throw new ApiError(400, 'Nom de photo invalide');
      const w = Math.min(1200, Math.max(100, Math.round(Number(width) || 480)));
      const data = await call(`/${photoName}/media?maxWidthPx=${w}&skipHttpRedirect=true`);
      if (!data.photoUri || !/^https?:\/\//.test(data.photoUri)) throw new ApiError(502, 'Photo Google indisponible');
      return data.photoUri;
    },
  };
}

const publicCategories = () => CATEGORIES.map(({ key, label, emoji }) => ({ key, label, emoji }));

module.exports = {
  createPlacesService, categorize, normalize, isValidPlaceId, isValidPhotoName, createLimiter, publicCategories, CATEGORIES,
};
