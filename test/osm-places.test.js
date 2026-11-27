'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

const source = readFileSync(require.resolve('../web/client/osm-places.js'), 'utf8');

function harness(responses) {
  const requests = [];
  const window = {};
  const fetch = async (url, options) => {
    requests.push({ url, options });
    const response = responses.shift();
    if (response instanceof Error) throw response;
    return { ok: true, json: async () => response };
  };
  class DOMParser {
    parseFromString(input) { return { body: { textContent: input.replace(/<[^>]*>/g, '') } }; }
  }
  vm.runInNewContext(source, { window, fetch, AbortSignal, URLSearchParams, URL, DOMParser });
  return { osm: window.WEOSM, requests };
}

test('commerces OSM normalisés et recherche limitée au centre public de la ville', async () => {
  const h = harness([{ elements: [
    { type: 'node', id: 12, lat: 12.37, lon: -1.51, tags: { name: 'Chez Awa', cuisine: 'regional;grill', wikimedia_commons: 'File:Repas.jpg' } },
    { type: 'way', id: 14, center: { lat: 12.38, lon: -1.50 }, tags: { name: 'Café' } },
    { type: 'node', id: 15, lat: 12.37, lon: -1.51, tags: {} },
    { type: 'node', id: 16, lat: null, lon: -1.51, tags: { name: 'Sans coordonnées' } },
  ] }]);
  const result = await h.osm.nearby('ouaga');
  assert.equal(result.length, 2);
  assert.equal(result[0].id, 'node/12');
  assert.equal(result[0].cuisine, 'regional, grill');
  assert.equal(result[0].commons, 'File:Repas.jpg');
  assert.equal(result[1].lat, 12.38);
  assert.match(String(h.requests[0].options.body), /12.3714/);
  await h.osm.nearby('ouaga');
  assert.equal(h.requests.length, 1);
});

test('erreur réseau et résultat incomplet explicités', async () => {
  const h = harness([new Error('offline'), { elements: [], remark: 'timeout' }]);
  await assert.rejects(h.osm.nearby('bobo'), /indisponibles/);
  await assert.rejects(h.osm.nearby('bobo'), /incomplète/);
});

test('photo Commons affichable seulement avec auteur et licence réutilisable', async () => {
  const info = {
    thumburl: 'https://upload.wikimedia.org/example.jpg',
    descriptionurl: 'https://commons.wikimedia.org/wiki/File:Repas.jpg',
    extmetadata: { Artist: { value: '<b>Photographe</b>' }, LicenseShortName: { value: 'CC BY 4.0' }, LicenseUrl: { value: 'https://creativecommons.org/licenses/by/4.0/' } },
  };
  const h = harness([{ query: { pages: { 1: { imageinfo: [info] } } } }, { query: { pages: { 1: { imageinfo: [{ ...info, extmetadata: {} }] } } } }]);
  const photo = await h.osm.photo('File:Repas.jpg');
  assert.equal(photo.author, 'Photographe');
  assert.equal(photo.license, 'CC BY 4.0');
  assert.equal(await h.osm.photo('File:Sans-licence.jpg'), null);
  assert.equal(await h.osm.photo('Category:Restaurants'), null);
});
