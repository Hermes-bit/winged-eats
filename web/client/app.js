'use strict';

// =====================================================================
// Winged Eats · application client (mobile d'abord, sans dépendance)
// =====================================================================

// Quartiers pilotes (centres approximatifs, à remplacer par les données SIG en priorité 2).
const ZONES = [
  { name: 'Ouaga 2000', hint: 'Sud · quartier pilote', latitude: 12.3650, longitude: -1.5100 },
  { name: 'Zone du Bois', hint: 'Centre-est · quartier pilote', latitude: 12.3580, longitude: -1.5040 },
  { name: "Patte d'Oie", hint: 'Sud-ouest · quartier pilote', latitude: 12.3450, longitude: -1.5500 },
];
const MAX_QTY = 20;
const POLL_MS = 5000;
const TERMINAL = ['DELIVERED', 'REFUSED', 'CANCELLED'];
const STEPS = [
  ['PENDING', 'Commande envoyée', 'Transmise au restaurant'],
  ['ACCEPTED', 'Acceptée par le restaurant', 'Le restaurant confirme'],
  ['PREPARING', 'En préparation', 'Votre repas est en cuisine'],
  ['READY', 'Prête à être remise', 'Emballée et prête'],
  ['DELIVERED', 'Remise au client', 'Avec votre code de remise'],
];
const STATUS = {
  PENDING: { label: 'En attente', cls: 'warn', emoji: '📨', title: 'Commande envoyée', text: 'En attente de confirmation du restaurant.' },
  ACCEPTED: { label: 'Acceptée', cls: 'ok', emoji: '👍', title: 'Commande acceptée', text: 'Le restaurant va lancer la préparation.' },
  PREPARING: { label: 'En préparation', cls: 'ok', emoji: '🍳', title: 'En cuisine…', text: 'Votre repas est en cours de préparation.' },
  READY: { label: 'Prête', cls: 'ok', emoji: '🛍️', title: 'Commande prête', text: 'Elle va vous être remise : préparez votre code.' },
  DELIVERED: { label: 'Remise', cls: 'ok', emoji: '🎉', title: 'Bon appétit !', text: 'Commande remise. Merci de votre confiance.' },
  REFUSED: { label: 'Refusée', cls: 'bad', emoji: '😕', title: 'Commande refusée', text: "Le restaurant n'a pas pu accepter votre commande." },
  CANCELLED: { label: 'Annulée', cls: 'bad', emoji: '✖️', title: 'Commande annulée', text: 'Cette commande a été annulée.' },
};

// Thèmes visuels par catégorie : dégradé + motif tissé, à la place des photos (légers en 3G).
const THEMES = {
  'Grillades': { th: 'ember', icon: '🍖', mains: ['🍖', '🍗', '🥩'], deco: ['🔥', '🌶️', '🍢'] },
  'Cuisine africaine': { th: 'savane', icon: '🍲', mains: ['🍲', '🥘', '🍛'], deco: ['🌿', '🍅', '🍚'] },
  'Maquis': { th: 'sahel', icon: '🍗', mains: ['🍗', '🍢', '🍖'], deco: ['🍌', '🌶️', '🍋'] },
  'Plats du jour': { th: 'terre', icon: '🥘', mains: ['🥘', '🍛', '🍲'], deco: ['🍅', '🧅', '🌿'] },
  'Boissons': { th: 'bissap', icon: '🥤', mains: ['🥤', '🧃', '🍹'], deco: ['🧊', '🍋', '🌺'] },
};
const DEFAULT_THEME = { th: 'savane', icon: '🍽️', mains: ['🍽️'], deco: ['🌿', '🍴', '✨'] };
const DISH_EMOJI = [
  [/brochette/i, '🍢'], [/poulet|ailes|chicken/i, '🍗'], [/poisson|capitaine|tilapia/i, '🐟'],
  [/bœuf|boeuf|mouton|viande/i, '🥩'], [/riz/i, '🍚'], [/\btô\b|gombo|soupe/i, '🥣'],
  [/alloco|banane|plantain/i, '🍌'], [/frite/i, '🍟'], [/salade/i, '🥗'], [/pizza/i, '🍕'],
  [/burger/i, '🍔'], [/œuf|oeuf/i, '🍳'], [/bissap|jus/i, '🧃'], [/bière|biere/i, '🍺'],
  [/eau\b/i, '💧'], [/soda|coca/i, '🥤'], [/café|thé/i, '☕'],
];
const SEARCH_IDEAS = ['Poulet braisé', 'Riz gras', 'Alloco', 'Brochettes', 'Bissap'];

// Icônes au trait (24 × 24), dessinées pour l'application.
const ICONS = {
  home: '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v10.5a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9"/>',
  map: '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4z"/><path d="M9 4v14M15 6v14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
  bag: '<path d="M5 8h14l-1.1 11.6a1.5 1.5 0 0 1-1.5 1.4H7.6a1.5 1.5 0 0 1-1.5-1.4L5 8z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  arrowLeft: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  heart: '<path d="M12 20s-7.2-4.4-9.2-8.8C1.5 8.3 3.3 5 6.7 5c2.1 0 3.6 1.2 5.3 3 1.7-1.8 3.2-3 5.3-3 3.4 0 5.2 3.3 3.9 6.2C19.2 15.6 12 20 12 20z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  pin: '<path d="M12 21s-6.5-5.8-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.2-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  bike: '<circle cx="6" cy="17" r="2.6"/><circle cx="18" cy="17" r="2.6"/><path d="M8.6 17h5.2l2.4-6h2.3"/><path d="M14.5 7h2.2l1.5 4M4 11.5h6.5l2 3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  locate: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22"/>',
  phone: '<path d="M5.5 4h3.2l1.8 4.6-2.2 1.4a11 11 0 0 0 5.7 5.7l1.4-2.2 4.6 1.8v3.2a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3.5 6.2a2 2 0 0 1 2-2.2z"/>',
  cash: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v.01M18 14.5v.01"/>',
  mobile: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l.9 12.1a1.5 1.5 0 0 0 1.5 1.4h7.2a1.5 1.5 0 0 0 1.5-1.4L18 7M9 7V4.5h6V7"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  store: '<path d="M4 9.5 5.6 4.5h12.8L20 9.5"/><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/><path d="M5.5 12.5v7.5h13v-7.5M10 20v-4.5h4V20"/>',
  help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6M12 16.8v.01"/>',
  shield: '<path d="M12 3 5 6v5.5c0 4.3 2.9 7.8 7 9.5 4.1-1.7 7-5.2 7-9.5V6l-7-3z"/><path d="m9 12 2 2 4-4"/>',
  history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 4v4.5H8M12 8v4l2.8 1.8"/>',
  flame: '<path d="M12 21c-3.9 0-6.8-2.6-6.8-6.3 0-3.4 2.5-5.4 3.9-8.3.5 1.9 1.5 2.9 2.5 3.4.4-2.6 1.4-5 3.9-6.3-.5 2.9 3.3 5.4 3.3 11.2 0 3.7-2.9 6.3-6.8 6.3z"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.01"/>',
  alert: '<path d="M12 3.5 2.5 20h19L12 3.5z"/><path d="M12 10v4.5M12 17.5v.01"/>',
  sparkle: '<path d="M12 3.5c.6 4.2 2.3 5.9 6.5 6.5-4.2.6-5.9 2.3-6.5 6.5-.6-4.2-2.3-5.9-6.5-6.5 4.2-.6 5.9-2.3 6.5-6.5z"/>',
  refresh: '<path d="M19.5 11A7.5 7.5 0 0 0 6 6.5L4 8.5M4 4v4.5h4.5"/><path d="M4.5 13A7.5 7.5 0 0 0 18 17.5l2-2M20 20v-4.5h-4.5"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  logout: '<path d="M14.5 4.5h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3M10 16.5 5.5 12 10 7.5M5.5 12H15"/>',
  star: '<path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
  nav: '<path d="M12 3 19.5 20 12 16.2 4.5 20z"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.3 2.3 3.5 5.2 3.5 8.5s-1.2 6.2-3.5 8.5c-2.3-2.3-3.5-5.2-3.5-8.5s1.2-6.2 3.5-8.5z"/>',
};

// ---------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------

const $ = (sel) => document.querySelector(sel);
const main = $('#app');
const SVGNS = 'http://www.w3.org/2000/svg';

const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* stockage indisponible */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* stockage indisponible */ }
  },
};

const NBSP = ' ';
const num = (n) => Number(n).toLocaleString('fr-FR').replace(/\s/g, NBSP);
const fmt = (n) => `${num(n)}${NBSP}FCFA`;
const fmtF = (n) => `${num(n)}${NBSP}F`;
const fmtKm = (km) => (km < 0.5 ? `< 500${NBSP}m` : `${String(Math.round(km * 10) / 10).replace('.', ',')}${NBSP}km`);
const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;
const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const displayName = (name) => String(name || '').replace(/\s*\(démo\)\s*$/i, '');
const isDemo = (name) => /\(démo\)\s*$/i.test(String(name || ''));
const theme = (category) => THEMES[category] || DEFAULT_THEME;
const mainEmoji = (r) => { const t = theme(r.category); return t.mains[hash(r.name) % t.mains.length]; };
const dishEmoji = (name, t) => (DISH_EMOJI.find(([re]) => re.test(name)) || [null, t.icon])[1];
const orderDate = (s) => new Date(String(s).replace(' ', 'T') + 'Z');

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (k in node && typeof v !== 'string') node[k] = v;
    else node.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

function svg(viewBox, markup, cls) {
  const s = document.createElementNS(SVGNS, 'svg');
  s.setAttribute('viewBox', viewBox);
  s.setAttribute('aria-hidden', 'true');
  if (cls) s.setAttribute('class', cls);
  s.innerHTML = markup; // contenu statique uniquement (jamais de donnée utilisateur)
  return s;
}
const icon = (name) => svg('0 0 24 24', ICONS[name] || '', 'i');

function logoMark() {
  return svg('0 0 32 32', `
    <rect width="32" height="32" rx="9" fill="#0B7A3E"/>
    <rect width="32" height="32" rx="9" fill="url(#lg)" opacity=".35"/>
    <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <path fill="#F5B82E" d="M6.5 24.5C8 15.5 15 8.5 25.5 6.5c.4 0 .7.4.5.8-1.2 2.6-3 4.6-5.2 6.1h3.3c.5 0 .7.5.4.9-1.5 2-3.6 3.4-6 4.1h2.6c.5 0 .7.6.3.9-3.6 2.8-8.4 4.3-14.4 5.7-.4.1-.6-.2-.5-.5z"/>
    <path d="M9.2 21.6c3.2-5 7.6-8.6 13.2-10.8" stroke="#FFF7E0" stroke-width="1" stroke-linecap="round" fill="none" opacity=".55"/>`);
}

const ART = {
  bag: `<ellipse cx="90" cy="138" rx="56" ry="7" fill="#EDE5D6"/><circle cx="90" cy="74" r="58" fill="#EAF5EE"/>
    <path d="M57 60h66l7 74H50z" fill="#F5B82E"/><path d="M57 60h66l1.6 13H55.4z" fill="#D4960F"/>
    <rect x="51.5" y="100" width="77" height="9" fill="#0B7A3E"/><rect x="51" y="111" width="78" height="3.5" fill="#D62E2E"/>
    <path d="M75 62V52a15 15 0 0 1 30 0v10" fill="none" stroke="#075C2E" stroke-width="6" stroke-linecap="round"/>
    <path d="M141 30l3 7.5 7.5 3-7.5 3-3 7.5-3-7.5-7.5-3 7.5-3z" fill="#F5B82E"/><circle cx="34" cy="46" r="5" fill="#0B7A3E"/><circle cx="150" cy="98" r="3.5" fill="#D62E2E"/>`,
  receipt: `<ellipse cx="90" cy="138" rx="50" ry="7" fill="#EDE5D6"/><circle cx="90" cy="74" r="58" fill="#FFF7E0"/>
    <path d="M58 26h64v104l-10.7-7-10.6 7-10.7-7-10.7 7-10.6-7L58 130z" fill="#fff" stroke="#E8E0D2" stroke-width="2"/>
    <rect x="70" y="42" width="40" height="7" rx="3.5" fill="#0B7A3E"/><rect x="70" y="60" width="40" height="5" rx="2.5" fill="#E8E0D2"/>
    <rect x="70" y="72" width="30" height="5" rx="2.5" fill="#E8E0D2"/><rect x="70" y="84" width="36" height="5" rx="2.5" fill="#E8E0D2"/>
    <rect x="70" y="100" width="40" height="7" rx="3.5" fill="#F5B82E"/><circle cx="144" cy="40" r="5" fill="#0B7A3E"/><circle cx="36" cy="96" r="4" fill="#D62E2E"/>`,
  search: `<ellipse cx="90" cy="138" rx="50" ry="7" fill="#EDE5D6"/><circle cx="90" cy="74" r="58" fill="#EAF5EE"/>
    <circle cx="82" cy="66" r="30" fill="#fff" stroke="#0B7A3E" stroke-width="9"/><path d="m104 88 22 22" stroke="#075C2E" stroke-width="12" stroke-linecap="round"/>
    <path d="M70 60a14 14 0 0 1 14-10" stroke="#F5B82E" stroke-width="5" stroke-linecap="round" fill="none"/>
    <circle cx="140" cy="36" r="5" fill="#F5B82E"/><circle cx="38" cy="100" r="4" fill="#D62E2E"/>`,
  pin: `<ellipse cx="90" cy="138" rx="40" ry="7" fill="#EDE5D6"/><circle cx="90" cy="74" r="58" fill="#FFF7E0"/>
    <path d="M90 132s-34-30-34-58a34 34 0 0 1 68 0c0 28-34 58-34 58z" fill="#0B7A3E"/><circle cx="90" cy="74" r="13" fill="#F5B82E"/>
    <circle cx="142" cy="44" r="5" fill="#D62E2E"/><circle cx="36" cy="58" r="4" fill="#0B7A3E"/>`,
};
const art = (kind) => svg('0 0 180 150', ART[kind] || ART.bag, 'art');

async function api(path, options = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json' },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error('Connexion impossible. Vérifiez votre réseau puis réessayez.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erreur réseau, réessayez');
  return data;
}

