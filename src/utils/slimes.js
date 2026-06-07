const crypto = require("crypto");

/**
 * Slime System Utility
 * -----------------------------------------
 * Drop-in progression system for collectible slimes.
 *
 * Features:
 * - Base slime species
 * - Rarity tiers
 * - Visual modifiers
 * - Size modifiers
 * - Weighted generation
 * - Leveling + XP
 * - Stat scaling
 * - Display names / colors
 *
 * Example final names:
 * - Huge Fire Slime
 * - Golden Big Toxic Slime
 * - Dark Matter Gigantic Void Slime
 */

// =========================================
// CONSTANTS
// =========================================

const MAX_SLIME_LEVEL = 100;

// -----------------------------------------
// BASE SPECIES
// -----------------------------------------
const BASE_SPECIES = [
  {
    id: "nooby_slime",
    name: "Nooby Slime",
    element: "nature",
    baseHp: 60,
    baseDamage: 5,
    color: "#9ca3af",
    weight: 50,
  },
  {
    id: "basic_slug",
    name: "Basic Slug",
    element: "nature",
    baseHp: 88,
    baseDamage: 9,
    color: "#3b82f6",
    weight: 35,
  },
  {
    id: "green_slug",
    name: "Green Slug",
    element: "nature",
    baseHp: 35,
    baseDamage: 6,
    color: "#22c55e",
    weight: 30,
  },
  {
    id: "fire_slug",
    name: "Fire Slug",
    element: "fire",
    baseHp: 42,
    baseDamage: 8,
    color: "#ef4444",
    weight: 18,
  },
  {
    id: "ice_slug",
    name: "Ice Slug",
    element: "ice",
    baseHp: 46,
    baseDamage: 7,
    color: "#3b82f6",
    weight: 16,
  },
  {
    id: "toxic_slug",
    name: "Toxic Slug",
    element: "poison",
    baseHp: 40,
    baseDamage: 9,
    color: "#84cc16",
    weight: 14,
  },
  {
    id: "shadow_slug",
    name: "Shadow Slug",
    element: "shadow",
    baseHp: 52,
    baseDamage: 10,
    color: "#6b7280",
    weight: 10,
  },
  {
    id: "void_slug",
    name: "Void Slug",
    element: "void",
    baseHp: 64,
    baseDamage: 13,
    color: "#7c3aed",
    weight: 6,
  },
  {
    id: "crystal_slug",
    name: "Crystal Slug",
    element: "crystal",
    baseHp: 58,
    baseDamage: 12,
    color: "#06b6d4",
    weight: 4,
  },
  {
    id: "celestial_slug",
    name: "Celestial Slug",
    element: "light",
    baseHp: 72,
    baseDamage: 14,
    color: "#f59e0b",
    weight: 2,
  },
];

// -----------------------------------------
// RARITY TIERS
// -----------------------------------------
const RARITY_TIERS = [
  {
    id: "common",
    name: "Common",
    color: "#9ca3af",
    statMult: 1.0,
    weight: 4000,
  },
  {
    id: "uncommon",
    name: "Uncommon",
    color: "#22c55e",
    statMult: 1.25,
    weight: 2200,
  },
  {
    id: "rare",
    name: "Rare",
    color: "#3b82f6",
    statMult: 1.6,
    weight: 1100,
  },
  {
    id: "epic",
    name: "Epic",
    color: "#a855f7",
    statMult: 2.2,
    weight: 500,
  },
  {
    id: "legendary",
    name: "Legendary",
    color: "#f59e0b",
    statMult: 3.0,
    weight: 180,
  },
  {
    id: "mythic",
    name: "Mythic",
    color: "#ec4899",
    statMult: 4.2,
    weight: 70,
  },
  {
    id: "divine",
    name: "Divine",
    color: "#eab308",
    statMult: 6.0,
    weight: 22,
  },
  {
    id: "cosmic",
    name: "Cosmic",
    color: "#4f46e5",
    statMult: 9.0,
    weight: 5,
  },
];

