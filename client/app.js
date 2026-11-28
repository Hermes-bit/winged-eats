'use strict';

// =====================================================================
// Winged Eats · application client
// Design : maquettes/maquette-winged-eats.html (rouge Faso, plats illustrés).
// Fonctions réelles : catalogue, panier, commande (espèces), suivi, restaurants Google.
// Fonctions en démonstration (signalées) : paiement mobile, SMS, livreur, abonnements.
// =====================================================================

// Centres approximatifs des quartiers (à remplacer par les données SIG).
const CITIES = {
  ouaga: {
    name: 'Ouagadougou', short: 'Ouaga',
    zones: [
      { name: 'Ouaga 2000', latitude: 12.3650, longitude: -1.5100 },
      { name: 'Zone du Bois', latitude: 12.3580, longitude: -1.5040 },
      { name: "Patte d'Oie", latitude: 12.3450, longitude: -1.5500 },
      { name: 'Zogona', latitude: 12.3760, longitude: -1.4980 },
      { name: 'Gounghin', latitude: 12.3640, longitude: -1.5450 },
    ],
  },
  bobo: {
    name: 'Bobo-Dioulasso', short: 'Bobo',
    zones: [
      { name: 'Centre-ville', latitude: 11.1771, longitude: -4.2979 },
      { name: 'Koko', latitude: 11.1830, longitude: -4.2890 },
      { name: 'Sarfalao', latitude: 11.1580, longitude: -4.3120 },
    ],
  },
};
const MAX_QTY = 20;
const POLL_MS = 5000;
const TERMINAL = ['DELIVERED', 'REFUSED', 'CANCELLED'];
const STATUS = {
  PENDING: { label: 'Envoyée', title: 'Commande envoyée', text: 'En attente de confirmation du restaurant.', step: 0, chip: '#FFF1D6' },
  ACCEPTED: { label: 'Acceptée', title: 'Commande acceptée', text: 'Le restaurant lance la préparation.', step: 1, chip: '#FFF1D6' },
  PREPARING: { label: 'En préparation', title: 'En cuisine', text: 'Votre repas est en préparation.', step: 2, chip: '#FFF1D6' },
  READY: { label: 'Prête', title: 'Commande prête', text: 'Elle va vous être remise. Préparez votre code.', step: 3, chip: '#FFF1D6' },
  DELIVERED: { label: 'Livrée', title: 'Bon appétit !', text: 'Commande remise. Merci pour votre confiance.', step: 4, chip: '#E3F4EA' },
  REFUSED: { label: 'Refusée', title: 'Commande refusée', text: "Le restaurant n'a pas pu accepter votre commande.", step: -1, chip: '#FFE3DF' },
  CANCELLED: { label: 'Annulée', title: 'Commande annulée', text: 'Cette commande a été annulée.', step: -1, chip: '#FFE3DF' },
};
const STEP_LABELS = ['Acceptée', 'En préparation', 'Prête', 'Livrée'];

// Plats et boissons illustrés de la maquette.
const DISH_KEYS = [
  [/brochette|grill|kebab|dibi/i, 'bro'], [/poulet|ailes|chicken|bicyclette|choukouya/i, 'pou'],
  [/poisson|capitaine|tilapia|attiéké|attieke/i, 'poi'], [/pizza/i, 'piz'],
  [/burger|sandwich|frite|tacos|chawarma|shawarma|fast/i, 'bur'],
  [/bière|biere/i, 'beer'],
  [/bissap|jus|boisson|zoom|gingembre|\beau\b|soda|café|cafe|thé|glace|dêguê|degue/i, 'bis'],
  [/\btô\b|gombo|sauce|soupe|feuille|babenda/i, 'to'], [/riz/i, 'riz'],
];
const CAT_FOOD = {
  maquis: 'pou', grillades: 'bro', africaine: 'to', fastfood: 'bur', pizza: 'piz', chawarma: 'bur',
  asiatique: 'riz', europeenne: 'piz', cafe: 'bis', boulangerie: 'bur', desserts: 'bis', restaurant: 'riz',
};
const PARTNER_CAT_KEY = { 'Grillades': 'grillades', 'Cuisine africaine': 'africaine', 'Maquis': 'maquis', 'Plats du jour': 'africaine', 'Boissons': 'cafe' };
const RECENT_IDEAS = ['Poulet bicyclette', 'Riz gras', 'Attiéké poisson', 'Dêguê', 'Pizza'];
const BEST_CATS = [
  ['riz', 'Riz gras et riz sauce', 'africaine'], ['bro', 'Brochettes et grillades', 'grillades'],
  ['pou', 'Poulet braisé ou bicyclette', 'maquis'], ['to', 'Tô, sauce gombo, sauce feuilles', 'africaine'],
  ['poi', 'Poisson braisé, attiéké', 'africaine'], ['bur', 'Burgers et sandwichs', 'fastfood'],
  ['bis', 'Bissap, gingembre, zoom-koom', 'cafe'],
];

// ---------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------

const $ = (sel) => document.querySelector(sel);
const main = $('#app');
const SVGNS = 'http://www.w3.org/2000/svg';
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } },
  remove(key) { try { localStorage.removeItem(key); } catch { /* stockage indisponible */ } },
};
const NBSP = ' ';
const num = (n) => Number(n).toLocaleString('fr-FR').replace(/\s/g, NBSP);
const fmtF = (n) => `${num(n)}${NBSP}F`;
const fmtCFA = (n) => `${num(n)}${NBSP}FCFA`;
const fmtKm = (km) => (km === null || km === undefined ? '' : km < 0.5 ? `< 500${NBSP}m` : `${String(Math.round(km * 10) / 10).replace('.', ',')}${NBSP}km`);
const fmtRating = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
const plural = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`;
const scrollBehavior = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const displayName = (name) => String(name || '').replace(/\s*\(démo\)\s*$/i, '');
const isDemo = (name) => /\(démo\)\s*$/i.test(String(name || ''));
const orderDate = (s) => new Date(String(s).replace(' ', 'T') + 'Z');
const dishKey = (name, fallback = 'riz') => (DISH_KEYS.find(([re]) => re.test(name)) || [null, fallback])[1];
const catKeyOf = (r) => PARTNER_CAT_KEY[r.category] || 'restaurant';
const restoKey = (r) => dishKey(displayName(r.name), CAT_FOOD[catKeyOf(r)]);
const placeKey = (p) => dishKey(p.name, CAT_FOOD[p.category] || 'riz');
function initials(name) {
  const stop = ['chez', 'maquis', 'restaurant', 'resto'];
  const words = displayName(name).split(/[\s'’-]+/).filter((w) => w && !stop.includes(w.toLowerCase()));
  return (words.slice(0, 2).map((w) => w[0]).join('') || 'WE').toUpperCase();
}
const cityOf = (origin) => CITIES[(origin && origin.city) || 'ouaga'] || CITIES.ouaga;

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
// replaceChildren n'aplatit pas les tableaux et écrirait « null » : on passe toujours par fill().
function fill(node, ...children) {
  node.replaceChildren(...children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false));
  return node;
}
const setView = (...children) => fill(main, ...children);

function useSvg(id, cls) {
  const s = document.createElementNS(SVGNS, 'svg');
  if (cls) s.setAttribute('class', cls);
  s.setAttribute('aria-hidden', 'true');
  const u = document.createElementNS(SVGNS, 'use');
  u.setAttribute('href', `#${id}`);
  s.append(u);
  return s;
}
const I = (name) => useSvg(`i-${name}`, 'ic');
const S = () => useSvg('i-star', 'ic star');
const logo = (size = 40) => { const s = useSvg('logo'); s.style.width = `${size}px`; s.style.height = `${size}px`; return s; };

// Vignette illustrée (plat) ; une photo Google la recouvre si elle est disponible.
function F(k, h, ...children) {
  const d = el('div', { class: `ft k-${k}`, style: h ? `height:${h}px` : null });
  d.append(...children.flat().filter(Boolean), useSvg(`f-${k}`));
  return d;
}
const PLACES_SERVER = 'https://winged-eats-1.onrender.com';
function photoImg(photo, w) {
  if (!photo) return null;
  const img = el('img', { class: 'ph', src: `${PLACES_SERVER}/api/places/photo?name=${encodeURIComponent(photo.name)}&w=${w}`, alt: '', loading: 'lazy', decoding: 'async' });
  const credit = photo.author ? el('span', { class: 'credit', text: `© ${photo.author}` }) : null;
  img.addEventListener('error', () => { img.remove(); if (credit) credit.remove(); });
  return [img, credit];
}

async function api(path, options = {}) {
  if (path !== '/config' && !path.startsWith('/places/')) throw new Error('Cette fonctionnalité n’est pas encore disponible.');
  let res;
  try {
    res = await fetch(`${PLACES_SERVER}/api${path}`, { ...options, headers: options.body ? { 'Content-Type': 'application/json' } : undefined, body: options.body ? JSON.stringify(options.body) : undefined });
  } catch {
    throw new Error('Connexion impossible. Vérifiez votre réseau puis réessayez.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erreur réseau, réessayez');
  return data;
}

const cache = new Map();
function cached(key, ttl, loader) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.promise;
  const promise = loader().catch((e) => { cache.delete(key); throw e; });
  cache.set(key, { at: Date.now(), promise });
  return promise;
}
const okey = (o) => `${o.latitude.toFixed(4)},${o.longitude.toFixed(4)}`;
const qs = (o) => `lat=${o.latitude}&lon=${o.longitude}`;
// Les partenaires ne sont pas encore connectés à la version publiée.
const getRestaurants = async () => [];
const getMenu = (id) => cached(`menu:${id}`, 60000, () => api(`/restaurants/${id}`));
const putMenu = (m) => cache.set(`menu:${m.id}`, { at: Date.now(), promise: Promise.resolve(m) });

// Restaurants réels (Google Places) : chargés en direct, jamais enregistrés ; mémoire de 5 minutes.
let appConfig = { google: { places: false, maps_key: null, map_id: 'DEMO_MAP_ID' }, categories: [] };
let googleError = null;
const googleOn = () => Boolean(appConfig.google && appConfig.google.places);
const catInfo = (key) => appConfig.categories.find((c) => c.key === key) || { key, label: ({ grillades: 'Grillades', africaine: 'Africaine', maquis: 'Maquis', cafe: 'Boissons' })[key] || 'Restaurant', emoji: '' };
const PT = 5 * 60000;
const gNearby = (o) => cached(`gn:${okey(o)}`, PT, () => api(`/places/nearby?${qs(o)}`));
const gCategory = (o, c) => cached(`gc:${c}:${okey(o)}`, PT, () => api(`/places/search?${qs(o)}&cat=${encodeURIComponent(c)}`));
const gSearch = (o, q) => cached(`gs:${fold(q)}:${okey(o)}`, PT, () => api(`/places/search?${qs(o)}&q=${encodeURIComponent(q)}`));
const gDetails = (id, o) => cached(`gd:${id}`, PT, () => api(`/places/${encodeURIComponent(id)}${o ? `?${qs(o)}` : ''}`));

// ---------------------------------------------------------------------
// Composants communs
// ---------------------------------------------------------------------

function toast(message, ic = 'check') {
  const t = el('div', { class: 'toast', role: 'status' }, I(ic), el('span', { text: message }));
  $('#toasts').append(t);
  setTimeout(() => t.remove(), 2800);
}
const alertBox = (msg, info = false) => el('div', { class: info ? 'alert i' : 'alert', role: info ? 'status' : 'alert' }, I('info'), el('span', { text: msg }));
const demoNote = (text) => el('div', { class: 'demo' }, I('info'), el('span', null, el('b', { text: 'Démonstration · ' }), text));

function openSheet(build, { flush = false, label = '', onClose = null } = {}) {
  const prev = document.activeElement;
  const bg = el('div', { class: 'sheet-bg' });
  const sheet = el('div', { class: flush ? 'bsheet flush' : 'bsheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': label });
  const onKey = (e) => { if (e.key === 'Escape' && [...document.querySelectorAll('.sheet-bg:not(.closing)')].pop() === bg) close(); };
  function close() {
    if (!bg.isConnected || bg.classList.contains('closing')) return;
    bg.classList.add('closing');
    document.removeEventListener('keydown', onKey);
    if (onClose) onClose();
    setTimeout(() => {
      bg.remove();
      if (!document.querySelector('.sheet-bg')) document.body.style.overflow = '';
      if (prev && prev.isConnected) prev.focus({ preventScroll: true });
    }, 200);
  }
  bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
  document.addEventListener('keydown', onKey);
  sheet.append(...[build(close)].flat(Infinity).filter(Boolean));
  bg.append(sheet);
  document.body.append(bg);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => { const f = sheet.querySelector('[autofocus]') || sheet.querySelector('button, input, a[href]'); if (f) f.focus({ preventScroll: true }); });
  return close;
}
function closeAllSheets() { document.querySelectorAll('.sheet-bg').forEach((n) => n.remove()); document.body.style.overflow = ''; }

function confirmSheet({ title, text, ok = 'Confirmer', cancel = 'Annuler' }) {
  return new Promise((resolve) => {
    let result = false;
    openSheet((close) => [
      el('div', { class: 'grab' }), el('h2', { text: title }), el('p', { class: 'sub', text }),
      el('button', { class: 'btn dk', type: 'button', onclick: () => { result = true; close(); } }, ok),
      el('button', { class: 'btn lt', type: 'button', style: 'margin-top:8px', onclick: close }, cancel),
    ], { label: title, onClose: () => resolve(result) });
  });
}

function infoSheet(title, rows, extra) {
  openSheet((close) => [
    el('div', { class: 'grab' }), el('h2', { text: title }),
    rows.map(([q, a]) => el('div', { style: 'padding:10px 0;border-bottom:1px solid var(--line)' }, el('div', { class: 't', text: q }), el('div', { class: 'm', style: 'font-size:13px;margin-top:3px', text: a }))),
    extra || null,
    el('button', { class: 'btn lt', type: 'button', style: 'margin-top:14px', onclick: close }, 'Fermer'),
  ], { label: title });
}

function qty(value, { min = 1, max = MAX_QTY, onChange, trashAtMin = false, lg = false }) {
  const b = el('b', { text: String(value), 'aria-live': 'polite' });
  const minus = el('button', { type: 'button' });
  const plus = el('button', { type: 'button', 'aria-label': 'Plus' }, I('plus'));
  const paint = () => {
    b.textContent = String(value);
    const trash = trashAtMin && value <= min;
    fill(minus, I(trash ? 'trash' : 'minus'));
    minus.setAttribute('aria-label', trash ? 'Retirer' : 'Moins');
    minus.disabled = !trashAtMin && value <= min;
    plus.disabled = value >= max;
  };
  minus.onclick = () => { if (trashAtMin && value <= min) return onChange(0); value = Math.max(min, value - 1); paint(); onChange(value); };
  plus.onclick = () => { value = Math.min(max, value + 1); paint(); onChange(value); };
  paint();
  return el('div', { class: lg ? 'q lg' : 'q' }, minus, b, plus);
}

