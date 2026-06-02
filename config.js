// Central configuration for economy system
module.exports = {
  DEFAULT_COINS: 500,
  DEFAULT_GOOP: 0,

  DAILY: {
    MIN: 100,
    MAX: 400,
    GOOP_CHANCE: 0.07,
    GOOP_MIN: 1,
    GOOP_MAX: 3,
  },

  SEARCH: {
    MIN: 20,
    MAX: 150,
    GOOP_CHANCE: 0.03,
    GOOP_MIN: 1,
    GOOP_MAX: 2,
  },

  REBIRTH: {
    THRESHOLD_GOOP: 100,
    MAX_REBIRTHS: 10,
    REBIRTH_BONUS_COINS: 5000, // increased bonus
    MULTIPLIER_PER_REBIRTH: 0.15, // 15% coin multiplier per rebirth level
  },

  // default cooldowns (ms)
  COOLDOWNS: {
    WORK: 60 * 60 * 1000, // 1 hour default
  },

  // job definitions
  JOBS: [
    {
      id: "miner",
      name: "Miner",
      description: "Mine precious ores and sell them.",
      coinsMin: 80,
      coinsMax: 180,
      goopChance: 0.02,
      goopMin: 0,
      goopMax: 1,
      cooldownMs: 60 * 60 * 1000,
    },
    {
      id: "farmer",
      name: "Farmer",
      description: "Tend fields and harvest crops.",
      coinsMin: 60,
      coinsMax: 140,
      goopChance: 0.01,
      goopMin: 0,
      goopMax: 1,
      cooldownMs: 60 * 60 * 1000,
    },
    {
      id: "scavenger",
      name: "Scavenger",
      description: "Search ruins for lost items.",
      coinsMin: 40,
      coinsMax: 120,
      goopChance: 0.05,
      goopMin: 0,
      goopMax: 2,
      cooldownMs: 60 * 60 * 1000,
    },
    {
      id: "alchemist",
      name: "Alchemist",
      description: "Brew potions and experiment.",
      coinsMin: 20,
      coinsMax: 75,
      goopChance: 0.20,
      goopMin: 1,
      goopMax: 3,
      cooldownMs: 60 * 60 * 1000,
    },
    {
      id: "hunter",
      name: "Hunter",
      description: "Track elusive beasts.",
      coinsMin: 100,
      coinsMax: 250,
      goopChance: 0.01,
      goopMin: 0,
      goopMax: 1,
      cooldownMs: 90 * 60 * 1000,
    },
  ],
  SLIMES: {
    COINS_MIN: 20,
    COINS_MAX: 120,
    GOOP_CHANCE: 0.15,
    GOOP_MIN: 1,
    GOOP_MAX: 4,
    SLIME_DROP_CHANCE: 0.9, // chance to get a slime item
    WIN_CHANCE: 0.7,
    PENALTY_COINS: 10,
    COOLDOWN_MS: 10 * 60 * 1000, // 10 minutes between attacks
  },

  // Custom Icon Suite (Internal IDs for easy replacement)
  ICONS: {
    COIN: "", // <coin_id>
    SLIME: "", // <slime_id>
    GOOP: "", // <goop_id>
    REBIRTH: "", // <rebirth_id>
    STATS: "", // <stats_id>
    XP: "", // <xp_id>
    INVENTORY: "", // <inventory_id>
    ERROR: "", // <error_id>
    WARNING: "", // <warning_id>
    SUCCESS: "", // <success_id>
  },
};
