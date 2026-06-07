const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const config = require("../../../config");
const { simple, error, COLORS } = require("../../utils/embed");
const { getUser, addCoins } = require("../../utils/economy");
const VFX = require("../../utils/vfx");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gamble")
    .setDescription("Risk coins in a high-stakes dice roll")
    .addIntegerOption((opt) =>
      opt.setName("amount").setDescription("Amount to gamble").setRequired(true),
    ),

  async execute(interaction) {
    const amount = interaction.options.getInteger("amount");
    if (!amount || amount < 1) return interaction.reply({ embeds: [error({ description: "Bet must be at least 1" })], flags: [MessageFlags.Ephemeral] });

    const user = getUser(interaction.user.id);
    const coins = user.coins || 0;

    if (coins < amount) return interaction.reply({ embeds: [error({ description: "You don't have enough coins" })], flags: [MessageFlags.Ephemeral] });

    // Initial Rolling Frame
    const rollingEmbed = simple({
      title: `${config.ICONS.GAMBLE} Rolling the Dice...`,
      description: `*The dice tumble across the table...*\n\n\`[ BET: ${amount.toLocaleString()} ]\`\n\n**Result:** ?`,
      color: COLORS.INFO
    });
    await interaction.reply({ embeds: [rollingEmbed] });

    // Animation delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const win = Math.random() < 0.45;

    if (win) {
      addCoins(interaction.user.id, amount);

      const winMessages = [
        "You took the risk and it paid off!",
        "The dice rolled in your favor!",
        "You've doubled your stash with a lucky bet.",
        "A calculated risk led to a big payout.",
        "Fortune favors the bold slug!"
      ];
      const msg = winMessages[Math.floor(Math.random() * winMessages.length)];

      const particles = VFX.burst("GOLD", 5);
      const embed = simple({ 
        title: `${particles} WINNER ${particles}`, 
        description: `${VFX.screenShake(msg)}\n\nYou've doubled your ${config.ICONS.COIN} **${amount.toLocaleString()} coins**!`, 
        color: COLORS.SUCCESS 
      });
      await interaction.editReply({ embeds: [embed] });
    } else {
      addCoins(interaction.user.id, -amount);

      const loseMessages = [
        "Tough luck. You lost your bet.",
        "The house always wins, even against slugs.",
        "That's a painful loss for your wallet.",
        "The dice weren't kind to you today.",
        "Better luck next time, high roller."
      ];
      const msg = loseMessages[Math.floor(Math.random() * loseMessages.length)];

      const embed = simple({ 
        title: `${config.ICONS.ERROR} BUST`, 
        description: `${msg}\n\nYou lost your bet of ${config.ICONS.COIN} **${amount.toLocaleString()} coins**.`, 
        color: COLORS.ERROR 
      });
      await interaction.editReply({ embeds: [embed] });
    }
  },
};