// -----------------------------------------
// VISUAL MODIFIERS
// Keep "normal" first as default.
// -----------------------------------------
const VISUAL_MODIFIERS = [
  {
    id: "normal",
    name: "",
    color: null,
    statMult: 1.0,
    weight: 5000,
    minRarityIndex: 0,
  },
  {
    id: "shiny",
    name: "Shiny",
    color: "#f8fafc",
    statMult: 1.6,
    weight: 260,
    minRarityIndex: 1,
  },
  {
    id: "golden",
    name: "Golden",
    color: "#facc15",
    statMult: 2.2,
    weight: 120,
    minRarityIndex: 2,
  },
  {
    id: "rainbow",
    name: "Rainbow",
    color: "#d946ef",
    statMult: 3.2,
    weight: 40,
    minRarityIndex: 3,
  },
  {
    id: "dark_matter",
    name: "Dark Matter",
    color: "#111827",
    statMult: 5.5,
    weight: 8,
    minRarityIndex: 4,
  },
];

// -----------------------------------------
// SIZE MODIFIERS
// -----------------------------------------
const SIZE_MODIFIERS = [
  {
    id: "normal",
    name: "",
    statMult: 1.0,
    hpBias: 1.0,
    damageBias: 1.0,
    weight: 5000,
    minRarityIndex: 0,
  },
  {
    id: "big",
    name: "Big",
    statMult: 1.5,
    hpBias: 1.7,
    damageBias: 1.2,
    weight: 240,
    minRarityIndex: 1,
  },
  {
    id: "huge",
    name: "Huge",
    statMult: 2.4,
    hpBias: 2.4,
    damageBias: 1.8,
    weight: 70,
    minRarityIndex: 2,
  },
  {
    id: "gigantic",
    name: "Gigantic",
    statMult: 4.0,
    hpBias: 4.2,
    damageBias: 2.8,
    weight: 14,
    minRarityIndex: 4,
  },
];

// -----------------------------------------
// XP CURVE
// -----------------------------------------
function getSlimeXPNeeded(level) {
  const lvl = Math.max(1, Number(level) || 1);
  return Math.floor(40 + Math.pow(lvl, 1.45) * 18);
}

// =========================================
// HELPERS
// =========================================

function randomId() {
  return crypto.randomBytes(8).toString("hex");
}

function clamp(num, min, max) {
  return Math.min(max, Math.max(min, num));
}

function rollWeighted(items, getWeight) {
  const list = Array.isArray(items) ? items : [];
  const weights = list.map((item) => Math.max(0, Number(getWeight(item)) || 0));
  const total = weights.reduce((a, b) => a + b, 0);

  if (!list.length || total <= 0) {
    return list[0] || null;
  }

  let roll = Math.random() * total;
  for (let i = 0; i < list.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return list[i];
  }

  return list[list.length - 1];
}

function getRarityIndex(id) {
  const idx = RARITY_TIERS.findIndex((r) => r.id === id);
  return idx === -1 ? 0 : idx;
}

function findById(arr, id, fallbackIndex = 0) {
  const item = arr.find((x) => x.id === id);
  return item || arr[fallbackIndex] || null;
}

// =========================================
// LOOKUPS
// =========================================

function getSpecies(id) {
  return findById(BASE_SPECIES, id, 0);
}

function getRarity(id) {
  return findById(RARITY_TIERS, id, 0);
}

function getVisualModifier(id) {
  return findById(VISUAL_MODIFIERS, id, 0);
}

function getSizeModifier(id) {
  return findById(SIZE_MODIFIERS, id, 0);
}

// =========================================
// NAME / DISPLAY
// =========================================

