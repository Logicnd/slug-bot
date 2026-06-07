const fs = require("fs");
const path = require("path");
const config = require("../../config");

const DATASTORE_KEY = "default";
const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_PATH = path.join(DATA_DIR, "economy.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function defaultState() {
  return {
    users: {},
    guilds: {},
    events: {
      active: [],
    },
    shop: {
      dateKey: getDateKey(),
      stock: Array.isArray(config.SHOP_POOL) ? [...config.SHOP_POOL] : [],
    },
    meta: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  };
}

ensureDir();

function readStore() {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      const initial = defaultState();
      fs.writeFileSync(DATA_PATH, JSON.stringify(initial, null, 2), "utf8");
      return initial;
    }
    const raw = fs.readFileSync(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return {
      users: parsed.users || {},
      guilds: parsed.guilds || {},
      events: parsed.events || { active: [] },
      shop: parsed.shop || {
        dateKey: getDateKey(),
        stock: Array.isArray(config.SHOP_POOL) ? [...config.SHOP_POOL] : [],
      },
      meta: parsed.meta || {
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    };
  } catch (err) {
    console.error("[ECON] Failed to read store:", err);
    return defaultState();
  }
}

let state = readStore();
let saveTimer = null;

function saveStore() {
  state.meta.updatedAt = Date.now();
  fs.writeFileSync(DATA_PATH, JSON.stringify(state, null, 2), "utf8");
}

function queueSave(delay = 150) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      saveStore();
    } catch (err) {
      console.error("[ECON] Failed to save store:", err);
    }
  }, delay);
}