// Petits caches mémoire pour limiter les appels en 3G.
const cache = new Map();
function cached(key, ttlMs, loader) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.promise;
  const promise = loader().catch((e) => { cache.delete(key); throw e; });
  cache.set(key, { at: Date.now(), promise });
  return promise;
}
const getRestaurants = (o) => cached(`list:${o.latitude},${o.longitude}`, 30000, () => api(`/restaurants?lat=${o.latitude}&lon=${o.longitude}`));
const getMenu = (id) => cached(`menu:${id}`, 60000, () => api(`/restaurants/${id}`));
const putMenu = (menu) => cache.set(`menu:${menu.id}`, { at: Date.now(), promise: Promise.resolve(menu) });

// ---------------------------------------------------------------------
// Configuration et restaurants réels (Google Places, chargés en direct)
// ---------------------------------------------------------------------

let appConfig = { google: { places: false, maps_key: null, map_id: 'DEMO_MAP_ID' }, categories: [] };
const googleOn = () => Boolean(appConfig.google && appConfig.google.places);

// Catégories unifiées (façon plateforme de livraison) : thème visuel par catégorie.
const CAT_THEME = {
  maquis: 'sahel', grillades: 'ember', africaine: 'savane', fastfood: 'terre', pizza: 'ember', chawarma: 'terre',
  asiatique: 'bissap', europeenne: 'savane', cafe: 'terre', boulangerie: 'sahel', desserts: 'bissap', restaurant: 'savane',
};
// Catégories des restaurants partenaires (base locale) → catégories unifiées.
const PARTNER_CAT_KEY = { 'Grillades': 'grillades', 'Cuisine africaine': 'africaine', 'Maquis': 'maquis', 'Plats du jour': 'africaine', 'Boissons': 'cafe' };
const catKeyOf = (r) => PARTNER_CAT_KEY[r.category] || 'restaurant';
const catInfo = (key) => appConfig.categories.find((c) => c.key === key) || { key, label: 'Restaurant', emoji: '🍽️' };

// Les données Google ne sont jamais enregistrées : simple mémoire de quelques minutes pour limiter les appels.
const PLACES_TTL = 5 * 60000;
const okey = (o) => `${o.latitude.toFixed(4)},${o.longitude.toFixed(4)}`;
const qs = (o) => `lat=${o.latitude}&lon=${o.longitude}`;
const gNearby = (o) => cached(`gn:${okey(o)}`, PLACES_TTL, () => api(`/places/nearby?${qs(o)}`));
const gCategory = (o, cat) => cached(`gc:${cat}:${okey(o)}`, PLACES_TTL, () => api(`/places/search?${qs(o)}&cat=${encodeURIComponent(cat)}`));
const gSearch = (o, q) => cached(`gs:${fold(q)}:${okey(o)}`, PLACES_TTL, () => api(`/places/search?${qs(o)}&q=${encodeURIComponent(q)}`));
const gDetails = (id, o) => cached(`gd:${id}`, PLACES_TTL, () => api(`/places/${encodeURIComponent(id)}${o ? `?${qs(o)}` : ''}`));
const photoUrl = (photo, w) => `/api/places/photo?name=${encodeURIComponent(photo.name)}&w=${w}`;
const fmtRating = (n) => String(Math.round(n * 10) / 10).replace('.', ',');

// Vignette d'un établissement Google : photo actuelle de Google, sinon illustration de la catégorie.
function placeCover(p, cls = '', width = 480, ...children) {
  const info = catInfo(p.category);
  const cover = el('div', { class: `cover th-${CAT_THEME[p.category] || 'savane'} ${cls}` }, collage(info.emoji));
  if (p.photo) {
    const img = el('img', { class: 'gphoto', src: photoUrl(p.photo, width), alt: '', loading: 'lazy', decoding: 'async' });
    const credit = p.photo.author ? el('span', { class: 'credit', text: `© ${p.photo.author}` }) : null;
    img.addEventListener('error', () => { img.remove(); if (credit) credit.remove(); });
    cover.append(img);
    if (credit) cover.append(credit);
  }
  cover.append(...children.flat().filter(Boolean));
  return cover;
}

function placeSubtitle(p) {
  const label = p.category !== 'restaurant' ? catInfo(p.category).label : (p.type_label || 'Restaurant');
  return [label, p.address].filter(Boolean).join(' · ');
}

function placeCard(p) {
  return el('article', { class: 'rc gc', 'data-gid': p.id },
    placeCover(p, '', 480,
      p.rating ? el('span', { class: 'tag' }, icon('star'), `${fmtRating(p.rating)}`, el('small', { text: ` (${p.rating_count})` })) : null),
    el('div', { class: 'rc-body' },
      el('div', { class: 'rc-title' },
        el('strong', { text: p.name }),
        p.distance_km !== null ? el('span', { class: 'dist', text: fmtKm(p.distance_km) }) : null),
      el('div', { class: 'rc-sub', text: placeSubtitle(p) }),
      el('div', { class: 'rc-meta' },
        p.open_now === true ? el('span', { class: 'open-now', text: 'Ouvert' }) : p.open_now === false ? el('span', { class: 'closed-now', text: 'Fermé' }) : null,
        el('span', { class: 'soon-pill', text: 'Bientôt sur Winged Eats' }))),
    el('a', { class: 'stretch', href: `#/p/${encodeURIComponent(p.id)}`, 'aria-label': `${p.name}, ${placeSubtitle(p)}` }));
}

const googleCredit = () => el('p', { class: 'gattr' }, 'Données et photos : ', el('b', { text: 'Google Maps' }));

// Section alimentée par Google : squelette immédiat, contenu à l'arrivée, message clair en cas d'erreur.
function googleSection({ title, sub, layout = 'list', load, transform = (l) => l, empty = null }) {
  if (!googleOn()) return null;
  const box = el('div', { class: layout === 'carousel' ? 'hscroll' : 'rlist' },
    [0, 1].map(() => el('div', { class: 'rc', 'aria-hidden': 'true' }, el('div', { class: 'skel', style: 'aspect-ratio:16/10;border-radius:20px' }),
      el('div', { class: 'skel', style: 'height:14px;width:70%;margin-top:10px' }))));
  const sec = el('section', { class: 'sec' },
    el('div', { class: 'sec-head' }, el('div', null, el('h2', { text: title }), sub ? el('p', { text: sub }) : null)),
    box);
  load().then((list) => {
    const items = transform(list);
    if (!items.length) {
      if (empty) fill(box, el('div', { class: 'page', style: 'grid-column:1/-1' }, el('p', { class: 'muted', text: empty })));
      else sec.remove();
      return;
    }
    fill(box, items.map(placeCard));
    sec.append(googleCredit());
  }).catch((e) => fill(box, el('div', { style: 'flex:1;grid-column:1/-1;padding:0 16px' }, alertBox(e.message, 'info'))));
  return sec;
}

// ---------------------------------------------------------------------
// Composants
// ---------------------------------------------------------------------

// replaceChildren n'aplatit pas les tableaux et écrirait « null » : on passe toujours par fill().
function fill(node, ...children) {
  node.replaceChildren(...children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false));
  return node;
}
const setView = (...children) => fill(main, ...children);

const alertBox = (message, kind = '') => el('div', { class: `alert ${kind}`, role: kind ? 'status' : 'alert' }, icon(kind === 'info' ? 'info' : 'alert'), el('span', { text: message }));

function emptyState(kind, title, text, ...actions) {
  return el('div', { class: 'empty' }, art(kind), el('h2', { text: title }), text ? el('p', { text }) : null, ...actions);
}

function collage(mainE, deco = []) {
  return el('div', { class: 'collage', 'aria-hidden': 'true' },
    el('span', { class: 'e-main', text: mainE }),
    deco.map((d, i) => el('span', { class: `e-${i + 1}`, text: d })));
}

function coverFor(r, cls = '', ...children) {
  const t = theme(r.category);
  const m = mainEmoji(r);
  return el('div', { class: `cover th-${t.th} ${cls}` }, collage(m, t.deco.filter((d) => d !== m)), ...children);
}

function miniCover(t, emoji, cls) {
  return el('div', { class: `cover th-${t.th} ${cls}` }, collage(emoji));
}

function stepper(value, { min = 1, max = MAX_QTY, small = false, onChange, trashAtMin = false }) {
  const label = el('b', { text: String(value), 'aria-live': 'polite' });
  const minusIcon = () => (trashAtMin && value <= min ? icon('trash') : icon('minus'));
  const minus = el('button', { type: 'button', 'aria-label': 'Diminuer la quantité' });
  const plus = el('button', { type: 'button', 'aria-label': 'Augmenter la quantité' }, icon('plus'));
  const paint = () => {
    label.textContent = String(value);
    minus.replaceChildren(minusIcon());
    minus.disabled = !trashAtMin && value <= min;
    minus.setAttribute('aria-label', trashAtMin && value <= min ? 'Retirer' : 'Diminuer la quantité');
    plus.disabled = value >= max;
  };
  minus.onclick = () => {
    if (trashAtMin && value <= min) return onChange(0);
    value = Math.max(min, value - 1); paint(); onChange(value);
  };
  plus.onclick = () => { value = Math.min(max, value + 1); paint(); onChange(value); };
  paint();
  return el('div', { class: small ? 'stepper sm' : 'stepper' }, minus, label, plus);
}

function toast(message, iconName = 'check') {
  const t = el('div', { class: 'toast', role: 'status' }, icon(iconName), el('span', { text: message }));
  $('#toasts').append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 260); }, 2600);
}

function openSheet(build, { flush = false, label = '', onClose = null } = {}) {
  const prevFocus = document.activeElement;
  const bg = el('div', { class: 'sheet-bg' });
  const sheet = el('div', { class: flush ? 'sheet flush' : 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': label });
  // Échap ne ferme que la feuille du dessus quand plusieurs sont empilées.
  const onKey = (e) => {
    if (e.key === 'Escape' && [...document.querySelectorAll('.sheet-bg:not(.closing)')].pop() === bg) close();
  };
  function close() {
    if (!bg.isConnected || bg.classList.contains('closing')) return;
    bg.classList.add('closing');
    document.removeEventListener('keydown', onKey);
    if (onClose) onClose();
    setTimeout(() => {
      bg.remove();
      if (!document.querySelector('.sheet-bg')) document.body.style.overflow = '';
      if (prevFocus && prevFocus.isConnected) prevFocus.focus({ preventScroll: true });
    }, 200);
  }
  bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
  document.addEventListener('keydown', onKey);
  sheet.append(...[build(close)].flat(Infinity).filter(Boolean));
  bg.append(sheet);
  document.body.append(bg);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => {
    const target = sheet.querySelector('[autofocus]') || sheet.querySelector('button, input, a[href]');
    if (target) target.focus({ preventScroll: true });
  });
  return close;
}

function closeAllSheets() {
  document.querySelectorAll('.sheet-bg').forEach((n) => n.remove());
  document.body.style.overflow = '';
}

function confirmSheet({ title, text, ok = 'Confirmer', cancel = 'Annuler', danger = false }) {
  return new Promise((resolve) => {
    let result = false; // Échap ou clic à l'extérieur = refus
    openSheet((close) => [
      el('div', { class: 'grabber' }),
      el('h2', { text: title }),
      el('p', { class: 'sheet-text', text }),
      el('div', { class: 'sheet-actions' },
        el('button', { class: danger ? 'btn block lg dark' : 'btn block lg', type: 'button', onclick: () => { result = true; close(); } }, ok),
        el('button', { class: 'btn block lg soft', type: 'button', onclick: close }, cancel)),
    ], { label: title, onClose: () => resolve(result) });
  });
}

function backButton(fallback = '#/') {
  return el('button', {
    class: 'icon-btn', type: 'button', 'aria-label': 'Retour',
    onclick: () => { if (navCount > 0) history.back(); else location.hash = fallback; },
  }, icon('arrowLeft'));
}

// ---------------------------------------------------------------------
// Panier, favoris et données locales
// ---------------------------------------------------------------------

const cartCount = (restaurantId) => {
  const cart = store.get('we_cart', null);
  if (!cart || (restaurantId !== undefined && cart.restaurant_id !== restaurantId)) return 0;
  return cart.lines.reduce((s, l) => s + l.quantity, 0);
};
const cartTotal = () => {
  const cart = store.get('we_cart', null);
  return cart ? cart.lines.reduce((s, l) => s + l.line_total, 0) : 0;
};

function updateCartBadge() {
  const count = cartCount();
  const badge = $('#cart-count');
  badge.textContent = String(count);
  badge.hidden = count === 0;
  badge.closest('a').setAttribute('aria-label', count ? `Panier, ${plural(count, 'article')}` : 'Panier');
}

const favs = () => store.get('we_favs', []);
const isFav = (id) => favs().includes(id);
function toggleFav(id) {
  const list = favs();
  store.set('we_favs', list.includes(id) ? list.filter((x) => x !== id) : [id, ...list]);
}

function favButton(id, cls = 'icon-btn glass fav') {
  const btn = el('button', { class: cls, type: 'button' }, icon('heart'));
  const paint = () => {
    const on = isFav(id);
    btn.classList.toggle('faved', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Retirer des favoris' : 'Ajouter aux favoris');
  };
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFav(id);
    paint();
    toast(isFav(id) ? 'Ajouté à vos favoris' : 'Retiré de vos favoris', 'heart');
  });
  paint();
  return btn;
}

function rememberSearch(q) {
  const v = q.trim();
  if (v.length < 2) return;
  const list = store.get('we_recent', []).filter((x) => fold(x) !== fold(v));
  store.set('we_recent', [v, ...list].slice(0, 6));
}

// ---------------------------------------------------------------------
// Adresse de livraison
// ---------------------------------------------------------------------

function chooseOrigin(origin, close) {
  store.set('we_origin', origin);
  if (close) close();
  toast(`Livraison à ${origin.label}`, 'pin');
  if (location.hash && location.hash !== '#/' && !location.hash.startsWith('#/cart') && !location.hash.startsWith('#/map')) location.hash = '#/';
  else route();
}

