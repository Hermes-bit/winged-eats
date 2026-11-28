'use strict';

const server = 'https://winged-eats-1.onrender.com/api';
const $ = (selector) => document.querySelector(selector);
let token = null;
let currentQuery = '';
let nextPage = null;
let nextDecisionOffset = null;
let sequence = 0;
const seen = new Set();
const message = (text) => { $('#message').textContent = text; };

async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`${server}${path}`, {
      method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined, cache: 'no-store',
    });
  } catch { throw new Error('Connexion impossible. Vérifiez votre réseau.'); }
  let data;
  try { data = await res.json(); }
  catch { throw new Error('Réponse du serveur invalide. Réessayez.'); }
  if (!res.ok) {
    if (res.status === 401 && token) { logout(); message('Session expirée. Reconnectez-vous.'); }
    throw new Error(data.error || 'Une erreur est survenue.');
  }
  return data;
}
function logout() {
  token = null;
  sequence += 1;
  $('#login').hidden = false;
  $('#dashboard').hidden = true;
  $('#logout').hidden = true;
  $('#results').replaceChildren();
  $('#decisions').replaceChildren();
  $('#count').textContent = '';
  $('#more').hidden = true;
  $('#more-decisions').hidden = true;
  seen.clear();
  currentQuery = '';
  nextPage = null;
  nextDecisionOffset = null;
  $('#query').value = '';
  $('#password').value = '';
}
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function checkbox(label, checked) {
  const wrapper = element('label');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  wrapper.append(input, document.createTextNode(label));
  return { wrapper, input };
}
function card(place) {
  const node = element('article', null, 'card');
  if (place.photo && !place.moderation.hidden && !place.moderation.photos_hidden) {
    const img = element('img', null, 'photo');
    img.alt = '';
    img.loading = 'lazy';
    img.src = `${server}/places/photo?name=${encodeURIComponent(place.photo.name)}&w=480`;
    img.addEventListener('error', () => img.replaceWith(element('div', 'Photo indisponible', 'photo-placeholder')));
    node.append(img);
  } else node.append(element('div', 'Photo masquée ou indisponible', 'photo-placeholder'));
  const body = element('div', null, 'card-body');
  body.append(element('h2', place.name), element('p', place.address || 'Adresse indisponible'));
  if (place.photo?.author && !place.moderation.hidden && !place.moderation.photos_hidden) {
    const credit = element('p', 'Photo : ', 'credit');
    const authors = place.photo.authors?.length ? place.photo.authors : [{ name: place.photo.author, uri: place.photo.author_uri }];
    authors.forEach((author, i) => {
      if (i) credit.append(', ');
      if (author.uri) {
        const link = element('a', author.name);
        link.href = author.uri;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        credit.append(link);
      } else credit.append(author.name);
    });
    credit.append(' · Google Maps');
    body.append(credit);
  }
  const hidden = checkbox('Masquer ce restaurant dans Winged Eats', place.moderation.hidden);
  const photos = checkbox('Masquer toutes ses photos Google', place.moderation.photos_hidden);
  const save = element('button', 'Enregistrer');
  const status = element('p');
  status.setAttribute('role', 'status');
  save.type = 'button';
  save.onclick = async () => {
    save.disabled = true;
    hidden.input.disabled = true;
    photos.input.disabled = true;
    status.textContent = 'Enregistrement…';
    try {
      await request(`/admin/restaurants/${encodeURIComponent(place.id)}`, { method: 'PUT', body: { hidden: hidden.input.checked, photos_hidden: photos.input.checked } });
      status.className = 'saved';
      status.textContent = 'Enregistré. Actualisez la recherche pour voir la photo actuelle.';
    } catch (error) { status.className = ''; status.textContent = error.message; }
    finally { save.disabled = false; hidden.input.disabled = false; photos.input.disabled = false; }
  };
  body.append(hidden.wrapper, photos.wrapper, save, status);
  node.append(body);
  return node;
}
async function search(pageToken) {
  const current = ++sequence;
  $('#more').hidden = true;
  $('#count').textContent = 'Recherche en cours…';
  message('');
  try {
    const params = new URLSearchParams({ name: currentQuery });
    if (pageToken) params.set('pageToken', pageToken);
    const data = await request(`/admin/restaurants?${params}`);
    if (sequence !== current) return;
    for (const place of data.places) if (!seen.has(place.id)) { seen.add(place.id); $('#results').append(card(place)); }
    nextPage = data.nextPageToken;
    $('#more').hidden = !nextPage;
    $('#count').textContent = seen.size ? `${seen.size} résultat(s) pour « ${currentQuery} »` : 'Aucun restaurant trouvé.';
  } catch (error) { if (sequence === current) { $('#count').textContent = ''; message(error.message); if (pageToken) $('#more').hidden = false; } }
}
$('#login-form').onsubmit = async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button');
  button.disabled = true;
  message('');
  try {
    const data = await request('/admin/login', { method: 'POST', body: { email: $('#email').value.trim(), password: $('#password').value } });
    token = data.access_token;
    $('#password').value = '';
    $('#login').hidden = true;
    $('#dashboard').hidden = false;
    $('#logout').hidden = false;
  } catch (error) { message(error.message); }
  finally { button.disabled = false; }
};
$('#logout').onclick = () => { logout(); message(''); };
$('#search-form').onsubmit = (event) => {
  event.preventDefault();
  currentQuery = $('#query').value.trim();
  if (currentQuery.length < 2) { message('Saisissez un quartier de 2 caractères minimum.'); return; }
  seen.clear();
  $('#results').replaceChildren();
  search();
};
$('#more').onclick = () => search(nextPage);
async function loadDecisions(offset = 0) {
  const button = offset ? $('#more-decisions') : $('#load-decisions');
  button.disabled = true;
  message('');
  try {
    const data = await request(`/admin/decisions?offset=${offset}`);
    if (!offset) $('#decisions').replaceChildren();
    if (!offset && !data.rows.length) $('#decisions').append(element('p', 'Aucune décision enregistrée.'));
    for (const row of data.rows) {
      const item = element('div', null, 'decision');
      item.append(element('p', `${row.place_id} · ${row.hidden ? 'Restaurant masqué' : 'Restaurant visible'} · ${row.photos_hidden ? 'Photos masquées' : 'Photos visibles'}`));
      const inspect = element('button', 'Examiner', 'secondary');
      inspect.type = 'button';
      inspect.onclick = async () => {
        inspect.disabled = true;
        sequence += 1;
        try {
          const place = await request(`/admin/restaurants/${encodeURIComponent(row.place_id)}`);
          $('#results').replaceChildren(card(place));
          $('#count').textContent = 'Fiche sélectionnée depuis les décisions enregistrées.';
          $('#more').hidden = true;
          $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) { message(error.message); }
        finally { inspect.disabled = false; }
      };
      const restore = element('button', 'Tout réafficher', 'secondary');
      restore.type = 'button';
      restore.onclick = async () => {
        restore.disabled = true;
        try {
          await request(`/admin/restaurants/${encodeURIComponent(row.place_id)}`, { method: 'PUT', body: { hidden: false, photos_hidden: false } });
          item.remove();
        } catch (error) { message(error.message); }
        finally { restore.disabled = false; }
      };
      item.append(inspect, restore);
      $('#decisions').append(item);
    }
    nextDecisionOffset = data.nextOffset;
    $('#more-decisions').hidden = nextDecisionOffset === null;
  } catch (error) { message(error.message); }
  finally { button.disabled = false; }
}
$('#load-decisions').onclick = () => loadDecisions();
$('#more-decisions').onclick = () => loadDecisions(nextDecisionOffset);