function topbar(title, { back = '#/', right = null } = {}) {
  return el('header', { class: 'topbar' },
    el('button', { class: 'circ', type: 'button', 'aria-label': 'Retour', onclick: () => goBack(back) }, I('back')),
    el('span', { class: 'title', text: title }),
    right || el('span', { style: 'width:40px' }));
}
function goBack(fallback) { if (navCount > 0) history.back(); else location.hash = fallback; }

function sec(title, sub, scroller) {
  return el('div', { class: 'sec' },
    el('div', null, el('h2', { class: 'h', text: title }), sub ? el('span', { class: 'm', text: sub }) : null),
    scroller ? el('button', { class: 'arr', type: 'button', 'aria-label': 'Voir la suite', onclick: () => scroller.scrollBy({ left: scroller.clientWidth * 0.62, behavior: scrollBehavior() }) }, I('right')) : null);
}

function emptyState(k, title, text, ...actions) {
  return el('div', { class: 'empty' }, F(k, 120), el('h2', { text: title }), text ? el('p', { text }) : null, ...actions);
}

// ---------------------------------------------------------------------
// Panier, favoris, profil
// ---------------------------------------------------------------------

const cartCount = (rid) => {
  const c = store.get('we_cart', null);
  if (!c || (rid !== undefined && c.restaurant_id !== rid)) return 0;
  return c.lines.reduce((s, l) => s + l.quantity, 0);
};
const cartTotal = () => { const c = store.get('we_cart', null); return c ? c.lines.reduce((s, l) => s + l.line_total, 0) : 0; };
function updateCartBadge() {
  const n = cartCount();
  const b = $('#cart-count');
  if (b) { b.textContent = String(n); b.hidden = n === 0; }
}
const favs = () => store.get('we_favs', []);
const isFav = (id) => favs().includes(id);
function favBtn(id, cls = 'heart', onChange = null) {
  const b = el('button', { class: cls, type: 'button' }, I('heart'));
  const paint = () => { const on = isFav(id); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? 'Retirer des favoris' : 'Ajouter aux favoris'); };
  b.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    const list = favs();
    if (!store.set('we_favs', list.includes(id) ? list.filter((x) => x !== id) : [id, ...list])) {
      toast("Impossible d'enregistrer vos favoris sur cet appareil.", 'info');
      return;
    }
    paint();
    toast(isFav(id) ? 'Ajouté à vos favoris' : 'Retiré de vos favoris', 'heart');
    if (onChange) onChange();
  });
  paint();
  return b;
}
function rememberSearch(q) {
  const v = q.trim();
  if (v.length < 2) return;
  store.set('we_recent', [v, ...store.get('we_recent', []).filter((x) => fold(x) !== fold(v))].slice(0, 6));
}

// ---------------------------------------------------------------------
// Cartes de restaurants
// ---------------------------------------------------------------------

function partnerCard(r, onFavoriteChange = null) {
  const closed = !r.is_open;
  const out = r.in_delivery_zone === false;
  const tag = closed ? ['Fermé', 'd'] : out ? ['Hors zone', 'd'] : r.delivery_fee <= 400 ? [`Livraison ${fmtF(r.delivery_fee)}`, 'g'] : null;
  const name = displayName(r.name);
  return el('article', { class: out ? 'rc dim' : 'rc' },
    F(restoKey(r), null, tag ? el('span', { class: `tag ${tag[1]}`, text: tag[0] }) : null, favBtn(r.id, 'heart', onFavoriteChange)),
    el('div', { class: 't ell', text: name }),
    el('div', { class: 'm ell', text: `${r.prep_minutes}–${r.prep_minutes + 10} min · ${fmtKm(r.distance_km)} · ${r.quartier}` }),
    el('div', { class: 'm' }, `Livraison ${fmtF(r.delivery_fee)}`, isDemo(r.name) ? el('span', { class: 'soonp', text: ' · Démo' }) : null),
    out ? null : el('a', { class: 'stretch', href: `#/r/${r.id}`, 'aria-label': `${name}, ${r.category}` }));
}

function placeCard(p, onFavoriteChange = null) {
  const label = p.category !== 'restaurant' ? catInfo(p.category).label : (p.type_label || 'Restaurant');
  return el('article', { class: 'rc' },
    F(placeKey(p), null, el('span', { class: 'tag g', text: 'Bientôt' }), photoImg(p.photo, 480), favBtn(p.id, 'heart', onFavoriteChange)),
    el('div', { class: 't ell', text: p.name }),
    el('div', { class: 'm ell' }, p.rating ? [S(), el('b', { style: 'color:#22150F', text: ` ${fmtRating(p.rating)}` }), ` (${num(p.rating_count)})`] : 'Pas encore noté',
      p.distance_km !== null ? ` · ${fmtKm(p.distance_km)}` : ''),
    el('div', { class: 'm ell', text: [label, p.open_now === true ? 'Ouvert' : p.open_now === false ? 'Fermé' : null].filter(Boolean).join(' · ') }),
    el('a', { class: 'stretch', href: `#/p/${encodeURIComponent(p.id)}`, 'aria-label': `${p.name}, ${label}` }));
}
const googleCredit = () => el('p', { class: 'gattr' }, 'Données et photos : ', el('b', { text: 'Google Maps' }), ' · établissements pas encore partenaires');

function googleBlock({ title, sub, layout = 'hs', load, transform = (l) => l, empty = null }) {
  if (!googleOn()) return null;
  const box = el('div', { class: layout === 'hs' ? 'hs' : 'vlist' },
    [0, 1].map(() => el('div', { class: 'rc', 'aria-hidden': 'true' }, el('div', { class: 'skel', style: 'height:112px' }), el('div', { class: 'skel', style: 'height:12px;width:70%;margin-top:8px' }))));
  const wrap = el('section', null, sec(title, sub, layout === 'hs' ? box : null), box);
  load().then((list) => {
    const items = transform(list);
    if (!items.length) { if (empty) fill(box, el('p', { class: 'm', style: 'padding:0 0 4px', text: empty })); else wrap.remove(); return; }
    fill(box, items.map((p) => placeCard(p)));
    wrap.append(googleCredit());
  }).catch((e) => fill(box, el('div', { style: 'grid-column:1/-1' }, alertBox(e.message, true))));
  return wrap;
}

// ---------------------------------------------------------------------
// Connexion et adresse
// ---------------------------------------------------------------------

function chooseOrigin(origin, close) {
  store.set('we_origin', origin);
  if (close) close();
  toast(`Livraison à ${origin.label}`, 'pin');
  if (location.hash.startsWith('#/login')) location.hash = '#/';
  else route();
}

function zoneSheet(cityKey, message) {
  const city = CITIES[cityKey];
  const current = store.get('we_origin', null);
  openSheet((close) => {
    const err = el('div', null, message ? alertBox(message) : null);
    const gps = el('button', { class: 'btn', type: 'button' }, I('loc'), 'Utiliser ma position');
    gps.onclick = () => {
      if (!navigator.geolocation) { fill(err, alertBox("La géolocalisation n'est pas disponible. Choisissez un quartier.")); return; }
      gps.disabled = true;
      navigator.geolocation.getCurrentPosition(
        (pos) => chooseOrigin({ label: 'Ma position', city: cityKey, latitude: pos.coords.latitude, longitude: pos.coords.longitude }, close),
        () => { gps.disabled = false; fill(err, alertBox('Position refusée. Choisissez un quartier.')); },
        { timeout: 10000 });
    };
    return [
      el('div', { class: 'grab' }),
      el('h2', { text: `Où livrer à ${city.name} ?` }),
      el('p', { class: 'sub', text: 'Choisissez votre quartier ou utilisez votre position.' }),
      el('div', { class: 'seg', style: 'grid-template-columns:1fr 1fr;margin-bottom:12px' },
        Object.entries(CITIES).map(([k, c]) => el('button', { type: 'button', class: k === cityKey ? 'on' : '', onclick: () => { close(); setTimeout(() => zoneSheet(k), 220); } }, c.name))),
      gps,
      el('div', { class: 'divi', text: 'ou un quartier' }),
      el('div', { class: 'list', style: 'margin:0 -16px' }, city.zones.map((z) => el('button', {
        type: 'button', onclick: () => chooseOrigin({ label: z.name, city: cityKey, latitude: z.latitude, longitude: z.longitude }, close),
      }, el('span', { class: 'circ' }, I(current && current.label === z.name ? 'check' : 'pin')), el('span', { class: 'grow', text: z.name }), I('right')))),
      err,
    ];
  }, { label: 'Adresse de livraison' });
}

function renderLogin(message) {
  chrome('bare');
  let cityKey = (store.get('we_origin', null) || {}).city || 'ouaga';
  const err = el('div', null, message ? alertBox(message) : null);
  const segBtns = Object.entries(CITIES).map(([k, c]) => el('button', {
    type: 'button', class: k === cityKey ? 'on' : '',
    onclick: (e) => { cityKey = k; segBtns.forEach((b) => b.classList.toggle('on', b === e.currentTarget)); },
  }, c.name));
  const go = () => zoneSheet(cityKey);
  setView(el('div', { class: 'login' },
    el('div', { class: 'grid9', 'aria-hidden': 'true' }, ['riz', 'bro', 'pou', 'to', 'piz', 'bis', 'poi', 'bur', 'riz'].map((k) => F(k, 84))),
    el('div', { class: 'sheetw' },
      el('div', { class: 'brand' }, logo(40), el('div', { class: 'wm' }, 'Winged ', el('span', { text: 'Eats' }))),
      el('p', { style: 'margin:10px 0 14px;font-size:14px;color:#5A463E', text: 'Découvrez les restaurants de Ouaga et de Bobo.' }),
      el('form', { onsubmit: (e) => { e.preventDefault(); go(); } },
        err,
        el('button', { class: 'btn', type: 'submit' }, 'Continuer')),
      el('div', { class: 'divi', text: 'Ville de livraison' }),
      el('div', { class: 'seg', style: 'grid-template-columns:1fr 1fr' }, segBtns))));
}

// ---------------------------------------------------------------------
// Accueil
// ---------------------------------------------------------------------

const homeState = { category: null, filters: new Set(), sort: 'distance' };
const SORTS = [['distance', 'Distance'], ['fee', 'Frais de livraison'], ['name', 'Nom']];

function filterPartners(list) {
  const f = homeState.filters;
  const out = list.filter((r) => (!homeState.category || catKeyOf(r) === homeState.category)
    && (!f.has('fast') || r.prep_minutes <= 20) && !f.has('rating'));
  const key = { distance: (a, b) => a.distance_km - b.distance_km, fee: (a, b) => a.delivery_fee - b.delivery_fee, name: (a, b) => displayName(a.name).localeCompare(displayName(b.name), 'fr') }[homeState.sort];
  return out.sort((a, b) => (b.in_delivery_zone - a.in_delivery_zone) || (b.is_open - a.is_open) || key(a, b));
}
function filterPlaces(list) {
  const f = homeState.filters;
  if (f.has('fast')) return [];
  return list.filter((p) => !f.has('rating') || (p.rating && p.rating >= 4.5));
}

function homeView(list, origin, redraw) {
  const city = cityOf(origin);
  const profile = store.get('we_profile', {});
  const firstName = (profile.name || '').trim().split(/\s+/)[0];
  const inZone = list.filter((r) => r.in_delivery_zone);
  const browsing = Boolean(homeState.category) || homeState.filters.size > 0;
  const cats = googleOn() ? appConfig.categories.map((c) => c.key) : [...new Set(list.map(catKeyOf))];
  const minFee = inZone.length ? Math.min(...inZone.map((r) => r.delivery_fee)) : null;
  const shown = filterPartners(list);
  const reset = () => { homeState.category = null; homeState.filters.clear(); redraw(); };
  const toggleFilter = (k) => { if (homeState.filters.has(k)) homeState.filters.delete(k); else homeState.filters.add(k); redraw(); };
  const toPartners = () => document.getElementById('partners')?.scrollIntoView({ behavior: scrollBehavior() });
  const sortSheet = () => openSheet((close) => [
    el('div', { class: 'grab' }), el('h2', { text: 'Trier par' }),
    SORTS.map(([k, l]) => el('button', { class: homeState.sort === k ? 'pm on' : 'pm', type: 'button', style: 'margin-top:8px', onclick: () => { homeState.sort = k; close(); redraw(); } }, el('b', { text: l }), el('span', { class: 'rd' }))),
  ], { label: 'Trier' });

  const popular = googleBlock({ title: `Populaires à ${city.short}`, sub: 'Restaurants réels · notes Google', load: () => gNearby(origin), transform: (l) => l.filter((p) => p.rating >= 4).sort((a, b) => b.rating - a.rating || b.rating_count - a.rating_count).slice(0, 10) });
  const partnersHs = inZone.length ? el('div', { class: 'hs' }, [...inZone].sort((a, b) => a.distance_km - b.distance_km).slice(0, 6).map((r) => partnerCard(r))) : null;

  return [
    googleError ? el('div', { class: 'pad' }, alertBox(`Restaurants Google indisponibles : ${googleError}`, true), el('button', { class: 'chip', type: 'button', onclick: () => location.reload() }, 'Réessayer')) : null,
    el('header', { class: 'home-header' },
    el('div', { class: 'pad fl sp', style: 'padding-top:calc(14px + env(safe-area-inset-top))' },
      el('button', { class: 'addr', type: 'button', onclick: () => zoneSheet(origin.city || 'ouaga'), 'aria-label': `Adresse : ${origin.label}. Modifier` },
        el('div', { class: 'm', text: 'Livrer à' }), el('div', { class: 't' }, `${origin.label}, ${city.name}`, I('down'))),
      el('a', { class: 'circ', href: '#/favorites', 'aria-label': 'Mes favoris' }, I('heart'))),
    el('div', { class: 'pad home-intro' },
      el('h1', null, firstName ? `Bonjour ${firstName},` : 'Bonjour,', el('br'), el('em', { text: 'on se régale ?' })),
      el('p', { class: 'm', text: 'Les bonnes adresses de votre quartier, ici.' }),
      el('a', { class: 'home-search', href: '#/search' }, I('search'), 'Un plat, un restaurant, une envie…'))),
    !browsing ? el('div', { class: 'pad', style: 'margin-top:14px' }, el('div', { class: 'banner' },
      el('div', { class: 'banner-copy' },
        el('div', { class: 'banner-label', text: "Les saveurs d’ici ✦" }),
        el('div', { class: 'bt', text: `Découvrez les restaurants de ${city.short}.` }),
        el('div', { class: 'bs', text: 'Consultez les adresses et contactez les établissements.' }),
        el('button', { class: 'chip', type: 'button', onclick: toPartners }, 'Je découvre', I('right'))),
      el('div', { class: 'banner-art', 'aria-hidden': 'true' }, useSvg('f-meal')))) : null,
    el('div', { class: 'chips', style: 'margin-top:12px' },
      el('button', { class: !homeState.category ? 'chip on' : 'chip', type: 'button', onclick: reset }, 'Tout'),
      el('button', { class: 'chip', type: 'button', onclick: toPartners }, 'Restaurants'),
      el('a', { class: 'chip', href: '#/quartiers' }, 'Quartiers de Ouaga'),
      el('button', { class: 'chip', type: 'button', onclick: () => toast('Courses : bientôt disponible', 'info') }, 'Courses', el('span', { class: 'soon', text: 'bientôt' })),
      el('button', { class: 'chip', type: 'button', onclick: () => toast('Pharmacies de garde : bientôt disponible', 'info') }, 'Pharmacie', el('span', { class: 'soon', text: 'bientôt' })),
      el('button', { class: homeState.category === 'cafe' ? 'chip on' : 'chip', type: 'button', onclick: () => { homeState.category = homeState.category === 'cafe' ? null : 'cafe'; redraw(); } }, 'Boissons')),
    sec('Une envie particulière ?'),
    el('div', { class: 'cats', role: 'group', 'aria-label': 'Catégories' }, cats.map((k) => el('button', {
      class: homeState.category === k ? 'cat on' : 'cat', type: 'button', 'aria-pressed': String(homeState.category === k),
      onclick: () => { homeState.category = homeState.category === k ? null : k; redraw(); },
    }, F(CAT_FOOD[k] || 'riz', 52), catInfo(k).label))),
    el('div', { class: 'chips', style: 'margin-top:12px' },
      el('button', { class: homeState.filters.has('rating') ? 'chip on' : 'chip', type: 'button', 'aria-pressed': String(homeState.filters.has('rating')), onclick: () => toggleFilter('rating') }, I('star'), '4,5 et +'),
      browsing ? el('button', { class: 'chip', type: 'button', onclick: reset }, I('x'), 'Réinitialiser') : null),
    !browsing ? popular : null,
    !browsing && partnersHs ? [sec('Commander maintenant', `Livraison à ${origin.label}`, partnersHs), partnersHs] : null,
    !browsing ? dishesBlock(inZone) : null,
    el('div', { id: 'partners', style: 'scroll-margin-top:10px' }),
    googleBlock({
      title: homeState.category ? `${catInfo(homeState.category).label} à ${city.short}` : `À découvrir à ${city.short}`,
      sub: 'Pas encore disponibles à la commande', layout: 'v',
      load: () => (homeState.category ? gCategory(origin, homeState.category) : gNearby(origin)),
      transform: filterPlaces, empty: browsing ? 'Aucun établissement ne correspond à ces filtres.' : null,
    }),
  ];
}

