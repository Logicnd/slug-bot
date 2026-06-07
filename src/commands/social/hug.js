const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { simple, error, COLORS } = require("../../utils/embed");
const { addXP, getCooldown, setUser, getUser, trackQuestProgress, getEventMultiplier, getActiveEvents, getXPBoostMultiplier } = require("../../utils/economy");
const config = require("../../../config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("hug")
    .setDescription("Give another user a friendly squeeze for XP and potential bonuses")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The lucky slug to hug").setRequired(true)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("user");
    const userId = interaction.user.id;

    if (targetUser.id === userId) {
      return interaction.reply({
        embeds: [error({ description: "You can't hug yourself! Go find a friend." })],
        flags: [MessageFlags.Ephemeral],
      });
    }

    if (targetUser.bot) {
      return interaction.reply({
        embeds: [error({ description: "Bots are made of metal and circuits, they don't appreciate hugs." })],
        flags: [MessageFlags.Ephemeral],
      });
    }

    const cooldown = 30 * 60 * 1000; // 30 minutes
    const check = getCooldown(userId, "lastHug", cooldown);

    if (!check.canProceed) {
      const remaining = check.remaining;
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      return interaction.reply({
        embeds: [error({ description: `${config.ICONS.REFRESH} Your arms are tired! Wait **${mins}m ${secs}s** before hugging again.` })],
        flags: [MessageFlags.Ephemeral],
      });
    }

    // Track quest progress
    trackQuestProgress(userId, "hug");

    // Update cooldown
    setUser(userId, { lastHug: Date.now() });

    const user = getUser(userId);
    const targetData = getUser(targetUser.id);

    // Luck Factor: Critical Hug?
    const isCritical = Math.random() < 0.1; // 10% chance
    const xpBoostMult = getXPBoostMultiplier(userId);
    const xpMult = getEventMultiplier("xp_gain") * xpBoostMult;
    const activeEvents = getActiveEvents();
    
    // XP rewards
    let xpSender = Math.floor(Math.random() * 10) + 10; // 10-20 XP
    let xpReceiver = Math.floor(Math.random() * 5) + 5; // 5-10 XP

    if (isCritical) {
      xpSender *= 3;
      xpReceiver *= 3;
    }

    xpSender = Math.floor(xpSender * xpMult);
    xpReceiver = Math.floor(xpReceiver * xpMult);

    const resSender = addXP(userId, xpSender);
    const resReceiver = addXP(targetUser.id, xpReceiver);

    const hugMessages = [
      `**${interaction.user.username}** wrapped their arms around **${targetUser.username}**!`,
      `**${interaction.user.username}** gave **${targetUser.username}** a warm, squishy hug!`,
      `**${interaction.user.username}** shared some positive vibes with **${targetUser.username}**!`,
      `**${interaction.user.username}** and **${targetUser.username}** had a friendly moment.`,
      `**${interaction.user.username}** tackled **${targetUser.username}** with a massive bear hug!`,
      `**${interaction.user.username}** gently patted **${targetUser.username}**'s head and gave them a squeeze.`,
    ];
    const msg = hugMessages[Math.floor(Math.random() * hugMessages.length)];

    let extraInfo = "";
    if (resSender.leveledUp) extraInfo += `\n${config.ICONS.LEVEL_UP} **${interaction.user.username} leveled up to ${resSender.level}!**`;
    if (resReceiver.leveledUp) extraInfo += `\n${config.ICONS.LEVEL_UP} **${targetUser.username} leveled up to ${resReceiver.level}!**`;

    const embed = simple({
      title: isCritical ? `${config.ICONS.SUCCESS} CRITICAL HUG! ${config.ICONS.SUCCESS}` : `${config.ICONS.STATS} Friendly Hug`,
      description: `${msg}${xpBoostMult > 1 ? `\n${config.ICONS.XP} **EXP Booster active:** x${xpBoostMult.toFixed(2)}` : ""}${activeEvents.length ? `\n${config.ICONS.EVENT} **Ongoing Events (${activeEvents.length}):** ${activeEvents.map((e) => e.name).join(", ")}` : ""}\n\n${interaction.user.username}: **+${xpSender} XP**\n${targetUser.username}: **+${xpReceiver} XP**${extraInfo}`,
      color: isCritical ? "#ff69b4" : COLORS.INFO,
    });

    return interaction.reply({ embeds: [embed] });
  },
};
