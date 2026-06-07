const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { simple, error, COLORS } = require("../../utils/embed");
const {
  createTrade,
  getTrade,
  deleteTrade,
  getUserTrades,
  pruneTrades,
} = require("../../utils/trades");
const {
  getTradeableAmount,
  addTradeableAmount,
} = require("../../utils/economy");
const config = require("../../../config");

// Build trade choices
const tradeChoices = [
  { name: "Coins", value: "coins" },
  { name: "Goop", value: "goop" },
  ...(config.SHOP_POOL || []).slice(0, 22).map((item) => ({
    name: item.name,
    value: item.id,
  })),
];

function getTradeLabel(type) {
  if (type === "coins") return "Coins";
  if (type === "goop") return "Goop";
  if (type === "slimes") return "Slimes";

  const item = (config.SHOP_POOL || []).find((i) => i.id === type);
  return item ? item.name : type;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("trade")
    .setDescription("Trade items and resources with other players")

    .addSubcommand((sub) =>
      sub
        .setName("offer")
        .setDescription("Offer a trade")
        .addUserOption((opt) =>
          opt
            .setName("user")
            .setDescription("User to trade with")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("offer_type")
            .setDescription("What you're offering")
            .setRequired(true)
            .addChoices(...tradeChoices),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("offer_amount")
            .setDescription("Amount")
            .setRequired(true)
            .setMinValue(1),
        )
        .addStringOption((opt) =>
          opt
            .setName("request_type")
            .setDescription("What you want")
            .setRequired(true)
            .addChoices(...tradeChoices),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("request_amount")
            .setDescription("Amount")
            .setRequired(true)
            .setMinValue(1),
        ),
    )

    .addSubcommand((sub) =>
      sub
        .setName("accept")
        .setDescription("Accept a trade")
        .addStringOption((opt) =>
          opt.setName("id").setDescription("Trade ID").setRequired(true),
        ),
    )

    .addSubcommand((sub) =>
      sub
        .setName("decline")
        .setDescription("Decline/cancel a trade")
        .addStringOption((opt) =>
          opt.setName("id").setDescription("Trade ID").setRequired(true),
        ),
    )

    .addSubcommand((sub) =>
      sub.setName("list").setDescription("View your trades"),
    ),

  async execute(interaction) {
    pruneTrades();

    const sub = interaction.options.getSubcommand();

    // =========================
    // OFFER
    // =========================
    if (sub === "offer") {
      const target = interaction.options.getUser("user");
      const offerType = interaction.options.getString("offer_type");
      const offerAmount = interaction.options.getInteger("offer_amount");
      const requestType = interaction.options.getString("request_type");
      const requestAmount = interaction.options.getInteger("request_amount");

      if (target.id === interaction.user.id) {
        return interaction.reply({
          embeds: [error({ description: "You can't trade with yourself." })],
          flags: [MessageFlags.Ephemeral],
        });
      }

      if (target.bot) {
        return interaction.reply({
          embeds: [error({ description: "Bots can't trade." })],
          flags: [MessageFlags.Ephemeral],
        });
      }

      if (offerType === requestType && offerAmount === requestAmount) {
        return interaction.reply({
          embeds: [error({ description: "This trade does nothing." })],
          flags: [MessageFlags.Ephemeral],
        });
      }

      const owned = getTradeableAmount(interaction.user.id, offerType);
      if (owned < offerAmount) {
        return interaction.reply({
          embeds: [
            error({
              description: `You only have **${owned.toLocaleString()} ${getTradeLabel(offerType)}**.`,
            }),
          ],
          flags: [MessageFlags.Ephemeral],
        });
      }

      const trade = createTrade({
        fromUserId: interaction.user.id,
        toUserId: target.id,
        offerType,
        offerAmount,
        requestType,
        requestAmount,
      });

      return interaction.reply({
        embeds: [
          simple({
            title: "Trade Offered",
            description:
              `**Trade ID:** \`${trade.id}\`\n\n` +
              `**To:** <@${target.id}>\n\n` +
              `You offer **${offerAmount.toLocaleString()} ${getTradeLabel(offerType)}**\n` +
              `For **${requestAmount.toLocaleString()} ${getTradeLabel(requestType)}**\n\n` +
              `Accept: \`/trade accept id:${trade.id}\`\n` +
              `Decline: \`/trade decline id:${trade.id}\``,
            color: COLORS.INFO,
          }),
        ],
      });
    }

    // =========================
    // ACCEPT
    // =========================
    if (sub === "accept") {
      const id = interaction.options.getString("id");
      const trade = getTrade(id);

      if (!trade) {
        return interaction.reply({
          embeds: [error({ description: "Trade not found or expired." })],
          flags: [MessageFlags.Ephemeral],
        });
      }

      if (trade.toUserId !== interaction.user.id) {
        return interaction.reply({
          embeds: [error({ description: "Not your trade." })],
          flags: [MessageFlags.Ephemeral],
        });
      }

      const senderOwned = getTradeableAmount(trade.fromUserId, trade.offerType);
      const receiverOwned = getTradeableAmount(
        trade.toUserId,
        trade.requestType,
      );

      if (
        senderOwned < trade.offerAmount ||
        receiverOwned < trade.requestAmount
      ) {
        deleteTrade(id);
        return interaction.reply({
          embeds: [error({ description: "Trade failed — resources changed." })],
          flags: [MessageFlags.Ephemeral],
        });
      }

      addTradeableAmount(trade.fromUserId, trade.offerType, -trade.offerAmount);
      addTradeableAmount(trade.toUserId, trade.offerType, trade.offerAmount);

      addTradeableAmount(
        trade.toUserId,
        trade.requestType,
        -trade.requestAmount,
      );
      addTradeableAmount(
        trade.fromUserId,
        trade.requestType,
        trade.requestAmount,
      );

      deleteTrade(id);

      return interaction.reply({
        embeds: [
          simple({
            title: "Trade Completed",
            description:
              `<@${trade.fromUserId}> traded **${trade.offerAmount.toLocaleString()} ${getTradeLabel(trade.offerType)}** ` +
              `for **${trade.requestAmount.toLocaleString()} ${getTradeLabel(trade.requestType)}** with <@${trade.toUserId}>.`,
            color: COLORS.SUCCESS,
          }),
        ],
      });
    }

    // =========================
    // DECLINE
    // =========================
    if (sub === "decline") {
      const id = interaction.options.getString("id");
      const trade = getTrade(id);

      if (!trade) {
        return interaction.reply({
          embeds: [error({ description: "Trade not found." })],
          flags: [MessageFlags.Ephemeral],
        });
      }

      if (
        trade.toUserId !== interaction.user.id &&
        trade.fromUserId !== interaction.user.id
      ) {
        return interaction.reply({
          embeds: [error({ description: "You can't cancel this trade." })],
          flags: [MessageFlags.Ephemeral],
        });
      }

      deleteTrade(id);

      return interaction.reply({
        embeds: [
          simple({
            title: "Trade Cancelled",
            description: `Trade \`${id}\` cancelled.`,
            color: COLORS.WARNING,
          }),
        ],
      });
    }

    // =========================
    // LIST
    // =========================
    if (sub === "list") {
      const trades = getUserTrades(interaction.user.id);

      if (!trades.length) {
        return interaction.reply({
          embeds: [
            simple({
              title: "Pending Trades",
              description: "No pending trades.",
              color: COLORS.NEUTRAL,
            }),
          ],
          flags: [MessageFlags.Ephemeral],
        });
      }

      const lines = trades.map((t) => {
        const dir =
          t.fromUserId === interaction.user.id ? "Outgoing" : "Incoming";
        const other =
          t.fromUserId === interaction.user.id ? t.toUserId : t.fromUserId;

        return (
          `**${dir}** — \`${t.id}\`\n` +
          `With: <@${other}>\n` +
          `Offer: **${t.offerAmount} ${getTradeLabel(t.offerType)}**\n` +
          `Request: **${t.requestAmount} ${getTradeLabel(t.requestType)}**`
        );
      });

      return interaction.reply({
        embeds: [
          simple({
            title: "Pending Trades",
            description: lines.join("\n\n"),
            color: COLORS.INFO,
          }),
        ],
        flags: [MessageFlags.Ephemeral],
      });
    }
  },
};
