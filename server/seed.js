'use strict';

const crypto = require('crypto');

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function randomCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Données de démonstration. Noms, quartiers et coordonnées sont fictifs ou approximatifs :
// à remplacer par l'import OpenStreetMap (priorité 2).
const DEMO_RESTAURANTS = [
  {
    name: 'Chez Maman Rose (démo)',
    category: 'Grillades',
    quartier: 'Ouaga 2000',
    address_hint: 'Près du rond-point, face à la station',
    latitude: 12.3650,
    longitude: -1.5100,
    opening_hours: '10h - 23h',
    prep_minutes: 20,
    menu: [
      {
        category: 'Grillades',
        items: [
          {
            name: 'Demi-poulet braisé',
            description: 'Poulet braisé au charbon, sauce piment',
            price: 3500,
            groups: [
              { name: 'Accompagnement', required: true, max_choices: 1, options: [['Attiéké', 0], ['Frites', 0], ['Alloco', 500]] },
              { name: 'Suppléments', required: false, max_choices: 2, options: [['Œuf', 300], ['Sauce arachide', 200]] },
            ],
          },
          {
            name: 'Poulet entier',
            description: 'Pour 3 personnes',
            price: 7000,
            groups: [
              { name: 'Accompagnement', required: true, max_choices: 1, options: [['Attiéké', 0], ['Frites', 0]] },
            ],
          },
          {
            name: 'Brochettes de bœuf (x5)',
            description: 'Pimentées sur demande',
            price: 2000,
            groups: [
              { name: 'Piment', required: true, max_choices: 1, options: [['Sans piment', 0], ['Pimenté', 0]] },
            ],
          },
        ],
      },
      {
        category: 'Boissons',
        items: [
          { name: 'Jus de bissap 50 cl', description: null, price: 500, groups: [] },
          { name: 'Bière locale 65 cl', description: null, price: 1000, groups: [] },
        ],
      },
    ],
  },
  {
    name: 'Le Baobab (démo)',
    category: 'Cuisine africaine',
    quartier: 'Zone du Bois',
    address_hint: 'Derrière la pharmacie, portail vert',
    latitude: 12.3580,
    longitude: -1.5040,
    opening_hours: '11h - 22h30',
    prep_minutes: 25,
    menu: [
      {
        category: 'Plats du jour',
        items: [
          {
            name: 'Riz gras',
            description: 'Riz à la sauce tomate et légumes',
            price: 2500,
            groups: [
              { name: 'Viande', required: true, max_choices: 1, options: [['Poulet', 0], ['Bœuf', 300], ['Mouton', 800]] },
            ],
          },
          { name: 'Tô et sauce gombo', description: null, price: 2000, groups: [] },
          {
            name: 'Poisson braisé',
            description: 'Capitaine braisé, attiéké',
            price: 4500,
            groups: [],
          },
        ],
      },
    ],
  },
  {
    name: 'Maquis Le Manguier (démo)',
    category: 'Maquis',
    quartier: "Patte d'Oie",
    address_hint: 'Carrefour de la Patte d\'Oie, côté marché',
    latitude: 12.3450,
    longitude: -1.5500,
    opening_hours: '08h - 00h',
    prep_minutes: 15,
    menu: [
      {
        category: 'Maquis',
        items: [
          {
            name: 'Alloco-poulet',
            description: 'Bananes plantain frites et poulet grillé',
            price: 3000,
            groups: [],
          },
          {
            name: 'Brochettes de poulet (x3)',
            description: null,
            price: 1500,
            groups: [],
          },
        ],
      },
    ],
  },
];

// Insère les restaurants de démonstration si la base est vide.
// Retourne les codes partenaires en clair, une seule fois, pour être notés par l'opérateur.
function seedDemoData(db) {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM restaurants').get();
  if (count > 0) return [];

  const created = [];
  db.exec('BEGIN');
  try {
    for (const r of DEMO_RESTAURANTS) {
      const code = randomCode();
      const info = db
        .prepare(`INSERT INTO restaurants
          (name, category, quartier, address_hint, latitude, longitude, opening_hours, prep_minutes, partner_code_hash)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(r.name, r.category, r.quartier, r.address_hint, r.latitude, r.longitude,
          r.opening_hours, r.prep_minutes, hashCode(code));
      const restaurantId = Number(info.lastInsertRowid);

      for (const [ci, cat] of r.menu.entries()) {
        const catId = Number(
          db.prepare('INSERT INTO menu_categories (restaurant_id, name, position) VALUES (?, ?, ?)')
            .run(restaurantId, cat.category, ci).lastInsertRowid,
        );
        for (const item of cat.items) {
          const itemId = Number(
            db.prepare(`INSERT INTO menu_items (restaurant_id, category_id, name, description, price)
              VALUES (?, ?, ?, ?, ?)`)
              .run(restaurantId, catId, item.name, item.description, item.price).lastInsertRowid,
          );
          for (const g of item.groups) {
            const groupId = Number(
              db.prepare(`INSERT INTO option_groups (item_id, name, required, max_choices) VALUES (?, ?, ?, ?)`)
                .run(itemId, g.name, g.required ? 1 : 0, g.max_choices).lastInsertRowid,
            );
            for (const [optName, delta] of g.options) {
              db.prepare('INSERT INTO options (group_id, name, price_delta) VALUES (?, ?, ?)')
                .run(groupId, optName, delta);
            }
          }
        }
      }
      created.push({ id: restaurantId, name: r.name, partner_code: code });
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return created;
}

module.exports = { seedDemoData, hashCode };
