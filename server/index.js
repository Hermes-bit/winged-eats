'use strict';

const config = require('./config');
const { openDatabase } = require('./db');
const { seedDemoData } = require('./seed');
const { createApp } = require('./app');

const db = openDatabase(config.DB_PATH);
const seeded = seedDemoData(db);

if (seeded.length > 0) {
  console.log('Données de démonstration créées. Codes partenaires (notez-les, ils ne seront plus affichés) :');
  for (const r of seeded) console.log(`  - ${r.name} : ${r.partner_code}`);
}

createApp(db).listen(config.PORT, () => {
  console.log(`Winged Eats démarré sur http://localhost:${config.PORT}`);
  console.log(`  Client      : http://localhost:${config.PORT}/client/`);
  console.log(`  Partenaire  : http://localhost:${config.PORT}/partner/`);
});
