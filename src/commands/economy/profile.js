const { SlashCommandBuilder } = require("discord.js");
const config = require("../../../config");
const { simple, COLORS } = require("../../utils/embed");
const { getUser, getXPNeeded } = require("../../utils/economy");
const { getBestSlime } = require("../../utils/slimes");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View your current rank and stats"),

  async execute(interaction) {
    const user = getUser(interaction.user.id);
    const job = config.JOBS.find((j) => j.id === (user.jobs && user.jobs.selected));
    const slimes = user.slimes || [];
    
    // Calculate best slime, total slimes, total slime power
    const bestSlime = getBestSlime(slimes);
    const totalSlimes = slimes.length;
    const totalSlimePower = slimes.reduce((sum, s) => sum + (s.power || 0), 0);
    const activeSlime = slimes.find(s => s.uid === user.selectedSlimeId);

    // Determine Rank based on Level
    let rank = "Novice Slug";
    if (user.level >= 5) rank = "Slime Enthusiast";
    if (user.level >= 10) rank = "Goop Master";
    if (user.level >= 20) rank = "Slug Lord";
    if (user.rebirths > 0) rank = `Reborn ${rank}`;

    const xpNeeded = getXPNeeded(user.level);
    const progress = Math.floor((user.xp / xpNeeded) * 100);

    const profileFields = [
      `${config.ICONS.STATS} **Rank:** ${rank}`,
      `${config.ICONS.XP} **Level:** ${user.level} (${progress}%)`,
      `${config.ICONS.XP} \`${user.xp.toLocaleString()} / ${xpNeeded.toLocaleString()} XP\``,
      `\n${config.ICONS.JOB} **Job:** ${job ? job.name : "*Unemployed*"}`,
      `${config.ICONS.REBIRTH} **Rebirths:** ${user.rebirths || 0}`,
      `\n${config.ICONS.INVENTORY} **Balances**`,
      `${config.ICONS.COIN} **Coins:** \`${Number(user.coins).toLocaleString()}\``,
      `${config.ICONS.GOOP} **Goop:** \`${Number(user.goop).toLocaleString()}\``,
      `\n${config.ICONS.SLIME} **Slime Farm (${totalSlimes})**`,
      `⭐ **Active Companion:** ${activeSlime ? `**${activeSlime.displayName}** (Lv.${activeSlime.level})` : "*None selected*"}`,
      `🏆 **Best Slime:** ${bestSlime ? `**${bestSlime.displayName}** (Power: ${bestSlime.power})` : "*None*"}`,
      `💪 **Total Slime Power:** \`${totalSlimePower.toLocaleString()}\``
    ];

    const embed = simple({
      title: `${config.ICONS.STATS} ${interaction.user.username}'s Profile`,
      description: profileFields.join("\n"),
      color: activeSlime ? activeSlime.displayColor : COLORS.INFO,
    });

    embed.setThumbnail(
      interaction.user.displayAvatarURL({ dynamic: true, size: 128 }),
    );

    return interaction.reply({ embeds: [embed] });
  },
};