// Petits prix : plats de moins de 3 000 F des partenaires ouverts les plus proches.
function dishesBlock(inZone, { title = 'Bons plans à moins de 3 000 F', max = 3000 } = {}) {
  const open = inZone.filter((r) => r.is_open).sort((a, b) => a.distance_km - b.distance_km).slice(0, 4);
  if (!open.length) return null;
  const box = el('div', { class: 'mini' }, [0, 1, 2].map(() => el('div', { class: 'skel', style: 'height:64px' })));
  const wrap = el('section', null, sec(title, 'Ajoutez en un geste', box), box);
  Promise.allSettled(open.map((r) => getMenu(r.id))).then((res) => {
    const menus = res.filter((x) => x.status === 'fulfilled').map((x) => x.value);
    const picks = menus.flatMap((m) => m.categories.flatMap((c) => c.items.filter((i) => i.available && i.price <= max).map((item) => ({ item, menu: m }))));
    if (!picks.length) { wrap.remove(); return; }
    fill(box, picks.slice(0, 9).map(({ item, menu }) => el('button', {
      type: 'button', 'aria-label': `${item.name}, ${fmtF(item.price)}, ${displayName(menu.name)}`,
      onclick: () => openItem(item, menu, updateCartBadge),
    }, F(dishKey(item.name, restoKey(menu)), 64), el('span', { class: 'plus' }, I('plus')),
    el('div', { class: 'n', text: item.name }), el('div', { class: 'p', text: fmtF(item.price) }))));
  }).catch(() => wrap.remove());
  return wrap;
}

async function renderHome(alive) {
  const origin = store.get('we_origin', null);
  if (!origin) return renderLogin();
  chrome('nav', 'home');
  setView(el('div', { class: 'pad', style: 'padding-top:20px' }, el('div', { class: 'skel', style: 'height:40px;width:60%' }), el('div', { class: 'skel', style: 'height:80px;margin-top:20px' }), el('div', { class: 'skel', style: 'height:150px;margin-top:20px' })));
  let list;
  try { list = await getRestaurants(origin); } catch (e) {
    if (!alive()) return;
    return setView(el('div', { class: 'pad', style: 'padding-top:30px' }, alertBox(e.message), el('button', { class: 'btn', type: 'button', onclick: () => route() }, 'Réessayer')));
  }
  if (!alive()) return;
  const body = el('div');
  const redraw = () => fill(body, homeView(list, origin, redraw));
  redraw();
  setView(body);
}

async function showLiveOrder(alive) {
  const phones = store.get('we_orders', {});
  for (const id of Object.keys(phones).map(Number).sort((a, b) => b - a).slice(0, 3)) {
    let o;
    try { o = await api(`/orders/${id}?phone=${encodeURIComponent(phones[id])}`); } catch { continue; }
    if (!alive()) return;
    if (TERMINAL.includes(o.status)) continue;
    const meta = store.get('we_order_meta', {})[id] || {};
    const node = el('div', { class: 'live' }, el('a', { href: `#/order/${id}` },
      I('moto'), el('span', { class: 'grow' }, el('div', { class: 't', text: `${STATUS[o.status].label} · n°${id}` }), el('div', { class: 'm', text: meta.restaurant_name ? displayName(meta.restaurant_name) : 'Suivre la commande' })), I('right')));
    document.body.append(node);
    onCleanup(() => node.remove());
    return;
  }
}

// ---------------------------------------------------------------------
// Offres
// ---------------------------------------------------------------------

async function renderOffres(alive) {
  const origin = store.get('we_origin', null);
  if (!origin) return renderLogin();
  chrome('nav', 'home');
  setView(topbar('', { back: '#/' }), el('div', { class: 'bigt', text: 'Offres' }), el('div', { class: 'pad' }, el('div', { class: 'skel', style: 'height:150px' })));
  let list;
  try { list = await getRestaurants(origin); } catch (e) { if (alive()) setView(topbar('Offres'), el('div', { class: 'pad' }, alertBox(e.message))); return; }
  if (!alive()) return;
  const inZone = list.filter((r) => r.in_delivery_zone && r.is_open);
  const cheap = inZone.filter((r) => r.delivery_fee <= 500).sort((a, b) => a.delivery_fee - b.delivery_fee);
  const cheapHs = cheap.length ? el('div', { class: 'hs' }, cheap.map((r) => partnerCard(r))) : null;
  setView(
    topbar('', { back: '#/' }),
    el('div', { class: 'bigt', text: 'Offres' }),
    el('p', { class: 'm pad', style: 'margin-top:-4px', text: 'Les promotions des restaurants partenaires (1 acheté = 1 offert, livraison offerte…) apparaîtront ici dès leur lancement.' }),
    cheapHs ? [sec('Livraison à petit prix', `${fmtF(500)} ou moins`, cheapHs), cheapHs] : null,
    dishesBlock(inZone),
    googleBlock({ title: 'Les mieux notés', sub: 'Note Google 4,5 et plus', load: () => gNearby(origin), transform: (l) => l.filter((p) => p.rating >= 4.5) }),
  );
}

// ---------------------------------------------------------------------
// Restaurant et fiche plat
// ---------------------------------------------------------------------

function openItem(item, menu, onAdded) {
  if (!item.available || !menu.is_open) { toast(!menu.is_open ? 'Restaurant fermé : commande impossible' : 'Article en rupture', 'info'); return; }
  const state = { quantity: 1, selected: new Map() };
  const section = (menu.categories || []).find((c) => c.items.some((i) => i.id === item.id));
  const k = dishKey(item.name, section ? dishKey(section.name, restoKey(menu)) : restoKey(menu));
  const isSel = (g, oid) => (state.selected.get(g.id) || new Set()).has(oid);
  const unit = () => item.price + item.option_groups.reduce((s, g) => s + g.options.filter((o) => isSel(g, o.id)).reduce((a, o) => a + o.price_delta, 0), 0);
  const missing = () => item.option_groups.find((g) => g.required && !(state.selected.get(g.id)?.size > 0));
  const addBtn = el('button', { class: 'btn', type: 'button', style: 'flex:1' });
  const pills = new Map();
  const refresh = () => {
    const m = missing();
    addBtn.disabled = Boolean(m);
    addBtn.textContent = m ? 'Faites un choix' : `Ajouter · ${fmtF(unit() * state.quantity)}`;
    for (const [g, p] of pills) { const done = (state.selected.get(g.id)?.size || 0) > 0; p.textContent = done ? '✓ Choisi' : 'Obligatoire'; p.style.background = done ? '#E3F4EA' : ''; }
  };
  const groups = item.option_groups.map((g) => {
    const single = g.max_choices === 1;
    const pill = el('span', { class: 'chip', style: 'font-size:11px;cursor:default', text: g.required ? 'Obligatoire' : `Facultatif${single ? '' : ` · ${g.max_choices} max`}` });
    if (g.required) pills.set(g, pill);
    const head = el('div', { class: 'fl sp', style: 'margin-top:14px' }, el('span', { class: 't', text: g.name }), pill);
    // Choix court sans supplément (ex. piment) : contrôle segmenté, comme dans la maquette.
    if (single && g.options.length <= 3 && g.options.every((o) => !o.price_delta)) {
      const btns = g.options.map((o) => el('button', { type: 'button', onclick: (e) => { state.selected.set(g.id, new Set([o.id])); btns.forEach((b) => b.classList.toggle('on', b === e.currentTarget)); refresh(); } }, o.name));
      return [head, el('div', { class: 'seg', style: `margin-top:6px;grid-template-columns:repeat(${g.options.length},1fr)` }, btns)];
    }
    return [head, g.options.map((o) => el('label', { class: 'opt' },
      el('input', {
        type: single ? 'radio' : 'checkbox', name: `g${g.id}`,
        onchange: (e) => {
          let set = state.selected.get(g.id) || new Set();
          if (single) set = new Set([o.id]);
          else if (e.target.checked) {
            if (set.size >= g.max_choices) { e.target.checked = false; toast(`Maximum ${g.max_choices} choix`, 'info'); return; }
            set = new Set(set).add(o.id);
          } else { set = new Set(set); set.delete(o.id); }
          state.selected.set(g.id, set);
          refresh();
        },
      }),
      el('span', { class: 'nm', text: o.name }), el('span', { class: 'm', text: o.price_delta ? `+${fmtF(o.price_delta)}` : '' }),
      el('span', { class: single ? 'rd' : 'rd sq' })))];
  });
  const close = openSheet((closeFn) => [
    el('div', { class: 'platimg' }, F(k, 230), el('button', { class: 'circ w x', type: 'button', 'aria-label': 'Fermer', onclick: closeFn }, I('x'))),
    el('div', { class: 'pad', style: 'padding-bottom:8px' },
      el('div', { style: 'font:800 21px Inter,sans-serif;margin-top:12px', text: item.name }),
      el('div', { style: 'font-weight:700;margin:2px 0 4px', text: fmtF(item.price) }),
      item.description ? el('div', { class: 'm', style: 'font-size:13px', text: item.description }) : null,
      groups),
    el('div', { class: 'foot' }, qty(1, { lg: true, onChange: (v) => { state.quantity = v; refresh(); } }), addBtn),
  ], { flush: true, label: item.name });
  addBtn.onclick = async () => {
    if (missing()) return;
    const chosen = item.option_groups.flatMap((g) => g.options.filter((o) => isSel(g, o.id)));
    const existing = store.get('we_cart', null);
    if (existing && existing.restaurant_id !== menu.id && existing.lines.length) {
      const ok = await confirmSheet({ title: 'Nouveau panier ?', text: `Votre panier contient des articles de ${displayName(existing.restaurant_name)}. Les remplacer ?`, ok: 'Remplacer le panier', cancel: 'Garder mon panier' });
      if (!ok) return;
    }
    const cart = existing && existing.restaurant_id === menu.id ? existing : { restaurant_id: menu.id, restaurant_name: menu.name, restaurant_category: menu.category, lines: [] };
    const u = unit();
    cart.lines.push({ item_id: item.id, name: item.name, unit_price: u, quantity: state.quantity, option_ids: chosen.map((o) => o.id), options_label: chosen.map((o) => o.name).join(' + '), line_total: u * state.quantity });
    store.set('we_cart', cart);
    close();
    updateCartBadge();
    toast(`Ajouté : ${state.quantity} × ${item.name}`, 'bag');
    if (onAdded) onAdded();
  };
  refresh();
}

let cartBarSlot = null;
function paintCartBar(rid) {
  if (!cartBarSlot) return;
  const n = cartCount(rid);
  fill(cartBarSlot, n ? el('div', { class: 'cartbar' }, el('a', { class: 'btn dk', href: '#/cart' }, I('bag'), `Voir le panier · ${plural(n, 'article')} · ${fmtF(cartTotal())}`)) : null);
}

async function renderRestaurant(id, alive) {
  const origin = store.get('we_origin', null);
  if (!origin) return renderLogin('Choisissez une adresse de livraison avant de commander.');
  chrome('nonav');
  setView(el('div', { class: 'skel', style: 'height:190px;border-radius:0' }), el('div', { class: 'pad' }, el('div', { class: 'skel', style: 'height:26px;width:60%;margin-top:30px' }), el('div', { class: 'skel', style: 'height:70px;margin-top:16px' })));
  let menu;
  let info = null;
  try {
    [menu, info] = await Promise.all([api(`/restaurants/${id}`), getRestaurants(origin).then((l) => l.find((r) => r.id === id) || null)]);
  } catch (e) {
    if (!alive()) return;
    return setView(topbar('Restaurant'), el('div', { class: 'pad' }, alertBox(e.message), el('button', { class: 'btn', type: 'button', onclick: () => route() }, 'Réessayer')));
  }
  if (!alive()) return;
  putMenu(menu);
  const name = displayName(menu.name);
  const tabs = menu.categories.map((c, i) => el('button', { class: i === 0 ? 'chip on' : 'chip', type: 'button', 'data-t': `c${c.id}`, onclick: () => document.getElementById(`c${c.id}`).scrollIntoView({ behavior: scrollBehavior() }) }, c.name));
  cartBarSlot = el('div');
  setView(
    el('div', { class: 'hero' }, F(restoKey(menu), 220),
      el('div', { class: 'acts' }, el('button', { class: 'circ w', type: 'button', 'aria-label': 'Retour', onclick: () => goBack('#/') }, I('back')), favBtn(id, 'circ w'))),
    el('div', { class: 'pad restaurant-intro' },
      el('h1', { class: 'rname', style: 'margin-bottom:0' }, name, isDemo(menu.name) ? el('span', { class: 'soonp', style: 'font-size:12px', text: ' · Démo' }) : null),
      el('div', { class: 'm', text: [menu.category, menu.quartier, menu.address_hint].filter(Boolean).join(' · ') }),
      el('div', { class: 'kp2' },
        el('div', null, el('b', { text: `${menu.prep_minutes}–${menu.prep_minutes + 10} min` }), el('span', { class: 'm', text: info ? `Livraison ${fmtF(info.delivery_fee)} · ${fmtKm(info.distance_km)}` : 'Livraison selon distance' })),
        el('div', null, el('b', { style: `color:${menu.is_open ? 'var(--green)' : 'var(--red2)'}`, text: menu.is_open ? 'Ouvert' : 'Fermé' }), el('span', { class: 'm', text: menu.opening_hours || 'Horaires non renseignés' }))),
      !menu.is_open ? alertBox('Restaurant fermé : vous pouvez consulter le menu, mais pas commander.') : null,
      !info ? alertBox("La disponibilité pour cette adresse ne peut pas être vérifiée.") : !info.in_delivery_zone ? alertBox(`Hors zone de livraison (${fmtKm(info.distance_km)}). Changez d'adresse pour commander.`) : null),
    el('div', { class: 'tabsw' }, el('div', { class: 'chips' }, tabs)),
    menu.categories.map((c) => el('section', { id: `c${c.id}`, class: 'msec' },
      el('h3', { text: c.name }),
      c.items.map((item) => {
        const can = item.available && menu.is_open && info && info.in_delivery_zone;
        return el('button', { class: 'mrow', type: 'button', disabled: !can, onclick: () => openItem(item, menu, () => paintCartBar(menu.id)) },
          el('div', { class: 'grow' },
            el('div', { class: 't', text: item.name }),
            item.description ? el('div', { class: 'm', text: item.description }) : null,
            el('div', { style: 'font-weight:700;margin-top:3px' }, fmtF(item.price), !item.available ? el('span', { class: 'out', text: ' · Rupture' }) : item.option_groups.length ? el('span', { class: 'save', text: ' · Personnalisable' }) : null)),
          el('div', { class: 'ftw' }, F(dishKey(item.name, dishKey(c.name, restoKey(menu))), 70), can ? el('span', { class: 'plus' }, I('plus')) : null));
      }))),
    el('div', { style: 'height:90px' }),
    cartBarSlot);
  paintCartBar(id);
  onCleanup(() => { cartBarSlot = null; });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) tabs.forEach((t) => t.classList.toggle('on', t.dataset.t === en.target.id));
    }, { rootMargin: '-80px 0px -60% 0px' });
    main.querySelectorAll('.msec').forEach((s) => io.observe(s));
    onCleanup(() => io.disconnect());
  }
}

