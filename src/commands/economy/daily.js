const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { simple, error, COLORS } = require("../../utils/embed");
const { getUser, addCoins, addGoop, setUser, addXP, getEventMultiplier, getActiveEvents, getXPBoostMultiplier } = require("../../utils/economy");
const config = require("../../../config");

module.exports = {
  data: new SlashCommandBuilder().setName("daily").setDescription("Claim your daily coin and goop reward"),

  async execute(interaction) {
    const COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours
    const userId = interaction.user.id;
    const user = getUser(userId);

    const now = Date.now();
    const last = Number(user.lastDaily || 0);
    const remaining = COOLDOWN - (now - last);

    if (remaining > 0) {
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      return interaction.reply({ embeds: [error({ description: `${config.ICONS.REFRESH} You must wait **${hours}h ${minutes}m** to claim your next daily.` })], flags: [MessageFlags.Ephemeral] });
    }

    const multi = 1 + (Number(user.rebirths || 0) * (config.REBIRTH.MULTIPLIER_PER_REBIRTH || 0));
    const coinMult = getEventMultiplier("coin_gain");
    const goopMult = getEventMultiplier("goop_find");
    const xpBoostMult = getXPBoostMultiplier(userId);
    const xpMult = getEventMultiplier("xp_gain") * xpBoostMult;
    const activeEvents = getActiveEvents();
    const baseReward = Math.floor(Math.random() * (config.DAILY.MAX - config.DAILY.MIN + 1)) + config.DAILY.MIN;
    const reward = Math.floor(baseReward * multi * coinMult);
    
    addCoins(userId, reward);

    let goop = 0;
    if (Math.random() < (config.DAILY.GOOP_CHANCE * goopMult)) {
      goop = Math.floor(Math.random() * (config.DAILY.GOOP_MAX - config.DAILY.GOOP_MIN + 1)) + config.DAILY.GOOP_MIN;
      if (goop > 0) addGoop(userId, goop);
    }

    // Add XP
    const xpAmount = Math.floor(100 * xpMult);
    const xpRes = addXP(userId, xpAmount);

    setUser(userId, { lastDaily: now });

    let extraMsg = "";
    if (multi > 1) extraMsg = `\n*(x${multi.toFixed(2)} Rebirth Multiplier)*`;
    if (xpRes.leveledUp) extraMsg += `\n\n${config.ICONS.LEVEL_UP} **Level Up!** You are now level **${xpRes.level}**!`;
    if (xpBoostMult > 1) extraMsg += `\n${config.ICONS.XP} **EXP Booster active:** x${xpBoostMult.toFixed(2)}`;
    if (activeEvents.length) extraMsg += `\n${config.ICONS.EVENT} **Ongoing Events (${activeEvents.length}):** ${activeEvents.map((e) => e.name).join(", ")}`;

    const greetings = [
      "Rise and shine! The early slug gets the goop.",
      "Good morning! Here's your daily shipment of supplies.",
      "Another day, another trail of slime to leave behind.",
      "Welcome back! Your daily allowance has been processed.",
      "Greetings! Stay squishy out there today."
    ];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];

    const embed = simple({ 
      title: `${config.ICONS.REFRESH} Daily Reward`, 
      description: `${greeting}\n\n${config.ICONS.COIN} **${reward.toLocaleString()} coins**${goop ? `\n${config.ICONS.GOOP} **${goop.toLocaleString()} goop**` : ""}\n+${xpAmount} XP${extraMsg}`, 
      color: COLORS.SUCCESS 
    });
    return interaction.reply({ embeds: [embed] });
  },
};
