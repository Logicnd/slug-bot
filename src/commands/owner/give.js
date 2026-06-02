const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { simple, error, COLORS } = require("../../utils/embed");
const { addCoins, addGoop, getUser } = require("../../utils/economy");
const { isOwner } = require("../../utils/owners");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("give")
    .setDescription("Owner-only: give coins or goop to a user by ID or mention")
    .addStringOption((opt) =>
      opt.setName("target").setDescription("Target user ID or mention").setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("currency")
        .setDescription("coins or goop")
        .addChoices({ name: "coins", value: "coins" }, { name: "goop", value: "goop" })
        .setRequired(true),
    )
    .addIntegerOption((opt) => opt.setName("amount").setDescription("Amount to give").setRequired(true)),

  async execute(interaction) {
    if (!isOwner(interaction.user.id)) return interaction.reply({ embeds: [error({ description: "You are not authorized to use this command." })], flags: [MessageFlags.Ephemeral] });

    const raw = interaction.options.getString("target");
    const currency = interaction.options.getString("currency");
    const amount = interaction.options.getInteger("amount");

    if (!raw) return interaction.reply({ embeds: [error({ description: "Provide a target ID or mention." })], flags: [MessageFlags.Ephemeral] });

    // Support raw ID or mention like <@!ID> or <@ID>
    const idMatch = raw.match(/^(?:<@!?)?(\d+)>?$/);
    const targetId = idMatch ? idMatch[1] : raw;

    if (!/^[0-9]+$/.test(targetId)) return interaction.reply({ embeds: [error({ description: "Invalid ID provided." })], flags: [MessageFlags.Ephemeral] });

    // ensure target exists in DB
    getUser(targetId);

    if (currency === "coins") {
      addCoins(targetId, amount);
    } else {
      addGoop(targetId, amount);
    }

    const embed = simple({ title: "Give — Success", description: `Gave **${amount} ${currency}** to <@${targetId}> (ID: ${targetId})`, color: COLORS.SUCCESS });
    return interaction.reply({ embeds: [embed] });
  },
};
