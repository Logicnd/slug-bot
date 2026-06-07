const { SlashCommandBuilder } = require("discord.js");
const { getUser } = require("../../utils/economy");
const { sortSlimesByPower } = require("../../utils/slimes");
const { simple, COLORS } = require("../../utils/embed");
const config = require("../../../config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("slimes")
    .setDescription("List all your owned slimes, sorted by power"),

  async execute(interaction) {
    const user = getUser(interaction.user.id);
    const slimes = user.slimes || [];

    if (slimes.length === 0) {
      return interaction.reply({
        embeds: [simple({
          title: `${config.ICONS.SLIME} Your Slimes`,
          description: "Your farm is currently empty! Use `/attack` to find and capture wild slimes.",
          color: COLORS.NEUTRAL,
        })],
      });
    }

    // Sort slimes by power
    const sorted = sortSlimesByPower(slimes);
    
    // Total stats
    const totalPower = sorted.reduce((sum, s) => sum + (s.power || 0), 0);
    const activeSlime = sorted.find(s => s.uid === user.selectedSlimeId);

    const descriptionLines = [
      `Total Slimes: **${sorted.length}** | Total Power: **${totalPower.toLocaleString()}**`,
      `Active Slime: ${activeSlime ? `**${activeSlime.displayName}** (Lv. ${activeSlime.level})` : "*None selected (use `/slime set [uid]`)*"}\n`,
      `**Owned Slimes:**`,
    ];

    // Show up to 15 slimes. If more, show instructions on how to view details.
    const maxDisplay = 15;
    const displayed = sorted.slice(0, maxDisplay);

    displayed.forEach((s) => {
      const isActive = s.uid === user.selectedSlimeId ? `⭐ ` : ``;
      descriptionLines.push(
        `${isActive}\`[${s.uid}]\` **Lv.${s.level} ${s.displayName}**\n` +
        `   *Power:* **${s.power}** | *HP:* **${s.stats?.hp}** | *DMG:* **${s.stats?.damage}**`
      );
    });

    if (sorted.length > maxDisplay) {
      descriptionLines.push(`\n*...and ${sorted.length - maxDisplay} more slimes.*`);
    }

    descriptionLines.push(`\nUse \`/slime view [uid]\` to inspect details or \`/slime set [uid]\` to choose active slime.`);

    const embed = simple({
      title: `${config.ICONS.SLIME} ${interaction.user.username}'s Slimes`,
      description: descriptionLines.join("\n"),
      color: activeSlime ? activeSlime.displayColor : COLORS.INFO,
    });

    embed.setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 128 }));

    return interaction.reply({ embeds: [embed] });
  },
};
