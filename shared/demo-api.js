'use strict';

// =====================================================================
// Winged Eats · mode démonstration (version publiée sur GitHub Pages)
//
// GitHub Pages ne sert que des fichiers statiques : il n'y a pas de serveur Node.
// Ce module reproduit l'API du serveur dans le navigateur, avec les mêmes règles
// (prix recalculés, options obligatoires, rayon de 6 km, statuts, commission).
// Les données de démonstration sont celles de server/seed.js ; commandes et stocks
// sont gardés dans le navigateur (localStorage). En local, `npm start` utilise le vrai serveur.
// =====================================================================

(function attach(global) {
  const DELIVERY = { baseFee: 300, perKm: 250, roundTo: 50, maxRadiusKm: 6 };
  const COMMISSION = 0.15;
  const TRANSITIONS = { PENDING: ['ACCEPTED', 'REFUSED', 'CANCELLED'], ACCEPTED: ['PREPARING', 'CANCELLED'], PREPARING: ['READY'], READY: ['DELIVERED'] };
  const ACTIVE = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'];
  // Restaurant simulé : la commande avance seule tant qu'aucun restaurateur n'y touche.
  const SIM_STEPS = [['ACCEPTED', 25], ['PREPARING', 60], ['READY', 120], ['DELIVERED', 180]];
  const KEY = 'we_demo_db';

  // Mêmes restaurants et menus que server/seed.js (identifiants attribués dans le même ordre).
  const SEED = [
    { name: 'Chez Maman Rose (démo)', category: 'Grillades', quartier: 'Ouaga 2000', address_hint: 'Près du rond-point, face à la station', latitude: 12.3650, longitude: -1.5100, opening_hours: '10h - 23h', prep_minutes: 20, code: 'ROSE2026',
      menu: [
        { category: 'Grillades', items: [
          { name: 'Demi-poulet braisé', description: 'Poulet braisé au charbon, sauce piment', price: 3500, groups: [
            { name: 'Accompagnement', required: true, max_choices: 1, options: [['Attiéké', 0], ['Frites', 0], ['Alloco', 500]] },
            { name: 'Suppléments', required: false, max_choices: 2, options: [['Œuf', 300], ['Sauce arachide', 200]] }] },
          { name: 'Poulet entier', description: 'Pour 3 personnes', price: 7000, groups: [
            { name: 'Accompagnement', required: true, max_choices: 1, options: [['Attiéké', 0], ['Frites', 0]] }] },
          { name: 'Brochettes de bœuf (x5)', description: 'Pimentées sur demande', price: 2000, groups: [
            { name: 'Piment', required: true, max_choices: 1, options: [['Sans piment', 0], ['Pimenté', 0]] }] }] },
        { category: 'Boissons', items: [
          { name: 'Jus de bissap 50 cl', description: null, price: 500, groups: [] },
          { name: 'Bière locale 65 cl', description: null, price: 1000, groups: [] }] }] },
    { name: 'Le Baobab (démo)', category: 'Cuisine africaine', quartier: 'Zone du Bois', address_hint: 'Derrière la pharmacie, portail vert', latitude: 12.3580, longitude: -1.5040, opening_hours: '11h - 22h30', prep_minutes: 25, code: 'BAOB2026',
      menu: [
        { category: 'Plats du jour', items: [
          { name: 'Riz gras', description: 'Riz à la sauce tomate et légumes', price: 2500, groups: [
            { name: 'Viande', required: true, max_choices: 1, options: [['Poulet', 0], ['Bœuf', 300], ['Mouton', 800]] }] },
          { name: 'Tô et sauce gombo', description: null, price: 2000, groups: [] },
          { name: 'Poisson braisé', description: 'Capitaine braisé, attiéké', price: 4500, groups: [] }] }] },
    { name: 'Maquis Le Manguier (démo)', category: 'Maquis', quartier: "Patte d'Oie", address_hint: "Carrefour de la Patte d'Oie, côté marché", latitude: 12.3450, longitude: -1.5500, opening_hours: '08h - 00h', prep_minutes: 15, code: 'MANG2026',
      menu: [
        { category: 'Maquis', items: [
          { name: 'Alloco-poulet', description: 'Bananes plantain frites et poulet grillé', price: 3000, groups: [] },
          { name: 'Brochettes de poulet (x3)', description: null, price: 1500, groups: [] }] }] },
  ];

  // Construction du catalogue avec des identifiants séquentiels, comme la base SQLite.
  const ids = { cat: 0, item: 0, group: 0, opt: 0 };
  const RESTAURANTS = SEED.map((r, i) => ({
    id: i + 1, name: r.name, category: r.category, quartier: r.quartier, address_hint: r.address_hint,
    latitude: r.latitude, longitude: r.longitude, opening_hours: r.opening_hours, prep_minutes: r.prep_minutes, code: r.code,
    categories: r.menu.map((c) => ({
      id: ++ids.cat, name: c.category,
      items: c.items.map((it) => ({
        id: ++ids.item, name: it.name, description: it.description, price: it.price,
        option_groups: it.groups.map((g) => ({
          id: ++ids.group, name: g.name, required: g.required, max_choices: g.max_choices,
          options: g.options.map(([name, delta]) => ({ id: ++ids.opt, name, price_delta: delta })),
        })),
      })),
    })),
  }));

  class DemoError extends Error {
    constructor(status, message) { super(message); this.status = status; }
  }

  const load = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
  };
  function db() {
    const d = load() || { orders: [], nextId: 1, unavailable: [], closed: [] };
    d.orders = d.orders || []; d.unavailable = d.unavailable || []; d.closed = d.closed || [];
    return d;
  }
  const save = (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* stockage plein ou bloqué */ } };

  function distanceKm(lat1, lon1, lat2, lon2) {
    const r = (x) => (x * Math.PI) / 180;
    const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(a));
  }
  const deliveryFee = (km) => Math.ceil((DELIVERY.baseFee + DELIVERY.perKm * km) / DELIVERY.roundTo) * DELIVERY.roundTo;
  function normalizePhone(raw) {
    if (typeof raw !== 'string') return null;
    let digits = raw.replace(/[\s.-]/g, '');
    if (digits.startsWith('+226')) digits = digits.slice(4);
    else if (digits.startsWith('00226')) digits = digits.slice(5);
    return /^\d{8}$/.test(digits) ? `+226${digits}` : null;
  }
  const requireText = (v, field, max) => {
    if (typeof v !== 'string' || !v.trim() || v.trim().length > max) throw new DemoError(400, `Champ invalide : ${field}`);
    return v.trim();
  };
  const sqlNow = (t = Date.now()) => new Date(t).toISOString().slice(0, 19).replace('T', ' ');

  // Avance la commande selon le temps écoulé (restaurant simulé).
  function simulate(o) {
    if (!o.sim || !ACTIVE.includes(o.status)) return o;
    const elapsed = (Date.now() - o.created_ms) / 1000;
    let status = 'PENDING';
    for (const [s, t] of SIM_STEPS) if (elapsed >= t) status = s;
    if (status !== o.status) { o.status = status; o.updated_at = sqlNow(); }
    return o;
  }

  const isOpen = (d, r) => !d.closed.includes(r.id);
  const isAvailable = (d, item) => !d.unavailable.includes(item.id);

  function menuOf(d, r) {
    return {
      id: r.id, name: r.name, category: r.category, quartier: r.quartier, address_hint: r.address_hint,
      opening_hours: r.opening_hours, prep_minutes: r.prep_minutes, is_open: isOpen(d, r),
      categories: r.categories.map((c) => ({ id: c.id, name: c.name, items: c.items.map((it) => ({ ...it, available: isAvailable(d, it) })) })),
    };
  }

  function formatOrder(o, internal) {
    const out = {
      id: o.id, restaurant_id: o.restaurant_id, status: o.status, customer_name: o.customer_name, repere: o.repere, note: o.note,
      distance_km: o.distance_km, subtotal: o.subtotal, delivery_fee: o.delivery_fee, total: o.total, payment_method: 'CASH',
      pickup_code: o.pickup_code, created_at: o.created_at, updated_at: o.updated_at, items: o.items,
    };
    if (internal) {
      out.commission = o.commission;
      out.net_to_restaurant = o.subtotal - o.commission;
      out.customer_phone = o.customer_phone;
    }
    return out;
  }

  function createOrder(body) {
    const d = db();
    const rid = Number(body.restaurant_id);
    const r = RESTAURANTS.find((x) => x.id === rid);
    const name = requireText(body.customer_name, 'customer_name', 80);
    const phone = normalizePhone(body.customer_phone);
    if (!phone) throw new DemoError(400, 'Numéro de téléphone invalide (8 chiffres, +226)');
    const repere = requireText(body.repere, 'repere', 200);
    const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 300) : null;
    const lat = Number(body.latitude);
    const lon = Number(body.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new DemoError(400, 'Coordonnées GPS invalides');
    if (!Array.isArray(body.items) || !body.items.length || body.items.length > 30) throw new DemoError(400, 'Le panier doit contenir entre 1 et 30 lignes');
    if (!r) throw new DemoError(404, 'Restaurant introuvable');
    if (!isOpen(d, r)) throw new DemoError(409, 'Restaurant fermé pour le moment');
    const km = distanceKm(lat, lon, r.latitude, r.longitude);
    if (km > DELIVERY.maxRadiusKm) throw new DemoError(422, `Hors zone de livraison (maximum ${DELIVERY.maxRadiusKm} km)`);
    const allItems = r.categories.flatMap((c) => c.items);
    const lines = body.items.map((line) => {
      const qty = Number(line.quantity);
      if (!Number.isInteger(qty) || qty < 1 || qty > 20) throw new DemoError(400, 'Quantité invalide (1 à 20)');
      const item = allItems.find((it) => it.id === Number(line.item_id));
      if (!item) throw new DemoError(400, `Article ${line.item_id} absent de ce restaurant`);
      if (!isAvailable(d, item)) throw new DemoError(409, `${item.name} est en rupture`);
      const opts = item.option_groups.flatMap((g) => g.options.map((o) => ({ ...o, group_id: g.id })));
      const chosen = [...new Set((line.option_ids || []).map(Number))].map((id) => {
        const o = opts.find((x) => x.id === id);
        if (!o) throw new DemoError(400, `Option ${id} invalide pour ${item.name}`);
        return o;
      });
      for (const g of item.option_groups) {
        const n = chosen.filter((o) => o.group_id === g.id).length;
        if (g.required && n === 0) throw new DemoError(400, `Choix obligatoire : ${g.name} (${item.name})`);
        if (n > g.max_choices) throw new DemoError(400, `Trop de choix pour ${g.name} (${item.name})`);
      }
      const unit = item.price + chosen.reduce((s, o) => s + o.price_delta, 0);
      return { item_name: item.name, unit_price: unit, quantity: qty, options_label: chosen.map((o) => o.name).join(' + '), line_total: unit * qty };
    });
    const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
    const fee = deliveryFee(km);
    const now = Date.now();
    const o = {
      id: d.nextId++, restaurant_id: r.id, status: 'PENDING', sim: true, customer_name: name, customer_phone: phone, repere, note,
      distance_km: Math.round(km * 100) / 100, subtotal, delivery_fee: fee, total: subtotal + fee, commission: Math.round(subtotal * COMMISSION),
      pickup_code: String(Math.floor(Math.random() * 10000)).padStart(4, '0'), created_ms: now, created_at: sqlNow(now), updated_at: sqlNow(now), items: lines,
    };
    d.orders.push(o);
    save(d);
    return formatOrder(o, false);
  }

  function findCustomerOrder(d, id, rawPhone) {
    const o = d.orders.find((x) => x.id === id);
    const phone = normalizePhone(rawPhone);
    if (!o || !phone || o.customer_phone !== phone) throw new DemoError(404, 'Commande introuvable');
    return simulate(o);
  }

  function parse(path) {
    const [p, q] = path.split('?');
    return { parts: p.split('/').filter(Boolean), query: new URLSearchParams(q || '') };
  }

  // API publique (/api/...) : mêmes chemins et mêmes réponses que le serveur.
  async function request(path, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body || {};
    const { parts, query } = parse(path);
    const d = db();
    if (parts[0] === 'config') {
      return { google: { places: false, maps_key: null, map_id: 'DEMO_MAP_ID' }, categories: [], demo: true };
    }
    if (parts[0] === 'places') throw new DemoError(503, 'Restaurants Google indisponibles dans la version de démonstration');
    if (parts[0] === 'restaurants' && !parts[1]) {
      const lat = Number(query.get('lat'));
      const lon = Number(query.get('lon'));
      const hasOrigin = query.has('lat') && Number.isFinite(lat) && Number.isFinite(lon);
      const list = RESTAURANTS.map((r) => {
        const out = {
          id: r.id, name: r.name, category: r.category, quartier: r.quartier, address_hint: r.address_hint,
          latitude: r.latitude, longitude: r.longitude, opening_hours: r.opening_hours, prep_minutes: r.prep_minutes, is_open: isOpen(d, r),
        };
        if (hasOrigin) {
          const km = distanceKm(lat, lon, r.latitude, r.longitude);
          out.distance_km = Math.round(km * 10) / 10;
          out.in_delivery_zone = km <= DELIVERY.maxRadiusKm;
          out.delivery_fee = deliveryFee(km);
        }
        return out;
      });
      return hasOrigin ? list.sort((a, b) => a.distance_km - b.distance_km) : list.sort((a, b) => a.name.localeCompare(b.name));
    }
    if (parts[0] === 'restaurants' && parts[1]) {
      const r = RESTAURANTS.find((x) => x.id === Number(parts[1]));
      if (!r) throw new DemoError(404, 'Restaurant introuvable');
      return menuOf(d, r);
    }
    if (parts[0] === 'orders' && !parts[1] && method === 'POST') return createOrder(body);
    if (parts[0] === 'orders' && parts[1] && parts[2] === 'cancel' && method === 'POST') {
      const o = findCustomerOrder(d, Number(parts[1]), body.phone);
      if (o.status !== 'PENDING') { save(d); throw new DemoError(409, 'Commande déjà acceptée : annulation impossible'); }
      o.status = 'CANCELLED'; o.sim = false; o.updated_at = sqlNow();
      save(d);
      return formatOrder(o, false);
    }
    if (parts[0] === 'orders' && parts[1]) {
      const o = findCustomerOrder(d, Number(parts[1]), query.get('phone'));
      save(d);
      return formatOrder(o, false);
    }
    throw new DemoError(404, 'Route introuvable');
  }

  // API restaurateur (/api/partner/...) : authentification par code de démonstration.
  async function partner(path, options = {}, code = '') {
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body || {};
    const { parts } = parse(path);
    const d = db();
    const byCode = (c) => RESTAURANTS.find((r) => r.code === String(c || '').trim().toUpperCase());
    if (parts[0] === 'login') {
      const r = byCode(body.code);
      if (!r) throw new DemoError(401, 'Code partenaire invalide');
      return { id: r.id, name: r.name };
    }
    const r = byCode(code);
    if (!r) throw new DemoError(401, 'Code partenaire invalide');
    if (parts[0] === 'menu') return menuOf(d, r);
    if (parts[0] === 'orders' && !parts[1]) {
      const list = d.orders.filter((o) => o.restaurant_id === r.id).map(simulate);
      save(d);
      return list.sort((a, b) => (ACTIVE.includes(b.status) - ACTIVE.includes(a.status)) || b.id - a.id).slice(0, 100).map((o) => formatOrder(o, true));
    }
    if (parts[0] === 'orders' && parts[2] === 'status' && method === 'POST') {
      const o = d.orders.find((x) => x.id === Number(parts[1]) && x.restaurant_id === r.id);
      if (!o) throw new DemoError(404, 'Commande introuvable');
      simulate(o);
      if (!(TRANSITIONS[o.status] || []).includes(body.status)) { save(d); throw new DemoError(409, `Transition interdite : ${o.status} → ${body.status}`); }
      o.status = body.status; o.sim = false; o.updated_at = sqlNow();
      save(d);
      return formatOrder(o, true);
    }
    if (parts[0] === 'items' && parts[1] && method === 'PATCH') {
      const item = r.categories.flatMap((c) => c.items).find((it) => it.id === Number(parts[1]));
      if (!item) throw new DemoError(404, 'Article introuvable');
      if (typeof body.available !== 'boolean') throw new DemoError(400, 'available doit être un booléen');
      d.unavailable = d.unavailable.filter((x) => x !== item.id);
      if (!body.available) d.unavailable.push(item.id);
      save(d);
      return { id: item.id, available: body.available };
    }
    if (parts[0] === 'restaurant' && method === 'PATCH') {
      if (typeof body.is_open !== 'boolean') throw new DemoError(400, 'is_open doit être un booléen');
      d.closed = d.closed.filter((x) => x !== r.id);
      if (!body.is_open) d.closed.push(r.id);
      save(d);
      return { id: r.id, is_open: body.is_open };
    }
    throw new DemoError(404, 'Route introuvable');
  }

  // Version publiée (github.io) ou forcée avec ?demo dans l'adresse.
  const enabled = /\.github\.io$/i.test(global.location.hostname) || new URLSearchParams(global.location.search).has('demo');

  global.WEDemo = {
    enabled,
    request,
    partner,
    codes: RESTAURANTS.map((r) => ({ name: r.name.replace(/\s*\(démo\)\s*$/i, ''), code: r.code })),
    reset() { try { localStorage.removeItem(KEY); } catch { /* rien */ } },
  };
}(window));
