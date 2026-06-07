const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { simple, error, COLORS } = require("../../utils/embed");
const { getUser, addCoins, addGoop, canWork, setLastWork, addXP, trackQuestProgress, getEventMultiplier, getActiveEvents, getXPBoostMultiplier } = require("../../utils/economy");
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

    // Track quest progress
    trackQuestProgress(interaction.user.id, "work");

    // Event Multipliers
    const coinMult = getEventMultiplier("coin_gain");
    const goopMult = getEventMultiplier("goop_find");
    const xpBoostMult = getXPBoostMultiplier(interaction.user.id);
    const xpMult = getEventMultiplier("xp_gain") * xpBoostMult;
    const activeEvents = getActiveEvents();

    const multi = 1 + (Number(user.rebirths || 0) * (config.REBIRTH.MULTIPLIER_PER_REBIRTH || 0));
    const baseReward = Math.floor(Math.random() * (job.coinsMax - job.coinsMin + 1)) + job.coinsMin;
    const reward = Math.floor(baseReward * multi * coinMult);
    
    addCoins(interaction.user.id, reward);

    let goopEarned = 0;
    if (Math.random() < ((job.goopChance || 0) * goopMult)) {
      goopEarned = Math.floor(Math.random() * ((job.goopMax || 1) - (job.goopMin || 0) + 1)) + (job.goopMin || 0);
      if (goopEarned > 0) addGoop(interaction.user.id, goopEarned);
    }

    setLastWork(interaction.user.id, job.id, Date.now());

    // Add XP
    const xpAmount = Math.floor((Math.floor(Math.random() * 20) + 15) * xpMult); // 15-35 XP
    const xpRes = addXP(interaction.user.id, xpAmount);

    let extraMsg = "";
    if (multi > 1) extraMsg = `\n*(x${multi.toFixed(2)} Rebirth Multiplier)*`;
    if (xpRes.leveledUp) extraMsg += `\n\n${config.ICONS.LEVEL_UP} **Level Up!** You are now level **${xpRes.level}**!`;
    if (xpBoostMult > 1) extraMsg += `\n${config.ICONS.XP} **EXP Booster active:** x${xpBoostMult.toFixed(2)}`;
    if (activeEvents.length) extraMsg += `\n${config.ICONS.EVENT} **Ongoing Events (${activeEvents.length}):** ${activeEvents.map((e) => e.name).join(", ")}`;

    const workStories = [
      `You put in some serious hours at your station as a **${job.name}**.`,
      `It was a long shift, but you managed to get everything done as a **${job.name}**.`,
      `Your hard work as a **${job.name}** is really starting to show.`,
      `You efficiently handled your duties as a **${job.name}** today.`,
      `The boss was impressed with your performance as a **${job.name}**!`,
      `You finished your shift as a **${job.name}** feeling accomplished.`,
      `A busy day for a **${job.name}**, but the pay is worth it!`,
      `You navigated the challenges of being a **${job.name}** with ease.`
    ];
    const story = workStories[Math.floor(Math.random() * workStories.length)];

    const embed = simple({
      title: `${config.ICONS.WORK} Work Completed`,
      description: `${story}\n\n${config.ICONS.COIN} **${reward.toLocaleString()} coins**${goopEarned ? `\n${config.ICONS.GOOP} **${goopEarned.toLocaleString()} goop**` : ""}\n+${xpAmount} XP${extraMsg}`,
      color: COLORS.SUCCESS,
    });

    return interaction.reply({ embeds: [embed] });
  },
};
