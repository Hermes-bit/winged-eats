'use strict';

const { ApiError } = require('../errors');
const { isValidPlaceId } = require('./places');

function createModeration(config, { fetchImpl = globalThis.fetch } = {}) {
  const { url, anonKey, serviceKey, adminUserId } = config;
  const configured = Boolean(url && anonKey && serviceKey && adminUserId);
  if ([url, anonKey, serviceKey, adminUserId].some(Boolean) && !configured) {
    throw new Error('Configuration Supabase de modération incomplète');
  }
  if (configured && (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(adminUserId))) {
    throw new Error('URL Supabase ou identifiant administrateur invalide');
  }

  function ensureConfigured() {
    if (!configured) throw new ApiError(503, 'Administration non configurée sur le serveur.');
  }
  async function request(path, init) {
    let response;
    try { response = await fetchImpl(`${url}${path}`, init); }
    catch { throw new ApiError(503, 'Service de modération inaccessible. Réessayez.'); }
    return response;
  }
  const databaseHeaders = () => ({ apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' });

  async function authenticate(token) {
    ensureConfigured();
    if (typeof token !== 'string' || !token || token.length > 8192) throw new ApiError(401, 'Connexion administrateur requise.');
    const res = await request('/auth/v1/user', { headers: { apikey: anonKey, Authorization: `Bearer ${token}` } });
    if (res.status === 401 || res.status === 403) throw new ApiError(401, 'Session expirée ou invalide.');
    if (!res.ok) throw new ApiError(503, 'Vérification de la session indisponible.');
    const user = await res.json();
    if (user.id !== adminUserId) throw new ApiError(403, 'Accès administrateur refusé.');
  }
  return {
    configured,
    authenticate,
    async login(email, password) {
      ensureConfigured();
      if (typeof email !== 'string' || email.length > 254 || !email.includes('@') || typeof password !== 'string' || !password || password.length > 1024) {
        throw new ApiError(400, 'Adresse e-mail ou mot de passe invalide.');
      }
      const res = await request('/auth/v1/token?grant_type=password', {
        method: 'POST', headers: { apikey: anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
      });
      if (res.status === 400 || res.status === 401) throw new ApiError(401, 'Identifiants invalides.');
      if (!res.ok) throw new ApiError(503, 'Connexion administrateur indisponible.');
      const data = await res.json();
      await authenticate(data.access_token);
      return { access_token: data.access_token };
    },
    async decisions(ids) {
      if (!ids.every(isValidPlaceId)) throw new ApiError(400, 'Identifiant Google invalide.');
      if (!configured || !ids.length) return new Map();
      const filter = encodeURIComponent(`in.(${ids.join(',')})`);
      const res = await request(`/rest/v1/winged_restaurant_moderation?select=place_id,hidden,photos_hidden&place_id=${filter}`, { headers: databaseHeaders() });
      if (!res.ok) throw new ApiError(503, 'Lecture des décisions de modération impossible.');
      const rows = await res.json();
      if (!Array.isArray(rows) || rows.some((r) => !isValidPlaceId(r.place_id) || typeof r.hidden !== 'boolean' || typeof r.photos_hidden !== 'boolean')) {
        throw new ApiError(503, 'Réponse de modération invalide.');
      }
      return new Map(rows.map((row) => [row.place_id, row]));
    },
    async list(offset) {
      ensureConfigured();
      if (!Number.isInteger(offset) || offset < 0 || offset > 100000) throw new ApiError(400, 'Page invalide.');
      const res = await request(`/rest/v1/winged_restaurant_moderation?select=place_id,hidden,photos_hidden&or=(hidden.eq.true,photos_hidden.eq.true)&order=updated_at.desc&limit=100&offset=${offset}`, { headers: databaseHeaders() });
      if (!res.ok) throw new ApiError(503, 'Lecture des décisions de modération impossible.');
      const rows = await res.json();
      if (!Array.isArray(rows) || rows.some((r) => !isValidPlaceId(r.place_id) || typeof r.hidden !== 'boolean' || typeof r.photos_hidden !== 'boolean')) {
        throw new ApiError(503, 'Réponse de modération invalide.');
      }
      return rows;
    },
    async save(id, hidden, photosHidden) {
      ensureConfigured();
      if (!isValidPlaceId(id) || typeof hidden !== 'boolean' || typeof photosHidden !== 'boolean') throw new ApiError(400, 'Décision de modération invalide.');
      const res = await request('/rest/v1/winged_restaurant_moderation?on_conflict=place_id', {
        method: 'POST',
        headers: { ...databaseHeaders(), Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ place_id: id, hidden, photos_hidden: photosHidden, updated_at: new Date().toISOString() }),
      });
      if (!res.ok) throw new ApiError(503, 'Enregistrement impossible. Aucune confirmation de modification.');
    },
  };
}

module.exports = { createModeration };
