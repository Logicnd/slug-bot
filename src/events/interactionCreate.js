const { Events, MessageFlags } = require("discord.js");
const { error } = require("../utils/embed");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const { client } = interaction;
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.warn(`[WARN] Unknown command: ${interaction.commandName}`);
      return;
    }

    if (typeof command.execute !== "function") {
      console.error(`[ERROR] Command missing execute(): ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`[ERROR] Command Error [/${interaction.commandName}]`, err);

      const errorMessage = "An unexpected error occurred while processing your request. Please try again later.";

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [error({ description: errorMessage })], flags: [MessageFlags.Ephemeral] });
        } else {
          await interaction.reply({ embeds: [error({ description: errorMessage })], flags: [MessageFlags.Ephemeral] });
        }
      } catch (notifyErr) {
        if (notifyErr.code === 10062) {
          console.warn("[WARN] Cannot notify user: interaction is unknown/expired (10062)");
        } else {
          console.error("[ERROR] Failed notifying user about error:", notifyErr);
        }
      }
    }
  },
};
