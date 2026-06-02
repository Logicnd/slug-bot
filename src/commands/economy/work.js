const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { simple, error, COLORS } = require("../../utils/embed");
const { getUser, addCoins, addGoop, canWork, setLastWork } = require("../../utils/economy");
const { getJob } = require("../../utils/jobs");
const config = require("../../../config");

module.exports = {
  data: new SlashCommandBuilder().setName("work").setDescription("Work your selected job to earn coins"),

  async execute(interaction) {
    const user = getUser(interaction.user.id);
    const selected = user.jobs && user.jobs.selected;
    if (!selected) return interaction.reply({ embeds: [error({ description: "You must select a job first. Use /job select <id>" })], flags: [MessageFlags.Ephemeral] });

    const job = getJob(selected);
    if (!job) return interaction.reply({ embeds: [error({ description: "Selected job is invalid. Use /job list and reselect." })], flags: [MessageFlags.Ephemeral] });

    const cooldown = job.cooldownMs || config.COOLDOWNS.WORK;
    const check = canWork(interaction.user.id, job.id, cooldown);
    if (!check.ok) {
      const remaining = check.remaining;
      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      const msg = `You must wait ${hours}h ${minutes}m to work ${job.name} again.`;
      return interaction.reply({ embeds: [error({ description: msg })], flags: [MessageFlags.Ephemeral] });
    }

    const multi = 1 + (Number(user.rebirths || 0) * (config.REBIRTH.MULTIPLIER_PER_REBIRTH || 0));
    const baseReward = Math.floor(Math.random() * (job.coinsMax - job.coinsMin + 1)) + job.coinsMin;
    const reward = Math.floor(baseReward * multi);
    
    addCoins(interaction.user.id, reward);

    let goopEarned = 0;
    if (Math.random() < (job.goopChance || 0)) {
      goopEarned = Math.floor(Math.random() * ((job.goopMax || 1) - (job.goopMin || 0) + 1)) + (job.goopMin || 0);
      if (goopEarned > 0) addGoop(interaction.user.id, goopEarned);
    }

    setLastWork(interaction.user.id, job.id, Date.now());

    let extraMsg = "";
    if (multi > 1) extraMsg = `\n*(x${multi.toFixed(2)} Rebirth Multiplier)*`;

    const embed = simple({
      title: "Work Completed",
      description: `You finished your shift as a **${job.name}** and earned:\n\n${config.ICONS.COIN} **${reward.toLocaleString()} coins**${goopEarned ? `\n${config.ICONS.GOOP} **${goopEarned.toLocaleString()} goop**` : ""}${extraMsg}`,
      color: COLORS.SUCCESS,
    });

    return interaction.reply({ embeds: [embed] });
  },
};