function addressPicker(message, close) {
  const current = store.get('we_origin', null);
  const errorSlot = el('div', null, message ? alertBox(message) : null);
  const gpsBtn = el('button', { class: 'btn block lg', type: 'button' }, icon('locate'), 'Utiliser ma position');
  gpsBtn.onclick = () => {
    if (!navigator.geolocation) {
      errorSlot.replaceChildren(alertBox("La géolocalisation n'est pas disponible. Choisissez un quartier."));
      return;
    }
    gpsBtn.disabled = true;
    gpsBtn.replaceChildren(icon('locate'), 'Localisation…');
    navigator.geolocation.getCurrentPosition(
      (pos) => chooseOrigin({ label: 'Ma position', latitude: pos.coords.latitude, longitude: pos.coords.longitude }, close),
      () => {
        gpsBtn.disabled = false;
        gpsBtn.replaceChildren(icon('locate'), 'Utiliser ma position');
        errorSlot.replaceChildren(alertBox('Position refusée. Choisissez un quartier pilote.'));
      },
      { timeout: 10000 },
    );
  };
  return [
    el(close ? 'h2' : 'h1', { text: 'Où souhaitez-vous être livré ?' }),
    el('p', { class: close ? 'sheet-text' : '', text: 'Nous affichons les restaurants qui livrent à cette adresse.' }),
    gpsBtn,
    el('div', { class: 'divider', text: 'ou choisissez un quartier' }),
    el('div', null, ZONES.map((z) => {
      const isCurrent = current && current.label === z.name;
      return el('button', {
        class: 'zone', type: 'button',
        onclick: () => chooseOrigin({ label: z.name, latitude: z.latitude, longitude: z.longitude }, close),
      },
        el('span', { class: isCurrent ? 'zi cur' : 'zi' }, icon(isCurrent ? 'check' : 'pin')),
        el('span', { class: 'grow' }, el('b', { text: z.name }), el('small', { text: z.hint })),
        icon('chevronRight'));
    })),
    errorSlot,
  ];
}

function openAddressSheet() {
  openSheet((close) => [el('div', { class: 'grabber' }), addressPicker(null, close)], { label: 'Adresse de livraison' });
}

function renderOnboarding(message) {
  chrome('bare');
  setView(el('div', { class: 'onb' },
    el('section', { class: 'onb-hero' },
      ['🍗', '🥘', '🍌', '🧃'].map((e, i) => el('span', { class: `bubble b${i + 1}`, 'aria-hidden': 'true', text: e })),
      el('div', null,
        el('div', { class: 'logo' }, logoMark(), el('b', null, 'Winged ', el('span', { style: 'color:var(--gold-500)', text: 'Eats' }))),
        el('p', { text: 'Les maquis et restaurants de Ouaga, livrés chez vous.' }),
        el('div', { class: 'tri' }))),
    el('section', { class: 'onb-sheet' }, addressPicker(message, null))));
}

// ---------------------------------------------------------------------
// Accueil
// ---------------------------------------------------------------------

const FILTERS = [
  ['open', 'Ouverts', null],
  ['near', 'Moins de 3 km', null],
  ['cheap', 'Livraison ≤ 500 F', null],
  ['fast', 'Prêt en 20 min', 'flame'],
];
const SORTS = [
  ['distance', 'Distance', 'Les plus proches d’abord'],
  ['fee', 'Frais de livraison', 'Les moins chers d’abord'],
  ['prep', 'Temps de préparation', 'Les plus rapides d’abord'],
  ['name', 'Nom', 'Ordre alphabétique'],
];
const homeState = { category: null, filters: new Set(), sort: 'distance' };

function filterRestaurants(list) {
  const f = homeState.filters;
  return list.filter((r) => {
    if (homeState.category && catKeyOf(r) !== homeState.category) return false;
    if (f.has('open') && !(r.is_open && r.in_delivery_zone)) return false;
    if (f.has('near') && !(r.in_delivery_zone && r.distance_km <= 3)) return false;
    if (f.has('cheap') && !(r.in_delivery_zone && r.delivery_fee <= 500)) return false;
    if (f.has('fast') && !(r.prep_minutes <= 20)) return false;
    return true;
  });
}

function sortRestaurants(list) {
  const key = {
    distance: (a, b) => a.distance_km - b.distance_km,
    fee: (a, b) => a.delivery_fee - b.delivery_fee,
    prep: (a, b) => a.prep_minutes - b.prep_minutes,
    name: (a, b) => displayName(a.name).localeCompare(displayName(b.name), 'fr'),
  }[homeState.sort];
  return [...list].sort((a, b) => (b.in_delivery_zone - a.in_delivery_zone) || (b.is_open - a.is_open) || key(a, b));
}

function restaurantCard(r, { onFocus } = {}) {
  const name = displayName(r.name);
  const closed = !r.is_open;
  const out = r.in_delivery_zone === false;
  let tag = null;
  if (!closed && !out) {
    if (r.delivery_fee <= 400) tag = el('span', { class: 'tag gold', text: `Livraison ${fmtF(r.delivery_fee)}` });
    else if (r.prep_minutes <= 15) tag = el('span', { class: 'tag' }, icon('flame'), 'Rapide');
  }
  const overlay = closed ? 'Fermé pour le moment' : out ? `Hors zone · ${fmtKm(r.distance_km)}` : null;
  return el('article', { class: out ? 'rc dim' : 'rc', 'data-id': r.id },
    coverFor(r, closed || out ? 'closed' : '', tag, overlay ? el('div', { class: 'overlay' }, el('span', { text: overlay })) : null),
    favButton(r.id),
    el('div', { class: 'rc-body' },
      el('div', { class: 'rc-title' },
        el('strong', { text: name }),
        r.distance_km !== undefined ? el('span', { class: 'dist', text: fmtKm(r.distance_km) }) : null),
      el('div', { class: 'rc-sub', text: `${r.category} · ${r.quartier}` }),
      el('div', { class: 'rc-meta' },
        r.delivery_fee !== undefined ? el('span', { class: 'fee' }, icon('bike'), fmtF(r.delivery_fee)) : null,
        el('span', null, icon('clock'), `${r.prep_minutes} min`),
        r.opening_hours ? el('span', { text: r.opening_hours }) : null)),
    out ? null : el('a', {
      class: 'stretch', href: `#/r/${r.id}`, 'aria-label': `${name}, ${r.category}, ${closed ? 'fermé' : 'ouvert'}`,
      onfocus: onFocus || null,
    }));
}

function homeHeader(origin) {
  const hasOrders = Object.keys(store.get('we_orders', {})).length > 0;
  return el('header', { class: 'appbar' },
    el('div', { class: 'appbar-row' },
      el('button', { class: 'addr', type: 'button', onclick: openAddressSheet, 'aria-label': `Adresse de livraison : ${origin.label}. Modifier` },
        el('span', { class: 'addr-ico' }, icon('pin')),
        el('span', { style: 'min-width:0' }, el('small', { text: 'Livrer à' }), el('b', null, origin.label, icon('chevronDown')))),
      el('a', { class: 'icon-btn', href: '#/orders', 'aria-label': 'Mes commandes' }, icon('receipt'), hasOrders ? el('i', { class: 'dot' }) : null)),
    el('nav', { class: 'verticals', 'aria-label': 'Services' },
      el('button', { class: 'chip on', type: 'button', 'aria-current': 'true' }, el('span', { class: 'emo', text: '🍽️' }), 'Restaurants'),
      el('button', { class: 'chip soon', type: 'button', onclick: () => toast('Pharmacies de garde : bientôt disponible', 'sparkle') },
        el('span', { class: 'emo', text: '💊' }), 'Pharmacies', el('span', { class: 'soon-tag', text: 'Bientôt' })),
      el('button', { class: 'chip soon', type: 'button', onclick: () => toast('Mobilité : bientôt disponible', 'sparkle') },
        el('span', { class: 'emo', text: '🛵' }), 'Mobilité', el('span', { class: 'soon-tag', text: 'Bientôt' }))));
}

function promos(origin, inZone) {
  const minFee = inZone.length ? Math.min(...inZone.map((r) => r.delivery_fee)) : null;
  const toList = () => document.getElementById('all-restaurants')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return el('div', { class: 'promos', role: 'region', 'aria-label': 'À la une' },
    el('div', { class: 'promo cover th-savane' },
      collage('🍗', ['🌶️', '🍌', '🔥']),
      el('span', { class: 'eyebrow', text: 'Ouagadougou' }),
      el('h3', { text: 'Vos maquis préférés, livrés chez vous' }),
      minFee !== null ? el('p', { text: `Livraison dès ${fmtF(minFee)} à ${origin.label}` }) : null,
      el('button', { class: 'btn', type: 'button', onclick: toList }, 'Commander', icon('arrowRight'))),
    el('div', { class: 'promo cover th-sahel' },
      collage('💵', ['✨', '🪙', '']),
      el('span', { class: 'eyebrow', text: 'Paiement' }),
      el('h3', { text: 'Payez en espèces à la livraison' }),
      el('p', { text: 'Mobile Money arrive bientôt.' })),
    el('div', { class: 'promo cover th-ember' },
      collage('🛵', ['🔐', '✨', '']),
      el('span', { class: 'eyebrow', text: 'Remise sécurisée' }),
      el('h3', { text: 'Un code à 4 chiffres pour chaque commande' }),
      el('p', { text: 'Donnez-le au livreur à la réception.' })));
}

// Filtres applicables aux établissements Google (ils n'ont ni frais de livraison ni temps de préparation).
function filterPlaces(places) {
  const f = homeState.filters;
  if (f.has('cheap') || f.has('fast')) return [];
  return places.filter((p) => (!f.has('open') || p.open_now === true) && (!f.has('near') || (p.distance_km !== null && p.distance_km <= 3)));
}

function homeContent(list, origin, redraw) {
  const inZone = list.filter((r) => r.in_delivery_zone);
  if (inZone.length === 0 && !googleOn()) {
    return [emptyState('pin', 'Pas encore de livraison ici',
      `Aucun restaurant ne livre à ${origin.label} pour le moment. Essayez un quartier pilote.`,
      el('button', { class: 'btn', type: 'button', onclick: openAddressSheet }, icon('pin'), "Changer d'adresse"))];
  }
  // Avec Google : toutes les catégories façon plateforme de livraison ; sinon celles des partenaires.
  const categories = googleOn()
    ? appConfig.categories.map((c) => c.key)
    : [...new Set(list.map(catKeyOf))];
  const browsing = Boolean(homeState.category) || homeState.filters.size > 0;
  const shown = sortRestaurants(filterRestaurants(list));
  const favList = favs().map((id) => list.find((r) => r.id === id)).filter(Boolean);
  const sortLabel = SORTS.find(([k]) => k === homeState.sort)[1];

  const openSort = () => openSheet((close) => [
    el('div', { class: 'grabber' }),
    el('h2', { text: 'Trier les restaurants' }),
    el('p', { class: 'sheet-text', text: 'Les restaurants hors zone restent en fin de liste.' }),
    el('div', { role: 'radiogroup' }, SORTS.map(([key, label, hint]) => el('label', { class: 'opt-row' },
      el('input', {
        type: 'radio', name: 'sort', checked: homeState.sort === key,
        onchange: () => { homeState.sort = key; redraw(); close(); },
      }),
      el('span', { class: 'mark' }, icon('check')),
      el('span', { class: 'name' }, el('b', { text: label }), el('div', { class: 'muted', text: hint }))))),
  ], { label: 'Trier' });

  const resetBrowse = () => { homeState.category = null; homeState.filters.clear(); redraw(); };
  const catLabel = homeState.category ? catInfo(homeState.category).label : null;

  return [
    !browsing ? promos(origin, inZone) : null,
    el('div', { class: 'cats', role: 'group', 'aria-label': 'Catégories' }, categories.map((key) => {
      const info = catInfo(key);
      return el('button', {
        class: homeState.category === key ? 'cat on' : 'cat', type: 'button', 'aria-pressed': String(homeState.category === key),
        onclick: () => { homeState.category = homeState.category === key ? null : key; redraw(); },
      }, el('span', { class: `cat-ico tint-${CAT_THEME[key] || 'savane'}`, text: info.emoji }), el('span', { text: info.label }));
    })),
    el('div', { class: 'filters', role: 'group', 'aria-label': 'Filtres' },
      el('button', { class: homeState.sort !== 'distance' ? 'chip on' : 'chip', type: 'button', onclick: openSort },
        icon('sliders'), `Trier : ${sortLabel}`, icon('chevronDown')),
      FILTERS.map(([key, label, ic]) => el('button', {
        class: homeState.filters.has(key) ? 'chip on' : 'chip', type: 'button', 'aria-pressed': String(homeState.filters.has(key)),
        onclick: () => {
          if (homeState.filters.has(key)) homeState.filters.delete(key); else homeState.filters.add(key);
          redraw();
        },
      }, ic ? icon(ic) : null, label))),
    !browsing && favList.length ? el('section', { class: 'sec' },
      el('div', { class: 'sec-head' }, el('div', null, el('h2', { text: 'Vos favoris' }))),
      el('div', { class: 'hscroll' }, favList.map((r) => restaurantCard(r)))) : null,
    !browsing ? googleSection({
      title: 'Les mieux notés autour de vous', sub: 'Restaurants réels · notes Google', layout: 'carousel',
      load: () => gNearby(origin),
      transform: (l) => l.filter((p) => p.rating >= 4).sort((a, b) => b.rating - a.rating || b.rating_count - a.rating_count).slice(0, 10),
    }) : null,
    !browsing && inZone.length ? el('section', { class: 'sec' },
      el('div', { class: 'sec-head' }, el('div', null, el('h2', { text: 'Commander maintenant' }), el('p', { text: `Restaurants partenaires · livraison à ${origin.label}` }))),
      el('div', { class: 'hscroll' }, [...inZone].sort((a, b) => a.distance_km - b.distance_km).slice(0, 6).map((r) => restaurantCard(r)))) : null,
    !browsing ? dishesSection(inZone) : null,
    el('div', { class: 'results-bar', id: 'all-restaurants', style: 'scroll-margin-top:150px' },
      el('div', null,
        el('h2', { style: 'font-size:22px;font-weight:800', text: browsing ? (catLabel || 'Résultats') : 'Restaurants partenaires' }),
        el('div', { class: 'muted', text: `${plural(shown.length, 'restaurant')} où commander` })),
      browsing ? el('button', { class: 'btn soft sm', type: 'button', onclick: resetBrowse }, 'Réinitialiser') : null),
    shown.length
      ? el('div', { class: 'rlist' }, shown.map((r) => restaurantCard(r)))
      : googleOn()
        ? el('div', { class: 'page' }, alertBox('Aucun restaurant partenaire ne correspond pour l’instant. Découvrez ci-dessous les établissements de Ouaga.', 'info'))
        : emptyState('search', 'Aucun résultat', 'Aucun restaurant ne correspond à ces filtres.',
          el('button', { class: 'btn', type: 'button', onclick: resetBrowse }, 'Effacer les filtres')),
    googleSection({
      title: catLabel ? `${catLabel} à Ouaga` : 'À découvrir à Ouaga',
      sub: 'Pas encore disponibles à la commande',
      load: () => (homeState.category ? gCategory(origin, homeState.category) : gNearby(origin)),
      transform: filterPlaces,
      empty: browsing ? 'Aucun établissement ne correspond à ces filtres.' : null,
    }),
  ];
}

