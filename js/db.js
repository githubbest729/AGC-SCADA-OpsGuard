/* AGC SCADA OpsGuard — IndexedDB data layer
   All plant data lives locally so checklists run with zero connectivity.
   Stores:
     equipment        - equipment registry (PLC/HMI/servers/switches)
     versions         - firmware / software version matrix entries
     licenses         - runtime licenses / SSL certs / support contracts
     pmTemplates       - checklist templates (frequency-categorised)
     pmRuns            - completed / in-progress checklist run instances
     securityChecks   - cybersecurity hardening checklist items
     securityRuns      - completed security audit run instances
     backups           - backup verification log entries
     settings           - app/plant settings (single row, key "app")
*/

const DB_NAME = "opsguard-db";
const DB_VERSION = 1;

const STORES = {
  equipment: "id",
  versions: "id",
  licenses: "id",
  pmTemplates: "id",
  pmRuns: "id",
  securityChecks: "id",
  securityRuns: "id",
  backups: "id",
  settings: "key"
};

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      Object.entries(STORES).forEach(([name, keyPath]) => {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath });
          if (name === "pmRuns") {
            store.createIndex("byStatus", "status");
            store.createIndex("byTemplate", "templateId");
          }
          if (name === "equipment") store.createIndex("byType", "type");
          if (name === "backups") store.createIndex("byDate", "date");
          if (name === "securityRuns") store.createIndex("byStatus", "status");
        }
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

function tx(storeName, mode = "readonly") {
  return openDB().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

const OpsDB = {
  async getAll(storeName) {
    const store = await tx(storeName);
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async get(storeName, key) {
    const store = await tx(storeName);
    return new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async put(storeName, value) {
    const store = await tx(storeName, "readwrite");
    return new Promise((resolve, reject) => {
      const req = store.put(value);
      req.onsuccess = () => resolve(value);
      req.onerror = () => reject(req.error);
    });
  },

  async bulkPut(storeName, values) {
    const store = await tx(storeName, "readwrite");
    return new Promise((resolve, reject) => {
      values.forEach((v) => store.put(v));
      store.transaction.oncomplete = () => resolve(values);
      store.transaction.onerror = () => reject(store.transaction.error);
    });
  },

  async delete(storeName, key) {
    const store = await tx(storeName, "readwrite");
    return new Promise((resolve, reject) => {
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  async count(storeName) {
    const store = await tx(storeName);
    return new Promise((resolve, reject) => {
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async clearAll() {
    const db = await openDB();
    const names = Array.from(db.objectStoreNames);
    const t = db.transaction(names, "readwrite");
    names.forEach((n) => t.objectStore(n).clear());
    return new Promise((resolve, reject) => {
      t.oncomplete = () => resolve(true);
      t.onerror = () => reject(t.error);
    });
  },

  uid(prefix = "id") {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  },

  /** Seeds the database on first run only (checked via settings.seeded flag). */
  async seedIfEmpty(seed) {
    const flag = await this.get("settings", "app");
    if (flag && flag.seeded) return false;

    await this.bulkPut("pmTemplates", seed.PM_TEMPLATES);
    await this.bulkPut("equipment", seed.EQUIPMENT);
    await this.bulkPut("versions", seed.VERSIONS);
    await this.bulkPut("licenses", seed.LICENSES);
    await this.bulkPut("securityChecks", seed.SECURITY_CHECKLIST);
    await this.bulkPut("backups", seed.SAMPLE_BACKUPS);

    await this.put("settings", {
      key: "app",
      seeded: true,
      plantName: "AGC Demo Plant — Unit 1",
      engineerName: "Christian Tosita Espinosa",
      engineerRole: "SCADA Engineer",
      createdAt: new Date().toISOString()
    });
    return true;
  }
};
