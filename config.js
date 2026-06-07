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
    REBIRTH_BONUS_COINS: 5000,
    MULTIPLIER_PER_REBIRTH: 0.15,
  },

  LEVELING: {
    BASE_XP: 100,
    XP_MULTIPLIER: 1.5,
  },

  QUESTS: {
    DAILY_COUNT: 3,
    POOL: [
      {
        id: "daily_work",
        type: "work",
        goal: 2,
        name: "Hard Worker",
        reward: { coins: 500, xp: 100 },
      },
      {
        id: "daily_hug",
        type: "hug",
        goal: 3,
        name: "Social Butterfly",
        reward: { coins: 300, xp: 50 },
      },
      {
        id: "daily_gamble",
        type: "gamble",
        goal: 5,
        name: "High Roller",
        reward: { coins: 1000, xp: 200 },
      },
    ],
  },

  EVENTS: {
    CHANCE_PER_HOUR: 0.15,
    TYPES: [
      {
        id: "gold_rush",
        name: "Gold Rush",
        duration_ms: 3600000,
        multipliers: { coins: 2.0 },
      },
      {
        id: "xp_frenzy",
        name: "XP Frenzy",
        duration_ms: 3600000,
        multipliers: { xp: 2.0 },
      },
    ],
  },

  SHOP_POOL: [
    {
      id: "slime_shield",
      name: "Slime Shield",
      price: 1500,
      type: "consumable",
      uses: 5,
      description: "Protects your slimes from attacks.",
    },
    {
      id: "exp_boost",
      name: "XP Boost",
      price: 2000,
      type: "consumable",
      duration_ms: 7200000,
      description: "Double XP for 2 hours.",
    },
  ],

  COOLDOWNS: {
    WORK: 60 * 60 * 1000,
  },

  JOBS: [
    {
      id: "miner",
      name: "Miner",
      description: "Mine precious ores.",
      coinsMin: 80,
      coinsMax: 180,
      goopChance: 0.02,
      goopMin: 0,
      goopMax: 1,
      cooldownMs: 3600000,
    },
    {
      id: "farmer",
      name: "Farmer",
      description: "Tend fields.",
      coinsMin: 60,
      coinsMax: 140,
      goopChance: 0.01,
      goopMin: 0,
      goopMax: 1,
      cooldownMs: 3600000,
    },
    {
      id: "scavenger",
      name: "Scavenger",
      description: "Search ruins.",
      coinsMin: 40,
      coinsMax: 120,
      goopChance: 0.05,
      goopMin: 0,
      goopMax: 2,
      cooldownMs: 3600000,
    },
    {
      id: "alchemist",
      name: "Alchemist",
      description: "Brew potions.",
      coinsMin: 20,
      coinsMax: 75,
      goopChance: 0.2,
      goopMin: 1,
      goopMax: 3,
      cooldownMs: 3600000,
    },
    {
      id: "hunter",
      name: "Hunter",
      description: "Track beasts.",
      coinsMin: 100,
      coinsMax: 250,
      goopChance: 0.01,
      goopMin: 0,
      goopMax: 1,
      cooldownMs: 5400000,
    },
  ],

  SLIMES: {
    COINS_MIN: 20,
    COINS_MAX: 120,
    GOOP_CHANCE: 0.15,
    GOOP_MIN: 1,
    GOOP_MAX: 4,
    SLIME_DROP_CHANCE: 0.9,
    WIN_CHANCE: 0.7,
    PENALTY_COINS: 10,
    COOLDOWN_MS: 600000,
    ROLL_COST: 1000,
  },

  // ✅ CLEAN: no emojis, ready for custom IDs later
  ICONS: {
    COIN: "<:coin:1512191873165557850>",
    GAMBLE: "<:gamble:1512209827265515601>",
    SHIELD: "<:shield:1512209975953326090>",
    EVENT: "<:event:1512212438827925554>",
    REFRESH: "<:refresh:1512212017115828387>",
    DEFEAT: "<:defeat:1512210191532294227>",
    ARENA: "<:arena:1512209583060291615>",
    SLIME: "<:slime:1512192268214341642>",
    LEVEL: "<:level:1512192200333852813>",
    GOOP: "<:goop:1512192144969040075>",
    SEARCH: "<:search:1512203978966958220>",
    WORK: "<:work:1512204554479992872>",
    REBIRTH: "<:rebirth:1512206647160737832>",
    STATS: "<:stats:1512192296609911004>",
    QUEST: "<:quest:1512195541679870052>",
    JOB: "<:job:1512202619655815391>",
    XP: "<:xp:1512194653187866714>",
    ATTACK: "<:attack:1512205083033600020>",
    INVENTORY: "<:inventory:1512209278797086793>",
    ERROR: "<:error:1512215192379850773>",
    SUCCESS: "<:success:1512214738212491444>",
  },

  // safety block (prevents crashes)
  ECONOMY: {
    POOL: {},
    TYPES: {},
  },
};