// Carrousel de plats : charge les menus des restaurants ouverts les plus proches, après l'affichage principal.
function dishesSection(inZone) {
  const rail = el('div', { class: 'hscroll' },
    [0, 1, 2].map(() => el('div', { class: 'dc', 'aria-hidden': 'true' },
      el('div', { class: 'skel', style: 'aspect-ratio:1;border-radius:18px' }),
      el('div', { class: 'skel', style: 'height:12px;width:70%;margin-top:10px' }),
      el('div', { class: 'skel', style: 'height:14px;width:90%;margin-top:6px' }))));
  const sec = el('section', { class: 'sec' },
    el('div', { class: 'sec-head' }, el('div', null, el('h2', { text: 'À goûter près de vous' }), el('p', { text: 'Ajoutez en un geste' }))),
    rail);
  const open = inZone.filter((r) => r.is_open).sort((a, b) => a.distance_km - b.distance_km).slice(0, 4);
  if (!open.length) return null;
  Promise.allSettled(open.map((r) => getMenu(r.id))).then((results) => {
    const menus = results.filter((x) => x.status === 'fulfilled').map((x) => x.value);
    const perMenu = menus.map((m) => m.categories.flatMap((c) => c.items.map((item) => ({ item, menu: m, section: c.name })))
      .filter(({ item }) => item.available).slice(0, 3));
    const picks = [];
    for (let i = 0; i < 3; i++) for (const list of perMenu) if (list[i]) picks.push(list[i]);
    if (!picks.length) { sec.remove(); return; }
    rail.replaceChildren(...picks.slice(0, 10).map(({ item, menu, section }) => {
      const t = THEMES[section] ? theme(section) : theme(menu.category);
      return el('button', {
        class: 'dc', type: 'button', 'aria-label': `${item.name}, ${fmt(item.price)}, chez ${displayName(menu.name)}. Ajouter`,
        onclick: () => openItem(item, menu, () => updateCartBadge()),
      },
        el('div', { class: `cover th-${t.th}` }, collage(dishEmoji(item.name, t)), el('span', { class: 'add-fab' }, icon('plus'))),
        el('small', { text: displayName(menu.name) }),
        el('strong', { text: item.name }),
        el('span', { class: 'p', text: fmt(item.price) }));
    }));
  }).catch(() => sec.remove());
  return sec;
}

function homeSkeleton(origin) {
  return [
    homeHeader(origin),
    el('div', { class: 'page', 'aria-busy': 'true', 'aria-label': 'Chargement' },
      el('div', { class: 'skel', style: 'height:162px;border-radius:24px;margin-top:8px' }),
      el('div', { style: 'display:flex;gap:18px;margin-top:20px' }, [0, 1, 2, 3].map(() => el('div', { class: 'skel', style: 'width:64px;height:64px;border-radius:22px' }))),
      el('div', { class: 'skel', style: 'height:24px;width:55%;margin-top:30px' }),
      el('div', { class: 'skel', style: 'height:170px;border-radius:20px;margin-top:14px' }),
      el('div', { class: 'skel', style: 'height:16px;width:60%;margin-top:12px' })),
  ];
}

async function renderHome(alive) {
  const origin = store.get('we_origin', null);
  if (!origin) return renderOnboarding();
  chrome('dock', 'home');
  setView(homeSkeleton(origin));
  let list;
  try {
    list = await getRestaurants(origin);
  } catch (e) {
    if (!alive()) return;
    return setView(homeHeader(origin), el('div', { class: 'page' }, alertBox(e.message),
      el('button', { class: 'btn block', type: 'button', onclick: () => route() }, icon('refresh'), 'Réessayer')));
  }
  if (!alive()) return;
  const body = el('div');
  const redraw = () => body.replaceChildren(...homeContent(list, origin, redraw).flat(Infinity).filter(Boolean));
  redraw();
  setView(homeHeader(origin), body);
  showLiveOrder(alive);
}

// Bandeau flottant « commande en cours » (au-dessus du dock).
async function showLiveOrder(alive) {
  const phones = store.get('we_orders', {});
  const ids = Object.keys(phones).map(Number).sort((a, b) => b - a).slice(0, 3);
  for (const id of ids) {
    let o;
    try { o = await api(`/orders/${id}?phone=${encodeURIComponent(phones[id])}`); } catch { continue; }
    if (!alive()) return;
    if (TERMINAL.includes(o.status)) continue;
    const meta = store.get('we_order_meta', {})[id] || {};
    const s = STATUS[o.status];
    const node = el('div', { class: 'live' },
      el('a', { href: `#/order/${id}` },
        el('span', { class: 'pulse', 'aria-hidden': 'true', text: s.emoji }),
        el('span', { class: 'grow' },
          el('b', { text: `${s.label} · n°${id}` }),
          el('small', { text: meta.restaurant_name ? `${displayName(meta.restaurant_name)} · Suivre la commande` : 'Suivre la commande' })),
        icon('chevronRight')));
    document.body.append(node);
    document.body.classList.add('has-live');
    onCleanup(() => { node.remove(); document.body.classList.remove('has-live'); });
    return;
  }
}

// ---------------------------------------------------------------------
// Restaurant et menu
// ---------------------------------------------------------------------

function openItem(item, menu, onAdded) {
  if (!item.available || !menu.is_open) {
    toast(!menu.is_open ? 'Restaurant fermé : commande impossible' : 'Article en rupture', 'info');
    return;
  }
  const state = { quantity: 1, selected: new Map() };
  const sectionName = (menu.categories || []).find((c) => c.items.some((i) => i.id === item.id))?.name;
  const t = THEMES[sectionName] ? theme(sectionName) : theme(menu.category);
  const isSelected = (group, optionId) => (state.selected.get(group.id) || new Set()).has(optionId);
  const unitPrice = () => item.price + item.option_groups.reduce((sum, g) =>
    sum + g.options.filter((o) => isSelected(g, o.id)).reduce((s, o) => s + o.price_delta, 0), 0);
  const missing = () => item.option_groups.find((g) => g.required && !(state.selected.get(g.id)?.size > 0));

  const addBtn = el('button', { class: 'btn lg', type: 'button' });
  const reqPills = new Map();
  const refresh = () => {
    const m = missing();
    addBtn.disabled = Boolean(m);
    addBtn.classList.toggle('center', Boolean(m));
    fill(addBtn, m
      ? el('span', { class: 'lbl', text: 'Faites un choix', title: `Choix obligatoire : ${m.name}` })
      : [el('span', { class: 'lbl', text: 'Ajouter' }), el('span', { class: 'nowrap', text: fmt(unitPrice() * state.quantity) })]);
    for (const [g, pill] of reqPills) {
      const done = (state.selected.get(g.id)?.size || 0) > 0;
      pill.className = done ? 'req done' : 'req must';
      pill.textContent = done ? '✓ Choisi' : 'Obligatoire';
    }
  };

  const groupNodes = item.option_groups.map((g) => {
    const single = g.max_choices === 1;
    const pill = g.required ? el('span', { class: 'req must', text: 'Obligatoire' }) : el('span', { class: 'req', text: 'Facultatif' });
    if (g.required) reqPills.set(g, pill);
    return el('fieldset', { class: 'group', style: 'border-left:0;border-right:0;border-bottom:0' },
      el('legend', { class: 'sr-only', text: g.name }),
      el('div', { class: 'group-head' },
        el('div', null, el('h3', { text: g.name }), el('small', { text: single ? 'Choisissez 1 option' : `Jusqu'à ${g.max_choices} choix` })),
        pill),
      g.options.map((o) => el('label', { class: 'opt-row' },
        el('input', {
          type: single ? 'radio' : 'checkbox',
          name: `g${g.id}`,
          checked: isSelected(g, o.id),
          onchange: (e) => {
            let set = state.selected.get(g.id) || new Set();
            if (single) set = new Set([o.id]);
            else if (e.target.checked) {
              if (set.size >= g.max_choices) {
                e.target.checked = false;
                toast(`Maximum ${g.max_choices} choix pour « ${g.name} »`, 'info');
                return;
              }
              set = new Set(set).add(o.id);
            } else {
              set = new Set(set);
              set.delete(o.id);
            }
            state.selected.set(g.id, set);
            refresh();
          },
        }),
        el('span', { class: single ? 'mark' : 'mark box' }, icon('check')),
        el('span', { class: 'name', text: o.name }),
        el('span', { class: 'delta', text: o.price_delta ? `+${fmt(o.price_delta)}` : 'Inclus' }))));
  });

  const close = openSheet((closeFn) => [
    el('div', { class: `cover item-hero th-${t.th}` },
      collage(dishEmoji(item.name, t), t.deco),
      el('button', { class: 'icon-btn glass sheet-close', type: 'button', 'aria-label': 'Fermer', onclick: closeFn }, icon('x'))),
    el('div', { class: 'item-body' },
      el('h2', { text: item.name }),
      el('div', { class: 'price-line', text: fmt(item.price) }),
      item.description ? el('p', { class: 'desc', text: item.description }) : null,
      groupNodes),
    el('div', { class: 'sheet-foot' },
      stepper(1, { onChange: (v) => { state.quantity = v; refresh(); } }),
      addBtn),
  ], { flush: true, label: item.name });

  addBtn.onclick = async () => {
    if (missing()) return;
    const chosen = [];
    for (const g of item.option_groups) {
      for (const o of g.options) if (isSelected(g, o.id)) chosen.push(o);
    }
    const existing = store.get('we_cart', null);
    if (existing && existing.restaurant_id !== menu.id && existing.lines.length > 0) {
      const ok = await confirmSheet({
        title: 'Nouveau panier ?',
        text: `Votre panier contient des articles de ${displayName(existing.restaurant_name)}. Les remplacer par ce plat de ${displayName(menu.name)} ?`,
        ok: 'Remplacer le panier',
        cancel: 'Garder mon panier',
        danger: true,
      });
      if (!ok) return;
    }
    const cart = existing && existing.restaurant_id === menu.id
      ? existing
      : { restaurant_id: menu.id, restaurant_name: menu.name, lines: [] };
    const unit = unitPrice();
    cart.lines.push({
      item_id: item.id,
      name: item.name,
      unit_price: unit,
      quantity: state.quantity,
      option_ids: chosen.map((o) => o.id),
      options_label: chosen.map((o) => o.name).join(' + '),
      line_total: unit * state.quantity,
    });
    cart.restaurant_category = menu.category;
    store.set('we_cart', cart);
    close();
    updateCartBadge();
    toast(`Ajouté : ${state.quantity} × ${item.name}`, 'bag');
    if (onAdded) onAdded();
  };

  refresh();
}

function dishRow(item, menu, sectionName) {
  const canOrder = item.available && menu.is_open;
  const t = THEMES[sectionName] ? theme(sectionName) : theme(menu.category);
  return el('button', {
    class: 'dish', type: 'button', disabled: !canOrder,
    'aria-label': `${item.name}, ${fmt(item.price)}${!item.available ? ', en rupture' : ''}`,
    onclick: () => openItem(item, menu, () => paintCartBar(menu.id)),
  },
    el('div', { class: 'dish-info' },
      el('strong', { text: item.name }),
      item.description ? el('p', { text: item.description }) : null,
      el('div', { class: 'dish-price' },
        el('b', { text: fmt(item.price) }),
        !item.available
          ? el('span', { class: 'out', text: 'Rupture' })
          : item.option_groups.length ? el('span', { class: 'soft', text: 'Personnalisable' }) : null)),
    el('div', { class: `dish-thumb cover th-${t.th}` },
      collage(dishEmoji(item.name, t)),
      canOrder ? el('span', { class: 'add-fab' }, icon('plus')) : null));
}

let cartBarSlot = null;
function paintCartBar(restaurantId) {
  if (!cartBarSlot) return;
  const count = cartCount(restaurantId);
  fill(cartBarSlot, count > 0 ? el('div', { class: 'cartbar' },
    el('a', { class: 'btn lg', href: '#/cart' },
      el('span', { class: 'qtyb', text: String(count) }),
      el('span', { text: 'Voir le panier' }),
      el('span', { text: fmt(cartTotal()) }))) : null);
  document.body.classList.toggle('has-cartbar', count > 0);
}

function stat(ic, value, label) {
  return el('div', { class: 'stat' }, el('b', null, icon(ic), value), el('small', { text: label }));
}

