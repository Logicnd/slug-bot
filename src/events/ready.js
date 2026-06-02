const { Events, ActivityType } = require("discord.js");

module.exports = {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    console.log(`[OK] Logged in as ${client.user.tag}`);
    console.log(`[OK] Loaded ${client.commands.size} commands`);
    console.log(`[OK] Serving ${client.guilds.cache.size} guilds`);

    try {
      await client.user.setActivity("I eat slime", {
        type: ActivityType.Playing,
      });
      console.log("[OK] Presence set successfully");
    } catch (err) {
      console.error("[ERROR] Failed to set presence:", err);
    }
  },
};
