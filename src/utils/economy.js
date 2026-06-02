const fs = require("fs");
const path = require("path");

const config = require("../../config");
const { isOwner } = require("./owners");

const DATA_PATH = path.join(process.cwd(), "data.json");
const TEMP_PATH = DATA_PATH + ".tmp";

class EconomyManager {
  constructor() {
    this.cache = new Map();

    // Save queue state
    this.saveQueued = false;
    this.saveInterval = 2000;

    this._loadStorage();
  }

  // =========================
  // STORAGE
  // =========================

  _loadStorage() {
    try {
      if (!fs.existsSync(DATA_PATH)) {
        fs.writeFileSync(DATA_PATH, JSON.stringify({}, null, 2));
      }

      const raw = fs.readFileSync(DATA_PATH, "utf8");
      const parsed = JSON.parse(raw || "{}");

      for (const [id, data] of Object.entries(parsed)) {
        this.cache.set(id, this._repairUser(data));
      }

      console.log(`[OK] Loaded ${this.cache.size} economy users`);
    } catch (err) {
      console.error("[ERROR] Failed loading economy data:", err);

      this.cache = new Map();
    }
  }

  _persist() {
    try {
      const data = Object.fromEntries(this.cache);

      // TRUE atomic write
      fs.writeFileSync(TEMP_PATH, JSON.stringify(data, null, 2), "utf8");

      fs.renameSync(TEMP_PATH, DATA_PATH);
    } catch (err) {
      console.error("[ERROR] Database write failed:", err);
    }
  }

  _queueSave() {
    if (this.saveQueued) return;

    this.saveQueued = true;

    setTimeout(() => {
      this._persist();
      this.saveQueued = false;
    }, this.saveInterval);
  }

  // =========================
  // USER SCHEMA
  // =========================

  _defaultUser() {
    return {
      money: config.DEFAULT_COINS || 0,
      goop: config.DEFAULT_GOOP || 0,

      jobs: {
        selected: null,
      },

      items: {
        slimes: 0,
      },

      lastDaily: 0,
      lastWork: {},
      lastAttack: 0,

      rebirths: 0,
    };
  }

  /**
   * Repairs old/incomplete user schemas
   */
  _repairUser(user = {}) {
    const defaults = this._defaultUser();

    return {
      ...defaults,
      ...user,

      jobs: {
        ...defaults.jobs,
        ...(user.jobs || {}),
      },

      items: {
        ...defaults.items,
        ...(user.items || {}),
      },
    };
  }

  // =========================
  // USER ACCESS
  // =========================

  getUser(id) {
    if (!this.cache.has(id)) {
      const user = this._defaultUser();

      this.cache.set(id, user);

      this._queueSave();
    }

    const repaired = this._repairUser(this.cache.get(id));

    this.cache.set(id, repaired);

    return repaired;
  }

  setUser(id, updates = {}) {
    const user = this.getUser(id);

    for (const [key, value] of Object.entries(updates)) {
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        user[key] = {
          ...(user[key] || {}),
          ...value,
        };
      } else {
        user[key] = value;
      }
    }

    this.cache.set(id, user);

    this._queueSave();

    return user;
  }

  // =========================
  // STATS
  // =========================

  modifyStat(id, key, amount) {
    const user = this.getUser(id);

    const current = Number(user[key]) || 0;

    const updated = current + Number(amount);

    // Prevent invalid numbers
    user[key] = Number.isFinite(updated) ? Math.max(0, updated) : current;

    this.cache.set(id, user);

    this._queueSave();

    return user;
  }

  // =========================
  // ITEMS
  // =========================

  addItem(id, itemName, amount = 1) {
    const user = this.getUser(id);

    if (!user.items) {
      user.items = {};
    }

    const current = Number(user.items[itemName]) || 0;

    user.items[itemName] = Math.max(0, current + Number(amount));

    this.cache.set(id, user);

    this._queueSave();

    return user;
  }

  // =========================
  // COOLDOWNS
  // =========================

  getCooldown(id, type, cooldownMs, subKey = null) {
    if (isOwner(id)) {
      return {
        canProceed: true,
        remaining: 0,
      };
    }

    const user = this.getUser(id);

    const lastAction = subKey ? user[type]?.[subKey] || 0 : user[type] || 0;

    const elapsed = Date.now() - lastAction;

    const remaining = cooldownMs - elapsed;

    return {
      canProceed: remaining <= 0,
      remaining: Math.max(0, remaining),
    };
  }

  // =========================
  // CLEAN SHUTDOWN
  // =========================

  shutdown() {
    try {
      this._persist();

      console.log("[OK] Economy data saved");
    } catch (err) {
      console.error("[ERROR] Failed during shutdown save:", err);
    }
  }
}

const economy = new EconomyManager();

// Save on shutdown
process.on("SIGINT", () => {
  economy.shutdown();
  process.exit(0);
});

process.on("SIGTERM", () => {
  economy.shutdown();
  process.exit(0);
});

// =========================
// EXPORTS
// =========================

module.exports = {
  // Core
  getUser: (id) => economy.getUser(id),

  setUser: (id, data) => economy.setUser(id, data),

  // Currency
  addCoins: (id, amount) => economy.modifyStat(id, "money", amount),

  addMoney: (id, amount) => economy.modifyStat(id, "money", amount),

  addGoop: (id, amount) => economy.modifyStat(id, "goop", amount),

  // Items
  addItem: (id, item, amt) => economy.addItem(id, item, amt),

  // Cooldowns
  checkCooldown: (id, type, ms, subKey) =>
    economy.getCooldown(id, type, ms, subKey),

  // Work helpers
  canWork: (id, jobId, cooldownMs) => {
    const res = economy.getCooldown(id, "lastWork", cooldownMs, jobId);
    return { ok: res.canProceed, remaining: res.remaining };
  },

  setLastWork: (id, jobId, timestamp) =>
    economy.setUser(id, { lastWork: { [jobId]: timestamp } }),

  // Attack helpers
  canAttack: (id, cooldownMs) => {
    const res = economy.getCooldown(id, "lastAttack", cooldownMs, null);
    return { ok: res.canProceed, remaining: res.remaining };
  },

  setLastAttack: (id, timestamp) => economy.setUser(id, { lastAttack: timestamp }),

  // Job helpers
  setJob: (id, jobId) => economy.setUser(id, { jobs: { selected: jobId } }),

  // Debug
  DATA_PATH,
  // Raw read/write helpers (returns/accepts plain objects)
  read: () => JSON.parse(JSON.stringify(Object.fromEntries(economy.cache))),

  write: (data) => {
    if (!data || typeof data !== "object") return false;
    for (const [id, user] of Object.entries(data)) {
      economy.cache.set(id, economy._repairUser(user));
    }
    economy._queueSave();
    return true;
  },
};