// ---------------------------------------------------------------------
// Panier et paiement
// ---------------------------------------------------------------------

function mmLogo(orange) {
  return el('img', { src: orange ? '../shared/logos/orange-money.png' : '../shared/logos/moov-money.png', alt: orange ? 'Orange Money' : 'Moov Money' });
}

function mobileMoneyDemo(kind, amount, onCash) {
  const orange = kind === 'o';
  openSheet((close) => [
    el('div', { class: 'grab' }),
    el('div', { style: 'text-align:center;padding-top:8px' },
      el('div', { class: `om ${orange ? 'o' : 'mv'}`, style: 'width:64px;height:64px;border-radius:18px;margin:0 auto' }, mmLogo(orange)),
      el('div', { style: 'font:800 22px Inter,sans-serif;margin-top:14px', text: 'Confirmez le paiement' }),
      el('div', { style: 'font:800 32px Inter,sans-serif;color:#E0362A;margin:6px 0;letter-spacing:-.02em', text: fmtCFA(amount) })),
    el('div', { class: 'otp', 'aria-hidden': 'true' }, ['', '', '', ''].map(() => el('span'))),
    el('div', { class: 'alert i' }, I('info'), el('span', null, el('b', { text: `${orange ? 'Orange Money' : 'Moov Money'} arrive bientôt. ` }), 'Le paiement mobile sera activé dès la signature avec l’opérateur. Pour l’instant, payez en espèces à la livraison.')),
    el('button', { class: 'btn', type: 'button', onclick: () => { close(); onCash(); } }, 'Payer en espèces à la livraison'),
    el('button', { class: 'btn lt', type: 'button', style: 'margin-top:8px', onclick: close }, 'Fermer'),
  ], { label: 'Paiement mobile' });
}

function renderCart(alive) {
  const cart = store.get('we_cart', null);
  if (!cart || !cart.lines.length) {
    chrome('nav', 'cart');
    return setView(topbar('Panier', { right: el('a', { class: 'circ', href: '#/orders', 'aria-label': 'Commandes' }, I('clock')) }),
      emptyState('riz', 'Votre panier est vide', "Ajoutez des plats d'un restaurant : ils apparaîtront ici.", el('a', { class: 'btn', href: '#/', style: 'width:auto;display:inline-flex' }, 'Découvrir les restaurants')));
  }
  const origin = store.get('we_origin', null);
  if (!origin) return renderLogin('Choisissez une adresse de livraison avant de commander.');
  chrome('nonav', 'cart');
  const save = () => store.set('we_cart', cart);
  const subtotal = () => cart.lines.reduce((s, l) => s + l.line_total, 0);
  const fb = restoKey({ name: cart.restaurant_name, category: cart.restaurant_category });
  let fee = null;
  let blocked = null;
  let tip = 0;
  let submitting = false;
  const lines = el('div');
  const tot = el('div', { style: 'margin-top:12px' });
  const errorSlot = el('div');
  const submit = el('button', { class: 'btn', type: 'submit' });
  const tipBtns = [0, 200, 500, 1000].map((v) => el('button', { type: 'button', class: v === 0 ? 'on' : '', onclick: (e) => { tip = v; tipBtns.forEach((b) => b.classList.toggle('on', b === e.currentTarget)); paint(); } }, v ? fmtF(v) : 'Non'));
  const pmBtn = (key, badge, cls, title, sub) => el('button', { class: key === 'cash' ? 'pm on' : 'pm', type: 'button', 'data-pm': key }, el('span', { class: `om ${cls}` }, badge), el('span', null, el('b', { text: title }), el('br'), el('span', { class: 'm', text: sub })), el('span', { class: 'rd' }));
  const pms = [pmBtn('cash', 'F', 'cash', 'Espèces à la livraison', 'Disponible'), pmBtn('o', mmLogo(true), 'o', 'Orange Money', 'Bientôt disponible'), pmBtn('mv', mmLogo(false), 'mv', 'Moov Money', 'Bientôt disponible')];
  const setCash = () => pms.forEach((b) => b.classList.toggle('on', b.dataset.pm === 'cash'));
  pms.forEach((b) => { b.onclick = () => { if (b.dataset.pm === 'cash') setCash(); else mobileMoneyDemo(b.dataset.pm, subtotal() + (fee ? fee.delivery_fee : 0), setCash); }; });

  function paint() {
    if (!cart.lines.length) { store.remove('we_cart'); updateCartBadge(); route(); return; }
    fill(lines, cart.lines.map((l, i) => el('div', { class: 'fl', style: 'gap:10px;padding:7px 0' },
      el('div', { style: 'width:38px' }, F(dishKey(l.name, fb), 38)),
      el('div', { style: 'flex:1' }, el('div', { style: 'font-weight:600', text: l.name }), el('div', { class: 'm' }, fmtF(l.unit_price), l.options_label ? el('span', { class: 'save', text: ` ${l.options_label}` }) : null)),
      qty(l.quantity, { trashAtMin: true, onChange: (v) => { if (v === 0) cart.lines.splice(i, 1); else { l.quantity = v; l.line_total = l.unit_price * v; } save(); updateCartBadge(); paint(); } }))));
    const s = subtotal();
    const total = fee ? s + fee.delivery_fee : null;
    fill(tot,
      el('div', { class: 'lr' }, el('span', { text: 'Articles' }), el('span', { text: fmtF(s) })),
      el('div', { class: 'lr' }, el('span', { text: 'Livraison estimée' }), el('span', { text: fee ? fmtF(fee.delivery_fee) : 'À vérifier' })),
      el('div', { class: 'lr', style: 'font-weight:800;font-size:15px' }, el('span', { text: 'Total de la commande' }), el('span', { text: total === null ? 'À vérifier' : fmtCFA(total) })),
      tip ? el('div', { class: 'm', text: `Pourboire séparé : ${fmtF(tip)} en espèces au livreur` }) : null,
      el('div', { class: 'hint', text: 'Les prix et les frais sont recalculés à la commande.' }));
    submit.disabled = submitting || !fee || Boolean(blocked);
    submit.textContent = submitting ? 'Envoi de la commande…' : blocked ? 'Commande indisponible' : total === null ? 'Vérification de la livraison…' : `Commander · ${fmtF(total)} en espèces`;
  }

  const profile = store.get('we_profile', {});
  const form = el('form', {
    onsubmit: async (e) => {
      e.preventDefault();
      if (submitting || !fee || blocked) return;
      const f = e.target.elements;
      const body = {
        restaurant_id: cart.restaurant_id, customer_name: f.name.value, customer_phone: f.phone.value, repere: f.repere.value,
        note: [f.note.value, tip ? `Pourboire prévu pour le livreur : ${tip} F` : ''].filter(Boolean).join(' · '),
        latitude: origin.latitude, longitude: origin.longitude,
        items: cart.lines.map((l) => ({ item_id: l.item_id, quantity: l.quantity, option_ids: l.option_ids })),
      };
      submitting = true;
      paint();
      try {
        const order = await api('/orders', { method: 'POST', body });
        const phones = store.get('we_orders', {}); phones[order.id] = body.customer_phone; store.set('we_orders', phones);
        const meta = store.get('we_order_meta', {}); meta[order.id] = { restaurant_id: cart.restaurant_id, restaurant_name: cart.restaurant_name, category: cart.restaurant_category || null }; store.set('we_order_meta', meta);
        store.set('we_profile', { ...store.get('we_profile', {}), name: body.customer_name, phone: body.customer_phone });
        store.remove('we_cart');
        updateCartBadge();
        location.hash = `#/order/${order.id}`;
      } catch (err) {
        fill(errorSlot, alertBox(err.message));
        errorSlot.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
        submitting = false;
        paint();
      }
    },
  },
    el('div', { class: 'fl', style: 'gap:10px;padding:10px 0;border-bottom:1px solid var(--line)' },
      el('span', { class: 'circ' }, I('pin')),
      el('div', { style: 'flex:1' }, el('div', { class: 't', text: `${origin.label}, ${cityOf(origin).name}` }), el('div', { class: 'm', text: 'Adresse de livraison' })),
      el('button', { class: 'chip', type: 'button', onclick: () => zoneSheet(origin.city || 'ouaga') }, 'Changer')),
    el('div', { class: 'field' }, el('label', { for: 'repere' }, 'Repère pour le livreur (obligatoire)'),
      el('textarea', { id: 'repere', name: 'repere', required: true, rows: 2, maxlength: 200, placeholder: 'Ex. portail bleu, en face de la pharmacie' })),
    el('div', { class: 't', style: 'margin:14px 0 4px' }, `Votre commande · ${displayName(cart.restaurant_name)}`),
    lines,
    el('a', { class: 'm', href: `#/r/${cart.restaurant_id}`, style: 'display:inline-block;margin:2px 0 6px;color:var(--red);font-weight:700' }, '+ Ajouter des articles'),
    el('div', { class: 't', style: 'margin:8px 0 6px' }, 'Pourboire pour le livreur'),
    el('div', { class: 'tip' }, tipBtns),
    el('div', { class: 'hint', text: 'Le pourboire se donne en espèces au livreur ; il n’est pas ajouté au paiement.' }),
    el('div', { class: 't', style: 'margin:12px 0 6px' }, 'Payer avec'),
    el('div', { style: 'display:grid;gap:7px' }, pms),
    el('div', { class: 't', style: 'margin:14px 0 0' }, 'Vos coordonnées'),
    el('div', { class: 'field' }, el('label', { for: 'name' }, 'Nom'), el('input', { id: 'name', name: 'name', required: true, maxlength: 80, autocomplete: 'name', value: profile.name || '' })),
    el('div', { class: 'field' }, el('label', { for: 'phone' }, 'Téléphone'), el('input', { id: 'phone', name: 'phone', type: 'tel', required: true, autocomplete: 'tel', inputmode: 'tel', placeholder: '+226 70 00 00 00', value: profile.phone || '' })),
    el('div', { class: 'field' }, el('label', { for: 'note' }, 'Note pour le cuisinier (facultatif)'), el('input', { id: 'note', name: 'note', maxlength: 200, placeholder: '« pas trop d’oignon »' })),
    tot,
    errorSlot,
    el('div', { style: 'position:fixed;z-index:35;left:50%;transform:translateX(-50%);width:min(480px,100%);bottom:0;padding:12px 16px calc(14px + env(safe-area-inset-bottom));background:linear-gradient(#fff0,#fff 30%)' }, submit));
  setView(topbar('Paiement', { back: `#/r/${cart.restaurant_id}` }), el('div', { class: 'pad' }, form));
  paint();
  const loadFee = () => {
    fill(errorSlot);
    getRestaurants(origin).then((list) => {
      if (!alive()) return;
      const r = list.find((x) => x.id === cart.restaurant_id);
      if (!r) blocked = "Ce restaurant n'est plus disponible.";
      else {
        if (!r.in_delivery_zone) blocked = `Hors zone de livraison (${fmtKm(r.distance_km)}). Changez d'adresse.`;
        else if (!r.is_open) blocked = 'Ce restaurant est fermé. Commande impossible.';
        else fee = r;
      }
      if (blocked) fill(errorSlot, alertBox(blocked));
      paint();
    }).catch((e) => {
      if (!alive()) return;
      fill(errorSlot, alertBox(e.message), el('button', { class: 'btn lt', type: 'button', onclick: loadFee }, 'Réessayer la vérification'));
      paint();
    });
  };
  loadFee();
}

// ---------------------------------------------------------------------
// Plan stylisé (maquette) : sans tuiles cartographiques
// ---------------------------------------------------------------------

function planSvg(extra = '') {
  const s = document.createElementNS(SVGNS, 'svg');
  s.setAttribute('class', 'map');
  s.setAttribute('viewBox', '0 0 322 702');
  s.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = `<rect width="322" height="702" fill="#F3EBDD"/><path d="M-20 90C80 70 120 130 220 110S330 60 360 80V0H-20z" fill="#BFDDE8"/><path d="M190 380h140v140H200z" fill="#D6E8C2"/><g stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round"><path d="M-10 250L340 210"/><path d="M110 0L150 720"/><path d="M-10 430L340 470"/><path d="M250 120L210 720"/></g><g stroke="#fff" stroke-width="5" fill="none"><path d="M-10 340L340 330"/><path d="M40 0L60 720"/><path d="M-10 560L340 600"/><path d="M180 150L330 300"/></g><g stroke="#F6D69A" stroke-width="10" fill="none" stroke-linecap="round"><path d="M-10 160L340 150"/></g>${extra}`;
  return s;
}

// ---------------------------------------------------------------------
// Suivi de commande
// ---------------------------------------------------------------------

async function restaurantMeta(o) {
  const meta = store.get('we_order_meta', {})[o.id];
  if (meta && meta.restaurant_name) return { name: meta.restaurant_name, category: meta.category };
  try { const m = await getMenu(o.restaurant_id); return { name: m.name, category: m.category }; } catch { return { name: 'Restaurant', category: null }; }
}