async function renderRestaurant(id, alive) {
  chrome('nodock');
  setView(
    el('div', { class: 'skel', style: 'height:236px;border-radius:0' }),
    el('div', { class: 'page', 'aria-busy': 'true' },
      el('div', { class: 'skel', style: 'height:30px;width:65%;margin-top:26px' }),
      el('div', { class: 'skel', style: 'height:16px;width:80%;margin-top:12px' }),
      el('div', { class: 'skel', style: 'height:64px;margin-top:18px;border-radius:20px' }),
      [0, 1, 2].map(() => el('div', { class: 'skel', style: 'height:96px;margin-top:16px;border-radius:18px' }))));

  const origin = store.get('we_origin', null);
  let menu;
  let info = null;
  try {
    [menu, info] = await Promise.all([
      api(`/restaurants/${id}`),
      origin ? getRestaurants(origin).then((l) => l.find((r) => r.id === id) || null).catch(() => null) : null,
    ]);
  } catch (e) {
    if (!alive()) return;
    return setView(el('div', { class: 'pagehead' }, backButton(), el('div', { class: 'title', text: 'Restaurant' }), el('span', { class: 'spacer' })),
      el('div', { class: 'page' }, alertBox(e.message),
        el('button', { class: 'btn block', type: 'button', onclick: () => route() }, icon('refresh'), 'Réessayer')));
  }
  if (!alive()) return;
  putMenu(menu);

  const t = theme(menu.category);
  const name = displayName(menu.name);
  const bar = el('div', { class: 'store-bar' },
    el('button', {
      class: 'icon-btn glass', type: 'button', 'aria-label': 'Retour',
      onclick: () => { if (navCount > 0) history.back(); else location.hash = '#/'; },
    }, icon('arrowLeft')),
    el('div', { class: 'name', text: name, 'aria-hidden': 'true' }),
    favButton(id, 'icon-btn glass'));

  const tabs = el('nav', { class: 'tabs', 'aria-label': 'Rubriques du menu' }, menu.categories.map((cat, i) => el('button', {
    class: i === 0 ? 'tab on' : 'tab', type: 'button', 'data-target': `cat-${cat.id}`,
    onclick: () => document.getElementById(`cat-${cat.id}`).scrollIntoView({ behavior: 'smooth', block: 'start' }),
  }, cat.name)));

  cartBarSlot = el('div');
  setView(
    bar,
    el('div', { class: `cover store-cover th-${t.th}${menu.is_open ? '' : ' closed'}` }, collage(mainEmoji(menu), t.deco.filter((d) => d !== mainEmoji(menu)))),
    el('section', { class: 'store-head' },
      el('div', { class: `store-logo tint-${t.th}`, 'aria-hidden': 'true', text: t.icon }),
      el('h1', null, name, isDemo(menu.name) ? el('span', { class: 'demo-chip', text: 'Démo' }) : null),
      el('p', { class: 'desc', text: [menu.category, menu.quartier, menu.address_hint].filter(Boolean).join(' · ') }),
      el('div', { class: 'status' },
        el('span', { class: menu.is_open ? 'badge ok' : 'badge bad', text: menu.is_open ? 'Ouvert' : 'Fermé' }),
        menu.opening_hours ? el('span', { class: 'badge plain' }, icon('clock'), menu.opening_hours) : null),
      el('div', { class: 'stats' },
        stat('bike', info ? fmtF(info.delivery_fee) : '—', 'Livraison'),
        stat('clock', `${menu.prep_minutes} min`, 'Préparation'),
        stat('pin', info ? fmtKm(info.distance_km) : '—', 'Distance')),
      !menu.is_open ? alertBox('Restaurant fermé pour le moment : vous pouvez consulter le menu, mais pas commander.') : null,
      info && !info.in_delivery_zone ? alertBox(`Hors zone de livraison (${fmtKm(info.distance_km)}). Changez d'adresse pour commander.`) : null),
    tabs,
    menu.categories.map((cat) => el('section', { id: `cat-${cat.id}`, class: 'menu-sec', 'aria-label': cat.name },
      el('h2', { text: cat.name }),
      cat.items.map((item) => dishRow(item, menu, cat.name)))),
    el('div', { style: 'height:24px' }),
    cartBarSlot,
  );
  paintCartBar(id);

  const coverH = 170;
  const onScroll = () => bar.classList.toggle('solid', window.scrollY > coverH);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  onCleanup(() => { window.removeEventListener('scroll', onScroll); cartBarSlot = null; document.body.classList.remove('has-cartbar'); });

  // Onglet actif selon la rubrique visible.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        tabs.querySelectorAll('.tab').forEach((b) => {
          const on = b.dataset.target === entry.target.id;
          b.classList.toggle('on', on);
          if (on) b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        });
      }
    }, { rootMargin: '-140px 0px -60% 0px' });
    main.querySelectorAll('.menu-sec').forEach((s) => io.observe(s));
    onCleanup(() => io.disconnect());
  }
}

// ---------------------------------------------------------------------
// Panier et commande
// ---------------------------------------------------------------------

function cartHeader() {
  return el('header', { class: 'pagehead' },
    backButton(),
    el('div', { class: 'title', text: 'Panier' }),
    el('a', { class: 'chip', href: '#/orders' }, icon('receipt'), 'Commandes'));
}

function renderCart(alive) {
  const cart = store.get('we_cart', null);
  if (!cart || cart.lines.length === 0) {
    chrome('dock', 'cart');
    return setView(cartHeader(),
      emptyState('bag', 'Votre panier est vide', "Ajoutez des plats d'un restaurant : ils apparaîtront ici.",
        el('a', { class: 'btn lg', href: '#/' }, 'Découvrir les restaurants')));
  }
  const origin = store.get('we_origin', null);
  if (!origin) return renderOnboarding('Choisissez une adresse de livraison avant de commander.');
  chrome('nodock', 'cart');

  const save = () => store.set('we_cart', cart);
  const subtotal = () => cart.lines.reduce((s, l) => s + l.line_total, 0);
  const t = theme(cart.restaurant_category);
  let fee = null;
  let blocked = null;

  const linesCard = el('div', { class: 'card' });
  const summary = el('div', { class: 'card' });
  const errorSlot = el('div');
  const submit = el('button', { class: 'btn lg', type: 'submit' });

  const paint = () => {
    if (cart.lines.length === 0) { store.remove('we_cart'); updateCartBadge(); route(); return; }
    linesCard.replaceChildren(
      el('a', { class: 'store-chip', href: `#/r/${cart.restaurant_id}` },
        miniCover(t, t.icon, 'mini'),
        el('span', { class: 'grow' }, el('b', { text: displayName(cart.restaurant_name) }), el('small', { text: '+ Ajouter des articles' })),
        icon('chevronRight')),
      el('div', { style: 'margin-top:6px' }, cart.lines.map((line, index) => el('div', { class: 'line' },
        miniCover(t, dishEmoji(line.name, t), 'thumb'),
        el('div', { class: 'info' },
          el('b', { text: line.name }),
          line.options_label ? el('small', { text: line.options_label }) : null,
          el('span', { class: 'lp', text: fmt(line.line_total) })),
        stepper(line.quantity, {
          small: true,
          trashAtMin: true,
          onChange: (v) => {
            if (v === 0) cart.lines.splice(index, 1);
            else { line.quantity = v; line.line_total = line.unit_price * v; }
            save(); updateCartBadge(); paint();
          },
        })))));
    const total = fee === null ? null : subtotal() + fee.delivery_fee;
    summary.replaceChildren(
      el('div', { class: 'sum-row' }, el('span', { text: `Sous-total · ${plural(cartCount(), 'article')}` }), el('span', { text: fmt(subtotal()) })),
      el('div', { class: 'sum-row' },
        el('span', null, 'Livraison ', fee ? el('small', { text: `· ${fmtKm(fee.distance_km)}` }) : null),
        el('span', { text: fee ? fmt(fee.delivery_fee) : '…' })),
      el('div', { class: 'sum-row total' }, el('span', { text: 'Total' }), el('span', { text: total === null ? '…' : fmt(total) })));
    submit.disabled = Boolean(blocked);
    submit.replaceChildren(el('span', { text: 'Commander' }), el('span', { text: total === null ? fmt(subtotal()) : fmt(total) }));
  };

  const profile = store.get('we_profile', {});
  const form = el('form', {
    novalidate: false,
    onsubmit: async (e) => {
      e.preventDefault();
      const f = e.target.elements;
      const body = {
        restaurant_id: cart.restaurant_id,
        customer_name: f.name.value,
        customer_phone: f.phone.value,
        repere: f.repere.value,
        note: f.note.value,
        latitude: origin.latitude,
        longitude: origin.longitude,
        items: cart.lines.map((l) => ({ item_id: l.item_id, quantity: l.quantity, option_ids: l.option_ids })),
      };
      submit.disabled = true;
      submit.replaceChildren(el('span', { text: 'Envoi de la commande…' }));
      try {
        const order = await api('/orders', { method: 'POST', body });
        const phones = store.get('we_orders', {});
        phones[order.id] = body.customer_phone;
        store.set('we_orders', phones);
        const meta = store.get('we_order_meta', {});
        meta[order.id] = { restaurant_id: cart.restaurant_id, restaurant_name: cart.restaurant_name, category: cart.restaurant_category || null };
        store.set('we_order_meta', meta);
        store.set('we_profile', { name: body.customer_name, phone: body.customer_phone });
        store.remove('we_cart');
        updateCartBadge();
        location.hash = `#/order/${order.id}`;
      } catch (err) {
        errorSlot.replaceChildren(alertBox(err.message));
        errorSlot.scrollIntoView({ behavior: 'smooth', block: 'center' });
        paint();
      }
    },
  },
    el('h2', { class: 'card-title', text: 'Livraison' }),
    el('div', { class: 'card' },
      el('div', { class: 'addr-card' },
        el('span', { class: 'zi' }, icon('pin')),
        el('span', { class: 'grow' }, el('b', { text: origin.label }), el('small', { text: 'Adresse de livraison' })),
        el('button', { class: 'link-btn', type: 'button', onclick: openAddressSheet }, 'Modifier')),
      el('div', { class: 'field', style: 'margin-top:16px' },
        el('label', { for: 'repere' }, 'Repère pour le livreur'),
        el('textarea', { id: 'repere', name: 'repere', required: true, rows: 2, maxlength: 200, placeholder: 'Ex. portail bleu, en face de la pharmacie' }))),
    el('h2', { class: 'card-title', text: 'Vos coordonnées' }),
    el('div', { class: 'card' },
      el('div', { class: 'field' },
        el('label', { for: 'name' }, 'Votre nom'),
        el('input', { id: 'name', name: 'name', required: true, maxlength: 80, autocomplete: 'name', value: profile.name || '' })),
      el('div', { class: 'field' },
        el('label', { for: 'phone' }, 'Téléphone'),
        el('input', { id: 'phone', name: 'phone', type: 'tel', required: true, autocomplete: 'tel', inputmode: 'tel', placeholder: '+226 70 00 00 00', value: profile.phone || '' }),
        el('div', { class: 'hint', text: 'Sert au suivi de la commande et au livreur.' })),
      el('div', { class: 'field' },
        el('label', { for: 'note' }, 'Remarque pour le restaurant (facultatif)'),
        el('input', { id: 'note', name: 'note', maxlength: 300, placeholder: 'Ex. sans piment' }))),
    el('h2', { class: 'card-title', text: 'Paiement' }),
    el('div', { class: 'pay on', role: 'radio', 'aria-checked': 'true' },
      el('span', { class: 'pi' }, icon('cash')),
      el('span', { class: 'grow' }, el('b', { text: 'Espèces à la livraison' }), el('small', { text: 'Préparez si possible le montant exact' })),
      el('span', { class: 'tick' }, icon('check'))),
    el('div', { class: 'pay off', role: 'radio', 'aria-checked': 'false', 'aria-disabled': 'true' },
      el('span', { class: 'pi' }, icon('mobile')),
      el('span', { class: 'grow' }, el('b', { text: 'Mobile Money' }), el('small', { text: 'Bientôt disponible' }))),
    el('h2', { class: 'card-title', text: 'Récapitulatif' }),
    summary,
    errorSlot,
    el('div', { class: 'checkout-bar' }, submit));

  setView(cartHeader(), el('div', { class: 'page' }, linesCard, form));
  paint();

  getRestaurants(origin).then((list) => {
    if (!alive()) return;
    const r = list.find((x) => x.id === cart.restaurant_id);
    if (!r) return;
    fee = r;
    if (!r.in_delivery_zone) blocked = `Hors zone de livraison (${fmtKm(r.distance_km)}). Changez d'adresse.`;
    else if (!r.is_open) blocked = 'Ce restaurant est fermé. Commande impossible.';
    if (blocked) errorSlot.replaceChildren(alertBox(blocked));
    paint();
  }).catch((e) => { if (alive()) errorSlot.replaceChildren(alertBox(e.message)); });
}

// ---------------------------------------------------------------------
// Suivi de commande
// ---------------------------------------------------------------------

async function restaurantMeta(o) {
  const meta = store.get('we_order_meta', {})[o.id];
  if (meta && meta.restaurant_name) return { name: meta.restaurant_name, category: meta.category };
  try {
    const m = await getMenu(o.restaurant_id);
    return { name: m.name, category: m.category };
  } catch {
    return { name: 'Restaurant', category: null };
  }
}

function orderView(o, r, onCancel) {
  const s = STATUS[o.status];
  const current = STEPS.findIndex(([code]) => code === o.status);
  const failed = o.status === 'REFUSED' || o.status === 'CANCELLED';
  const t = theme(r.category);
  const heroTheme = failed ? 'th-bad' : o.status === 'DELIVERED' ? 'th-sahel' : 'th-savane';

  return [
    el('header', { class: 'pagehead' },
      el('a', { class: 'icon-btn', href: '#/orders', 'aria-label': 'Toutes mes commandes' }, icon('arrowLeft')),
      el('div', { class: 'title', text: `Commande n°${o.id}` }),
      el('span', { class: 'spacer' })),
    el('section', { class: `cover track-hero ${heroTheme}`, 'aria-live': 'polite' },
      el('span', { class: 'emo', 'aria-hidden': 'true', text: s.emoji }),
      el('h1', { text: s.title }),
      el('p', { text: `${displayName(r.name)} · ${s.text}` }),
      !failed ? el('div', { class: 'segbar', 'aria-hidden': 'true' }, STEPS.map((_, idx) => el('i', {
        class: idx < current || o.status === 'DELIVERED' ? 'done' : idx === current ? 'cur' : '',
      }))) : null),
    el('div', { class: 'page' },
      !failed ? el('div', { class: 'card', style: 'margin-top:14px' },
        el('div', { class: 'pin-card' },
          el('div', { class: 'lbl' }, el('b', { text: 'Code de remise' }), el('small', { text: 'À donner au livreur à la réception' })),
          el('div', { class: 'pin', 'aria-label': `Code ${String(o.pickup_code).split('').join(' ')}` },
            String(o.pickup_code).split('').map((d) => el('span', { text: d }))))) : null,
      !failed ? el('div', { class: 'card' },
        el('ol', { class: 'timeline' }, STEPS.map(([code, label, sub], idx) => {
          const done = idx < current || (o.status === 'DELIVERED' && idx === current);
          const cur = idx === current && !done;
          return el('li', { class: done ? 'done' : cur ? 'cur' : '', 'aria-current': cur ? 'step' : null },
            el('span', { class: 'dotm' }, done ? icon('check') : null),
            el('div', null, el('b', { text: label }), el('small', { text: sub })));
        }))) : null,
      el('h2', { class: 'card-title', text: 'Détail' }),
      el('div', { class: 'card' },
        el('div', { class: 'store-chip' },
          miniCover(t, t.icon, 'mini'),
          el('span', { class: 'grow' },
            el('b', { text: displayName(r.name) }),
            el('span', { class: `badge ${s.cls}`, style: 'margin-top:4px', text: s.label }))),
        el('div', { style: 'margin-top:10px' }, o.items.map((it) => el('div', { class: 'sum-row' },
          el('span', null, el('b', { style: 'color:var(--ink)', text: `${it.quantity} × ` }), it.item_name,
            it.options_label ? el('small', { text: ` (${it.options_label})` }) : null),
          el('span', { class: 'nowrap', text: fmt(it.line_total) })))),
        el('div', { class: 'sum-row', style: 'border-top:1px solid var(--line-soft);margin-top:6px;padding-top:12px' },
          el('span', { text: 'Livraison' }), el('span', { text: fmt(o.delivery_fee) })),
        el('div', { class: 'sum-row total' }, el('span', { text: 'Total' }), el('span', { text: fmt(o.total) })),
        el('div', { class: 'muted', style: 'display:flex;align-items:center;gap:8px;margin-top:8px' }, icon('cash'), 'Espèces à la livraison')),
      el('div', { style: 'display:grid;gap:10px;margin-top:18px' },
        o.status === 'PENDING' ? el('button', { class: 'btn block danger-text', type: 'button', onclick: onCancel }, 'Annuler la commande') : null,
        el('a', { class: 'btn block ghost', href: '#/' }, "Retour à l'accueil"))),
  ];
}