function getSlimeDisplayName(slime) {
  const species = getSpecies(slime.speciesId);
  const visual = getVisualModifier(slime.visualId);
  const size = getSizeModifier(slime.sizeId);

  const parts = [];
  if (visual && visual.name) parts.push(visual.name);
  if (size && size.name) parts.push(size.name);
  if (species && species.name) parts.push(species.name);

  const baseName = parts.join(" ").trim() || "Unknown Slug";
  if (slime.nickname) return `"${slime.nickname}" (${baseName})`;
  return baseName;
}

function getSlimeDisplayColor(slime) {
  const visual = getVisualModifier(slime.visualId);
  const rarity = getRarity(slime.rarityId);
  const species = getSpecies(slime.speciesId);

  return visual?.color || rarity?.color || species?.color || "#22c55e";
}

function getSlimeEmojiKey(slime) {
  const visual = getVisualModifier(slime.visualId);
  const size = getSizeModifier(slime.sizeId);

  // You said you'll make custom emojis later.
  // This gives you a key you can map in config later.
  // Example returned values:
  // slime, shiny_slime, golden_slime, rainbow_slime, dark_matter_slime
  // huge_shiny_slime, gigantic_dark_matter_slime, etc.
  const parts = [];

  if (size?.id && size.id !== "normal") parts.push(size.id);
  if (visual?.id && visual.id !== "normal") parts.push(visual.id);

  parts.push("slime");
  return parts.join("_");
}

// =========================================
// STAT CALCULATION
// =========================================

function calculateSlimeStats(slime) {
  const species = getSpecies(slime.speciesId);
  const rarity = getRarity(slime.rarityId);
  const visual = getVisualModifier(slime.visualId);
  const size = getSizeModifier(slime.sizeId);

  const level = clamp(Number(slime.level) || 1, 1, MAX_SLIME_LEVEL);

  const baseHp = Number(species.baseHp) || 10;
  const baseDamage = Number(species.baseDamage) || 1;

  const rarityMult = Number(rarity.statMult) || 1;
  const visualMult = Number(visual.statMult) || 1;
  const sizeMult = Number(size.statMult) || 1;
  const hpBias = Number(size.hpBias) || 1;
  const damageBias = Number(size.damageBias) || 1;

  const levelHpMult = 1 + (level - 1) * 0.12;
  const levelDamageMult = 1 + (level - 1) * 0.1;

  const hp = Math.floor(
    baseHp * rarityMult * visualMult * sizeMult * hpBias * levelHpMult,
  );
  const damage = Math.floor(
    baseDamage *
      rarityMult *
      visualMult *
      sizeMult *
      damageBias *
      levelDamageMult,
  );

  return {
    hp: Math.max(1, hp),
    damage: Math.max(1, damage),
  };
}

function getSlimePower(slime) {
  const stats = calculateSlimeStats(slime);
  return Math.floor(stats.hp * 0.6 + stats.damage * 8);
}

// =========================================
// GENERATION LOGIC
// =========================================

function rollRarity({ luck = 1 } = {}) {
  const safeLuck = Math.max(1, Number(luck) || 1);

  // Higher luck slightly favors rarer tiers.
  // We reduce common weights and slightly boost rare weights.
  return rollWeighted(RARITY_TIERS, (rarity, index) => {
    const base = Number(rarity.weight) || 1;

    // Lower tiers weaken more with luck, upper tiers strengthen more.
    const bias =
      1 + (index / Math.max(1, RARITY_TIERS.length - 1)) * (safeLuck - 1) * 0.9;
    const softness = Math.max(
      0.12,
      1 -
        (safeLuck - 1) *
          0.12 *
          (1 - index / Math.max(1, RARITY_TIERS.length - 1)),
    );

    return base * bias * softness;
  });
}

function rollSpecies() {
  return rollWeighted(BASE_SPECIES, (species) => species.weight);
}