function read() {
  return state.users;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function randInt(min, max) {
  const a = Math.ceil(Number(min) || 0);
  const b = Math.floor(Number(max) || 0);
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function getDateKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getXPNeeded(level = 1) {
  const base = Number(config.LEVELING?.BASE_XP || 100);
  const mult = Number(config.LEVELING?.XP_MULTIPLIER || 1.5);
  return Math.floor(base * Math.pow(mult, Math.max(0, Number(level) - 1)));
}

function createQuestSet() {
  const pool = Array.isArray(config.QUESTS?.POOL)
    ? [...config.QUESTS.POOL]
    : [];
  const count = Math.max(1, Number(config.QUESTS?.DAILY_COUNT || 3));
  const picked = [];

  while (pool.length && picked.length < count) {
    const idx = randInt(0, pool.length - 1);
    const q = pool.splice(idx, 1)[0];
    picked.push({
      id: q.id,
      type: q.type,
      progress: 0,
      goal: Number(q.goal || 1),
      completed: false,
      claimed: false,
    });
  }

  return {
    date: getDateKey(),
    current: picked,
  };
}

function defaultUser(userId) {
  return {
    userId: String(userId),

    coins: Number(config.DEFAULT_COINS || 0),
    goop: Number(config.DEFAULT_GOOP || 0),

    xp: 0,
    level: 1,
    rebirths: 0,

    lastDaily: 0,
    lastHug: 0,

    jobs: {
      selected: config.JOBS?.[0]?.id || null,
      lastWorked: {},
    },

    selectedJob: config.JOBS?.[0]?.id || null,

    items: {},
    inventory: [],

    slimes: [],
    selectedSlimeId: null,

    boosts: {
      xpBoostUntil: 0,
    },

    shields: {
      charges: 0,
    },

    variants: [],

    attack: {
      lastAt: 0,
    },

    arena: {
      lastAt: 0,
    },

    quests: createQuestSet(),

    stats: {
      interactions: 0,
      commandsUsed: 0,
      totalCoinsEarned: 0,
      totalCoinsSpent: 0,
      totalGoopEarned: 0,
      totalGoopSpent: 0,
    },

    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function syncInventoryFromItems(user) {
  const shopMap = new Map((config.SHOP_POOL || []).map((i) => [i.id, i]));
  const arr = [];

  for (const [id, quantity] of Object.entries(user.items || {})) {
    if (!quantity || quantity <= 0) continue;
    const itemDef = shopMap.get(id);
    arr.push({
      id,
      name: itemDef?.name || id,
      type: itemDef?.type || "consumable",
      quantity: Number(quantity) || 0,
      description: itemDef?.description || "",
      usesRemaining: itemDef?.uses || null,
      duration_ms: itemDef?.duration_ms || null,
    });
  }

  user.inventory = arr;
}

function normalizeUser(raw) {
  const base = defaultUser(raw.userId);

  const user = {
    ...base,
    ...raw,
    userId: String(raw.userId || base.userId),
    coins: Math.max(0, Number(raw.coins ?? base.coins) || 0),
    goop: Math.max(0, Number(raw.goop ?? base.goop) || 0),
    xp: Math.max(0, Number(raw.xp ?? base.xp) || 0),
    level: Math.max(1, Number(raw.level ?? base.level) || 1),
    rebirths: clamp(
      Number(raw.rebirths ?? base.rebirths) || 0,
      0,
      Number(config.REBIRTH?.MAX_REBIRTHS || 10),
    ),
    lastDaily: Math.max(0, Number(raw.lastDaily ?? base.lastDaily) || 0),
    lastHug: Math.max(0, Number(raw.lastHug ?? base.lastHug) || 0),
    jobs: {
      selected: raw.jobs?.selected || raw.selectedJob || base.jobs.selected,
      lastWorked: raw.jobs?.lastWorked || base.jobs.lastWorked,
    },
    selectedJob: raw.selectedJob || raw.jobs?.selected || base.selectedJob,
    items: typeof raw.items === "object" && raw.items ? raw.items : {},
    inventory: Array.isArray(raw.inventory) ? raw.inventory : [],
    slimes: Array.isArray(raw.slimes) ? raw.slimes : [],
    selectedSlimeId: raw.selectedSlimeId || null,
    boosts: {
      xpBoostUntil: Math.max(
        0,
        Number(raw.boosts?.xpBoostUntil ?? base.boosts.xpBoostUntil) || 0,
      ),
    },
    shields: {
      charges: Math.max(
        0,
        Number(raw.shields?.charges ?? base.shields.charges) || 0,
      ),
    },
    variants: Array.isArray(raw.variants) ? raw.variants : [],
    attack: {
      lastAt: Math.max(
        0,
        Number(raw.attack?.lastAt ?? base.attack.lastAt) || 0,
      ),
    },
    arena: {
      lastAt: Math.max(0, Number(raw.arena?.lastAt ?? base.arena.lastAt) || 0),
    },
    quests:
      raw.quests && raw.quests.date === getDateKey()
        ? raw.quests
        : createQuestSet(),
    stats: {
      interactions: Math.max(
        0,
        Number(raw.stats?.interactions ?? base.stats.interactions) || 0,
      ),
      commandsUsed: Math.max(
        0,
        Number(raw.stats?.commandsUsed ?? base.stats.commandsUsed) || 0,
      ),
      totalCoinsEarned: Math.max(
        0,
        Number(raw.stats?.totalCoinsEarned ?? base.stats.totalCoinsEarned) || 0,
      ),
      totalCoinsSpent: Math.max(
        0,
        Number(raw.stats?.totalCoinsSpent ?? base.stats.totalCoinsSpent) || 0,
      ),
      totalGoopEarned: Math.max(
        0,
        Number(raw.stats?.totalGoopEarned ?? base.stats.totalGoopEarned) || 0,
      ),
      totalGoopSpent: Math.max(
        0,
        Number(raw.stats?.totalGoopSpent ?? base.stats.totalGoopSpent) || 0,
      ),
    },
    createdAt: Number(raw.createdAt || base.createdAt),
    updatedAt: Date.now(),
  };

  syncInventoryFromItems(user);

  return user;
}

function getUser(userId) {
  const id = String(userId);
  if (!state.users[id]) {
    state.users[id] = defaultUser(id);
    queueSave();
  }
  state.users[id] = normalizeUser(state.users[id]);
  return state.users[id];
}

function setUser(userId, patch = {}) {
  const user = getUser(userId);
  const merged = normalizeUser({ ...user, ...patch });

  if (patch.jobs) {
    merged.jobs = {
      ...user.jobs,
      ...patch.jobs,
    };
    merged.selectedJob = merged.jobs.selected;
  }

  if (patch.selectedJob && !patch.jobs) {
    merged.jobs.selected = patch.selectedJob;
    merged.selectedJob = patch.selectedJob;
  }

  if (patch.items) {
    merged.items = { ...user.items, ...patch.items };
  }

  state.users[String(userId)] = merged;
  queueSave();
  return state.users[String(userId)];
}

function recordInteraction(userId, guildId) {
  const user = getUser(userId);
  user.stats.interactions += 1;
  setUser(userId, user);

  if (!guildId) return;

  const gid = String(guildId);
  if (!state.guilds[gid]) {
    state.guilds[gid] = {
      guildId: gid,
      users: {},
      interactions: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  state.guilds[gid].users[String(userId)] = true;
  state.guilds[gid].interactions[String(userId)] =
    Number(state.guilds[gid].interactions[String(userId)] || 0) + 1;
  state.guilds[gid].updatedAt = Date.now();
  queueSave();
}

function getGuildUserIds(guildId) {
  const guild = state.guilds[String(guildId)];
  if (!guild) return [];
  return Object.keys(guild.users || {});
}

function addCoins(userId, amount) {
  const user = getUser(userId);
  const delta = Number(amount) || 0;

  if (delta >= 0) {
    user.coins += delta;
    user.stats.totalCoinsEarned += delta;
  } else {
    const spend = Math.min(user.coins, Math.abs(delta));
    user.coins -= spend;
    user.stats.totalCoinsSpent += spend;
  }

  setUser(userId, user);
  return user;
}

function addGoop(userId, amount) {
  const user = getUser(userId);
  const delta = Number(amount) || 0;

  if (delta >= 0) {
    user.goop += delta;
    user.stats.totalGoopEarned += delta;
  } else {
    const spend = Math.min(user.goop, Math.abs(delta));
    user.goop -= spend;
    user.stats.totalGoopSpent += spend;
  }

  setUser(userId, user);
  return user;
}

function addXP(userId, amount) {
  const user = getUser(userId);
  let xpGain = Math.max(0, Math.floor(Number(amount) || 0));
  user.xp += xpGain;

  let leveledUp = false;
  while (user.xp >= getXPNeeded(user.level)) {
    user.xp -= getXPNeeded(user.level);
    user.level += 1;
    leveledUp = true;
  }

  setUser(userId, user);

  return {
    user,
    gained: xpGain,
    leveledUp,
    level: user.level,
    nextLevelXP: getXPNeeded(user.level),
  };
}

function getCooldown(userId, key, cooldownMs) {
  const user = getUser(userId);
  const last = Number(user[key] || 0);
  const remaining = Math.max(0, last + Number(cooldownMs || 0) - Date.now());

  return {
    canProceed: remaining <= 0,
    remaining,
  };
}

function canAttack(userId, cooldownMs) {
  const user = getUser(userId);
  const remaining = Math.max(
    0,
    Number(user.attack?.lastAt || 0) + Number(cooldownMs || 0) - Date.now(),
  );
  return { ok: remaining <= 0, remaining };
}

function setLastAttack(userId, timestamp = Date.now()) {
  const user = getUser(userId);
  user.attack.lastAt = Number(timestamp) || Date.now();
  setUser(userId, user);
  return user.attack.lastAt;
}

function canArena(userId, cooldownMs) {
  const user = getUser(userId);
  const remaining = Math.max(
    0,
    Number(user.arena?.lastAt || 0) + Number(cooldownMs || 0) - Date.now(),
  );
  return { ok: remaining <= 0, remaining };
}

function setLastArena(userId, timestamp = Date.now()) {
  const user = getUser(userId);
  user.arena.lastAt = Number(timestamp) || Date.now();
  setUser(userId, user);
  return user.arena.lastAt;
}

function canWork(userId, jobId, cooldownMs) {
  const user = getUser(userId);
  const last = Number(user.jobs?.lastWorked?.[jobId] || 0);
  const remaining = Math.max(0, last + Number(cooldownMs || 0) - Date.now());
  return { ok: remaining <= 0, remaining };
}

function setLastWork(userId, jobId, timestamp = Date.now()) {
  const user = getUser(userId);
  if (!user.jobs) user.jobs = { selected: null, lastWorked: {} };
  if (!user.jobs.lastWorked) user.jobs.lastWorked = {};
  user.jobs.lastWorked[jobId] = Number(timestamp) || Date.now();
  setUser(userId, user);
  return user.jobs.lastWorked[jobId];
}

function setJob(userId, jobId) {
  const user = getUser(userId);
  user.jobs.selected = jobId;
  user.selectedJob = jobId;
  setUser(userId, user);
  return user;
}

function addItem(userId, itemId, amount = 1) {
  const user = getUser(userId);
  const qty = Math.max(1, Number(amount) || 1);
  user.items[itemId] = Number(user.items[itemId] || 0) + qty;
  setUser(userId, user);
  return user.items[itemId];
}

function getShopItems() {
  if (state.shop.dateKey !== getDateKey()) {
    state.shop.dateKey = getDateKey();
    state.shop.stock = Array.isArray(config.SHOP_POOL)
      ? [...config.SHOP_POOL]
      : [];
    queueSave();
  }
  return deepClone(state.shop.stock || []);
}

function getShopCountdown() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  const diff = next.getTime() - now.getTime();

  const totalSeconds = Math.max(0, Math.floor(diff / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function getActiveItemEffects(userId) {
  const user = getUser(userId);
  const now = Date.now();

  return {
    slimeShieldCharges: Math.max(0, Number(user.shields?.charges || 0)),
    expBoostRemainingMs: Math.max(
      0,
      Number(user.boosts?.xpBoostUntil || 0) - now,
    ),
  };
}

function getXPBoostMultiplier(userId) {
  const effects = getActiveItemEffects(userId);
  return effects.expBoostRemainingMs > 0 ? 2 : 1;
}

function consumeShieldCharge(userId) {
  const user = getUser(userId);
  const charges = Math.max(0, Number(user.shields?.charges || 0));

  if (charges <= 0) {
    return { ok: false, chargesRemaining: 0 };
  }

  user.shields.charges = charges - 1;
  setUser(userId, user);

  return {
    ok: true,
    chargesRemaining: user.shields.charges,
  };
}

function useItem(userId, itemId, quantity = 1) {
  const user = getUser(userId);
  const qty = Math.max(1, Number(quantity) || 1);
  const owned = Number(user.items[itemId] || 0);

  if (owned < qty) {
    return { ok: false, msg: "You do not own enough of that item." };
  }

  const item = (config.SHOP_POOL || []).find((i) => i.id === itemId);
  if (!item) {
    return { ok: false, msg: "That item does not exist in the shop pool." };
  }

  if (item.type !== "consumable") {
    return { ok: false, msg: "That item is not usable." };
  }

  user.items[itemId] = owned - qty;
  if (user.items[itemId] <= 0) delete user.items[itemId];

  let result = {
    ok: true,
    item,
    quantity: qty,
  };

  if (itemId === "slime_shield") {
    const chargePerItem = Number(item.uses || 1);
    const added = chargePerItem * qty;
    user.shields.charges = Number(user.shields.charges || 0) + added;

    result = {
      ...result,
      chargesAdded: added,
      totalCharges: user.shields.charges,
    };
  }

  if (itemId === "exp_boost") {
    const addMs = Number(item.duration_ms || 0) * qty;
    const now = Date.now();
    const base = Math.max(now, Number(user.boosts?.xpBoostUntil || 0));
    user.boosts.xpBoostUntil = base + addMs;

    result = {
      ...result,
      durationMsAdded: addMs,
      expires: user.boosts.xpBoostUntil,
    };
  }

  setUser(userId, user);
  return result;
}

function addSlime(userId, slime) {
  const user = getUser(userId);
  user.slimes.push(slime);
  if (!user.selectedSlimeId && slime?.uid) {
    user.selectedSlimeId = slime.uid;
  }
  setUser(userId, user);
  return slime;
}

function removeSlime(userId, slimeUid) {
  const user = getUser(userId);
  const before = user.slimes.length;
  user.slimes = user.slimes.filter((s) => s.uid !== slimeUid);
  if (user.selectedSlimeId === slimeUid) {
    user.selectedSlimeId = user.slimes[0]?.uid || null;
  }
  setUser(userId, user);
  return before !== user.slimes.length;
}

function setSelectedSlime(userId, slimeUid) {
  const user = getUser(userId);
  const exists = user.slimes.some((s) => s.uid === slimeUid);
  if (!exists) return false;
  user.selectedSlimeId = slimeUid;
  setUser(userId, user);
  return true;
}

function getTradeableAmount(userId, type) {
  const user = getUser(userId);
  if (type === "coins") return Number(user.coins || 0);
  if (type === "goop") return Number(user.goop || 0);
  return Number(user.items?.[type] || 0);
}

function addTradeableAmount(userId, type, delta) {
  const user = getUser(userId);
  const amount = Number(delta) || 0;

  if (type === "coins") {
    addCoins(userId, amount);
    return true;
  }

  if (type === "goop") {
    addGoop(userId, amount);
    return true;
  }

  const current = Number(user.items?.[type] || 0);
  const next = current + amount;
  if (next < 0) return false;

  if (!user.items) user.items = {};
  if (next === 0) delete user.items[type];
  else user.items[type] = next;

  setUser(userId, user);
  return true;
}

function getMultiplierValue(multipliers, key) {
  const map = {
    coin_gain: ["coin_gain", "coins"],
    goop_find: ["goop_find", "goop"],
    slime_drop: ["slime_drop", "slimes"],
    xp_gain: ["xp_gain", "xp"],
  };

  const keys = map[key] || [key];
  let value = 1;

  for (const k of keys) {
    const v = Number(multipliers?.[k] || 1);
    if (v > 0) value *= v;
  }

  return value;
}

function cleanupExpiredEvents() {
  const now = Date.now();
  state.events.active = (state.events.active || []).filter(
    (e) => Number(e.endsAt || 0) > now,
  );
}

function getActiveEvents() {
  cleanupExpiredEvents();
  return (state.events.active || []).map((e) => ({
    ...e,
    remainingMs: Math.max(0, Number(e.endsAt || 0) - Date.now()),
  }));
}

function getEventMultiplier(key) {
  const active = getActiveEvents();
  let total = 1;

  for (const event of active) {
    total *= getMultiplierValue(event.multipliers, key);
  }

  return total;
}

function startRandomEvent() {
  const pool = Array.isArray(config.EVENTS?.TYPES) ? config.EVENTS.TYPES : [];
  if (!pool.length) return null;
  const picked = pool[randInt(0, pool.length - 1)];
  return startEventById(picked.id);
}

function startEventById(id) {
  const def = (config.EVENTS?.TYPES || []).find((e) => e.id === id);
  if (!def) return null;

  const now = Date.now();
  const event = {
    id: def.id,
    name: def.name,
    description: def.description || "A global event is active.",
    color: def.color || null,
    duration_ms: Number(def.duration_ms || 3600000),
    multipliers: def.multipliers || {},
    startedAt: now,
    endsAt: now + Number(def.duration_ms || 3600000),
  };

  state.events.active = (state.events.active || []).filter(
    (e) => e.id !== def.id,
  );
  state.events.active.push(event);
  queueSave();

  return event;
}

function stopEvent(id) {
  cleanupExpiredEvents();

  if (!id) {
    const prev = [...state.events.active];
    state.events.active = [];
    queueSave();
    return prev;
  }

  const idx = state.events.active.findIndex((e) => e.id === id);
  if (idx === -1) return null;

  const [removed] = state.events.active.splice(idx, 1);
  queueSave();
  return removed;
}

function getEventStatus() {
  const activeEvents = getActiveEvents();
  return {
    activeEvents,
    totalMultipliers: {
      coin_gain: getEventMultiplier("coin_gain"),
      goop_find: getEventMultiplier("goop_find"),
      slime_drop: getEventMultiplier("slime_drop"),
      xp_gain: getEventMultiplier("xp_gain"),
    },
  };
}

function trackQuestProgress(userId, type, amount = 1) {
  const user = getUser(userId);

  if (!user.quests || user.quests.date !== getDateKey()) {
    user.quests = createQuestSet();
  }

  for (const quest of user.quests.current) {
    if (quest.claimed || quest.type !== type) continue;
    quest.progress = Math.min(
      Number(quest.goal || 1),
      Number(quest.progress || 0) + Number(amount || 1),
    );
    if (quest.progress >= quest.goal) quest.completed = true;
  }

  setUser(userId, user);
  return user.quests.current;
}

function claimQuestReward(userId, questId) {
  const user = getUser(userId);

  if (!user.quests || user.quests.date !== getDateKey()) {
    user.quests = createQuestSet();
  }

  const quest = user.quests.current.find((q) => q.id === questId);
  if (!quest) return { ok: false, msg: "Quest not found." };
  if (!quest.completed)
    return { ok: false, msg: "That quest is not complete yet." };
  if (quest.claimed)
    return { ok: false, msg: "That quest has already been claimed." };

  const def = (config.QUESTS?.POOL || []).find((q) => q.id === questId);
  if (!def) return { ok: false, msg: "Quest reward definition is missing." };

  quest.claimed = true;

  const rewardCoins = Math.max(0, Number(def.reward?.coins || 0));
  const rewardXP = Math.max(0, Number(def.reward?.xp || 0));
  const rewardGoop = Math.max(0, Number(def.reward?.goop || 0));

  if (rewardCoins) addCoins(userId, rewardCoins);
  if (rewardGoop) addGoop(userId, rewardGoop);
  if (rewardXP) addXP(userId, rewardXP);

  setUser(userId, user);

  return {
    ok: true,
    reward: {
      coins: rewardCoins,
      xp: rewardXP,
      goop: rewardGoop,
    },
  };
}

function resetUser(userId, { keepRebirths = false } = {}) {
  const current = getUser(userId);
  const next = defaultUser(userId);
  if (keepRebirths) next.rebirths = current.rebirths;
  state.users[String(userId)] = next;
  queueSave();
  return state.users[String(userId)];
}

function resetAll({ keepRebirths = false } = {}) {
  const ids = Object.keys(state.users);
  for (const id of ids) {
    resetUser(id, { keepRebirths });
  }
  queueSave();
  return ids.length;
}

function resetGuildTracking() {
  state.guilds = {};
  queueSave();
}

function resetShopState() {
  state.shop = {
    dateKey: getDateKey(),
    stock: Array.isArray(config.SHOP_POOL) ? [...config.SHOP_POOL] : [],
  };
  queueSave();
}

module.exports = {
  DATASTORE_KEY,
  DATA_PATH,

  read,

  getUser,
  setUser,

  recordInteraction,
  getGuildUserIds,

  addCoins,
  addGoop,
  addXP,
  getXPNeeded,

  getCooldown,

  canAttack,
  setLastAttack,

  canArena,
  setLastArena,

  canWork,
  setLastWork,
  setJob,

  trackQuestProgress,
  claimQuestReward,

  getActiveEvents,
  getEventMultiplier,
  getEventStatus,
  startRandomEvent,
  startEventById,
  stopEvent,

  addItem,
  useItem,
  getShopItems,
  getShopCountdown,
  getActiveItemEffects,
  getXPBoostMultiplier,
  consumeShieldCharge,

  addSlime,
  removeSlime,
  setSelectedSlime,

  getTradeableAmount,
  addTradeableAmount,

  resetUser,
  resetAll,
  resetGuildTracking,
  resetShopState,
};