async function renderOrder(id, alive) {
  chrome('dock', null);
  const phones = store.get('we_orders', {});
  const phone = phones[id];
  if (!phone) {
    const input = el('input', { id: 'phone', type: 'tel', required: true, inputmode: 'tel', autocomplete: 'tel', placeholder: '+226 70 00 00 00' });
    return setView(
      el('header', { class: 'pagehead' }, backButton('#/orders'), el('div', { class: 'title', text: 'Suivre une commande' }), el('span', { class: 'spacer' })),
      el('div', { class: 'page' },
        emptyState('receipt', `Commande n°${id}`, 'Entrez le numéro de téléphone utilisé lors de la commande.'),
        el('form', {
          onsubmit: (e) => {
            e.preventDefault();
            const phones2 = store.get('we_orders', {});
            phones2[id] = input.value;
            store.set('we_orders', phones2);
            route();
          },
        }, el('div', { class: 'field' }, el('label', { for: 'phone' }, 'Téléphone'), input),
        el('button', { class: 'btn block lg', type: 'submit', style: 'margin-top:14px' }, 'Suivre la commande'))));
  }

  setView(
    el('header', { class: 'pagehead' }, backButton('#/orders'), el('div', { class: 'title', text: `Commande n°${id}` }), el('span', { class: 'spacer' })),
    el('div', { class: 'skel', style: 'height:190px;margin:4px 16px 0;border-radius:24px' }),
    el('div', { class: 'page' }, el('div', { class: 'skel', style: 'height:84px;margin-top:14px;border-radius:20px' }), el('div', { class: 'skel', style: 'height:220px;margin-top:12px;border-radius:20px' })));

  let r = null;
  let timer = null;
  const stop = () => { if (timer) clearInterval(timer); timer = null; };
  onCleanup(stop);
  const draw = async () => {
    try {
      const o = await api(`/orders/${id}?phone=${encodeURIComponent(phone)}`);
      if (!alive()) return stop();
      if (!r) r = await restaurantMeta(o);
      if (!alive()) return stop();
      setView(orderView(o, r, async () => {
        const ok = await confirmSheet({
          title: 'Annuler la commande ?',
          text: "L'annulation est possible tant que le restaurant n'a pas accepté la commande.",
          ok: 'Oui, annuler', cancel: 'Non, garder', danger: true,
        });
        if (!ok) return;
        try {
          await api(`/orders/${id}/cancel`, { method: 'POST', body: { phone } });
          toast('Commande annulée', 'check');
          draw();
        } catch (err) {
          toast(err.message, 'alert');
        }
      }));
      if (TERMINAL.includes(o.status)) stop();
    } catch (e) {
      if (!alive()) return stop();
      setView(
        el('header', { class: 'pagehead' }, backButton('#/orders'), el('div', { class: 'title', text: `Commande n°${id}` }), el('span', { class: 'spacer' })),
        el('div', { class: 'page' }, alertBox(e.message), el('button', { class: 'btn block', type: 'button', onclick: () => route() }, icon('refresh'), 'Réessayer')));
      stop();
    }
  };
  timer = setInterval(draw, POLL_MS);
  await draw();
}

let ordersTab = 'current';
async function renderOrders(alive) {
  chrome('dock', 'account');
  const phones = store.get('we_orders', {});
  const ids = Object.keys(phones).map(Number).sort((a, b) => b - a).slice(0, 20);
  const head = [
    el('header', { class: 'pagehead' }, backButton('#/account'), el('div', { class: 'title', text: '' }), el('span', { class: 'spacer' })),
    el('h1', { class: 'bigtitle', text: 'Commandes' }),
  ];
  if (ids.length === 0) {
    return setView(head, emptyState('receipt', 'Aucune commande', 'Vos commandes passées sur cet appareil apparaîtront ici.',
      el('a', { class: 'btn lg', href: '#/' }, 'Commander maintenant')));
  }
  const list = el('div', { class: 'page', 'aria-busy': 'true' }, [0, 1, 2].map(() => el('div', { class: 'skel', style: 'height:72px;margin-top:14px;border-radius:16px' })));
  const seg = el('div', { class: 'seg', role: 'tablist' });
  setView(head, seg, list);

  const results = await Promise.allSettled(ids.map((id) => api(`/orders/${id}?phone=${encodeURIComponent(phones[id])}`)));
  if (!alive()) return;
  const orders = results.filter((x) => x.status === 'fulfilled').map((x) => x.value);
  const metas = store.get('we_order_meta', {});
  const names = await Promise.all(orders.map((o) => (metas[o.id] ? Promise.resolve({ name: metas[o.id].restaurant_name, category: metas[o.id].category }) : restaurantMeta(o))));
  if (!alive()) return;

  const draw = () => {
    const current = orders.filter((o) => !TERMINAL.includes(o.status));
    const past = orders.filter((o) => TERMINAL.includes(o.status));
    seg.replaceChildren(
      el('button', { class: ordersTab === 'current' ? 'on' : '', role: 'tab', 'aria-selected': String(ordersTab === 'current'), type: 'button', onclick: () => { ordersTab = 'current'; draw(); } }, `En cours (${current.length})`),
      el('button', { class: ordersTab === 'past' ? 'on' : '', role: 'tab', 'aria-selected': String(ordersTab === 'past'), type: 'button', onclick: () => { ordersTab = 'past'; draw(); } }, `Terminées (${past.length})`));
    const shown = ordersTab === 'current' ? current : past;
    list.removeAttribute('aria-busy');
    list.replaceChildren(shown.length
      ? el('div', { style: 'margin-top:6px' }, shown.map((o) => {
        const r = names[orders.indexOf(o)];
        const t = theme(r.category);
        const s = STATUS[o.status];
        const count = o.items.reduce((n, it) => n + it.quantity, 0);
        return el('a', { class: 'order-row', href: `#/order/${o.id}` },
          miniCover(t, t.icon, 'mini'),
          el('span', { class: 'grow' },
            el('b', { text: displayName(r.name) }),
            el('small', { text: `n°${o.id} · ${plural(count, 'article')} · ${fmt(o.total)} · ${orderDate(o.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` }),
            el('span', { class: `badge ${s.cls}`, text: s.label })),
          icon('chevronRight'));
      }))
      : emptyState('receipt', ordersTab === 'current' ? 'Aucune commande en cours' : 'Aucune commande terminée', null));
  };
  if (ordersTab === 'current' && !orders.some((o) => !TERMINAL.includes(o.status))) ordersTab = 'past';
  draw();
}

// ---------------------------------------------------------------------
// Recherche
// ---------------------------------------------------------------------

function highlight(text, q) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (!q || i < 0) return [text];
  return [text.slice(0, i), el('mark', { text: text.slice(i, i + q.length) }), text.slice(i + q.length)];
}

let searchQuery = '';
async function renderSearch(alive) {
  const origin = store.get('we_origin', null);
  if (!origin) return renderOnboarding();
  chrome('dock', 'search');

  const input = el('input', {
    type: 'search', placeholder: 'Plat, restaurant, quartier…', 'aria-label': 'Rechercher', value: searchQuery,
    autocomplete: 'off', enterkeyhint: 'search',
  });
  const clearBtn = el('button', { class: 'clear', type: 'button', 'aria-label': 'Effacer', hidden: !searchQuery }, icon('x'));
  const body = el('div', { 'aria-live': 'polite' });
  setView(
    el('header', { class: 'pagehead' },
      el('form', { class: 'searchbar', role: 'search', onsubmit: (e) => { e.preventDefault(); rememberSearch(input.value); input.blur(); } },
        icon('search'), input, clearBtn)),
    body);

  let list = [];
  let menus = [];
  let loaded = false;
  const draw = () => {
    const q = input.value.trim();
    searchQuery = input.value;
    clearBtn.hidden = !input.value;
    if (!q) {
      const recent = store.get('we_recent', []);
      const cats = googleOn() ? appConfig.categories.map((c) => c.key) : [...new Set(list.map(catKeyOf))];
      fill(body, 
        recent.length ? el('div', { class: 'list-head', style: 'display:flex;justify-content:space-between;align-items:center' },
          el('span', { text: 'Recherches récentes' }),
          el('button', { class: 'link-btn', type: 'button', style: 'text-transform:none;letter-spacing:0', onclick: () => { store.remove('we_recent'); draw(); } }, 'Effacer')) : null,
        recent.length ? el('div', { class: 'recent' }, recent.map((r) => el('button', { class: 'chip', type: 'button', onclick: () => { input.value = r; draw(); } }, icon('history'), r))) : null,
        el('div', { class: 'list-head', text: 'Idées' }),
        el('div', { class: 'recent' }, SEARCH_IDEAS.map((r) => el('button', { class: 'chip', type: 'button', onclick: () => { input.value = r; draw(); } }, el('span', { class: 'emo', text: dishEmoji(r, DEFAULT_THEME) }), r))),
        cats.length ? el('div', { class: 'list-head', text: 'Catégories' }) : null,
        cats.map((key) => {
          const info = catInfo(key);
          const n = list.filter((r) => catKeyOf(r) === key && r.in_delivery_zone).length;
          return el('button', {
            class: 'row-link', type: 'button',
            onclick: () => { homeState.category = key; homeState.filters.clear(); location.hash = '#/'; },
          }, el('span', { class: `ri tint-${CAT_THEME[key] || 'savane'}`, text: info.emoji }),
          el('span', { class: 'grow' }, el('b', { text: info.label }),
            el('small', { text: n ? `${plural(n, 'partenaire')} où commander` : googleOn() ? 'Établissements de Ouaga' : 'Aucun partenaire' })),
          icon('chevronRight'));
        }),
        !loaded ? el('div', { class: 'page' }, el('div', { class: 'skel', style: 'height:56px;margin-top:16px' })) : null);
      return;
    }
    const fq = fold(q);
    const restos = list.filter((r) => fold(`${displayName(r.name)} ${r.category} ${r.quartier}`).includes(fq));
    const dishes = [];
    for (const m of menus) {
      for (const c of m.categories) {
        for (const item of c.items) {
          if (fold(`${item.name} ${item.description || ''} ${c.name}`).includes(fq)) dishes.push({ item, menu: m, section: c.name });
        }
      }
    }
    scheduleGoogle(q);
    if (!restos.length && !dishes.length) {
      fill(body, !loaded
        ? el('div', { class: 'page' }, el('div', { class: 'skel', style: 'height:56px;margin-top:16px' }))
        : googleOn() && q.length >= 3 ? null
          : emptyState('search', 'Aucun résultat', `Rien ne correspond à « ${q} ». Essayez un autre mot.`),
      googleOn() ? gSlot : null);
      return;
    }
    fill(body,
      restos.length ? el('div', { class: 'list-head', text: `Restaurants · ${restos.length}` }) : null,
      restos.map((r) => {
        const t = theme(r.category);
        return el('a', {
          class: 'row-link', href: r.in_delivery_zone ? `#/r/${r.id}` : null, 'aria-disabled': r.in_delivery_zone ? null : 'true',
          onclick: () => rememberSearch(q),
        },
          el('span', { class: `ri cov cover th-${t.th}` }, collage(mainEmoji(r))),
          el('span', { class: 'grow' },
            el('b', null, highlight(displayName(r.name), q)),
            el('small', { text: `${r.category} · ${fmtKm(r.distance_km)} · ${r.in_delivery_zone ? `Livraison ${fmtF(r.delivery_fee)}` : 'Hors zone'}${r.is_open ? '' : ' · Fermé'}` })),
          icon('chevronRight'));
      }),
      dishes.length ? el('div', { class: 'list-head', text: `Plats · ${dishes.length}` }) : null,
      dishes.map(({ item, menu, section }) => {
        const t = THEMES[section] ? theme(section) : theme(menu.category);
        const can = item.available && menu.is_open;
        return el('button', {
          class: 'row-link', type: 'button',
          onclick: () => { rememberSearch(q); if (can) openItem(item, menu, () => updateCartBadge()); else location.hash = `#/r/${menu.id}`; },
        },
          el('span', { class: `ri tint-${t.th}`, text: dishEmoji(item.name, t) }),
          el('span', { class: 'grow' },
            el('b', null, highlight(item.name, q)),
            el('small', { text: `${displayName(menu.name)}${!item.available ? ' · Rupture' : !menu.is_open ? ' · Fermé' : ''}` })),
          el('span', { class: 'price', text: fmt(item.price) }));
      }),
      googleOn() ? gSlot : null);
  };

  // Résultats Google : uniquement après une courte pause de frappe et 3 caractères (chaque appel est facturé).
  const gSlot = el('div');
  let gTimer = null;
  let gQuery = '';
  function scheduleGoogle(q) {
    if (!googleOn()) return;
    clearTimeout(gTimer);
    if (q.length < 3) { gQuery = ''; fill(gSlot); return; }
    if (q === gQuery) return;
    fill(gSlot, el('div', { class: 'list-head', text: 'Sur Google Maps' }),
      el('div', { class: 'page' }, el('div', { class: 'skel', style: 'height:56px;margin-top:6px' })));
    gTimer = setTimeout(async () => {
      gQuery = q;
      try {
        const places = await gSearch(origin, q);
        if (!alive() || gQuery !== q) return;
        fill(gSlot,
          el('div', { class: 'list-head', text: `Sur Google Maps · ${places.length}` }),
          places.length ? places.map((p) => el('a', { class: 'row-link', href: `#/p/${encodeURIComponent(p.id)}`, onclick: () => rememberSearch(q) },
            p.photo
              ? el('span', { class: 'ri cov cover' }, el('img', { class: 'gphoto', src: photoUrl(p.photo, 120), alt: '', loading: 'lazy' }))
              : el('span', { class: `ri tint-${CAT_THEME[p.category] || 'savane'}`, text: catInfo(p.category).emoji }),
            el('span', { class: 'grow' },
              el('b', null, highlight(p.name, q)),
              el('small', { text: [placeSubtitle(p), p.distance_km !== null ? fmtKm(p.distance_km) : null, p.open_now === true ? 'Ouvert' : p.open_now === false ? 'Fermé' : null].filter(Boolean).join(' · ') })),
            icon('chevronRight')))
            : emptyState('search', 'Aucun résultat', `Rien ne correspond à « ${q} » autour de vous.`),
          places.length ? googleCredit() : null);
      } catch (e) {
        if (alive() && gQuery === q) fill(gSlot, el('div', { class: 'page' }, alertBox(e.message, 'info')));
      }
    }, 650);
  }
  onCleanup(() => clearTimeout(gTimer));

  let debounce = null;
  input.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(draw, 120); });
  clearBtn.addEventListener('click', () => { input.value = ''; draw(); input.focus(); });
  draw();
  setTimeout(() => { if (alive()) input.focus({ preventScroll: true }); }, 60);

  try {
    list = await getRestaurants(origin);
    if (!alive()) return;
    draw();
    // MVP : menus des restaurants en zone (au plus 12) chargés pour chercher un plat.
    // À remplacer par une route de recherche côté serveur quand le catalogue grandira.
    const near = list.filter((r) => r.in_delivery_zone).slice(0, 12);
    const settled = await Promise.allSettled(near.map((r) => getMenu(r.id)));
    if (!alive()) return;
    menus = settled.filter((x) => x.status === 'fulfilled').map((x) => x.value);
    loaded = true;
    draw();
  } catch (e) {
    if (!alive()) return;
    loaded = true;
    fill(body, el('div', { class: 'page' }, alertBox(e.message)));
  }
}

