const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { simple, error, COLORS } = require("../../utils/embed");
const fs = require("fs");
const econ = require("../../utils/economy");
const { getUser, addGoop, addCoins, setUser } = econ;
const config = require("../../../config");

module.exports = {
  data: new SlashCommandBuilder().setName("rebirth").setDescription("Prestige/rebirth when you have enough goop"),

  async execute(interaction) {
    const user = getUser(interaction.user.id);
    if ((user.rebirths || 0) >= config.REBIRTH.MAX_REBIRTHS) return interaction.reply({ embeds: [error({ description: "You have reached the maximum rebirths." })], flags: [MessageFlags.Ephemeral] });
    if ((user.goop || 0) < config.REBIRTH.THRESHOLD_GOOP) return interaction.reply({ embeds: [error({ description: `You need ${config.REBIRTH.THRESHOLD_GOOP} goop to rebirth.` })], flags: [MessageFlags.Ephemeral] });

    // consume goop and grant bonus coins, increment rebirths
    const oldRebirths = user.rebirths || 0;
    const newRebirths = oldRebirths + 1;
    
    setUser(interaction.user.id, {
       goop: (Number(user.goop) || 0) - config.REBIRTH.THRESHOLD_GOOP,
       rebirths: newRebirths,
       coins: (Number(user.coins) || 0) + config.REBIRTH.REBIRTH_BONUS_COINS
     });
 
     const embed = simple({ title: "Rebirth Complete", description: `You rebirthed and received **${config.REBIRTH.REBIRTH_BONUS_COINS.toLocaleString()} coins**. Rebirths: ${newRebirths}`, color: COLORS.SUCCESS });
    return interaction.reply({ embeds: [embed] });
  },
};
