const { SlashCommandBuilder } = require("discord.js");
const config = require("../../../config");
const { simple, error, COLORS } = require("../../utils/embed");
const { getUser, addCoins } = require("../../utils/economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gamble")
    .setDescription("Risk coins")
    .addIntegerOption((opt) =>
      opt.setName("amount").setDescription("Amount to gamble").setRequired(true),
    ),

  async execute(interaction) {
    const amount = interaction.options.getInteger("amount");
    if (!amount || amount < 1) return interaction.reply({ embeds: [error({ description: "Bet must be at least 1" })], flags: [MessageFlags.Ephemeral] });

    const user = getUser(interaction.user.id);

    if (user.money < amount) return interaction.reply({ embeds: [error({ description: "You don't have enough coins" })], flags: [MessageFlags.Ephemeral] });

    const win = Math.random() < 0.45;

    if (win) {
      // Rebirth doesn't multiply gamble amount (that's overpowered), but let's format numbers!
      addCoins(interaction.user.id, amount);
      const embed = simple({ 
        title: "Gamble — Winner!", 
        description: `You took the risk and it paid off! You've doubled your **${amount.toLocaleString()} coins**.`, 
        color: COLORS.SUCCESS 
      });
      await interaction.reply({ embeds: [embed] });
    } else {
      addCoins(interaction.user.id, -amount);
      const embed = simple({ 
        title: "Gamble — Lost", 
        description: `Tough luck. You lost your bet of **${amount.toLocaleString()} coins**. Better luck next time!`, 
        color: COLORS.ERROR 
      });
      await interaction.reply({ embeds: [embed] });
    }
  },
};