function rollVisualModifier(rarityId, { luck = 1 } = {}) {
  const rarityIndex = getRarityIndex(rarityId);
  const safeLuck = Math.max(1, Number(luck) || 1);

  const pool = VISUAL_MODIFIERS.filter(
    (v) => rarityIndex >= (v.minRarityIndex || 0),
  );
  return rollWeighted(pool, (modifier) => {
    const base = Number(modifier.weight) || 1;

    if (modifier.id === "normal") {
      return Math.max(1, base / Math.max(1, safeLuck));
    }

    return base * safeLuck;
  });
}

function rollSizeModifier(rarityId, { luck = 1 } = {}) {
  const rarityIndex = getRarityIndex(rarityId);
  const safeLuck = Math.max(1, Number(luck) || 1);

  const pool = SIZE_MODIFIERS.filter(
    (s) => rarityIndex >= (s.minRarityIndex || 0),
  );
  return rollWeighted(pool, (modifier) => {
    const base = Number(modifier.weight) || 1;

    if (modifier.id === "normal") {
      return Math.max(1, base / Math.max(1, safeLuck));
    }

    return base * safeLuck;
  });
}

function createSlime({
  speciesId,
  rarityId = "common",
  visualId = "normal",
  sizeId = "normal",
  level = 1,
  xp = 0,
  nickname = "Sluggy",
  createdAt = Date.now(),
} = {}) {
  const species = getSpecies(speciesId || BASE_SPECIES[0].id);
  const rarity = getRarity(rarityId);
  const visual = getVisualModifier(visualId);
  const size = getSizeModifier(sizeId);

  const slime = {
    uid: randomId(),
    speciesId: species.id,
    rarityId: rarity.id,
    visualId: visual.id,
    sizeId: size.id,
    level: clamp(Number(level) || 1, 1, MAX_SLIME_LEVEL),
    xp: Math.max(0, Number(xp) || 0),
    nickname: nickname || "Sluggy",
    createdAt: Number(createdAt) || Date.now(),
  };

  return repairSlime(slime);
}

function generateRandomSlime(options = {}) {
  const rarity = rollRarity(options);
  const species = rollSpecies();
  const visual = rollVisualModifier(rarity.id, options);
  const size = rollSizeModifier(rarity.id, options);

  return createSlime({
    speciesId: species.id,
    rarityId: rarity.id,
    visualId: visual.id,
    sizeId: size.id,
    level: 1,
    xp: 0,
    nickname: "Sluggy"
  });
}

function generateGachaSlime() {
  const species = rollSpecies();
  const rarity = rollRarity();

  let visualId = "normal";
  let sizeId = "normal";

  // Roll visual modifier first
  const visRoll = Math.random(); // 0 to 1
  if (visRoll < 0.01) visualId = "rainbow";       // 1% Rainbow
  else if (visRoll < 0.02) visualId = "dark_matter"; // 1% Dark Matter
  else if (visRoll < 0.07) visualId = "golden";      // 5% Golden
  else if (visRoll < 0.27) visualId = "shiny";       // 20% Shiny
  // 73% Normal visual

  // Roll size modifier (mutations)
  const sizeRoll = Math.random();
  if (sizeRoll < 0.005) sizeId = "gigantic";  // 0.5% Gigantic
  else if (sizeRoll < 0.025) sizeId = "huge";   // 2% Huge
  else if (sizeRoll < 0.125) sizeId = "big";    // 10% Big
  // 87.5% Normal size

  // Force modifier 60.87% of the time they hit normal-normal so that normal-normal overall is 25% (1/4)
  if (visualId === "normal" && sizeId === "normal") {
    if (Math.random() < 0.6087) {
      if (Math.random() < 0.80) {
        visualId = "shiny";
      } else {
        sizeId = "big";
      }
    }
  }

  return createSlime({
    speciesId: species.id,
    rarityId: rarity.id,
    visualId,
    sizeId,
    level: 1,
    xp: 0,
    nickname: "Sluggy"
  });
}

// =========================================
// LEVELING
// =========================================

