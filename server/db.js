'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS restaurants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quartier TEXT NOT NULL,
  address_hint TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  opening_hours TEXT,
  prep_minutes INTEGER NOT NULL DEFAULT 20,
  commission_rate REAL NOT NULL DEFAULT 0.15,
  is_open INTEGER NOT NULL DEFAULT 1,
  partner_code_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS menu_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL CHECK (price >= 0),
  available INTEGER NOT NULL DEFAULT 1
);

-- Variantes : un groupe (ex. "Accompagnement") contient des options (ex. "Frites", "Alloco +500").
CREATE TABLE IF NOT EXISTS option_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  required INTEGER NOT NULL DEFAULT 0,
  max_choices INTEGER NOT NULL DEFAULT 1 CHECK (max_choices >= 1)
);

CREATE TABLE IF NOT EXISTS options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_delta INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  repere TEXT NOT NULL,
  note TEXT,
  distance_km REAL NOT NULL,
  subtotal INTEGER NOT NULL,
  delivery_fee INTEGER NOT NULL,
  total INTEGER NOT NULL,
  commission INTEGER NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'CASH' CHECK (payment_method IN ('CASH')),
  status TEXT NOT NULL DEFAULT 'PENDING',
  pickup_code TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON orders(restaurant_id, status);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES menu_items(id),
  item_name TEXT NOT NULL,
  unit_price INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  options_label TEXT NOT NULL DEFAULT '',
  line_total INTEGER NOT NULL
);
`;

function openDatabase(dbPath) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  }
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  if (dbPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }
  db.exec(SCHEMA);
  return db;
}

module.exports = { openDatabase };
