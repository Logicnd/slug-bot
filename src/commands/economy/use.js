const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { simple, error, COLORS } = require("../../utils/embed");
const { useItem } = require("../../utils/economy");
const config = require("../../../config");

const consumableChoices = (config.SHOP_POOL || [])
  .filter((item) => item.type === "consumable")
  .slice(0, 25)
  .map((item) => ({ name: item.name, value: item.id }));

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("use")
    .setDescription("Use a consumable item from your inventory")
    .addStringOption((opt) => {
      opt
        .setName("item")
        .setDescription("The item to use")
        .setRequired(true);

      if (consumableChoices.length) opt.addChoices(...consumableChoices);
      return opt;
    })
    .addIntegerOption((opt) =>
      opt
        .setName("quantity")
        .setDescription("How many to use")
        .setMinValue(1)
        .setRequired(false)
    ),

  async execute(interaction) {
    const itemId = interaction.options.getString("item").toLowerCase();
    const quantity = interaction.options.getInteger("quantity") || 1;
    const result = useItem(interaction.user.id, itemId, quantity);

    if (!result.ok) {
      return interaction.reply({
        embeds: [error({ description: result.msg || "That item could not be used." })],
        flags: [MessageFlags.Ephemeral],
      });
    }

    let description = `Used **${result.quantity.toLocaleString()}x ${result.item.name}**.`;

    if (itemId === "slime_shield") {
      description += `\n\n${config.ICONS.SHIELD} Added **${result.chargesAdded.toLocaleString()} shield charges**.\n**Active charges:** ${result.totalCharges.toLocaleString()}`;
    }

    if (itemId === "exp_boost") {
      description += `\n\n${config.ICONS.XP} Added **${formatDuration(result.durationMsAdded)}** of double XP.\n**Boost ends:** <t:${Math.floor(result.expires / 1000)}:R>`;
    }

    const embed = simple({
      title: `${config.ICONS.INVENTORY} Item Used`,
      description,
      color: COLORS.SUCCESS,
    });

    return interaction.reply({ embeds: [embed] });
  },
};