function trackView(o, r, onCancel) {
  const s = STATUS[o.status];
  const failed = s.step < 0;
  const k = restoKey(r);
  return [
    el('div', { class: 'trackw' },
      el('div', { class: 'gmap', 'aria-label': 'Carte de la livraison' }),
      el('div', { class: 'track-message m', text: 'Position du livreur en direct : bientôt disponible.' }),
      el('div', { style: 'position:absolute;top:calc(12px + env(safe-area-inset-top));left:16px;z-index:3' }, el('a', { class: 'circ w', href: '#/orders', 'aria-label': 'Mes commandes' }, I('back')))),
    el('div', { class: 'tsheet', 'aria-live': 'polite' },
      el('div', { class: 'grab' }),
      el('div', { class: 'fl sp', style: 'align-items:flex-start' },
        el('div', null, el('div', { style: 'font:800 22px Inter,sans-serif;letter-spacing:-.02em', text: s.title }), el('div', { class: 'm', text: s.text })),
        el('span', { class: 'chip', style: `background:${s.chip};cursor:default`, text: s.label })),
      !failed ? [
        el('div', { class: 'steps' }, STEP_LABELS.map((_, i) => el('i', { class: i < s.step ? 'on' : '' }))),
        el('div', { class: 'm fl sp', style: 'font-size:11px' }, STEP_LABELS.map((l) => el('span', { text: l }))),
      ] : null,
      el('div', { class: 'fl', style: 'gap:10px;margin-top:14px;padding-top:12px;border-top:1px solid var(--line)' },
        el('div', { class: 'av', text: initials(r.name) }),
        el('div', { style: 'flex:1' }, el('div', { class: 't', text: displayName(r.name) }), el('div', { class: 'm', text: `Commande n°${o.id} · position du livreur en direct bientôt` }))),
      !failed ? el('div', { class: 'code' }, 'Code de remise à donner au livreur : ', el('b', { text: String(o.pickup_code).split('').join(' ') })) : null,
      el('div', { class: 't', style: 'margin:16px 0 4px' }, 'Détail'),
      o.items.map((it) => el('div', { class: 'fl', style: 'gap:10px;padding:6px 0' },
        el('div', { style: 'width:38px' }, F(dishKey(it.item_name, k), 38)),
        el('div', { style: 'flex:1' }, el('div', { style: 'font-weight:600', text: `${it.quantity} × ${it.item_name}` }), it.options_label ? el('div', { class: 'm', text: it.options_label }) : null),
        el('b', { text: fmtF(it.line_total) }))),
      el('div', { class: 'lr' }, el('span', { class: 'm', text: 'Livraison' }), el('b', { text: fmtF(o.delivery_fee) })),
      el('div', { class: 'lr', style: 'font-weight:800;font-size:15px' }, el('span', { text: 'Total' }), el('span', { text: fmtCFA(o.total) })),
      el('div', { class: 'm', text: 'Paiement en espèces à la livraison' }),
      o.status === 'PENDING' ? el('button', { class: 'btn lt', type: 'button', style: 'margin-top:14px;color:var(--red2)', onclick: onCancel }, 'Annuler la commande') : null,
      el('a', { class: 'btn dk', href: '#/', style: 'margin-top:10px' }, "Retour à l'accueil")),
  ];
}

async function renderOrder(id, alive) {
  chrome('nav', null);
  const phones = store.get('we_orders', {});
  const phone = phones[id];
  if (!phone) {
    const input = el('input', { class: 'inp', type: 'tel', required: true, inputmode: 'tel', placeholder: '+226 70 00 00 00', 'aria-label': 'Téléphone' });
    return setView(topbar(`Commande n°${id}`, { back: '#/orders' }),
      el('div', { class: 'pad' }, el('p', { class: 'm', text: 'Entrez le numéro utilisé lors de la commande.' }),
        el('form', { onsubmit: (e) => { e.preventDefault(); const p = store.get('we_orders', {}); p[id] = input.value; store.set('we_orders', p); route(); } },
          input, el('button', { class: 'btn', type: 'submit', style: 'margin-top:12px' }, 'Suivre la commande'))));
  }
  setView(el('div', { class: 'skel', style: 'height:330px;border-radius:0' }), el('div', { class: 'pad' }, el('div', { class: 'skel', style: 'height:160px;margin-top:16px' })));
  let r = null;
  let timer = null;
  let trackMap = null;
  let renderVersion = 0;
  let lastOrder = '';
  const stop = () => { if (timer) clearInterval(timer); timer = null; };
  onCleanup(() => { stop(); renderVersion++; if (trackMap) trackMap.remove(); });
  const draw = async () => {
    try {
      const o = await api(`/orders/${id}?phone=${encodeURIComponent(phone)}`);
      if (!alive()) return stop();
      if (!r) r = await restaurantMeta(o);
      if (!alive()) return stop();
      const signature = JSON.stringify(o);
      if (signature === lastOrder) { if (TERMINAL.includes(o.status)) stop(); return; }
      lastOrder = signature;
      const version = ++renderVersion;
      if (trackMap) { trackMap.remove(); trackMap = null; }
      setView(trackView(o, r, async () => {
        const ok = await confirmSheet({ title: 'Annuler la commande ?', text: "L'annulation est possible tant que le restaurant n'a pas accepté.", ok: 'Oui, annuler', cancel: 'Non, garder' });
        if (!ok) return;
        try { await api(`/orders/${id}/cancel`, { method: 'POST', body: { phone } }); toast('Commande annulée'); draw(); } catch (err) { toast(err.message, 'info'); }
      }));
      const host = main.querySelector('.trackw .gmap');
      if (Number.isFinite(o.latitude) && Number.isFinite(o.longitude)) {
        WEMap.create(host, [o.longitude, o.latitude]).then(({ map, lib }) => {
          if (!alive() || version !== renderVersion) { map.remove(); return; }
          trackMap = map;
          new lib.Marker({ color: '#d74331' }).setLngLat([o.longitude, o.latitude]).setPopup(new lib.Popup({ offset: 25 }).setText('Point de livraison choisi (quartier parfois approximatif)')).addTo(map);
        }).catch((error) => {
          if (alive() && version === renderVersion) host.replaceChildren(alertBox(error.message, true));
        });
      } else {
        host.replaceChildren(alertBox("Adresse de livraison indisponible pour cette commande.", true));
      }
      if (TERMINAL.includes(o.status)) stop();
    } catch (e) {
      if (!alive()) return stop();
      renderVersion++;
      if (trackMap) { trackMap.remove(); trackMap = null; }
      setView(topbar(`Commande n°${id}`, { back: '#/orders' }), el('div', { class: 'pad' }, alertBox(e.message), el('button', { class: 'btn', type: 'button', onclick: () => route() }, 'Réessayer')));
      stop();
    }
  };
  timer = setInterval(draw, POLL_MS);
  await draw();
}

let ordersTab = 'all';
async function renderOrders(alive) {
  chrome('nav', 'account');
  const phones = store.get('we_orders', {});
  const ids = Object.keys(phones).map(Number).sort((a, b) => b - a).slice(0, 20);
  const head = topbar('Commandes', { back: '#/account' });
  if (!ids.length) return setView(head, emptyState('pou', 'Aucune commande', 'Vos commandes passées sur cet appareil apparaîtront ici.', el('a', { class: 'btn', href: '#/', style: 'width:auto;display:inline-flex' }, 'Commander maintenant')));
  const body = el('div', { class: 'pad' }, el('div', { class: 'skel', style: 'height:70px;margin-top:14px' }));
  const seg = el('div', { class: 'seg', style: 'grid-template-columns:1fr 1fr' });
  setView(head, el('div', { class: 'pad', style: 'margin-top:6px' }, seg), body);
  const results = await Promise.allSettled(ids.map((id) => api(`/orders/${id}?phone=${encodeURIComponent(phones[id])}`)));
  if (!alive()) return;
  const orders = results.filter((x) => x.status === 'fulfilled').map((x) => x.value);
  const names = await Promise.all(orders.map(restaurantMeta));
  if (!alive()) return;
  const summary = (o) => o.items.map((it) => `${it.item_name}${it.quantity > 1 ? ` x${it.quantity}` : ''}`).join(', ');
  const when = (o) => orderDate(o.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const draw = () => {
    fill(seg, [['all', 'Toutes'], ['again', 'Recommander']].map(([k, l]) => el('button', { type: 'button', class: ordersTab === k ? 'on' : '', onclick: () => { ordersTab = k; draw(); } }, l)));
    const current = orders.filter((o) => !TERMINAL.includes(o.status));
    const past = orders.filter((o) => TERMINAL.includes(o.status));
    if (ordersTab === 'again') {
      const seen = new Set();
      const uniq = orders.filter((o) => (seen.has(o.restaurant_id) ? false : seen.add(o.restaurant_id)));
      fill(body, el('div', { class: 't', style: 'margin:14px 0 4px' }, 'Vos restaurants'), uniq.map((o) => {
        const r = names[orders.indexOf(o)];
        return el('a', { class: 'fl', href: `#/r/${o.restaurant_id}`, style: 'gap:10px;padding:10px 0;border-bottom:1px solid var(--line)' },
          el('div', { style: 'width:52px' }, F(restoKey(r), 52)), el('div', { style: 'flex:1' }, el('div', { class: 't', text: displayName(r.name) }), el('div', { class: 'm', text: `Dernière commande : ${summary(o)}` })),
          el('span', { class: 'circ', style: 'color:var(--red)', 'aria-label': 'Recommander' }, I('redo')));
      }));
      return;
    }
    fill(body,
      current.length ? [el('div', { class: 't', style: 'margin:14px 0 6px;color:var(--red)' }, 'En cours'), current.map((o) => {
        const r = names[orders.indexOf(o)];
        return el('a', { class: 'fl', href: `#/order/${o.id}`, style: 'gap:10px;background:#FFF4F2;border-radius:14px;padding:10px;margin-bottom:8px' },
          el('div', { style: 'width:52px' }, F(restoKey(r), 52)),
          el('div', { style: 'flex:1' }, el('div', { class: 't', text: displayName(r.name) }), el('div', { class: 'm', text: `${plural(o.items.reduce((n, it) => n + it.quantity, 0), 'article')} · ${fmtF(o.total)} · ${STATUS[o.status].label}` })),
          I('right'));
      })] : null,
      el('div', { class: 't', style: 'margin:16px 0 4px' }, 'Passées'),
      past.length ? past.map((o) => {
        const r = names[orders.indexOf(o)];
        return el('div', { class: 'fl', style: 'gap:10px;padding:10px 0;border-bottom:1px solid var(--line)' },
          el('a', { href: `#/order/${o.id}`, style: 'width:52px' }, F(restoKey(r), 52)),
          el('a', { href: `#/order/${o.id}`, style: 'flex:1' }, el('div', { class: 't', text: displayName(r.name) }), el('div', { class: 'm ell', text: summary(o) }), el('div', { class: 'm', text: `${fmtF(o.total)} · ${when(o)} · ${STATUS[o.status].label}` })),
          el('a', { class: 'circ', href: `#/r/${o.restaurant_id}`, style: 'color:var(--red)', 'aria-label': 'Recommander' }, I('redo')));
      }) : el('p', { class: 'm', text: 'Aucune commande terminée.' }));
  };
  draw();
}

// ---------------------------------------------------------------------
// Recherche
// ---------------------------------------------------------------------

function renderNeighborhoods(alive) {
  chrome('nav', 'search');
  const origin = store.get('we_origin', null);
  const input = el('input', { type: 'search', placeholder: 'Ex. Zogona, Gounghin…', 'aria-label': 'Quartier de Ouagadougou', maxlength: 80, required: true, style: 'flex:1;border:0;background:none;font-size:14px;outline:none' });
  const results = el('div', { class: 'vlist', 'aria-live': 'polite' });
  const status = el('div', { class: 'pad', 'aria-live': 'polite' });
  const more = el('div', { class: 'pad' });
  let sequence = 0;
  let nextPageToken = null;
  let currentName = '';
  const seen = new Set();
  async function load(token = null) {
    const request = ++sequence;
    fill(status, el('p', { class: 'm', text: 'Recherche en cours…' }));
    fill(more);
    try {
      const params = new URLSearchParams({ name: currentName });
      if (origin) { params.set('lat', origin.latitude); params.set('lon', origin.longitude); }
      if (token) params.set('pageToken', token);
      const data = await api(`/places/neighborhood?${params}`);
      if (!alive() || request !== sequence) return;
      for (const p of data.places) {
        if (!seen.has(p.id)) { seen.add(p.id); results.append(placeCard(p)); }
      }
      nextPageToken = data.nextPageToken;
      fill(status, el('p', { class: 'm', text: seen.size ? `${seen.size} résultat(s) pour « ${currentName} »` : 'Aucun restaurant trouvé pour cette recherche.' }));
      if (nextPageToken) fill(more, el('button', { class: 'btn lt', type: 'button', onclick: () => load(nextPageToken) }, 'Afficher plus de résultats'));
    } catch (e) {
      if (!alive() || request !== sequence) return;
      fill(status, alertBox(e.message));
      fill(more, el('button', { class: 'btn lt', type: 'button', onclick: () => load(token) }, 'Réessayer'));
    }
  }
  function search(name) {
    const value = name.trim();
    if (value.length < 2 || value.length > 80) {
      sequence += 1;
      fill(more);
      fill(status, alertBox('Saisissez un nom de quartier de 2 à 80 caractères.'));
      return;
    }
    currentName = value;
    input.value = value;
    nextPageToken = null;
    seen.clear();
    fill(results);
    load();
  }
  setView(topbar('Restaurants par quartier', { back: '#/' }),
    el('div', { class: 'pad' },
      el('p', { class: 'm', text: 'Recherchez un quartier de Ouagadougou. Google peut inclure des adresses voisines et ne garantit pas une liste exhaustive.' }),
      googleOn()
        ? [el('form', { class: 'fl search-form', role: 'search', onsubmit: (e) => { e.preventDefault(); search(input.value); input.blur(); } }, I('search'), input, el('button', { class: 'chip', type: 'submit' }, 'Chercher')),
          el('div', { class: 'chips', style: 'margin-top:12px' }, CITIES.ouaga.zones.map((zone) => el('button', { class: 'chip', type: 'button', onclick: () => search(zone.name) }, zone.name)))]
        : alertBox('La recherche Google est indisponible. Réessayez plus tard.')),
    status, results, more, googleCredit());
}

function highlight(text, q) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (!q || i < 0) return [text];
  return [text.slice(0, i), el('mark', { style: 'background:#FFE3DF;color:inherit;border-radius:3px', text: text.slice(i, i + q.length) }), text.slice(i + q.length)];
}

