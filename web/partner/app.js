'use strict';

// =====================================================================
// Winged Eats · espace restaurateur
// =====================================================================

const root = document.querySelector('#root');
const KEY = 'we_partner_code';
const POLL_MS = 5000;

// Transitions proposées au restaurateur (le serveur reste seul juge : 409 si invalide).
const ACTIONS = {
  PENDING: [['REFUSED', 'Refuser', 'danger', true], ['ACCEPTED', 'Accepter', 'main', false]],
  ACCEPTED: [['CANCELLED', 'Annuler', 'danger', true], ['PREPARING', 'Lancer la préparation', 'main', false]],
  PREPARING: [['READY', 'Marquer comme prête', 'main', false]],
  READY: [['DELIVERED', 'Remise au livreur / client', 'main', false]],
};
const STATUS_LABEL = {
  PENDING: ['Nouvelle', 'warn'],
  ACCEPTED: ['Acceptée', 'ok'],
  PREPARING: ['En préparation', 'ok'],
  READY: ['Prête', 'ok'],
  DELIVERED: ['Remise', 'ok'],
  REFUSED: ['Refusée', 'bad'],
  CANCELLED: ['Annulée', 'bad'],
};
const CONFIRM = {
  REFUSED: ['Refuser cette commande ?', 'Le client verra que sa commande a été refusée.', 'Refuser la commande'],
  CANCELLED: ['Annuler cette commande ?', 'La commande déjà acceptée sera annulée pour le client.', 'Annuler la commande'],
};

const ICONS = {
  phone: '<path d="M5.5 4h3.2l1.8 4.6-2.2 1.4a11 11 0 0 0 5.7 5.7l1.4-2.2 4.6 1.8v3.2a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3.5 6.2a2 2 0 0 1 2-2.2z"/>',
  pin: '<path d="M12 21s-6.5-5.8-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.2-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  note: '<path d="M5 4h14v12l-4 4H5z"/><path d="M15 20v-4h4M8.5 9h7M8.5 12.5h4"/>',
  logout: '<path d="M14.5 4.5h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3M10 16.5 5.5 12 10 7.5M5.5 12H15"/>',
  refresh: '<path d="M19.5 11A7.5 7.5 0 0 0 6 6.5L4 8.5M4 4v4.5h4.5"/><path d="M4.5 13A7.5 7.5 0 0 0 18 17.5l2-2M20 20v-4.5h-4.5"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 21h4"/>',
  flame: '<path d="M12 21c-3.9 0-6.8-2.6-6.8-6.3 0-3.4 2.5-5.4 3.9-8.3.5 1.9 1.5 2.9 2.5 3.4.4-2.6 1.4-5 3.9-6.3-.5 2.9 3.3 5.4 3.3 11.2 0 3.7-2.9 6.3-6.8 6.3z"/>',
  bag: '<path d="M5 8h14l-1.1 11.6a1.5 1.5 0 0 1-1.5 1.4H7.6a1.5 1.5 0 0 1-1.5-1.4L5 8z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>',
  cash: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  alert: '<path d="M12 3.5 2.5 20h19L12 3.5z"/><path d="M12 10v4.5M12 17.5v.01"/>',
  moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
};

let timer = null;
let tab = 'orders';
let restaurant = null;
let shell = null;
let showAllDone = false;
let loadOrders = () => {};

// ---------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------

const NBSP = ' ';
const fmt = (n) => `${Number(n).toLocaleString('fr-FR').replace(/\s/g, NBSP)}${NBSP}FCFA`;
const displayName = (name) => String(name || '').replace(/\s*\(démo\)\s*$/i, '');
const isDemo = (name) => /\(démo\)\s*$/i.test(String(name || ''));
const orderDate = (s) => new Date(String(s).replace(' ', 'T') + 'Z');
const prettyPhone = (p) => {
  const m = /^\+226(\d{8})$/.exec(String(p || '').replace(/\s/g, ''));
  return m ? `+226 ${m[1].match(/\d{2}/g).join(' ')}` : String(p || '');
};

