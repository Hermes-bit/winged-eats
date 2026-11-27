'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

const source = readFileSync(require.resolve('../web/client/open-map.js'), 'utf8');

function mapHarness(event) {
  let instance;
  class Map {
    constructor(options) {
      this.options = options;
      this.handlers = {};
      instance = this;
      queueMicrotask(() => this.handlers[event]?.());
    }
    once(name, handler) { this.handlers[name] = handler; }
    on(name, handler) { this.handlers[name] = handler; }
    off(name) { delete this.handlers[name]; }
    remove() { this.removed = true; }
  }
  const window = { maplibregl: { Map } };
  vm.runInNewContext(source, { window, setTimeout, clearTimeout });
  return { window, get instance() { return instance; } };
}

test('carte Liberty centrée sur les coordonnées fournies', async () => {
  const harness = mapHarness('load');
  const { map } = await harness.window.WEMap.create('carte', [-1.51, 12.365]);
  assert.equal(map.options.style, 'https://tiles.openfreemap.org/styles/liberty');
  assert.deepEqual(map.options.center, [-1.51, 12.365]);
  assert.equal(map.options.container, 'carte');
});

test('erreur du fond de carte : message explicite et carte libérée', async () => {
  const harness = mapHarness('error');
  await assert.rejects(harness.window.WEMap.create('carte', [-1.51, 12.365]), /Carte indisponible/);
  assert.equal(harness.instance.removed, true);
});