let searchQuery = '';
async function renderSearch(alive) {
  const origin = store.get('we_origin', null);
  if (!origin) return renderLogin();
  chrome('nav', 'search');
  const input = el('input', { type: 'search', placeholder: 'Plats, restaurants, courses…', 'aria-label': 'Rechercher', value: searchQuery, autocomplete: 'off', enterkeyhint: 'search', style: 'flex:1;border:0;background:none;font-size:14px;outline:none' });
  const clear = el('button', { class: 'circ', type: 'button', style: 'width:30px;height:30px;background:#fff', 'aria-label': 'Effacer', hidden: !searchQuery }, I('x'));
  const body = el('div', { 'aria-live': 'polite' });
  setView(el('div', { class: 'pad search-header' },
    el('h1', { class: 'search-title', text: 'Trouver votre bonheur' }),
    el('p', { class: 'm', text: 'Un plat ou une adresse près de vous.' }),
    el('form', { class: 'fl search-form', role: 'search', onsubmit: (e) => { e.preventDefault(); rememberSearch(input.value); input.blur(); } }, I('search'), input, clear)), body);
  let list = [];
  let menus = [];
  let loaded = false;
  const gSlot = el('div');
  let gTimer = null;
  let gQuery = '';
  const scheduleGoogle = (q) => {
    if (!googleOn()) return;
    if (q && q === gQuery) return;
    clearTimeout(gTimer);
    if (q.length < 3) { gQuery = ''; fill(gSlot); return; }
    gQuery = q;
    fill(gSlot, el('div', { class: 't pad', style: 'margin:16px 0 6px' }, 'Sur Google Maps'), el('div', { class: 'pad' }, el('div', { class: 'skel', style: 'height:50px' })));
    gTimer = setTimeout(async () => {
      try {
        const places = await gSearch(origin, q);
        if (!alive() || gQuery !== q || input.value.trim() !== q) return;
        fill(gSlot, el('div', { class: 't pad', style: 'margin:16px 0 2px' }, `Sur Google Maps · ${places.length}`),
          el('div', { class: 'list' }, places.map((p) => el('a', { href: `#/p/${encodeURIComponent(p.id)}`, onclick: () => rememberSearch(q) },
            el('div', { style: 'width:40px' }, F(placeKey(p), 40, photoImg(p.photo, 120))),
            el('span', { class: 'grow' }, el('div', null, highlight(p.name, q)), el('div', { class: 'm', text: [p.category !== 'restaurant' ? catInfo(p.category).label : (p.type_label || 'Restaurant'), fmtKm(p.distance_km), 'Bientôt sur Winged Eats'].filter(Boolean).join(' · ') })),
            I('right')))),
          places.length ? googleCredit() : el('p', { class: 'm pad', text: 'Aucun établissement trouvé.' }));
      } catch (e) { if (alive() && gQuery === q && input.value.trim() === q) fill(gSlot, el('div', { class: 'pad' }, alertBox(e.message, true))); }
    }, 650);
  };
  onCleanup(() => clearTimeout(gTimer));
  const draw = () => {
    const q = input.value.trim();
    searchQuery = input.value;
    clear.hidden = !input.value;
    if (!q) {
      scheduleGoogle('');
      const recent = store.get('we_recent', []);
      const chips = recent.length ? recent : RECENT_IDEAS;
      fill(body,
        el('div', { class: 'pad' },
          el('div', { class: 'fl sp', style: 'margin:16px 0 8px' }, el('span', { class: 't', text: recent.length ? 'Recherches récentes' : 'Idées de recherche' }),
            recent.length ? el('button', { class: 'chip', type: 'button', style: 'background:none', onclick: () => { store.remove('we_recent'); draw(); } }, 'Effacer') : null),
          el('div', { style: 'display:flex;flex-wrap:wrap;gap:7px' }, chips.map((x) => el('button', { class: 'chip', type: 'button', onclick: () => { input.value = x; draw(); } }, I('clock'), x))),
          el('div', { class: 't', style: 'margin:18px 0 4px' }, 'Meilleures catégories')),
        el('div', { class: 'list' }, BEST_CATS.map(([k, l, cat]) => el('button', { type: 'button', style: 'padding:8px 16px', onclick: () => { homeState.category = cat; homeState.filters.clear(); location.hash = '#/'; } },
          el('div', { style: 'width:40px' }, F(k, 40)), el('span', { class: 'grow', text: l }), I('right')))));
      return;
    }
    const fq = fold(q);
    const restos = list.filter((r) => fold(`${displayName(r.name)} ${r.category} ${r.quartier}`).includes(fq));
    const dishes = [];
    for (const m of menus) for (const c of m.categories) for (const item of c.items) if (fold(`${item.name} ${item.description || ''} ${c.name}`).includes(fq)) dishes.push({ item, menu: m });
    scheduleGoogle(q);
    fill(body,
      !loaded ? el('div', { class: 'pad' }, el('div', { class: 'skel', style: 'height:50px;margin-top:16px' })) : null,
      restos.length ? [el('div', { class: 't pad', style: 'margin:16px 0 2px' }, `Restaurants · ${restos.length}`),
        el('div', { class: 'list' }, restos.map((r) => el('a', { href: r.in_delivery_zone ? `#/r/${r.id}` : null, onclick: () => rememberSearch(q) },
          el('div', { style: 'width:40px' }, F(restoKey(r), 40)),
          el('span', { class: 'grow' }, el('div', null, highlight(displayName(r.name), q)), el('div', { class: 'm', text: `${r.category} · ${fmtKm(r.distance_km)} · ${r.in_delivery_zone ? `Livraison ${fmtF(r.delivery_fee)}` : 'Hors zone'}` })),
          I('right'))))] : null,
      dishes.length ? [el('div', { class: 't pad', style: 'margin:16px 0 2px' }, `Plats · ${dishes.length}`),
        el('div', { class: 'list' }, dishes.map(({ item, menu }) => el('button', { type: 'button', onclick: () => { rememberSearch(q); if (item.available && menu.is_open) openItem(item, menu, updateCartBadge); else location.hash = `#/r/${menu.id}`; } },
          el('div', { style: 'width:40px' }, F(dishKey(item.name, restoKey(menu)), 40)),
          el('span', { class: 'grow' }, el('div', null, highlight(item.name, q)), el('div', { class: 'm', text: `${displayName(menu.name)}${!item.available ? ' · Rupture' : ''}` })),
          el('b', { text: fmtF(item.price) }))))] : null,
      loaded && !restos.length && !dishes.length && !(googleOn() && q.length >= 3) ? emptyState('riz', 'Aucun résultat', `Rien ne correspond à « ${q} ».`) : null,
      googleOn() ? gSlot : null);
  };
  let deb = null;
  onCleanup(() => clearTimeout(deb));
  input.addEventListener('input', () => { clearTimeout(deb); deb = setTimeout(draw, 120); });
  clear.addEventListener('click', () => { input.value = ''; draw(); input.focus(); });
  draw();
  setTimeout(() => { if (alive()) input.focus({ preventScroll: true }); }, 60);
  try {
    list = await getRestaurants(origin);
    if (!alive()) return;
    draw();
    const settled = await Promise.allSettled(list.filter((r) => r.in_delivery_zone).slice(0, 12).map((r) => getMenu(r.id)));
    if (!alive()) return;
    menus = settled.filter((x) => x.status === 'fulfilled').map((x) => x.value);
    loaded = true;
    draw();
  } catch (e) { if (alive()) { loaded = true; fill(body, el('div', { class: 'pad' }, alertBox(e.message))); } }
}

// ---------------------------------------------------------------------
// Carte « À emporter » : Google Maps si la clé navigateur est configurée, sinon plan stylisé
// ---------------------------------------------------------------------

function pinEl(it) {
  return el('button', { class: `mpin${it.kind === 'osm' || it.kind === 'google' ? ' g' : ''}`, type: 'button', 'aria-label': `${it.name}, ${fmtKm(it.km)}` },
    el('span', { class: 'pi' }, I('store')), it.label ? el('span', { class: 'pl', text: it.label }) : null);
}

function mapDistance(a, b) {
  const rad = Math.PI / 180;
  const dlat = (b.lat - a.latitude) * rad;
  const dlon = (b.lon - a.longitude) * rad;
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.lat * rad) * Math.sin(dlon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(Math.min(1, h)));
}

let mapsLoading = null;
let mapsAuthFailed = false;
let mapsErrorCode = null;
let mapsErrorCaptureInstalled = false;
function captureMapsError() {
  if (mapsErrorCaptureInstalled) return;
  mapsErrorCaptureInstalled = true;
  const originalError = console.error;
  const captureError = function (...args) {
    const message = args.filter((arg) => typeof arg === 'string').join(' ');
    if (message.includes('Google Maps JavaScript API error')) {
      const code = message.match(/\b[A-Za-z]+MapError\b/)?.[0];
      if (code) {
        mapsErrorCode = code;
        const diagnostic = document.getElementById('maps-error-code');
        if (diagnostic) diagnostic.textContent = `Code Google Maps : ${code}`;
      }
    }
    originalError.apply(console, args);
  };
  console.error = captureError;
  setTimeout(() => {
    if (console.error === captureError) console.error = originalError;
    mapsErrorCaptureInstalled = false;
  }, 30000);
}
function loadGoogleMaps(key) {
  if (window.google?.maps?.importLibrary) return Promise.resolve();
  if (mapsLoading) return mapsLoading;
  mapsLoading = new Promise((resolve, reject) => {
    captureMapsError();
    const timer = setTimeout(() => reject(new Error('Google Maps ne répond pas.')), 15000);
    window.__weMapsReady = () => { clearTimeout(timer); resolve(); };
    window.gm_authFailure = () => {
      clearTimeout(timer);
      mapsAuthFailed = true;
      reject(new Error('La clé Google Maps a été refusée.'));
      if (location.hash.startsWith('#/map')) route();
    };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&language=fr&region=BF&callback=__weMapsReady`;
    script.async = true;
    script.onerror = () => { clearTimeout(timer); reject(new Error('Chargement de Google Maps impossible.')); };
    document.head.append(script);
  }).catch((error) => { mapsLoading = null; throw error; });
  return mapsLoading;
}

async function renderGoogleMap(origin, alive, target = null) {
  chrome('nav', 'map');
  const host = el('div', { class: 'gmap', 'aria-label': 'Carte Google des restaurants' });
  const sheet = el('div', { class: 'msheet', 'aria-live': 'polite' });
  const search = el('button', { class: 'chip', type: 'button', style: 'background:#fff' }, 'Rechercher dans cette zone');
  const over = el('div', { class: 'over' },
    el('a', { class: 'searchpill', href: '#/search' }, I('search'), el('span', { class: 'm', text: 'Rechercher un restaurant' })),
    el('div', { style: 'margin-top:10px' }, search));
  setView(el('div', { class: 'mapw' }, host, over, sheet));
  fill(sheet, el('div', { class: 'grab' }), el('p', { class: 'm', text: 'Chargement de la carte…' }));
  try {
    await loadGoogleMaps(appConfig.google.maps_key);
    const { Map: GoogleMap } = await google.maps.importLibrary('maps');
    const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');
    if (!alive()) return;
    const map = new GoogleMap(host, { center: { lat: origin.latitude, lng: origin.longitude }, zoom: target ? 16 : 12, mapId: appConfig.google.map_id || 'DEMO_MAP_ID', disableDefaultUI: true, zoomControl: true, clickableIcons: false, gestureHandling: 'greedy' });
    let markers = [];
    let request = 0;
    let firstSearch = true;
    onCleanup(() => { request++; markers.forEach((marker) => { marker.map = null; }); google.maps.event.clearInstanceListeners(map); });
    function show(p, count) {
      fill(sheet, el('div', { class: 'grab' }),
        p ? el('a', { class: 'fl', href: `#/p/${encodeURIComponent(p.id)}`, style: 'gap:10px' },
          el('div', { style: 'width:96px' }, F(placeKey(p), 70, photoImg(p.photo, 240))),
          el('div', { style: 'flex:1' }, el('div', { class: 't', text: p.name }),
            el('div', { class: 'm', text: [p.address, p.rating ? `★ ${fmtRating(p.rating)}` : null, p.open_now === true ? 'Ouvert' : p.open_now === false ? 'Fermé' : null].filter(Boolean).join(' · ') }),
            el('span', { class: 'soonp', text: 'Voir la fiche du restaurant' })), I('right'))
          : el('p', { class: 'm', text: 'Aucun restaurant localisé dans cette zone.' }),
        el('p', { class: 'm', style: 'font-size:11px', text: `${count} établissement(s) affiché(s) · Google renvoie au maximum 20 résultats par recherche. Déplacez la carte pour explorer une autre zone.` }),
        googleCredit());
    }
    function addMarker(p) {
      const button = pinEl({ kind: 'google', name: p.name, km: p.distance_km, label: null });
      button.classList.add('gm');
      button.addEventListener('click', () => {
        map.panTo({ lat: p.latitude, lng: p.longitude });
        map.setZoom(16);
        show(p, markers.length);
      });
      markers.push(new AdvancedMarkerElement({ map, position: { lat: p.latitude, lng: p.longitude }, content: button, title: p.name }));
    }
    if (target) { addMarker(target); show(target, 1); }
    async function findPlaces() {
      const current = ++request;
      search.disabled = true;
      if (!markers.length) fill(sheet, el('div', { class: 'grab' }), el('p', { class: 'm', text: 'Recherche des restaurants…' }));
      try {
        const center = map.getCenter();
        const places = await gNearby({ latitude: center.lat(), longitude: center.lng() });
        if (!alive() || current !== request) return;
        markers.forEach((marker) => { marker.map = null; });
        markers = [];
        const located = places.filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
        const selected = firstSearch ? target : null;
        if (selected && !located.some((p) => p.id === selected.id)) located.unshift(selected);
        firstSearch = false;
        for (const p of located) addMarker(p);
        show(selected || located[0], located.length);
      } catch (error) {
        if (alive() && current === request) {
          if (!markers.length) fill(sheet, el('div', { class: 'grab' }));
          sheet.append(alertBox(error.message), el('button', { class: 'chip', type: 'button', onclick: findPlaces }, 'Réessayer'));
        }
      } finally { if (alive() && current === request) search.disabled = false; }
    }
    search.addEventListener('click', findPlaces);
    await findPlaces();
  } catch (error) {
    if (!alive()) return;
    fill(sheet, el('div', { class: 'grab' }), alertBox(error.message), el('p', { class: 'm', text: 'Vérifiez la clé et les restrictions Google Maps.' }), el('button', { class: 'chip', type: 'button', onclick: route }, 'Réessayer'));
  }
}