function ago(s) {
  const min = Math.max(0, Math.round((Date.now() - orderDate(s).getTime()) / 60000));
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  return `à ${orderDate(s).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

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

// replaceChildren n'aplatit pas les tableaux et écrirait « null » : on passe par fill().
function fill(node, ...children) {
  node.replaceChildren(...children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false));
  return node;
}

function svg(viewBox, markup, cls) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', viewBox);
  s.setAttribute('aria-hidden', 'true');
  if (cls) s.setAttribute('class', cls);
  s.innerHTML = markup; // contenu statique uniquement
  return s;
}
const icon = (name) => svg('0 0 24 24', ICONS[name] || '', 'i');
const logoMark = () => svg('0 0 32 32', `<rect width="32" height="32" rx="9" fill="#0B7A3E"/>
  <path fill="#F5B82E" d="M6.5 24.5C8 15.5 15 8.5 25.5 6.5c.4 0 .7.4.5.8-1.2 2.6-3 4.6-5.2 6.1h3.3c.5 0 .7.5.4.9-1.5 2-3.6 3.4-6 4.1h2.6c.5 0 .7.6.3.9-3.6 2.8-8.4 4.3-14.4 5.7-.4.1-.6-.2-.5-.5z"/>`);

const alertBox = (message) => el('div', { class: 'alert', role: 'alert' }, icon('alert'), el('span', { text: message }));

function toast(message, ic = 'check') {
  const t = el('div', { class: 'toast', role: 'status' }, icon(ic), el('span', { text: message }));
  document.querySelector('#toasts').append(t);
  setTimeout(() => t.remove(), 2800);
}

function confirmModal(title, text, okLabel) {
  return new Promise((resolve) => {
    const prev = document.activeElement;
    let bg = null;
    const onKey = (e) => { if (e.key === 'Escape') done(false); };
    function done(v) {
      bg.remove();
      document.removeEventListener('keydown', onKey);
      if (prev && prev.isConnected) prev.focus();
      resolve(v);
    }
    const okBtn = el('button', { class: 'btn block lg dark', type: 'button', onclick: () => done(true) }, okLabel);
    bg = el('div', { class: 'modal-bg', onclick: (e) => { if (e.target === bg) done(false); } },
      el('div', { class: 'modal', role: 'alertdialog', 'aria-modal': 'true', 'aria-label': title },
        el('h2', { text: title }),
        el('p', { text }),
        el('div', { class: 'acts' }, okBtn,
          el('button', { class: 'btn block lg ghost', type: 'button', onclick: () => done(false) }, 'Retour'))));
    document.addEventListener('keydown', onKey);
    document.body.append(bg);
    okBtn.focus();
  });
}

function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
}

async function api(path, options = {}) {
  const code = sessionStorage.getItem(KEY);
  let res;
  try {
    res = await fetch(`/api/partner${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(code ? { Authorization: `Bearer ${code}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error('Connexion impossible. Vérifiez votre réseau.');
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/login') {
    logout();
    throw new Error('Session expirée, reconnectez-vous.');
  }
  if (!res.ok) throw new Error(data.error || 'Erreur réseau, réessayez');
  return data;
}

// ---------------------------------------------------------------------
// Connexion
// ---------------------------------------------------------------------

function logout() {
  stopTimer();
  sessionStorage.removeItem(KEY);
  restaurant = null;
  shell = null;
  document.title = 'Winged Eats · Restaurateur';
  renderLogin();
}

function renderLogin(message) {
  stopTimer();
  const input = el('input', {
    id: 'code', name: 'code', class: 'code-input', required: true, autocomplete: 'off', autocapitalize: 'characters',
    spellcheck: 'false', maxlength: 16, placeholder: 'XXXXXXXX', 'aria-describedby': 'code-help',
  });
  const errorSlot = el('div', null, message ? alertBox(message) : null);
  const submit = el('button', { class: 'btn block lg', type: 'submit', style: 'margin-top:14px' }, 'Se connecter', icon('arrowRight'));
  const form = el('form', {
    onsubmit: async (e) => {
      e.preventDefault();
      submit.disabled = true;
      try {
        const code = input.value.trim();
        sessionStorage.setItem(KEY, code);
        restaurant = await api('/login', { method: 'POST', body: { code } });
        start();
      } catch (err) {
        sessionStorage.removeItem(KEY);
        fill(errorSlot, alertBox(err.message));
        submit.disabled = false;
        input.select();
      }
    },
  },
    el('label', { class: 'lbl', for: 'code' }, 'Code partenaire'),
    input,
    errorSlot,
    submit);

  fill(root, el('div', { class: 'login' },
    el('section', { class: 'login-hero' },
      el('div', { class: 'logo' }, logoMark(), el('b', null, 'Winged ', el('span', { style: 'color:var(--gold-500)', text: 'Eats' }))),
      el('div', null, el('span', { class: 'eyebrow', text: 'Espace restaurateur' })),
      el('p', { text: 'Recevez les commandes, suivez la préparation et gérez vos ruptures en temps réel.' })),
    el('section', { class: 'login-card' },
      el('h1', { text: 'Connexion' }),
      el('p', { id: 'code-help', text: 'Saisissez le code à 8 caractères remis lors de votre inscription.' }),
      form,
      el('div', { class: 'login-foot' }, icon('lock'), el('span', { text: 'Le code reste sur cet appareil jusqu’à la fermeture de l’onglet. Ne le partagez pas.' })))));
  input.focus();
}

// ---------------------------------------------------------------------
// Tableau de bord
// ---------------------------------------------------------------------

function start() {
  showAllDone = false;
  const name = displayName(restaurant.name);
  const openSwitch = el('button', { class: 'switch', type: 'button', role: 'switch', 'aria-checked': 'true', disabled: true },
    el('span', { class: 'track' }), el('span', { class: 'lbl', text: '…' }));
  const tabs = el('div', { class: 'segctl', role: 'tablist' });
  const content = el('main', { class: 'wrap' });
  shell = { openSwitch, tabs, content, isOpen: null, pending: 0, loadedOnce: false };

  fill(root,
    el('header', { class: 'topbar' },
      el('div', { class: 'wrap' },
        el('div', { class: 'topbar-row' },
          el('span', { class: 'logo' }, logoMark()),
          el('div', { class: 'who' },
            el('small', { text: 'Espace restaurateur' }),
            el('b', null, name, isDemo(restaurant.name) ? el('span', { class: 'demo-chip', text: 'Démo' }) : null)),
          openSwitch,
          el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Se déconnecter', title: 'Se déconnecter', onclick: logout }, icon('logout'))),
        tabs)),
    content);

  openSwitch.addEventListener('click', async () => {
    if (shell.isOpen === null) return;
    const next = !shell.isOpen;
    if (!next) {
      const ok = await confirmModal('Fermer le restaurant ?', 'Les clients ne pourront plus commander tant que vous ne rouvrez pas.', 'Fermer le restaurant');
      if (!ok) return;
    }
    openSwitch.disabled = true;
    try {
      await api('/restaurant', { method: 'PATCH', body: { is_open: next } });
      paintOpen(next);
      toast(next ? 'Restaurant ouvert : les commandes arrivent' : 'Restaurant fermé aux commandes', next ? 'check' : 'moon');
      if (tab === 'orders') loadOrders();
    } catch (err) {
      toast(err.message, 'alert');
    } finally {
      if (shell) openSwitch.disabled = false;
    }
  });

  renderTabs();
  showTab(tab);
}

function paintOpen(isOpen) {
  if (!shell) return;
  shell.isOpen = isOpen;
  shell.openSwitch.disabled = false;
  shell.openSwitch.setAttribute('aria-checked', String(isOpen));
  shell.openSwitch.setAttribute('aria-label', isOpen ? 'Restaurant ouvert. Fermer aux commandes' : 'Restaurant fermé. Ouvrir aux commandes');
  fill(shell.openSwitch, el('span', { class: 'track' }), el('span', { class: 'lbl', text: isOpen ? 'Ouvert' : 'Fermé' }));
}

function renderTabs() {
  if (!shell) return;
  const tabBtn = (key, label, count) => el('button', {
    class: tab === key ? 'on' : '', type: 'button', role: 'tab', 'aria-selected': String(tab === key),
    onclick: () => { if (tab !== key) { tab = key; renderTabs(); showTab(key); } },
  }, label, count ? el('span', { class: 'cnt', text: String(count) }) : null);
  fill(shell.tabs, tabBtn('orders', 'Commandes', shell.pending), tabBtn('menu', 'Menu & stock'));
}

function showTab(key) {
  stopTimer();
  window.scrollTo({ top: 0 });
  if (key === 'menu') return renderMenu();
  return renderOrders();
}

// ---------------------------------------------------------------------
// Commandes
// ---------------------------------------------------------------------

function orderCard(o, onChange) {
  const [label, cls] = STATUS_LABEL[o.status] || [o.status, ''];
  const actions = (ACTIONS[o.status] || []).map(([next, text, variant, needsConfirm]) => el('button', {
    class: variant === 'main' ? 'btn lg main' : 'btn lg danger', type: 'button',
    onclick: async (e) => {
      const btn = e.currentTarget;
      if (needsConfirm) {
        const [t, txt, ok] = CONFIRM[next];
        if (!(await confirmModal(t, txt, ok))) return;
      }
      btn.disabled = true;
      try {
        await api(`/orders/${o.id}/status`, { method: 'POST', body: { status: next } });
        toast(`Commande n°${o.id} : ${STATUS_LABEL[next][0].toLowerCase()}`);
        onChange();
      } catch (err) {
        toast(err.message, 'alert');
        btn.disabled = false;
      }
    },
  }, text));
  const showPin = ['ACCEPTED', 'PREPARING', 'READY'].includes(o.status);
  const count = o.items.reduce((n, it) => n + it.quantity, 0);
  const tel = String(o.customer_phone || '').replace(/[^\d+]/g, '');

  return el('article', { class: `ocard s-${o.status}`, 'aria-label': `Commande ${o.id}, ${label}` },
    el('div', { class: 'in' },
      el('div', { class: 'o-head' },
        el('div', null,
          el('div', { class: 'num' }, el('span', { text: 'n°' }), String(o.id), ` · ${o.customer_name}`),
          el('small', { text: `${ago(o.created_at)} · ${count} article${count > 1 ? 's' : ''} · ${String(o.distance_km).replace('.', ',')} km` })),
        el('span', { class: `badge ${cls}`, text: label })),
      el('div', { class: 'contact' },
        el('a', { href: `tel:${tel}` }, icon('phone'), prettyPhone(o.customer_phone)),
        el('div', null, icon('pin'), el('span', { text: o.repere }))),
      o.note ? el('div', { class: 'note' }, icon('note'), el('span', { text: `Remarque : ${o.note}` })) : null,
      el('ul', { class: 'items' }, o.items.map((it) => el('li', null,
        el('span', { class: 'q', text: `${it.quantity}×` }),
        el('div', null, el('span', { text: it.item_name }), it.options_label ? el('small', { text: it.options_label }) : null)))),
      el('div', { class: 'money' },
        el('div', { class: 'part' }, el('small', { text: 'Votre part' }), el('b', { text: fmt(o.net_to_restaurant) })),
        el('div', { class: 'right' },
          el('div', { text: `Total client ${fmt(o.total)}` }),
          el('small', { text: `Commission ${fmt(o.commission)} · espèces` }))),
      showPin ? el('div', { class: 'pin' },
        el('small', { text: 'Code de remise du client' }),
        el('div', { class: 'digits', 'aria-label': `Code ${String(o.pickup_code).split('').join(' ')}` },
          String(o.pickup_code).split('').map((d) => el('span', { text: d })))) : null,
      actions.length ? el('div', { class: 'actions' }, actions) : null));
}

function kpi(cls, ic, label, value) {
  return el('div', { class: `kpi ${cls}` }, el('small', null, icon(ic), label), el('b', { text: value }));
}

function column(title, orders, { cls = '', emptyText = null, reload }) {
  if (!orders.length && !emptyText) return null;
  return el('section', null,
    el('div', { class: `col-title ${cls}` }, el('h2', { text: title }), el('span', { class: 'n', text: String(orders.length) })),
    orders.length
      ? el('div', { class: 'grid' }, orders.map((o) => orderCard(o, reload)))
      : el('div', { class: 'empty' }, el('div', { class: 'e', text: '🍽️' }), el('b', { text: emptyText.title }), el('p', { text: emptyText.text })));
}

function renderOrders() {
  const content = shell.content;
  fill(content,
    el('div', { class: 'kpis', 'aria-busy': 'true' }, [0, 1, 2, 3].map(() => el('div', { class: 'skel', style: 'height:84px' }))),
    el('div', { class: 'skel', style: 'height:220px;margin-top:26px' }));

  const load = async () => {
    try {
      const [orders, info] = await Promise.all([api('/orders'), api('/menu')]);
      if (tab !== 'orders' || !shell) return;
      paintOpen(info.is_open);
      const by = (...st) => orders.filter((o) => st.includes(o.status));
      const pending = by('PENDING');
      const cooking = by('ACCEPTED', 'PREPARING');
      const ready = by('READY');
      const done = by('DELIVERED', 'REFUSED', 'CANCELLED');
      const today = new Date().toDateString();
      const earned = by('DELIVERED').filter((o) => orderDate(o.created_at).toDateString() === today)
        .reduce((s, o) => s + o.net_to_restaurant, 0);
      if (shell.loadedOnce && pending.length > shell.pending) toast('Nouvelle commande à accepter', 'bell');
      shell.pending = pending.length;
      shell.loadedOnce = true;
      renderTabs();
      document.title = pending.length ? `(${pending.length}) Winged Eats · Restaurateur` : 'Winged Eats · Restaurateur';

      const doneShown = showAllDone ? done : done.slice(0, 4);
      fill(content,
        !info.is_open ? el('div', { class: 'closed-banner' },
          icon('moon'),
          el('div', { class: 'grow' }, el('b', { text: 'Restaurant fermé' }), el('span', { text: 'Les clients ne peuvent pas commander. Rouvrez avec l’interrupteur en haut.' }))) : null,
        el('div', { class: 'kpis' },
          kpi(pending.length ? 'gold' : '', 'bell', 'À accepter', String(pending.length)),
          kpi('', 'flame', 'En cuisine', String(cooking.length)),
          kpi('', 'bag', 'Prêtes', String(ready.length)),
          kpi('cashbox', 'cash', 'Votre part du jour', fmt(earned))),
        el('div', { class: 'bar-line' },
          el('span', { class: 'live-dot', text: `Actualisé à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · automatique` }),
          el('button', { class: 'btn ghost sm', type: 'button', onclick: () => load() }, icon('refresh'), 'Actualiser')),
        column('À accepter', pending, {
          cls: 'new', reload: load,
          emptyText: { title: 'Aucune nouvelle commande', text: info.is_open ? 'Les nouvelles commandes apparaîtront ici automatiquement.' : 'Ouvrez le restaurant pour recevoir des commandes.' },
        }),
        column('En cuisine', cooking, { reload: load }),
        column('Prêtes à remettre', ready, { reload: load }),
        done.length ? el('section', null,
          el('div', { class: 'col-title' }, el('h2', { text: 'Terminées récemment' }), el('span', { class: 'n', text: String(done.length) })),
          el('div', { class: 'grid' }, doneShown.map((o) => orderCard(o, load))),
          done.length > doneShown.length ? el('button', {
            class: 'btn ghost block more', type: 'button',
            onclick: () => { showAllDone = true; load(); },
          }, `Voir les ${done.length - doneShown.length} autres`) : null) : null);
    } catch (err) {
      if (tab !== 'orders' || !shell) return;
      fill(content, alertBox(err.message), el('button', { class: 'btn block', type: 'button', style: 'margin-top:12px', onclick: () => load() }, icon('refresh'), 'Réessayer'));
    }
  };
  loadOrders = load;
  load();
  if (tab === 'orders' && restaurant) timer = setInterval(load, POLL_MS);
}

// ---------------------------------------------------------------------
// Menu et stock
// ---------------------------------------------------------------------

async function renderMenu() {
  const content = shell.content;
  const intro = [
    el('div', { class: 'col-title' }, el('h2', { text: 'Menu et disponibilité' })),
    el('p', { class: 'muted', style: 'margin:-4px 0 16px', text: 'Passez un plat en rupture : il reste visible pour les clients mais ne peut plus être commandé.' }),
  ];
  fill(content, intro, el('div', { class: 'skel', style: 'height:260px' }));
  try {
    const menu = await api('/menu');
    if (tab !== 'menu' || !shell) return;
    paintOpen(menu.is_open);
    fill(content, intro, menu.categories.map((cat) => {
      const avail = cat.items.filter((i) => i.available).length;
      return el('section', { class: 'menu-cat' },
        el('header', null, el('h3', { text: cat.name }), el('span', { class: avail === cat.items.length ? 'badge ok' : 'badge warn', text: `${avail}/${cat.items.length} disponibles` })),
        cat.items.map((item) => {
          const sw = el('button', {
            class: 'tgl', type: 'button', role: 'switch', 'aria-checked': String(item.available),
            'aria-label': `${item.name} : ${item.available ? 'disponible' : 'en rupture'}`,
          }, el('span', { class: 't', text: item.available ? 'Disponible' : 'En rupture' }), el('span', { class: 'track' }));
          sw.addEventListener('click', async () => {
            sw.disabled = true;
            try {
              await api(`/items/${item.id}`, { method: 'PATCH', body: { available: !item.available } });
              toast(!item.available ? `${item.name} : de nouveau disponible` : `${item.name} : en rupture`, 'check');
              renderMenu();
            } catch (err) {
              toast(err.message, 'alert');
              sw.disabled = false;
            }
          });
          return el('div', { class: item.available ? 'row' : 'row out' },
            el('div', { class: 'grow' }, el('b', { text: item.name }), el('small', { text: fmt(item.price) })),
            sw);
        }));
    }));
  } catch (err) {
    if (tab !== 'menu' || !shell) return;
    fill(content, intro, alertBox(err.message));
  }
}

// ---------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------

(async function init() {
  const code = sessionStorage.getItem(KEY);
  if (!code) return renderLogin();
  try {
    restaurant = await api('/login', { method: 'POST', body: { code } });
    start();
  } catch (err) {
    logout();
    renderLogin(err.message);
  }
}());
