const { SlashCommandBuilder } = require("discord.js");
const { simple, error, COLORS } = require("../../utils/embed");
const fs = require("fs");
const econ = require("../../utils/economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Show leaderboard for coins, goop, or rebirths")
    .addStringOption((opt) =>
      opt
        .setName("metric")
        .setDescription("Which metric to rank")
        .addChoices(
          { name: "Coins", value: "coins" },
          { name: "Goop", value: "goop" },
          { name: "Rebirths", value: "rebirths" },
        )
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("scope")
        .setDescription("server or global leaderboard")
        .addChoices({ name: "Server", value: "server" }, { name: "Global", value: "global" })
        .setRequired(false),
    ),

  async execute(interaction) {
    const metric = interaction.options.getString("metric") || "coins";
    const scope = interaction.options.getString("scope") || "server";

    try {
      const dataPath = econ.DATA_PATH || (process.cwd() + "/data.json");
      const data = typeof econ.read === "function" ? econ.read() : JSON.parse(fs.readFileSync(dataPath, "utf8") || "{}");
      const entries = Object.keys(data).map((id) => {
        const u = data[id] || {};
        let val = 0;
        if (metric === "coins") val = Number(u.money || 0);
        else if (metric === "goop") val = Number(u.goop || 0);
        else if (metric === "rebirths") val = Number(u.rebirths || 0);
        return { id, value: val };
      });

      let filtered = entries;

      if (scope === "server") {
        if (!interaction.guild) return interaction.reply({ embeds: [error({ description: "Server scope requires a guild." })], flags: [MessageFlags.Ephemeral] });

        // attempt to ensure members are fetched (may require GUILD_MEMBERS intent)
        if (interaction.guild.members.cache.size < 1) {
          await interaction.guild.members.fetch().catch(() => {});
        }

        const memberIds = new Set([...interaction.guild.members.cache.keys()]);
        filtered = entries.filter((e) => memberIds.has(e.id));
      }

      filtered.sort((a, b) => b.value - a.value);

      const top = filtered.slice(0, 10);
      if (!top.length) return interaction.reply({ embeds: [error({ description: "No data available for that scope/metric." })], ephemeral: true });

      const lines = await Promise.all(
        top.map(async (e, i) => {
          let display = e.id;
          try {
            const fetcher = interaction.client && interaction.client.users && interaction.client.users.fetch;
            if (fetcher) {
              const user = await fetcher.call(interaction.client.users, e.id);
              if (user && user.username) display = `${user.username}`;
            }
          } catch (err) {
            console.warn('leaderboard: failed to fetch user', e.id, err && err.message);
          }

          const formatted = typeof e.value === 'number' ? e.value.toLocaleString() : String(e.value);
          return `**#${i + 1}** — ${display} — **${formatted}**`;
        }),
      );

      const titleMap = { coins: "Coins", goop: "Goop", rebirths: "Rebirths" };
      const embed = simple({ title: `${titleMap[metric]} Leaderboard (${scope})`, description: lines.join("\n"), color: COLORS.NEUTRAL });
      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error("[ERROR] Leaderboard error:", err);
      return interaction.reply({ embeds: [error({ description: "Failed to load leaderboard — check logs." })], flags: [MessageFlags.Ephemeral] });
    }
  },
};
