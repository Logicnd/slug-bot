const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getEventStatus } = require("../../utils/economy");
const { COLORS } = require("../../utils/embed");
const config = require("../../../config");

const MULTIPLIER_LABELS = {
  coin_gain: "Coin gain",
  goop_find: "Goop find",
  slime_drop: "Slime drops",
  xp_gain: "XP gain",
};

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatMultipliers(multipliers = {}) {
  const entries = Object.entries(multipliers);
  if (!entries.length) return "No multipliers.";

  return entries
    .map(([key, value]) => `**${MULTIPLIER_LABELS[key] || key}:** x${Number(value).toFixed(2)}`)
    .join("\n");
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("events")
    .setDescription("List all active global events"),

  async execute(interaction) {
    const activeEvents = (getEventStatus().activeEvents || [])
      .slice()
      .sort((a, b) => (b.remainingMs || 0) - (a.remainingMs || 0));

    const embed = new EmbedBuilder()
      .setTitle(`${config.ICONS.EVENT} Active Events`)
      .setColor(activeEvents[0]?.color || COLORS.INFO)
      .setFooter({ text: "Event multipliers stack while events overlap." })
      .setTimestamp();

    if (!activeEvents.length) {
      embed.setDescription("No global events are active right now.");
      return interaction.reply({ embeds: [embed] });
    }

    embed.setDescription(`**${activeEvents.length}** event${activeEvents.length === 1 ? "" : "s"} active.`);
    embed.addFields(
      activeEvents.slice(0, 25).map((event) => ({
        name: `${event.name} - ${formatDuration(event.remainingMs || 0)} left`,
        value: `${event.description}\n${formatMultipliers(event.multipliers)}`,
        inline: false,
      }))
    );

    return interaction.reply({ embeds: [embed] });
  },
};
