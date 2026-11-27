'use strict';

(() => {
  const centers = {
    ouaga: [12.3714, -1.5197],
    bobo: [11.1771, -4.2979],
  };
  const cache = new Map();
  const text = (value) => typeof value === 'string' ? value.trim() : '';

  async function json(url, options = {}) {
    let response;
    try {
      response = await fetch(url, { ...options, signal: AbortSignal.timeout(25000) });
    } catch {
      throw new Error('Données OpenStreetMap indisponibles. Vérifiez votre connexion.');
    }
    if (!response.ok) throw new Error(`Service de données indisponible (${response.status}).`);
    try { return await response.json(); } catch { throw new Error('Réponse cartographique invalide.'); }
  }

  function normalize(element) {
    if (!element || !['node', 'way', 'relation'].includes(element.type) || !Number.isSafeInteger(element.id) || element.id <= 0) return null;
    const tags = element.tags || {};
    const lat = element.type === 'node' ? element.lat : element.center?.lat;
    const lon = element.type === 'node' ? element.lon : element.center?.lon;
    const name = text(tags.name);
    if (!name || !Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lon) || Math.abs(lon) > 180) return null;
    const photo = text(tags.wikimedia_commons);
    return {
      id: `${element.type}/${element.id}`,
      name,
      lat,
      lon,
      cuisine: text(tags.cuisine).replace(/;/g, ', ').replace(/_/g, ' '),
      address: [text(tags['addr:housenumber']), text(tags['addr:street']), text(tags['addr:suburb'])].filter(Boolean).join(' '),
      hours: text(tags.opening_hours),
      commons: /^File:[^|\n]{1,200}$/i.test(photo) ? photo : null,
    };
  }

  async function nearby(city) {
    const center = centers[city];
    if (!center) throw new Error('Ville non prise en charge par la recherche OpenStreetMap.');
    const hit = cache.get(city);
    if (hit && Date.now() - hit.at < 300000) return hit.items;
    const [lat, lon] = center;
    const query = `[out:json][timeout:20];nwr(around:8000,${lat},${lon})["amenity"~"^(restaurant|fast_food|cafe|food_court)$"]["name"];out center;`;
    const data = await json('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams({ data: query }),
    });
    if (!Array.isArray(data.elements) || data.remark) throw new Error('La recherche OpenStreetMap est incomplète. Réessayez.');
    const items = data.elements.map(normalize).filter(Boolean);
    cache.set(city, { at: Date.now(), items });
    return items;
  }

  function plain(html) {
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    return text(doc.body.textContent);
  }

  async function photo(title) {
    if (!title || !/^File:[^|\n]{1,200}$/i.test(title)) return null;
    const params = new URLSearchParams({
      action: 'query', format: 'json', origin: '*', prop: 'imageinfo',
      iiprop: 'url|extmetadata', iiurlwidth: '600', titles: title,
    });
    const data = await json(`https://commons.wikimedia.org/w/api.php?${params}`);
    const pages = data.query?.pages;
    if (!pages) throw new Error('Informations de la photo indisponibles.');
    const info = Object.values(pages)[0]?.imageinfo?.[0];
    if (!info) return null;
    const meta = info.extmetadata || {};
    const author = plain(meta.Artist?.value);
    const license = plain(meta.LicenseShortName?.value);
    const licenseUrl = text(meta.LicenseUrl?.value);
    const fileUrl = text(info.descriptionurl);
    const imageUrl = text(info.thumburl);
    let image, file, licence;
    try { image = new URL(imageUrl); file = new URL(fileUrl); licence = new URL(licenseUrl); } catch { return null; }
    if (image.protocol !== 'https:' || image.hostname !== 'upload.wikimedia.org'
      || file.protocol !== 'https:' || file.hostname !== 'commons.wikimedia.org'
      || licence.protocol !== 'https:' || licence.hostname !== 'creativecommons.org'
      || !/^\/(licenses\/by(-sa)?\/|publicdomain\/zero\/)/.test(licence.pathname)
      || !author || !license) return null;
    return { imageUrl, fileUrl, author, license, licenseUrl };
  }

  window.WEOSM = { nearby, photo };
})();
