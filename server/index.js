'use strict';

const config = require('./config');
const { openDatabase } = require('./db');
const { createApp } = require('./app');

const db = openDatabase(config.DB_PATH);
createApp(db, { hideDemo: true }).listen(config.PORT, () => {
  console.log(`Winged Eats démarré sur http://localhost:${config.PORT}`);
  console.log(`  Client      : http://localhost:${config.PORT}/client/`);
  console.log(`  Partenaire  : http://localhost:${config.PORT}/partner/`);
});
