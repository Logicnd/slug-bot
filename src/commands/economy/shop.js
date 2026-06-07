const {
  SlashCommandBuilder,
  MessageFlags,
  EmbedBuilder,
} = require("discord.js");
const { simple, error, COLORS } = require("../../utils/embed");
const {
  getUser,
  addCoins,
  addItem,
  getShopItems,
  getShopCountdown,
} = require("../../utils/economy");
const config = require("../../../config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("View and buy items from the daily shop")
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("List today's available stock"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("buy")
        .setDescription("Buy an item from today's stock")
        .addStringOption((opt) =>
          opt
            .setName("item")
            .setDescription("The ID of the item to buy")
            .setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("amount")
            .setDescription("The quantity to buy (default 1)")
            .setMinValue(1),
        ),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const currentStock = getShopItems();
    const countdown = getShopCountdown();

    if (sub === "list") {
      const user = getUser(interaction.user.id);
      const fields = currentStock.map((item) => ({
        name: `${item.name} — ${item.price.toLocaleString()} coins`,
        value: `${item.description}\n*ID: \`${item.id}\`*`,
        inline: false,
      }));

      const embed = new EmbedBuilder()
        .setTitle("The Daily Slug Shop")
        .setDescription(
          `Today's stock is fresh! Use \`/shop buy <id>\` to grab something.\n\nYour Balance: ${config.ICONS.COIN} **${user.coins.toLocaleString()} coins**\n\n${config.ICONS.REFRESH} **Stock Refreshes In:** ${countdown}`,
        )
        .addFields(fields)
        .setColor(COLORS.INFO)
        .setFooter({ text: "Stock resets daily at 00:00 GMT" });

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === "buy") {
      const itemId = interaction.options.getString("item").toLowerCase();
      const amount = interaction.options.getInteger("amount") || 1;
      const item = currentStock.find((i) => i.id === itemId);

      if (!item) {
        return interaction.reply({
          embeds: [
            error({
              description: `Item \`${itemId}\` is not in today's stock. Use \`/shop list\` to see what's available.`,
            }),
          ],
          flags: [MessageFlags.Ephemeral],
        });
      }

      const totalCost = item.price * amount;
      const user = getUser(interaction.user.id);

      if (user.coins < totalCost) {
        return interaction.reply({
          embeds: [
            error({
              description: `You don't have enough coins. You need **${totalCost.toLocaleString()}** but only have **${user.coins.toLocaleString()}**.`,
            }),
          ],
          flags: [MessageFlags.Ephemeral],
        });
      }

      addCoins(interaction.user.id, -totalCost);
      addItem(interaction.user.id, item.id, amount);

      const embed = simple({
        title: "Purchase Successful",
        description: `You bought **${amount}x ${item.name}** for ${config.ICONS.COIN} **${totalCost.toLocaleString()} coins**.`,
        color: COLORS.SUCCESS,
      });

      return interaction.reply({ embeds: [embed] });
    }
  },
};
