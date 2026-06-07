const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { isOwner } = require("../../utils/owners");
const { simple, error, COLORS } = require("../../utils/embed");
const {
  resetUser,
  resetAll,
  resetGuildTracking,
  resetShopState,
  DATASTORE_KEY,
} = require("../../utils/economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reset")
    .setDescription("Owner-only reset tools")
    .addSubcommand((sub) =>
      sub
        .setName("user")
        .setDescription("Reset one user's stats")
        .addUserOption((opt) =>
          opt
            .setName("target")
            .setDescription("User to reset")
            .setRequired(true),
        )
        .addBooleanOption((opt) =>
          opt.setName("keep_rebirths").setDescription("Keep rebirth count"),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("all")
        .setDescription("Reset all economy users in the current datastore")
        .addStringOption((opt) =>
          opt
            .setName("confirm")
            .setDescription("Type RESET_ALL to confirm")
            .setRequired(true),
        )
        .addBooleanOption((opt) =>
          opt
            .setName("keep_rebirths")
            .setDescription("Keep rebirths for everyone"),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("shop").setDescription("Force refresh the shop state"),
    )
    .addSubcommand((sub) =>
      sub.setName("guilds").setDescription("Clear tracked guild users"),
    ),

  async execute(interaction) {
    if (!isOwner(interaction.user.id)) {
      return interaction.reply({
        embeds: [error({ description: "Unauthorized." })],
        flags: [MessageFlags.Ephemeral],
      });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "user") {
      const target = interaction.options.getUser("target");
      const keepRebirths =
        interaction.options.getBoolean("keep_rebirths") || false;

      resetUser(target.id, { keepRebirths });

      return interaction.reply({
        embeds: [
          simple({
            title: "User Reset",
            description:
              `Reset stats for <@${target.id}> in datastore \`${DATASTORE_KEY}\`.` +
              (keepRebirths ? `\nRebirths were preserved.` : ""),
            color: COLORS.SUCCESS,
          }),
        ],
      });
    }

    if (sub === "all") {
      const confirm = interaction.options.getString("confirm");
      const keepRebirths =
        interaction.options.getBoolean("keep_rebirths") || false;

      if (confirm !== "RESET_ALL") {
        return interaction.reply({
          embeds: [
            error({
              description: "Confirmation text must be exactly `RESET_ALL`.",
            }),
          ],
          flags: [MessageFlags.Ephemeral],
        });
      }

      const count = resetAll({ keepRebirths });

      return interaction.reply({
        embeds: [
          simple({
            title: "Economy Reset",
            description:
              `Reset **${count}** users in datastore \`${DATASTORE_KEY}\`.` +
              (keepRebirths ? `\nRebirths were preserved.` : ""),
            color: COLORS.WARNING,
          }),
        ],
      });
    }

    if (sub === "shop") {
      resetShopState();

      return interaction.reply({
        embeds: [
          simple({
            title: "Shop Reset",
            description: `Daily shop was refreshed for datastore \`${DATASTORE_KEY}\`.`,
            color: COLORS.SUCCESS,
          }),
        ],
      });
    }

    if (sub === "guilds") {
      resetGuildTracking();

      return interaction.reply({
        embeds: [
          simple({
            title: "Guild Tracking Reset",
            description: `Tracked guild users were cleared for datastore \`${DATASTORE_KEY}\`.`,
            color: COLORS.SUCCESS,
          }),
        ],
      });
    }
  },
};