// ---------------------------------------------------------------------
// Carte (plan schématique centré sur l'adresse)
// ---------------------------------------------------------------------

function planBackground(w, h, cx, cy, scale, radiusKm) {
  const rings = [1, 2, 4, 6].filter((k) => k <= radiusKm + 0.5);
  // Rues stylisées : grille régulière légèrement inclinée et quelques grands axes.
  let streets = '';
  for (let x = -w; x < w * 2; x += 46) streets += `<path d="M${x} -20 L${x + h * 0.18} ${h + 20}" stroke="#fff" stroke-width="2.2" opacity=".75"/>`;
  for (let y = -40; y < h + 40; y += 52) streets += `<path d="M-20 ${y} L${w + 20} ${y - w * 0.12}" stroke="#fff" stroke-width="2.2" opacity=".75"/>`;
  const axes = `
    <path d="M-20 ${cy + 70} C ${w * 0.3} ${cy + 40}, ${w * 0.6} ${cy - 30}, ${w + 20} ${cy - 90}" stroke="#fff" stroke-width="9" fill="none"/>
    <path d="M-20 ${cy + 70} C ${w * 0.3} ${cy + 40}, ${w * 0.6} ${cy - 30}, ${w + 20} ${cy - 90}" stroke="#F3D98B" stroke-width="5" fill="none"/>
    <path d="M${cx - 120} -20 C ${cx - 80} ${h * 0.4}, ${cx + 40} ${h * 0.6}, ${cx + 30} ${h + 20}" stroke="#fff" stroke-width="8" fill="none"/>`;
  const parks = `
    <ellipse cx="${w * 0.18}" cy="${h * 0.28}" rx="54" ry="34" fill="#CFE5C7" opacity=".9"/>
    <ellipse cx="${w * 0.84}" cy="${h * 0.72}" rx="64" ry="40" fill="#CFE5C7" opacity=".9"/>
    <ellipse cx="${w * 0.7}" cy="${h * 0.2}" rx="34" ry="22" fill="#CFE5C7" opacity=".9"/>`;
  const circles = rings.map((k) => `
    <circle cx="${cx}" cy="${cy}" r="${k * scale}" fill="${k === rings[rings.length - 1] ? 'rgba(11,122,62,.05)' : 'none'}" stroke="#0B7A3E" stroke-width="1.4" stroke-dasharray="5 6" opacity=".55"/>
    <text x="${cx + k * scale * 0.7071 + 4}" y="${cy - k * scale * 0.7071 - 4}" font-size="11" font-weight="700" fill="#075C2E" font-family="Segoe UI, Arial, sans-serif">${k} km</text>`).join('');
  const compass = `<g transform="translate(${w - 30} ${h - 70})"><circle r="15" fill="#fff" opacity=".92"/><path d="M0 -10 L5 4 L0 1 L-5 4 Z" fill="#D62E2E"/><text y="-17" text-anchor="middle" font-size="10" font-weight="800" fill="#4A433B" font-family="Segoe UI, Arial, sans-serif">N</text></g>`;
  return svg(`0 0 ${w} ${h}`, `<rect width="${w}" height="${h}" fill="#EEE7D9"/>${parks}${streets}${axes}${circles}${compass}`, 'plan');
}

// Chargement unique du script Google Maps (clé navigateur, restreinte au domaine dans Google Cloud).
let mapsLoading = null;
let mapsAuthFailed = false;
function loadGoogleMaps(key) {
  if (window.google && window.google.maps && window.google.maps.importLibrary) return Promise.resolve();
  if (mapsLoading) return mapsLoading;
  mapsLoading = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { mapsLoading = null; reject(new Error('Google Maps ne répond pas : plan simplifié affiché.')); }, 15000);
    window.__weMapsReady = () => { clearTimeout(timer); resolve(); };
    // Appelé par Google si la clé est refusée (clé invalide, API non activée, domaine non autorisé).
    window.gm_authFailure = () => {
      mapsAuthFailed = true;
      toast('Clé Google Maps refusée : vérifiez GOOGLE_MAPS_BROWSER_KEY et ses restrictions.', 'alert');
      if (location.hash.startsWith('#/map')) route();
    };
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&language=fr&region=BF&callback=__weMapsReady`;
    s.async = true;
    s.onerror = () => { clearTimeout(timer); mapsLoading = null; reject(new Error('Chargement de Google Maps impossible : plan simplifié affiché.')); };
    document.head.append(s);
  });
  return mapsLoading;
}

function mapPin(item) {
  return el('div', { class: `mpin gpin ${item.kind === 'partner' ? 'is-partner' : 'is-google'}${item.off ? ' off' : ''}` },
    el('span', { class: 'bub' }, el('span', { class: `e tint-${item.tint}`, text: item.emoji }), el('span', { class: 'nm', text: item.name })));
}

async function renderMap(alive) {
  const origin = store.get('we_origin', null);
  if (!origin) return renderOnboarding();
  chrome('dock', 'map');
  const wrap = el('div', { class: 'map-wrap' });
  const sheet = el('div', { class: 'map-sheet' });
  setView(wrap, sheet);
  wrap.append(el('div', { class: 'skel', style: 'position:absolute;inset:0;border-radius:0' }));

  let list;
  try {
    list = await getRestaurants(origin);
  } catch (e) {
    if (!alive()) return;
    fill(sheet, el('div', { class: 'page' }, alertBox(e.message)));
    return;
  }
  const wantGoogleMap = Boolean(appConfig.google.maps_key) && !mapsAuthFailed;
  // Conditions Google : les établissements Google ne s'affichent qu'avec le fond de carte Google.
  const places = wantGoogleMap && googleOn() ? await gNearby(origin).catch(() => []) : [];
  if (!alive()) return;

  const partnerItem = (r) => {
    const t = theme(r.category);
    return {
      id: `r${r.id}`, kind: 'partner', lat: r.latitude, lng: r.longitude, km: r.distance_km, name: displayName(r.name),
      emoji: t.icon, tint: t.th, off: !(r.in_delivery_zone && r.is_open), card: () => restaurantCard(r),
    };
  };
  const placeItem = (p) => ({
    id: `g${p.id}`, kind: 'google', lat: p.latitude, lng: p.longitude, km: p.distance_km ?? 99, name: p.name,
    emoji: catInfo(p.category).emoji, tint: CAT_THEME[p.category] || 'savane', off: p.open_now === false, card: () => placeCard(p),
  });
  const valid = (i) => Number.isFinite(i.lat) && Number.isFinite(i.lng);

  const pins = new Map();
  const markers = new Map();
  const cards = el('div', { class: 'hscroll' });
  let gmap = null;
  const select = (id, fromPin) => {
    pins.forEach((p, pid) => p.classList.toggle('on', pid === id));
    markers.forEach((m, mid) => { m.zIndex = mid === id ? 1000 : null; });
    cards.querySelectorAll('[data-key]').forEach((c) => c.classList.toggle('on', c.dataset.key === id));
    if (fromPin) cards.querySelector(`[data-key="${id}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    else if (gmap && markers.has(id)) gmap.panTo(markers.get(id).position);
  };
  const fillCards = (items) => {
    fill(cards, items.map((it) => {
      const c = it.card();
      c.dataset.key = it.id;
      c.addEventListener('focusin', () => select(it.id, false));
      return c;
    }));
  };
  const topBar = () => el('div', { class: 'map-top' },
    el('button', { class: 'label', type: 'button', onclick: openAddressSheet, 'aria-label': `Adresse : ${origin.label}. Modifier` },
      icon('pin'), el('span', { text: origin.label }), icon('chevronDown')),
    el('a', { class: 'icon-btn glass', href: '#/search', 'aria-label': 'Rechercher' }, icon('search')));
  const paintSheet = (count) => {
    const inZone = list.filter((r) => r.in_delivery_zone).length;
    fill(sheet,
      el('div', { class: 'grabber' }),
      el('div', { class: 'sec-head' }, el('div', null,
        el('h2', { text: 'Autour de vous' }),
        el('p', { text: `${plural(inZone, 'partenaire')} livre${inZone > 1 ? 'nt' : ''} à ${origin.label}${count ? ` · ${plural(count, 'établissement')} sur Google Maps` : ''}` }))),
      cards,
      count ? googleCredit() : null);
  };

  // 1) Fond de carte Google (clé navigateur configurée).
  if (wantGoogleMap) {
    try {
      await loadGoogleMaps(appConfig.google.maps_key);
      const { Map, Circle } = await google.maps.importLibrary('maps');
      const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');
      if (!alive()) return;
      const items = [...list.map(partnerItem), ...places.map(placeItem)].filter(valid).sort((a, b) => a.km - b.km);
      const host = el('div', { class: 'gmap' });
      fill(wrap, host, topBar());
      const center = { lat: origin.latitude, lng: origin.longitude };
      gmap = new Map(host, {
        center, zoom: 14, mapId: appConfig.google.map_id || 'DEMO_MAP_ID',
        disableDefaultUI: true, zoomControl: true, clickableIcons: false, gestureHandling: 'greedy',
      });
      new Circle({ map: gmap, center, radius: 6000, clickable: false, strokeColor: '#0B7A3E', strokeOpacity: 0.5, strokeWeight: 1.5, fillColor: '#0B7A3E', fillOpacity: 0.04 });
      new AdvancedMarkerElement({ map: gmap, position: center, content: el('div', { class: 'me static', title: 'Votre adresse' }) });
      for (const it of items) {
        const pin = mapPin(it);
        pin.addEventListener('click', () => select(it.id, true));
        markers.set(it.id, new AdvancedMarkerElement({ map: gmap, position: { lat: it.lat, lng: it.lng }, content: pin, title: it.name }));
        pins.set(it.id, pin);
      }
      fillCards(items);
      paintSheet(places.length);
      if (items[0]) select(items[0].id, false);
      return;
    } catch (e) {
      if (!alive()) return;
      toast(e.message, 'info');
    }
  }

  // 2) Plan schématique (sans clé navigateur) : uniquement les restaurants partenaires.
  const partners = list.map(partnerItem).filter(valid).sort((a, b) => a.km - b.km);
  const radiusKm = Math.min(8, Math.max(2, ...partners.filter((i) => i.km <= 8).map((i) => i.km * 1.15)));
  const layout = () => {
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    const cx = w / 2;
    const cy = h / 2 + 24;
    const scale = (Math.min(w, h - 60) / 2 - 34) / radiusKm;
    const kx = 111.32 * Math.cos((origin.latitude * Math.PI) / 180);
    const ky = 110.57;
    fill(wrap,
      planBackground(w, h, cx, cy, scale, radiusKm),
      topBar(),
      el('div', { class: 'me', style: `left:${cx}px;top:${cy}px`, title: 'Votre adresse' }),
      el('div', { class: 'map-note', text: "Plan schématique · distances à vol d'oiseau" }));
    pins.clear();
    for (const it of partners) {
      const x = cx + (it.lng - origin.longitude) * kx * scale;
      const y = cy - (it.lat - origin.latitude) * ky * scale;
      if (x < 10 || x > w - 10 || y < 70 || y > h - 10) continue;
      const pin = mapPin(it);
      pin.classList.remove('gpin');
      pin.setAttribute('role', 'button');
      pin.setAttribute('tabindex', '0');
      pin.setAttribute('aria-label', `${it.name}, ${fmtKm(it.km)}`);
      pin.style.left = `${x}px`;
      pin.style.top = `${y - 6}px`;
      pin.addEventListener('click', () => select(it.id, true));
      pins.set(it.id, pin);
      wrap.append(pin);
    }
  };
  fillCards(partners);
  paintSheet(0);
  layout();
  const onResize = () => layout();
  window.addEventListener('resize', onResize);
  onCleanup(() => window.removeEventListener('resize', onResize));
  if (partners[0]) select(partners[0].id, false);
}

