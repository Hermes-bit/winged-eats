'use strict';

(() => {
  const version = '4.7.1';
  const base = `https://unpkg.com/maplibre-gl@${version}/dist/`;
  let loading;

  function load() {
    if (window.maplibregl) return Promise.resolve(window.maplibregl);
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = `${base}maplibre-gl.css`;
      const script = document.createElement('script');
      script.src = `${base}maplibre-gl.js`;
      let scriptReady = false;
      let cssReady = false;
      let settled = false;
      const timeout = setTimeout(() => fail(), 12000);
      function fail() {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        script.remove();
        css.remove();
        loading = null;
        reject(new Error('Carte indisponible : vérifiez votre connexion.'));
      }
      script.onerror = fail;
      css.onerror = fail;
      function ready() {
        if (!scriptReady || !cssReady || settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(window.maplibregl);
      }
      css.onload = () => { cssReady = true; ready(); };
      script.onload = () => {
        if (!window.maplibregl) return fail();
        scriptReady = true;
        ready();
      };
      document.head.append(css, script);
    });
    return loading;
  }

  async function create(container, center) {
    const lib = await load();
    const map = new lib.Map({
      container,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center,
      zoom: 13,
      attributionControl: true,
    });
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => fail(), 15000);
        function fail() {
          clearTimeout(timer);
          map.off('error', fail);
          reject(new Error('Carte indisponible : vérifiez votre connexion.'));
        }
        map.once('load', () => { clearTimeout(timer); map.off('error', fail); resolve(); });
        map.on('error', fail);
      });
      return { map, lib };
    } catch (error) {
      map.remove();
      throw error;
    }
  }

  window.WEMap = { create };
})();
