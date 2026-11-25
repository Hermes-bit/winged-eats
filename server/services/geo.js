'use strict';

const EARTH_RADIUS_KM = 6371;

// Distance à vol d'oiseau (Haversine). Remplacée par OSRM en priorité 2 pour un itinéraire réel.
function distanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

// Frais de livraison : forfait + tarif au km, arrondi au palier supérieur.
function deliveryFee(km, { baseFee, perKm, roundTo }) {
  const raw = baseFee + perKm * km;
  return Math.ceil(raw / roundTo) * roundTo;
}

module.exports = { distanceKm, deliveryFee };
