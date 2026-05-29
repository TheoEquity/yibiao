const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const dataDirectory = path.resolve(__dirname, '../../data');
const databaseFilePath = path.join(dataDirectory, 'app-state.sqlite');

let database;

function ensureDataDirectory() {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

function getDatabase() {
  if (database) {
    return database;
  }

  ensureDataDirectory();
  database = new DatabaseSync(databaseFilePath);
  database.exec(`
    CREATE TABLE IF NOT EXISTS app_state (
      store_key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  return database;
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function readLegacyJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function createJsonStore(fileName, defaultValue, options = {}) {
  const filePath = path.join(dataDirectory, fileName);
  const storeKey = options.key || fileName;

  function write(value) {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO app_state (store_key, value_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(store_key) DO UPDATE SET
        value_json = excluded.value_json,
        updated_at = excluded.updated_at
    `).run(storeKey, JSON.stringify(value), new Date().toISOString());
  }

  function read() {
    const db = getDatabase();
    const existingRow = db.prepare('SELECT value_json FROM app_state WHERE store_key = ?').get(storeKey);
    if (existingRow && existingRow.value_json) {
      try {
        return JSON.parse(existingRow.value_json);
      } catch {
        const fallback = cloneValue(defaultValue);
        write(fallback);
        return fallback;
      }
    }

    const legacyValue = readLegacyJson(filePath);
    if (legacyValue !== null) {
      write(legacyValue);
      return legacyValue;
    }

    const fallback = cloneValue(defaultValue);
    write(fallback);
    return fallback;
  }

  function exportToLegacyJson(value) {
    ensureDataDirectory();
    const temporaryPath = `${filePath}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify(value, null, 2), 'utf-8');
    fs.renameSync(temporaryPath, filePath);
  }

  return {
    filePath,
    storeKey,
    read,
    write,
    exportToLegacyJson,
  };
}

function syncDatabaseToLegacyJson(fileName, storeKey) {
  const store = createJsonStore(fileName, null, { key: storeKey });
  const value = store.read();
  if (value !== null) {
    store.exportToLegacyJson(value);
  }
}

module.exports = {
  createJsonStore,
  dataDirectory,
  databaseFilePath,
  syncDatabaseToLegacyJson,
};