function addSlimeXP(slime, amount) {
  const repaired = repairSlime(slime);
  let level = repaired.level;
  let xp = repaired.xp + Math.max(0, Number(amount) || 0);
  let leveledUp = false;

  while (level < MAX_SLIME_LEVEL) {
    const needed = getSlimeXPNeeded(level);
    if (xp < needed) break;
    xp -= needed;
    level += 1;
    leveledUp = true;
  }

  if (level >= MAX_SLIME_LEVEL) {
    level = MAX_SLIME_LEVEL;
    xp = 0;
  }

  const updated = repairSlime({
    ...repaired,
    level,
    xp,
  });

  return {
    slime: updated,
    leveledUp,
    level: updated.level,
    nextXP:
      updated.level >= MAX_SLIME_LEVEL ? 0 : getSlimeXPNeeded(updated.level),
  };
}

function getSlimeLevelProgress(slime) {
  const repaired = repairSlime(slime);
  if (repaired.level >= MAX_SLIME_LEVEL) {
    return {
      level: repaired.level,
      xp: 0,
      needed: 0,
      percent: 100,
    };
  }

  const needed = getSlimeXPNeeded(repaired.level);
  const xp = Math.max(0, Number(repaired.xp) || 0);

  return {
    level: repaired.level,
    xp,
    needed,
    percent: Math.floor((xp / needed) * 100),
  };
}

// =========================================
// REPAIR / NORMALIZE
// =========================================

function repairSlime(slime = {}) {
  const species = getSpecies(slime.speciesId || BASE_SPECIES[0].id);
  const rarity = getRarity(slime.rarityId || "common");
  const rarityIndex = getRarityIndex(rarity.id);

  let visual = getVisualModifier(slime.visualId || "normal");
  if (rarityIndex < (visual.minRarityIndex || 0)) {
    visual = getVisualModifier("normal");
  }

  let size = getSizeModifier(slime.sizeId || "normal");
  if (rarityIndex < (size.minRarityIndex || 0)) {
    size = getSizeModifier("normal");
  }

  const repaired = {
    uid: String(slime.uid || randomId()),
    speciesId: species.id,
    rarityId: rarity.id,
    visualId: visual.id,
    sizeId: size.id,
    level: clamp(Number(slime.level) || 1, 1, MAX_SLIME_LEVEL),
    xp: Math.max(0, Number(slime.xp) || 0),
    nickname: slime.nickname ? String(slime.nickname) : null,
    createdAt: Number(slime.createdAt) || Date.now(),
  };

  const stats = calculateSlimeStats(repaired);

  return {
    ...repaired,
    stats,
    displayName: getSlimeDisplayName(repaired),
    displayColor: getSlimeDisplayColor(repaired),
    emojiKey: getSlimeEmojiKey(repaired),
    power: getSlimePower(repaired),
  };
}

// =========================================
// SORT / COLLECTION HELPERS
// =========================================

function sortSlimesByPower(slimes = []) {
  return [...slimes].map(repairSlime).sort((a, b) => b.power - a.power);
}

function getBestSlime(slimes = []) {
  const sorted = sortSlimesByPower(slimes);
  return sorted[0] || null;
}

// =========================================
// EXPORTS
// =========================================

module.exports = {
  MAX_SLIME_LEVEL,

  BASE_SPECIES,
  RARITY_TIERS,
  VISUAL_MODIFIERS,
  SIZE_MODIFIERS,

  getSpecies,
  getRarity,
  getVisualModifier,
  getSizeModifier,

  getSlimeXPNeeded,
  getSlimeDisplayName,
  getSlimeDisplayColor,
  getSlimeEmojiKey,
  calculateSlimeStats,
  getSlimePower,

  createSlime,
  generateRandomSlime,
  generateGachaSlime,
  addSlimeXP,
  getSlimeLevelProgress,
  repairSlime,

  sortSlimesByPower,
  getBestSlime,
};