// ---------------------------------------------------------------------
// Fiche d'un établissement réel (Google Places, en direct)
// ---------------------------------------------------------------------

async function renderPlace(id, alive) {
  chrome('nodock');
  setView(
    el('div', { class: 'skel', style: 'height:260px;border-radius:0' }),
    el('div', { class: 'page', 'aria-busy': 'true' },
      el('div', { class: 'skel', style: 'height:30px;width:65%;margin-top:26px' }),
      el('div', { class: 'skel', style: 'height:16px;width:80%;margin-top:12px' }),
      el('div', { class: 'skel', style: 'height:64px;margin-top:18px;border-radius:20px' })));

  const origin = store.get('we_origin', null);
  let p;
  try {
    p = await gDetails(id, origin);
  } catch (e) {
    if (!alive()) return;
    return setView(el('div', { class: 'pagehead' }, backButton(), el('div', { class: 'title', text: 'Établissement' }), el('span', { class: 'spacer' })),
      el('div', { class: 'page' }, alertBox(e.message),
        el('button', { class: 'btn block', type: 'button', onclick: () => { cache.delete(`gd:${id}`); route(); } }, icon('refresh'), 'Réessayer')));
  }
  if (!alive()) return;

  const info = catInfo(p.category);
  const th = CAT_THEME[p.category] || 'savane';
  const bar = el('div', { class: 'store-bar' },
    el('button', {
      class: 'icon-btn glass', type: 'button', 'aria-label': 'Retour',
      onclick: () => { if (navCount > 0) history.back(); else location.hash = '#/'; },
    }, icon('arrowLeft')),
    el('div', { class: 'name', text: p.name, 'aria-hidden': 'true' }),
    p.maps_uri ? el('a', { class: 'icon-btn glass', href: p.maps_uri, target: '_blank', rel: 'noopener', 'aria-label': 'Ouvrir dans Google Maps' }, icon('nav')) : el('span', { class: 'spacer' }));

  // Galerie : photos actuelles de la fiche Google (aucune n'est stockée par Winged Eats).
  const gallery = p.photos.length
    ? el('div', { class: 'gallery', role: 'region', 'aria-label': 'Photos' }, p.photos.map((ph, i) => el('figure', { class: `cover th-${th}` },
      collage(info.emoji),
      el('img', {
        class: 'gphoto', src: photoUrl(ph, 900), alt: i === 0 ? p.name : '', loading: i === 0 ? 'eager' : 'lazy', decoding: 'async',
        onerror: (e) => e.target.remove(),
      }),
      ph.author ? el('figcaption', { class: 'credit' }, '© ', ph.author_uri
        ? el('a', { href: ph.author_uri, target: '_blank', rel: 'noopener', text: ph.author })
        : ph.author) : null,
      p.photos.length > 1 ? el('span', { class: 'count-pill', text: `${i + 1}/${p.photos.length}` }) : null)))
    : el('div', { class: `cover store-cover th-${th}` }, collage(info.emoji, ['🌿', '✨']));

  const statusBadge = p.open_now === true
    ? el('span', { class: 'badge ok', text: 'Ouvert maintenant' })
    : p.open_now === false ? el('span', { class: 'badge bad', text: 'Fermé maintenant' }) : null;
  const tel = p.phone ? String(p.phone).replace(/[^\d+]/g, '') : null;

  setView(
    bar,
    gallery,
    el('section', { class: 'store-head' },
      el('div', { class: `store-logo tint-${th}`, 'aria-hidden': 'true', text: info.emoji }),
      el('h1', { text: p.name }),
      el('p', { class: 'desc', text: [p.category !== 'restaurant' ? info.label : (p.type_label || 'Restaurant'), p.address].filter(Boolean).join(' · ') }),
      el('div', { class: 'status' },
        statusBadge,
        p.rating ? el('span', { class: 'badge plain' }, icon('star'), `${fmtRating(p.rating)} · ${p.rating_count} avis Google`) : null),
      el('div', { class: 'stats' },
        stat('pin', p.distance_km !== null ? fmtKm(p.distance_km) : '—', 'Distance'),
        stat('star', p.rating ? fmtRating(p.rating) : '—', 'Note Google'),
        stat('clock', p.open_now === true ? 'Ouvert' : p.open_now === false ? 'Fermé' : '—', 'En ce moment')),
      el('div', { class: 'soon-card' },
        el('span', { class: 'soon-ico', 'aria-hidden': 'true', text: '🛵' }),
        el('div', null,
          el('b', { text: 'Bientôt sur Winged Eats' }),
          el('p', { text: 'Cet établissement n’est pas encore partenaire : la commande en ligne n’est pas possible. Vous pouvez l’appeler ou vous y rendre.' }))),
      el('div', { class: 'place-actions' },
        tel ? el('a', { class: 'btn lg', href: `tel:${tel}` }, icon('phone'), 'Appeler') : null,
        p.maps_uri ? el('a', { class: tel ? 'btn lg ghost' : 'btn lg', href: p.maps_uri, target: '_blank', rel: 'noopener' }, icon('nav'), 'Itinéraire') : null,
        p.website ? el('a', { class: 'btn lg ghost', href: p.website, target: '_blank', rel: 'noopener' }, icon('globe'), 'Site web') : null)),
    el('div', { class: 'page' },
      p.summary ? [el('h2', { class: 'card-title', text: 'À propos' }), el('div', { class: 'card' }, el('p', { style: 'margin:0', text: p.summary }))] : null,
      p.hours.length ? [
        el('h2', { class: 'card-title', text: 'Horaires' }),
        el('div', { class: 'card' }, el('ul', { class: 'hours' }, p.hours.map((h) => {
          const [day, ...rest] = h.split(': ');
          return el('li', null, el('span', { text: day.charAt(0).toUpperCase() + day.slice(1) }), el('b', { text: rest.join(': ') || '' }));
        }))),
      ] : null,
      p.address_full ? [
        el('h2', { class: 'card-title', text: 'Adresse' }),
        el('div', { class: 'card' }, el('div', { class: 'addr-card' },
          el('span', { class: 'zi' }, icon('pin')),
          el('span', { class: 'grow' }, el('b', { text: p.address_full }), p.phone_display ? el('small', { text: p.phone_display }) : null))),
      ] : null,
      googleCredit()),
  );

  const onScroll = () => bar.classList.toggle('solid', window.scrollY > 180);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  onCleanup(() => window.removeEventListener('scroll', onScroll));
}

// ---------------------------------------------------------------------
// Compte
// ---------------------------------------------------------------------

function infoSheet(title, rows) {
  openSheet((close) => [
    el('div', { class: 'grabber' }),
    el('h2', { text: title }),
    el('div', { style: 'margin-top:8px' }, rows.map(([q, a]) => el('div', { style: 'padding:14px 0;border-bottom:1px solid var(--line-soft)' },
      el('b', { style: 'display:block;font-size:15.5px', text: q }), el('div', { class: 'muted', style: 'margin-top:4px;font-size:14.5px', text: a })))),
    el('div', { class: 'sheet-actions', style: 'margin-top:18px' }, el('button', { class: 'btn block lg soft', type: 'button', onclick: close }, 'Fermer')),
  ], { label: title });
}

function renderAccount() {
  chrome('dock', 'account');
  const profile = store.get('we_profile', {});
  const origin = store.get('we_origin', null);
  const initials = (profile.name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  const orderCount = Object.keys(store.get('we_orders', {})).length;
  const favCount = favs().length;

  const row = (ic, label, sub, props) => el(props.href ? 'a' : 'button', { class: 'row-link', type: props.href ? null : 'button', ...props },
    el('span', { class: 'ri' }, icon(ic)),
    el('span', { class: 'grow' }, el('b', { text: label }), sub ? el('small', { text: sub }) : null),
    icon('chevronRight'));

  setView(
    el('header', { class: 'acct-head' },
      el('div', null,
        el('h1', { text: profile.name || 'Bienvenue' }),
        el('small', { text: profile.phone || 'Vos coordonnées sont enregistrées à la première commande.' })),
      el('div', { class: 'avatar', 'aria-hidden': 'true' }, initials || icon('user'))),
    el('div', { class: 'quick' },
      el('a', { href: '#/orders' }, icon('receipt'), el('span', { text: orderCount ? `Commandes (${orderCount})` : 'Commandes' })),
      el('a', { href: '#/' , onclick: () => { homeState.category = null; homeState.filters.clear(); } }, icon('heart'), el('span', { text: `Favoris (${favCount})` })),
      el('button', { type: 'button', onclick: () => infoSheet('Aide', HELP) }, icon('help'), el('span', { text: 'Aide' }))),
    el('div', { class: 'list-head', text: 'Adresse de livraison' }),
    el('div', { class: 'page' }, el('div', { class: 'card' },
      el('div', { class: 'addr-card' },
        el('span', { class: 'zi' }, icon('pin')),
        el('span', { class: 'grow' }, el('b', { text: origin ? origin.label : 'Aucune adresse' }), el('small', { text: 'Utilisée pour les frais et la zone' })),
        el('button', { class: 'link-btn', type: 'button', onclick: openAddressSheet }, origin ? 'Modifier' : 'Choisir')))),
    el('div', { class: 'list-head', text: 'Plus' }),
    el('div', { class: 'menu-list' },
      row('store', 'Espace restaurateur', 'Gérer les commandes de votre établissement', { href: '/partner/' }),
      row('shield', 'Confidentialité', 'Ce que l’application garde sur cet appareil', { onclick: () => infoSheet('Confidentialité', PRIVACY) }),
      row('info', 'À propos', 'Winged Eats · Ouagadougou', { onclick: () => infoSheet('À propos', ABOUT) }),
      row('trash', 'Effacer les données de cet appareil', 'Adresse, panier, favoris, historique', {
        onclick: async () => {
          const ok = await confirmSheet({
            title: 'Effacer les données ?',
            text: 'Votre adresse, votre panier, vos favoris et la liste de vos commandes seront supprimés de cet appareil.',
            ok: 'Tout effacer', cancel: 'Annuler', danger: true,
          });
          if (!ok) return;
          ['we_origin', 'we_cart', 'we_orders', 'we_order_meta', 'we_profile', 'we_favs', 'we_recent'].forEach((k) => store.remove(k));
          cache.clear();
          location.hash = '#/';
          route();
        },
      })),
    el('div', { class: 'foot-note' }, el('div', { class: 'tri' }), 'Winged Eats · Ouagadougou · version MVP 0.1'));
}

const HELP = [
  ['Comment payer ?', 'En espèces, à la livraison. Le paiement Mobile Money arrivera bientôt.'],
  ['À quoi sert le code à 4 chiffres ?', 'Il garantit que la commande est remise à la bonne personne. Donnez-le au livreur à la réception.'],
  ['Puis-je annuler ma commande ?', "Oui, tant que le restaurant ne l'a pas acceptée. Ouvrez la commande puis « Annuler la commande »."],
  ['Comment sont calculés les frais ?', 'Selon la distance entre le restaurant et votre adresse (à vol d’oiseau), dans un rayon de 6 km.'],
];
const PRIVACY = [
  ['Sur cet appareil', 'Votre adresse choisie, votre panier, vos favoris, vos dernières recherches et la liste de vos commandes.'],
  ['Envoyé au restaurant', 'Votre nom, votre téléphone, votre repère et votre remarque, uniquement pour préparer et remettre la commande.'],
  ['Effacer', 'Vous pouvez tout effacer depuis Compte → « Effacer les données de cet appareil ».'],
];
const ABOUT = [
  ['Winged Eats', 'Commande de repas auprès des maquis et restaurants de Ouagadougou.'],
  ['Version', 'MVP 0.1 · module restaurants. Pharmacies de garde et mobilité sont prévues ensuite.'],
  ['Données de démonstration', 'Les restaurants marqués « Démo » sont fictifs.'],
  ['Établissements de Ouagadougou', 'Noms, notes, horaires et photos proviennent de Google Maps, chargés en direct : ils restent à jour et ne sont pas enregistrés par Winged Eats.'],
];

// ---------------------------------------------------------------------
// Routage
// ---------------------------------------------------------------------

let routeSeq = 0;
let navCount = -1;
let cleanups = [];
function onCleanup(fn) { cleanups.push(fn); }

function chrome(mode, section) {
  document.body.classList.toggle('hide-dock', mode === 'nodock');
  document.body.classList.toggle('bare', mode === 'bare');
  document.querySelectorAll('#dock [data-section]').forEach((a) => {
    const on = a.dataset.section === section;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  updateCartBadge();
}

function route() {
  const token = ++routeSeq;
  const alive = () => token === routeSeq;
  cleanups.forEach((fn) => { try { fn(); } catch { /* rien */ } });
  cleanups = [];
  closeAllSheets();
  window.scrollTo({ top: 0, behavior: 'instant' });
  const parts = (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean);
  if (parts[0] === 'r' && parts[1]) return renderRestaurant(Number(parts[1]), alive);
  if (parts[0] === 'p' && parts[1]) return renderPlace(decodeURIComponent(parts[1]), alive);
  if (parts[0] === 'cart') return renderCart(alive);
  if (parts[0] === 'order' && parts[1]) return renderOrder(Number(parts[1]), alive);
  if (parts[0] === 'orders') return renderOrders(alive);
  if (parts[0] === 'search') return renderSearch(alive);
  if (parts[0] === 'map') return renderMap(alive);
  if (parts[0] === 'account') return renderAccount(alive);
  return renderHome(alive);
}

document.querySelectorAll('#dock [data-icon]').forEach((a) => a.prepend(icon(a.dataset.icon)));
window.addEventListener('hashchange', () => { navCount += 1; route(); });
navCount = 0;

// Démarrage : configuration (Google activé ou non, catégories), puis premier affichage.
(async function boot() {
  try {
    appConfig = await api('/config');
  } catch {
    /* hors ligne ou serveur ancien : l'application fonctionne avec ses seules données */
  }
  route();
}());