async function renderMap(alive, placeId = null) {
  const savedOrigin = store.get('we_origin', null);
  let origin = { latitude: 12.3714, longitude: -1.5197, city: 'ouaga' };
  let target = null;
  if (placeId) {
    chrome('nav', 'map');
    setView(topbar('Carte du restaurant'), el('div', { class: 'pad' }, el('p', { class: 'm', text: 'Chargement du restaurant…' })));
    if (!appConfig.google.maps_key || !googleOn() || mapsAuthFailed) {
      return setView(topbar('Carte du restaurant'), el('div', { class: 'pad' },
        alertBox('La carte Google est indisponible : la position du restaurant ne peut pas être affichée ici.'),
        el('span', { id: 'maps-error-code', class: 'm', text: mapsErrorCode ? `Code Google Maps : ${mapsErrorCode}` : '' }),
        el('a', { class: 'btn lt', href: `#/p/${encodeURIComponent(placeId)}` }, 'Retour à la fiche')));
    }
    try { target = await gDetails(placeId, savedOrigin); } catch (e) {
      if (alive()) setView(topbar('Carte du restaurant'), el('div', { class: 'pad' }, alertBox(e.message), el('button', { class: 'btn lt', type: 'button', onclick: route }, 'Réessayer')));
      return;
    }
    if (!alive()) return;
    if (!Number.isFinite(target.latitude) || !Number.isFinite(target.longitude)) {
      return setView(topbar('Carte du restaurant'), el('div', { class: 'pad' }, alertBox('La position de ce restaurant n’est pas disponible.'), el('a', { class: 'btn lt', href: `#/p/${encodeURIComponent(placeId)}` }, 'Retour à la fiche')));
    }
    origin = { latitude: target.latitude, longitude: target.longitude, city: 'ouaga' };
  }
  if (appConfig.google.maps_key && googleOn() && !mapsAuthFailed) return renderGoogleMap(origin, alive, target);
  chrome('nav', 'map');
  const wrap = el('div', { class: 'mapw' }, planSvg());
  const sheet = el('div', { class: 'msheet' }, el('div', { class: 'grab' }), el('div', { class: 'skel', style: 'height:70px' }));
  const filters = { open: false };
  setView(wrap);
  let list;
  try { list = await getRestaurants(origin); } catch (e) { if (alive()) { fill(sheet, alertBox(e.message)); wrap.append(sheet); } return; }
  if (!alive()) return;
  const all = list.filter((r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude)).map((r) => ({
      id: `r${r.id}`, kind: 'partner', lat: r.latitude, lng: r.longitude, km: r.distance_km, name: displayName(r.name), open: r.is_open, available: r.is_open && r.in_delivery_zone, rating: null,
      label: r.delivery_fee <= 400 ? fmtF(r.delivery_fee) : null, href: `#/r/${r.id}`, k: restoKey(r),
      sub: `${r.prep_minutes}–${r.prep_minutes + 10} min · ${fmtKm(r.distance_km)} · ${r.in_delivery_zone ? `Livraison ${fmtF(r.delivery_fee)}` : 'Hors zone de livraison'}${isDemo(r.name) ? ' · Démo' : ''}`,
    })).sort((a, b) => a.km - b.km);
  const visible = () => all.filter((it) => !filters.open || it.open);
  const pins = new Map();
  const markers = new Map();
  let gmap = null;
  let selected = null;
  const mapNotice = mapsAuthFailed ? 'Clé Google Maps refusée' : !googleOn() ? 'Google Places indisponible' : 'Carte Google non configurée';
  let osmStatus = `${mapNotice} · chargement OpenStreetMap…`;
  let osmLoading = true;
  let osmError = null;
  const mapDiagnostic = () => mapsAuthFailed
    ? el('div', { id: 'maps-error-code', class: 'm', style: 'font-size:11px', text: mapsErrorCode ? `Code Google Maps : ${mapsErrorCode}` : '' })
    : null;
  let addOsmPins = null;
  const paintSheet = () => {
    const it = all.find((x) => x.id === selected) || visible()[0];
    if (it?.kind === 'osm') {
      const picture = F(dishKey(it.cuisine || it.name), 70);
      const attribution = el('div', { class: 'm', style: 'font-size:10px' });
      fill(sheet, el('div', { class: 'grab' }),
        el('div', { class: 'fl', style: 'align-items:flex-start;gap:10px' },
          el('div', { style: 'width:96px' }, picture),
          el('div', { style: 'flex:1' },
            el('div', { class: 't', text: it.name }),
            el('div', { class: 'm', text: [it.cuisine, fmtKm(it.km), it.address].filter(Boolean).join(' · ') }),
            el('div', { class: 'm', text: it.hours ? `Horaires déclarés : ${it.hours}` : 'Horaires non renseignés' }),
            el('div', { class: 'soonp', text: 'Non partenaire · menu et commande indisponibles' }))),
        attribution,
        el('a', { class: 'm', href: `https://www.openstreetmap.org/${it.osmId}`, target: '_blank', rel: 'noopener noreferrer', text: 'Voir sur OpenStreetMap ↗' }),
        mapDiagnostic(),
        el('div', { class: 'm', style: 'font-size:10px' }, `${osmStatus} · `,
          el('a', { href: 'https://www.openstreetmap.org/copyright', target: '_blank', rel: 'noopener noreferrer', text: '© contributeurs OpenStreetMap' })));
      if (it.commons) {
        WEOSM.photo(it.commons).then((photo) => {
          if (!alive() || !picture.isConnected || !photo) return;
          const image = el('img', { class: 'ph', src: photo.imageUrl, alt: '', loading: 'lazy' });
          image.addEventListener('error', () => { image.remove(); attribution.textContent = 'Photo indisponible.'; });
          picture.append(image);
          fill(attribution, 'Photo : ', el('a', { href: photo.fileUrl, target: '_blank', rel: 'noopener noreferrer', text: photo.author }), ' · ',
            el('a', { href: photo.licenseUrl, target: '_blank', rel: 'noopener noreferrer', text: photo.license }));
        }).catch(() => { if (alive() && attribution.isConnected) attribution.textContent = 'Photo indisponible.'; });
      }
      return;
    }
    fill(sheet, el('div', { class: 'grab' }), el('div', { class: 'h', style: 'margin-bottom:8px', text: 'À proximité' }),
      it ? el('a', { class: 'fl', href: it.href, style: 'gap:10px' },
        el('div', { style: 'width:96px' }, F(it.k, 70)),
        el('div', { style: 'flex:1' }, el('div', { class: 't', text: it.name }), el('div', { class: 'm', text: it.sub }), el('span', { class: 'save', text: it.available ? 'Voir le menu et commander' : 'Voir le menu' })),
        I('right')) : el('p', { class: 'm', text: osmLoading ? 'Recherche des restaurants OpenStreetMap…' : osmError ? 'Impossible de charger les restaurants OpenStreetMap.' : 'Aucun restaurant trouvé sur OpenStreetMap dans cette zone.' }),
      osmError ? el('button', { class: 'chip', type: 'button', onclick: route }, 'Réessayer') : null,
      mapDiagnostic(),
      el('div', { class: 'm', style: 'font-size:10px;margin-top:6px' }, `${osmStatus} · `,
        el('a', { href: 'https://www.openstreetmap.org/copyright', target: '_blank', rel: 'noopener noreferrer', text: '© contributeurs OpenStreetMap' })),
    );
  };
  const select = (id) => {
    selected = id;
    pins.forEach((p, k) => p.classList.toggle('on', k === id));
    markers.forEach((m, k) => { m.zIndex = k === id ? 1000 : null; });
    paintSheet();
  };
  function applyFilters() {
    const ok = new Set(visible().map((it) => it.id));
    pins.forEach((p, k) => { p.style.display = ok.has(k) ? '' : 'none'; });
    markers.forEach((m, k) => { m.map = ok.has(k) ? gmap : null; });
    if (!ok.has(selected)) selected = visible()[0]?.id || null;
    select(selected);
  }
  const chipToggle = (label, key) => el('button', { class: filters[key] ? 'chip on' : 'chip', type: 'button', style: filters[key] ? '' : 'background:#fff', onclick: (e) => { filters[key] = !filters[key]; e.currentTarget.classList.toggle('on', filters[key]); e.currentTarget.style.background = filters[key] ? '' : '#fff'; applyFilters(); } }, label);
  const over = el('div', { class: 'over' },
    el('a', { class: 'searchpill', href: '#/search' }, I('search'), el('span', { class: 'm', style: 'font-size:13px', text: 'Rechercher un restaurant' })));
  try {
    const host = el('div', { class: 'gmap' });
    fill(wrap, host, over, sheet);
    paintSheet();
    const { map, lib } = await WEMap.create(host, [origin.longitude, origin.latitude]);
    if (!alive()) { map.remove(); return; }
    onCleanup(() => map.remove());
    addOsmPins = (items) => { for (const it of items) {
      const p = pinEl(it);
      p.classList.add('gm');
      p.addEventListener('click', () => {
        map.flyTo({ center: [it.lng, it.lat], zoom: 16 });
        select(it.id);
      });
      const marker = new lib.Marker({ element: p, anchor: 'bottom' }).setLngLat([it.lng, it.lat]);
      pins.set(it.id, p);
      markers.set(it.id, {
        set map(value) {
          if (value) { marker.addTo(map); p.setAttribute('aria-label', `${it.name}, ${fmtKm(it.km)}`); }
          else marker.remove();
        },
        set zIndex(value) { p.style.zIndex = value || ''; },
      });
    } };
    addOsmPins(all);
    gmap = map;
    applyFilters();
  } catch (e) {
    if (!alive()) return;
    fill(wrap, el('div', { class: 'pad' }, alertBox(`Carte indisponible : ${e.message}`), el('button', { class: 'btn lt', type: 'button', onclick: route }, 'Réessayer')));
    return;
  }
  if (!Array.isArray(appConfig.moderation?.excluded_osm_ids)) {
    osmLoading = false;
    osmError = 'La liste de modération est indisponible.';
    osmStatus = `${mapNotice} · ${osmError}`;
    paintSheet();
    return;
  }
  const excludedOsmIds = new Set(appConfig.moderation.excluded_osm_ids);
  WEOSM.nearby('ouaga').then((places) => {
    if (!alive()) return;
    osmLoading = false;
    const additions = places.filter((p) => !excludedOsmIds.has(p.id) && !all.some((partner) => partner.kind === 'partner'
      && fold(partner.name) === fold(p.name)
      && mapDistance({ latitude: partner.lat, longitude: partner.lng }, p) < 0.1)).map((p) => ({
      ...p, id: `osm:${p.id}`, osmId: p.id, kind: 'osm', lng: p.lon,
      km: mapDistance(origin, p), open: false, available: false, label: null,
    })).sort((a, b) => a.km - b.km).slice(0, 100);
    all.push(...additions);
    all.sort((a, b) => a.km - b.km);
    osmStatus = `${mapNotice} · ${additions.length} commerces OpenStreetMap à 8 km du centre-ville · horaires non vérifiés`;
    addOsmPins(additions);
    applyFilters();
  }).catch((error) => {
    if (!alive()) return;
    osmLoading = false;
    osmError = error.message;
    osmStatus = `${mapNotice} · ${error.message}`;
    paintSheet();
  });
}

// ---------------------------------------------------------------------
// Fiche d'un établissement réel (Google)
// ---------------------------------------------------------------------

async function renderPlace(id, alive) {
  chrome('nonav');
  setView(el('div', { class: 'skel', style: 'height:190px;border-radius:0' }), el('div', { class: 'pad' }, el('div', { class: 'skel', style: 'height:26px;width:60%;margin-top:30px' })));
  const origin = store.get('we_origin', null);
  let p;
  try { p = await gDetails(id, origin); } catch (e) {
    if (!alive()) return;
    return setView(topbar('Établissement'), el('div', { class: 'pad' }, alertBox(e.message), el('button', { class: 'btn', type: 'button', onclick: () => { cache.delete(`gd:${id}`); route(); } }, 'Réessayer')));
  }
  if (!alive()) return;
  const k = placeKey(p);
  const label = p.category !== 'restaurant' ? catInfo(p.category).label : (p.type_label || 'Restaurant');
  const tel = p.phone ? String(p.phone).replace(/[^\d+]/g, '') : null;
  setView(
    el('div', { class: 'hero' },
      p.photos.length ? el('div', { class: 'gal' }, p.photos.map((ph, i) => F(k, 220, photoImg(ph, 900), p.photos.length > 1 ? el('span', { class: 'tag d', text: `${i + 1}/${p.photos.length}` }) : null))) : F(k, 220),
      el('div', { class: 'acts' }, el('button', { class: 'circ w', type: 'button', 'aria-label': 'Retour', onclick: () => goBack('#/') }, I('back')),
        favBtn(p.id, 'circ w'))),
    el('div', { class: 'pad', style: 'margin-top:-28px;position:relative' },
      el('div', { class: 'logo-sq', 'aria-hidden': 'true', text: initials(p.name) }),
      el('h1', { class: 'rname', style: 'margin-bottom:0', text: p.name }),
      el('div', { class: 'm fl', style: 'gap:4px;flex-wrap:wrap' }, p.rating ? [S(), el('b', { style: 'color:#22150F', text: fmtRating(p.rating) }), ` (${num(p.rating_count)}) · `] : null, `${label}${p.address ? ` · ${p.address}` : ''}`),
      el('div', { class: 'kp2' },
        el('div', null, el('b', { text: p.distance_km !== null ? fmtKm(p.distance_km) : '—' }), el('span', { class: 'm', text: 'Distance' })),
        el('div', null, el('b', { style: `color:${p.open_now === false ? 'var(--red2)' : 'var(--green)'}`, text: p.open_now === true ? 'Ouvert' : p.open_now === false ? 'Fermé' : '—' }), el('span', { class: 'm', text: 'En ce moment' }))),
      el('div', { class: 'alert i' }, I('moto'), el('span', null, el('b', { text: 'Bientôt sur Winged Eats. ' }), 'Cet établissement n’est pas encore partenaire : la commande en ligne n’est pas possible. Vous pouvez l’appeler ou vous y rendre.')),
      el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:8px' },
        tel ? el('a', { class: 'btn', href: `tel:${tel}` }, I('phone'), 'Appeler') : null,
        p.maps_uri ? el('a', { class: tel ? 'btn lt' : 'btn', href: p.maps_uri, target: '_blank', rel: 'noopener' }, I('loc'), 'Itinéraire') : null),
      Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
        ? el('a', { class: 'btn lt', href: `#/map/${encodeURIComponent(p.id)}`, style: 'margin-top:8px' }, I('pin'), 'Voir sur la carte') : null,
      p.summary ? el('p', { class: 'm', style: 'font-size:13px;margin-top:14px', text: p.summary }) : null,
      el('div', { class: 't', style: 'margin:16px 0 4px', text: 'Menu' }),
      el('p', { class: 'm', style: 'font-size:13px;margin:4px 0 10px', text: tel
        ? 'Le menu et les prix ne sont pas fournis ici. Consultez le site ou contactez le restaurant pour les demander.'
        : 'Le menu et les prix ne sont pas fournis ici. Consultez le site ou la fiche Google Maps pour plus d’informations.' }),
      p.website ? el('a', { class: 'btn lt', href: p.website, target: '_blank', rel: 'noopener noreferrer' }, 'Site du restaurant · menu si disponible')
        : p.maps_uri ? el('a', { class: 'btn lt', href: p.maps_uri, target: '_blank', rel: 'noopener noreferrer' }, 'Voir la fiche Google Maps') : null,
      p.hours.length ? [el('div', { class: 't', style: 'margin:16px 0 4px' }, 'Horaires'), el('ul', { class: 'hours' }, p.hours.map((h) => { const [d, ...r] = h.split(': '); return el('li', null, el('span', { text: d.charAt(0).toUpperCase() + d.slice(1) }), el('b', { text: r.join(': ') })); }))] : null,
      p.address_full ? [el('div', { class: 't', style: 'margin:16px 0 4px' }, 'Adresse'), el('div', { class: 'm', style: 'font-size:13px', text: p.address_full })] : null),
    el('p', { class: 'gattr', style: 'padding-bottom:30px', text: 'Données et photos : Google Maps (mises à jour automatiquement).' }));
}

// ---------------------------------------------------------------------
// Compte et espaces en démonstration
// ---------------------------------------------------------------------

