const { SlashCommandBuilder } = require("discord.js");
const config = require("../../../config");
const { simple, COLORS } = require("../../utils/embed");
const { getUser } = require("../../utils/economy");
const { getJob } = require("../../utils/jobs");
const { isOwner } = require("../../utils/owners");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View your economy profile, inventory, and stats"),

  async execute(interaction) {
    const user = getUser(interaction.user.id);
    const job =
      user.jobs && user.jobs.selected ? getJob(user.jobs.selected) : null;
    const slimes = (user.items && Number(user.items.slimes)) || 0;

    // Determine the user's rank/role title
    const rank = isOwner(interaction.user.id) ? "Bot Owner" : "Player";

    const profileFields = [
       `**Job:** ${job ? job.name : "*Unemployed*"}`,
       `${config.ICONS.REBIRTH} **Rebirths:** ${user.rebirths || 0}`,
       "\n**Balances**",
       `${config.ICONS.COIN} **Coins:** \`${Number(user.money).toLocaleString()}\``,
       `${config.ICONS.GOOP} **Goop:** \`${Number(user.goop).toLocaleString()}\``,
       `${config.ICONS.SLIME} **Slimes:** \`${slimes.toLocaleString()}\``,
     ];

    const embed = simple({
      title: `${interaction.user.username}'s Profile`,
      description: `**Rank:** ${rank}\n\n${profileFields.join("\n")}`,
      color: COLORS.INFO,
    });

    // Added a thumbnail of the user's avatar to make it feel more personal
    embed.setThumbnail(
      interaction.user.displayAvatarURL({ dynamic: true, size: 128 }),
    );

    return interaction.reply({ embeds: [embed] });
  },
};
