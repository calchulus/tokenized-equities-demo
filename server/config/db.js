const fs = require('fs');
const path = require('path');
const SEED_DATA = require('../../shared/seedData');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load DB, using defaults:', e.message);
  }
  return getDefaultDB();
}

function saveDB(data) {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function getDefaultDB() {
  return JSON.parse(JSON.stringify(SEED_DATA));
}

module.exports = { loadDB, saveDB, getDefaultDB };
