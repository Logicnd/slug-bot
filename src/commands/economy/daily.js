const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { simple, error, COLORS } = require("../../utils/embed");
const fs = require("fs");
const econ = require("../../utils/economy");
const { getUser, addCoins, addGoop } = econ;
const config = require("../../../config");

module.exports = {
  data: new SlashCommandBuilder().setName("daily").setDescription("Claim your daily reward"),

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
      return interaction.reply({ embeds: [error({ description: `You must wait ${hours}h ${minutes}m to claim your next daily.` })], flags: [MessageFlags.Ephemeral] });
    }

    const multi = 1 + (Number(user.rebirths || 0) * (config.REBIRTH.MULTIPLIER_PER_REBIRTH || 0));
    const baseReward = Math.floor(Math.random() * (config.DAILY.MAX - config.DAILY.MIN + 1)) + config.DAILY.MIN;
    const reward = Math.floor(baseReward * multi);
    
    addCoins(userId, reward);

    let goop = 0;
    if (Math.random() < config.DAILY.GOOP_CHANCE) {
      goop = Math.floor(Math.random() * (config.DAILY.GOOP_MAX - config.DAILY.GOOP_MIN + 1)) + config.DAILY.GOOP_MIN;
      if (goop > 0) addGoop(userId, goop);
    }

    setUser(userId, { lastDaily: now });

    let extraMsg = "";
    if (multi > 1) extraMsg = `\n*(x${multi.toFixed(2)} Rebirth Multiplier)*`;

    const embed = simple({ 
      title: "Daily Reward", 
      description: `Nice! You've claimed your daily bonus.\n\n${config.ICONS.COIN} **${reward.toLocaleString()} coins**${goop ? `\n${config.ICONS.GOOP} **${goop.toLocaleString()} goop**` : ""}${extraMsg}`, 
      color: COLORS.SUCCESS 
    });
    return interaction.reply({ embeds: [embed] });
  },
};
