const { SlashCommandBuilder, EmbedBuilder, version: djsVersion, MessageFlags } = require("discord.js");
const { isOwner } = require("../../utils/owners");
const { read, startRandomEvent, startEventById, stopEvent, getEventStatus } = require("../../utils/economy");
const { COLORS, simple } = require("../../utils/embed");
const config = require("../../../config");
const os = require("os");

function formatDuration(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${s}s`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("admin")
    .setDescription("Bot owner dashboard and maintenance")
    .addSubcommand(sub => sub.setName("stats").setDescription("View bot statistics"))
    .addSubcommand((sub) => {
      const eventChoices = (config.EVENTS.TYPES || []).slice(0, 25).map((e) => ({
        name: e.name,
        value: e.id,
      }));

      return sub
        .setName("event")
        .setDescription("Manage global events")
        .addStringOption((opt) =>
          opt
            .setName("action")
            .setDescription("What do you want to do?")
            .addChoices(
              { name: "Status", value: "status" },
              { name: "Start", value: "start" },
              { name: "Start All", value: "start_all" },
              { name: "Stop", value: "stop" },
            )
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("id")
            .setDescription("Event id (used by start/stop)")
            .addChoices(...eventChoices)
            .setRequired(false),
        );
    }),

  async execute(interaction) {
    if (!isOwner(interaction.user.id)) {
      return interaction.reply({ content: "Unauthorized.", flags: [MessageFlags.Ephemeral] });
    }

    const sub = interaction.options.getSubcommand() || "stats";

    if (sub === "stats") {
      const client = interaction.client;
      const econData = read();
      const userCount = Object.keys(econData).length;

      // Calculate system uptime
      const uptime = process.uptime();
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const mins = Math.floor((uptime % 3600) / 60);

      const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
      const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);

      const embed = new EmbedBuilder()
        .setTitle("SlugBot Admin Dashboard")
        .setColor(COLORS.INFO)
        .addFields(
          {
            name: `${config.ICONS.STATS} Bot Stats`,
            value: `**Servers:** ${client.guilds.cache.size}\n**Users Found:** ${userCount}\n**Ping:** ${client.ws.ping}ms`,
            inline: true,
          },
          {
            name: `${config.ICONS.INVENTORY} System`,
            value: `**Uptime:** ${days}d ${hours}h ${mins}m\n**Memory:** ${memoryUsage}MB / ${totalMem}GB\n**Node:** ${process.version}`,
            inline: true,
          },
          {
            name: `${config.ICONS.STATS} Versions`,
            value: `**Discord.js:** v${djsVersion}\n**OS:** ${os.platform()} ${os.arch()}`,
            inline: true,
          }
        )
        .setFooter({ text: "Self-Hosting Active via PM2" })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === "event") {
      const action = interaction.options.getString("action");

      if (action === "status") {
        const status = getEventStatus();
        const activeEvents = status.activeEvents || [];
        const embed = new EmbedBuilder()
          .setTitle(`${config.ICONS.EVENT} Global Event Status`)
          .setColor(COLORS.WARNING);

        if (!activeEvents.length) {
          embed.setDescription("No active event right now.");
          return interaction.reply({ embeds: [embed] });
        }

        const lines = activeEvents
          .slice()
          .sort((a, b) => (b.remainingMs || 0) - (a.remainingMs || 0))
          .map((ev) => {
            const multipliers = ev.multipliers || {};
            const multLines = Object.entries(multipliers)
              .map(([k, v]) => `- **${k}**: x${Number(v).toFixed(2)}`)
              .join("\n");

            return `**${ev.name}**\n${ev.description}\n**Time Remaining:** ${formatDuration(ev.remainingMs || 0)}\n**Multipliers**\n${multLines || "- (none)"}`;
          });

        embed.setDescription(lines.join("\n\n"));

        return interaction.reply({ embeds: [embed] });
      }

      if (action === "stop") {
        const id = interaction.options.getString("id");
        const prev = stopEvent(id || undefined);
        const embed = new EmbedBuilder()
          .setTitle(`${config.ICONS.EVENT} Event Stopped`)
          .setColor(COLORS.WARNING)
          .setDescription(
            Array.isArray(prev)
              ? prev.length
                ? `Stopped **${prev.map((e) => e.name).join(", ")}**.`
                : "No active events to stop."
              : prev
                ? `Stopped **${prev.name}**.`
                : "No active event to stop."
          );
        return interaction.reply({ embeds: [embed] });
      }

      if (action === "start") {
        const id = interaction.options.getString("id");
        const event = id ? startEventById(id) : startRandomEvent();
        if (!event) {
          const embed = new EmbedBuilder()
            .setTitle(`${config.ICONS.EVENT} Invalid Event`)
            .setColor(COLORS.WARNING)
            .setDescription("That event id doesn't exist.");
          return interaction.reply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
          .setTitle(`${config.ICONS.EVENT} Admin Event Started`)
          .setColor(COLORS.WARNING)
          .setDescription(`**${event.name}**\n${event.description}\n\nThis event is now stacked with any other active events.`);

        return interaction.reply({ embeds: [embed] });
      }

      if (action === "start_all") {
        const startedEvents = (config.EVENTS.TYPES || [])
          .map((eventDef) => startEventById(eventDef.id))
          .filter(Boolean);

        const embed = new EmbedBuilder()
          .setTitle(`${config.ICONS.EVENT} Admin Abuse Event Started`)
          .setColor(COLORS.WARNING)
          .setDescription(
            startedEvents.length
              ? `Started/refreshed **${startedEvents.length}** stacked events:\n\n${startedEvents.map((event) => `- **${event.name}**`).join("\n")}`
              : "No event definitions were found."
          )
          .setFooter({ text: "Yes, this is exactly as unbalanced as it sounds." });

        return interaction.reply({ embeds: [embed] });
      }

      return interaction.reply({
        embeds: [new EmbedBuilder().setTitle(`${config.ICONS.EVENT} Invalid Action`).setColor(COLORS.WARNING)],
        flags: [MessageFlags.Ephemeral],
      });
    }
  },
};