async function renderFavorites(alive) {
  const origin = store.get('we_origin', null);
  if (!origin) return renderLogin('Choisissez une adresse pour afficher vos favoris.');
  chrome('nav', 'favorites');
  const ids = favs().filter((id) => typeof id === 'string');
  const head = topbar('Mes favoris', { back: '#/account' });
  if (!ids.length) return setView(head, emptyState('pou', 'Aucun favori', 'Enregistrez vos restaurants préférés sur cet appareil.', el('a', { class: 'btn', href: '#/', style: 'width:auto;display:inline-flex' }, 'Découvrir les restaurants')));
  const body = el('div', { class: 'vlist', 'aria-live': 'polite' });
  setView(head, el('p', { class: 'm pad', text: 'Favoris enregistrés sur cet appareil. Les fiches Google sont actualisées à l’ouverture.' }), body);
  let partners = [];
  let partnerError = null;
  if (ids.some((id) => typeof id === 'number')) {
    try { partners = await getRestaurants(origin); } catch (e) { partnerError = e; }
  }
  if (!alive()) return;
  for (const id of ids) {
    if (!alive()) return;
    const slot = el('div');
    body.append(slot);
    if (typeof id === 'number') {
      if (partnerError) {
        fill(slot, alertBox(`Impossible de charger un restaurant favori : ${partnerError.message}`), el('button', { class: 'btn lt', type: 'button', onclick: route }, 'Réessayer'));
        continue;
      }
      const partner = partners.find((r) => r.id === id);
      if (partner) { fill(slot, partnerCard(partner, route)); continue; }
    } else if (typeof id === 'string') {
      try {
        const place = await gDetails(id, origin);
        if (!alive()) return;
        fill(slot, placeCard(place, route));
        continue;
      } catch (e) {
        if (!alive()) return;
        fill(slot, alertBox(`Impossible de charger un favori Google : ${e.message}`), favBtn(id, 'chip', route));
        continue;
      }
    }
    fill(slot, alertBox('Ce restaurant favori est indisponible.'), favBtn(id, 'chip', route));
  }
  if (ids.some((id) => typeof id === 'string')) body.append(googleCredit());
}

const RP = [
  { n: 'Essentiel', d: 'Maquis', p: [7500, 20000, 72000], c: '8 %', f: ['Menu, commandes et paiement mobile', 'Versement chaque semaine'] },
  { n: 'Pro', d: 'Restaurants établis', p: [20000, 54000, 192000], c: '5 %', f: ['Mise en avant « Populaires »', 'Offres 1+1 et codes promo', 'Statistiques détaillées'], best: 1 },
  { n: 'Premium', d: 'Chaînes', p: [40000, 108000, 384000], c: '3 %', f: ['Plusieurs points de vente', 'Bannière en accueil, conseiller dédié'] },
];
const LP = [
  { n: 'Standard', d: 'Pour démarrer', p: [3000, 8000, 29000], c: '90 %', f: ['Courses à Ouaga ou Bobo', 'Gains versés chaque jour', 'Assurance accident de base'] },
  { n: 'Pro', d: 'Plein temps', p: [6000, 16000, 58000], c: '100 %', f: ['Priorité aux heures de pointe', 'Gilet et sac isotherme offerts', 'Support prioritaire'], best: 1 },
];
const PER = ['mois', 'trimestre', 'an'];
function plansEl(P, who, i) {
  return P.map((x) => {
    const tot = x.p[i];
    const full = x.p[0] * [1, 3, 12][i];
    const sv = Math.round((1 - tot / full) * 100);
    return el('div', { class: x.best ? 'plan best' : 'plan' }, x.best ? el('span', { class: 'ribbon', text: 'Le plus choisi' }) : null,
      el('div', { class: 'fl sp', style: 'align-items:flex-start' },
        el('div', null, el('div', { class: 't', text: x.n }), el('div', { class: 'm', text: who === 'r' ? `Commission ${x.c}` : `Vous gardez ${x.c}` })),
        el('div', { style: 'text-align:right' }, el('div', { class: 'pr' }, `${fmtF(tot)} `, el('small', { text: `/ ${PER[i]}` })),
          el('div', { class: sv > 0 ? 'save' : 'm', text: sv > 0 ? `-${sv} % · ${fmtF(Math.round(tot / [1, 3, 12][i]))} / mois` : x.d }))),
      el('ul', null, x.f.map((t) => el('li', null, I('check'), t))));
  });
}
function renderSubscription(who) {
  chrome('nonav');
  const box = el('div');
  const btns = PER.map((p, j) => el('button', { type: 'button', class: j === 0 ? 'on' : '', onclick: (e) => { btns.forEach((b) => b.classList.toggle('on', b === e.currentTarget)); fill(box, plansEl(who === 'r' ? RP : LP, who, j)); } }, p === 'an' ? 'Année' : p[0].toUpperCase() + p.slice(1)));
  fill(box, plansEl(who === 'r' ? RP : LP, who, 0));
  const soon = () => toast('Paiement mobile bientôt disponible', 'info');
  setView(topbar(who === 'r' ? 'Abonnement restaurant' : 'Abonnement livreur', { back: '#/account' }),
    demoNote('tarifs proposés, à valider avec les restaurants et les livreurs. Souscription bientôt ouverte.'),
    el('div', { class: 'pad' },
      el('div', { style: 'font:800 20px Inter,sans-serif;letter-spacing:-.02em;margin:10px 0 2px', text: who === 'r' ? 'Vendez plus, payez moins de commission' : 'Gardez vos frais de livraison' }),
      el('div', { class: 'm', style: 'font-size:13px;margin-bottom:10px', text: who === 'r' ? 'Sans abonnement, la commission est de 15 %. Premier mois offert au lancement.' : "L'abonnement se rembourse en 2 à 3 jours de courses. Pass semaine : 1 000 F." }),
      el('div', { class: 'seg' }, btns), box,
      who === 'l' ? el('div', { class: 'fl', style: 'gap:8px;margin-top:12px;font-size:12px;background:var(--soft);border-radius:12px;padding:10px' }, I('pin'), el('span', null, 'Bobo-Dioulasso : ', el('b', { text: '-20 %' }), ' sur tous les abonnements la première année.')) : null,
      who === 'r' ? el('a', { class: 'btn lt', href: '../partner/', style: 'margin-top:14px' }, I('store'), 'Ouvrir l’espace restaurateur') : null),
    el('div', { style: 'position:fixed;left:50%;transform:translateX(-50%);width:min(480px,100%);bottom:0;padding:12px 16px calc(14px + env(safe-area-inset-bottom));display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#fff;z-index:30' },
      el('button', { class: 'btn', type: 'button', style: 'background:#FF7900', onclick: soon }, 'Orange Money'),
      el('button', { class: 'btn', type: 'button', style: 'background:#0054A6', onclick: soon }, 'Moov Money')));
}

function renderRider() {
  chrome('nonav');
  const profile = store.get('we_profile', {});
  const onl = el('span', { class: 't', style: 'color:#7D6A61', text: 'Hors ligne' });
  const tg = el('button', { class: 'tg', type: 'button', 'aria-label': 'En ligne' });
  tg.onclick = () => { tg.classList.toggle('on'); const on = tg.classList.contains('on'); onl.textContent = on ? 'En ligne' : 'Hors ligne'; onl.style.color = on ? '#1E8A4C' : '#7D6A61'; if (on) toast('Aperçu : la réception de courses arrive bientôt', 'info'); };
  setView(el('div', { class: 'trackw', style: 'height:calc(100dvh - 300px);min-height:330px' },
    planSvg('<path d="M50 250L150 270L160 400" stroke="#22150F" stroke-width="4" fill="none" stroke-dasharray="6 6"/><circle cx="50" cy="250" r="8" fill="#22150F"/><circle cx="160" cy="400" r="8" fill="#E0362A"/>'),
    el('div', { class: 'pad', style: 'position:relative;z-index:2;padding-top:calc(12px + env(safe-area-inset-top))' },
      el('div', { class: 'fl sp', style: 'background:#fff;border-radius:16px;padding:10px 12px;box-shadow:0 2px 12px #2a171222' },
        el('div', { class: 'fl' }, el('button', { class: 'circ', type: 'button', 'aria-label': 'Retour', onclick: () => goBack('#/account') }, I('back')),
          el('div', null, el('div', { class: 't', text: profile.name || 'Futur livreur' }), el('div', { class: 'm', text: 'Livreur Winged · aperçu' }))),
        el('div', { class: 'fl' }, onl, tg)),
      el('div', { class: 'kp', style: 'margin-top:8px' }, [['Gains', '0 F'], ['Courses', '0'], ['En ligne', '0 h']].map(([a, b]) => el('div', { style: 'background:#fff' }, el('span', { class: 'm', text: a }), el('b', { text: b })))))),
  el('div', { class: 'tsheet' },
    el('div', { class: 'grab' }),
    el('div', { class: 'demo', style: 'margin:0 0 10px' }, I('info'), el('span', null, el('b', { text: 'Démonstration · ' }), 'l’application livreur arrive bientôt. Voici comment une course vous sera proposée.')),
    el('div', { class: 'fl sp' }, el('span', { class: 'h', text: 'Exemple de course' }), el('span', { class: 'chip', style: 'background:#FFE3DF;color:#B8231A;cursor:default' }, I('clock'), '0:30')),
    el('div', { style: 'font:800 30px Inter,sans-serif;letter-spacing:-.02em;margin:6px 0 2px', text: fmtF(700) }),
    el('div', { class: 'm', text: 'Frais de livraison + pourboire · avec l’abonnement Pro vous gardez 100 %' }),
    el('div', { class: 'fl m', style: 'gap:12px;margin:12px 0' }, I('moto'), 'Récupération au restaurant, puis livraison au repère du client'),
    el('a', { class: 'btn', href: '#/abonnement/l' }, 'Voir les abonnements livreur')));
}

function renderAccount() {
  chrome('nav', 'account');
  const profile = store.get('we_profile', {});
  const origin = store.get('we_origin', null);
  const ini = (profile.name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const row = (ic, title, sub, onclick, right) => el('button', { type: 'button', onclick }, I(ic), el('span', { class: 'grow' }, title, sub ? [el('br'), el('span', { class: 'm', text: sub })] : null), right || I('right'));
  setView(
    el('div', { class: 'pad fl sp', style: 'padding-top:calc(20px + env(safe-area-inset-top))' },
      el('div', null, el('div', { style: 'font:800 24px Inter,sans-serif;letter-spacing:-.02em', text: profile.name || 'Bienvenue' }),
        el('div', { class: 'm', text: profile.phone || 'Restaurants et favoris' })),
      el('div', { class: 'av', style: 'width:56px;height:56px;font-size:18px' }, ini || I('user'))),
    el('div', { class: 'list', style: 'margin-top:6px' },
      row('pin', 'Ville', origin ? `${cityOf(origin).name} · ${origin.label}` : 'Non choisie', () => zoneSheet((origin && origin.city) || 'ouaga'), el('span', { class: 'chip', style: 'font-size:11px', text: 'Changer' })),
      row('globe', 'Langue', 'Français · Mooré et Dioula bientôt', () => infoSheet('Langue', [['Français', 'Langue actuelle de l’application.'], ['Mooré', 'Traduction en préparation.'], ['Dioula', 'Traduction en préparation.']])),
      row('heart', 'Mes favoris', 'Restaurants enregistrés sur cet appareil', () => { location.hash = '#/favorites'; }),
      row('help', 'Aide', null, () => infoSheet('Aide', HELP)),
      row('gear', 'Paramètres', 'Confidentialité, données, à propos', () => infoSheet('Paramètres', PRIVACY, el('button', {
        class: 'btn lt', type: 'button', style: 'margin-top:14px;color:var(--red2)',
        onclick: async () => {
          if (!(await confirmSheet({ title: 'Effacer les données ?', text: 'Adresse, panier, favoris et liste de commandes seront supprimés de cet appareil.', ok: 'Tout effacer' }))) return;
          ['we_origin', 'we_cart', 'we_orders', 'we_order_meta', 'we_profile', 'we_favs', 'we_recent'].forEach((k) => store.remove(k));
          cache.clear(); closeAllSheets(); location.hash = '#/'; route();
        },
      }, 'Effacer les données de cet appareil')))),
    el('div', { class: 'fl', style: 'justify-content:center;gap:8px;margin:24px 0 8px' }, logo(28), el('b', { class: 'unb', text: 'Winged Eats' })),
    el('p', { class: 'm', style: 'text-align:center', text: 'Ouagadougou · Bobo-Dioulasso · version MVP' }));
}
const HELP = [
  ['Puis-je commander ?', 'Les commandes ne sont pas encore disponibles. Vous pouvez contacter les restaurants via leurs fiches.'],
  ['Comment retrouver un restaurant ?', 'Utilisez la recherche, la carte ou vos favoris.'],
];
const PRIVACY = [
  ['Sur cet appareil', 'Adresse, panier, favoris, recherches et liste de vos commandes.'],
  ['Restaurants de la ville', 'Les favoris Google conservent uniquement leur identifiant sur cet appareil ; noms, notes, horaires et photos sont chargés en direct.'],
];

// ---------------------------------------------------------------------
// Routage
// ---------------------------------------------------------------------

let routeSeq = 0;
let navCount = -1;
let cleanups = [];
function onCleanup(fn) { cleanups.push(fn); }

function chrome(mode, section) {
  document.body.classList.toggle('nonav', mode === 'nonav');
  document.body.classList.toggle('bare', mode === 'bare');
  document.getElementById('nb').classList.toggle('search-compact', section === 'map' || section === 'search');
  document.querySelectorAll('#nb a').forEach((a) => {
    const on = a.dataset.s === section;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
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
  const [a, b] = (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean);
  if (['r', 'cart', 'order', 'orders', 'livreur', 'abonnement'].includes(a)) {
    chrome('nav', null);
    return setView(topbar('Bientôt disponible'), el('div', { class: 'pad' }, alertBox('Les commandes et espaces partenaires ne sont pas encore disponibles.', true)));
  }
  if (a === 'r' && b) return renderRestaurant(Number(b), alive);
  if (a === 'p' && b) return renderPlace(decodeURIComponent(b), alive);
  if (a === 'cart') return renderCart(alive);
  if (a === 'order' && b) return renderOrder(Number(b), alive);
  if (a === 'orders') return renderOrders(alive);
  if (a === 'favorites') return renderFavorites(alive);
  if (a === 'search') return renderSearch(alive);
  if (a === 'quartiers') return renderNeighborhoods(alive);
  if (a === 'map') return renderMap(alive, b ? decodeURIComponent(b) : null);
  if (a === 'offres') return renderOffres(alive);
  if (a === 'account') return renderAccount();
  if (a === 'livreur') return renderRider();
  if (a === 'abonnement') return renderSubscription(b === 'l' ? 'l' : 'r');
  if (a === 'login') return renderLogin();
  return renderHome(alive);
}

document.querySelectorAll('#nb a').forEach((a) => a.prepend(I(a.dataset.i)));
window.addEventListener('hashchange', () => { navCount += 1; route(); });
navCount = 0;
(async function boot() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    appConfig = await api('/config', { signal: controller.signal });
    if (!appConfig.google.places) googleError = 'Google Places n’est pas configuré sur le serveur.';
  } catch (e) { googleError = e.message; } finally { clearTimeout(timer); }
  route();
  // Application installable (PWA) : l'interface reste disponible hors connexion.
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { /* navigation privée, http… */ });
}());
