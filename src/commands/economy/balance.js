const { SlashCommandBuilder } = require("discord.js");
const config = require("../../../config");
const { simple, COLORS } = require("../../utils/embed");
const { getUser } = require("../../utils/economy");
const { getJob } = require("../../utils/jobs");

module.exports = {
  data: new SlashCommandBuilder().setName("balance").setDescription("Check your balances"),

  async execute(interaction) {
    const user = getUser(interaction.user.id);
    const jobId = user.jobs && user.jobs.selected;
    const job = jobId ? getJob(jobId) : null;

    const slimes = (user.items && Number(user.items.slimes)) || 0;
    const embed = simple({
      title: `${config.ICONS.STATS} ${interaction.user.username}'s Resources`,
      description: "Here's a quick look at your current stash.",
      color: COLORS.NEUTRAL,
      fields: [
        { name: `${config.ICONS.COIN} Coins`, value: `**${Number(user.coins).toLocaleString()}**`, inline: true },
        { name: `${config.ICONS.GOOP} Goop`, value: `**${Number(user.goop).toLocaleString()}**`, inline: true },
        { name: `${config.ICONS.SLIME} Slimes`, value: `**${slimes.toLocaleString()}**`, inline: true },
        { name: `${config.ICONS.JOB} Current Job`, value: job ? `**${job.name}**` : "*Unemployed*", inline: true },
      ],
    });

    await interaction.reply({ embeds: [embed] });
  },
};
