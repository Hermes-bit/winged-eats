'use strict';

const { DELIVERY } = require('../config');
const { distanceKm, deliveryFee } = require('./geo');

function listRestaurants(db, origin) {
  const rows = db.prepare(`SELECT id, name, category, quartier, address_hint, latitude, longitude,
      opening_hours, prep_minutes, is_open FROM restaurants ORDER BY name`).all();

  const result = rows.map((r) => {
    const restaurant = {
      id: r.id,
      name: r.name,
      category: r.category,
      quartier: r.quartier,
      address_hint: r.address_hint,
      // Position publique de l'établissement : sert aux repères de l'écran Carte.
      latitude: r.latitude,
      longitude: r.longitude,
      opening_hours: r.opening_hours,
      prep_minutes: r.prep_minutes,
      is_open: r.is_open === 1,
    };
    if (origin) {
      const km = distanceKm(origin.latitude, origin.longitude, r.latitude, r.longitude);
      restaurant.distance_km = Math.round(km * 10) / 10;
      restaurant.in_delivery_zone = km <= DELIVERY.maxRadiusKm;
      restaurant.delivery_fee = deliveryFee(km, DELIVERY);
    }
    return restaurant;
  });

  if (origin) result.sort((a, b) => a.distance_km - b.distance_km);
  return result;
}

function getRestaurantMenu(db, restaurantId) {
  const restaurant = db.prepare(`SELECT id, name, category, quartier, address_hint, opening_hours,
      prep_minutes, is_open FROM restaurants WHERE id = ?`).get(restaurantId);
  if (!restaurant) return null;

  const categories = db.prepare('SELECT id, name FROM menu_categories WHERE restaurant_id = ? ORDER BY position, id')
    .all(restaurantId);
  const items = db.prepare(`SELECT id, category_id, name, description, price, available
      FROM menu_items WHERE restaurant_id = ? ORDER BY id`).all(restaurantId);
  const groups = db.prepare(`SELECT g.id, g.item_id, g.name, g.required, g.max_choices
      FROM option_groups g JOIN menu_items i ON i.id = g.item_id
      WHERE i.restaurant_id = ? ORDER BY g.id`).all(restaurantId);
  const options = db.prepare(`SELECT o.id, o.group_id, o.name, o.price_delta
      FROM options o JOIN option_groups g ON g.id = o.group_id
      JOIN menu_items i ON i.id = g.item_id WHERE i.restaurant_id = ? ORDER BY o.id`).all(restaurantId);

  const groupsByItem = new Map();
  for (const g of groups) {
    const list = groupsByItem.get(g.item_id) || [];
    list.push({
      id: g.id,
      name: g.name,
      required: g.required === 1,
      max_choices: g.max_choices,
      options: options
        .filter((o) => o.group_id === g.id)
        .map((o) => ({ id: o.id, name: o.name, price_delta: o.price_delta })),
    });
    groupsByItem.set(g.item_id, list);
  }

  return {
    ...restaurant,
    is_open: restaurant.is_open === 1,
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      items: items
        .filter((i) => i.category_id === c.id)
        .map((i) => ({
          id: i.id,
          name: i.name,
          description: i.description,
          price: i.price,
          available: i.available === 1,
          option_groups: groupsByItem.get(i.id) || [],
        })),
    })),
  };
}

module.exports = { listRestaurants, getRestaurantMenu };
