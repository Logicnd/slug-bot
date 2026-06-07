const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getActiveEvents, getActiveItemEffects, getEventMultiplier, getUser } = require("../../utils/economy");
const { COLORS } = require("../../utils/embed");
const config = require("../../../config");

function formatMultiplier(value) {
  return `x${Number(value || 1).toFixed(2)}`;
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("multipliers")
    .setDescription("View current economy multipliers and active boosts"),

  async execute(interaction) {
    const user = getUser(interaction.user.id);
    const items = user.items || {};
    const effects = getActiveItemEffects(interaction.user.id);
    const activeEvents = getActiveEvents();

    const coinMult = getEventMultiplier("coin_gain");
    const goopMult = getEventMultiplier("goop_find");
    const slimeMult = getEventMultiplier("slime_drop");
    const eventXpMult = getEventMultiplier("xp_gain");
    const itemXpMult = effects.expBoostRemainingMs > 0 ? 2 : 1;
    const totalXpMult = eventXpMult * itemXpMult;
    const attackDangerMult = Math.min(
      Math.max(1, coinMult),
      Math.max(1, Number(config.SLIMES.PENALTY_EVENT_MULT_CAP) || 3)
    );
    const rebirthMult = 1 + (Number(user.rebirths || 0) * (config.REBIRTH.MULTIPLIER_PER_REBIRTH || 0));

    const globalLines = [
      `${config.ICONS.COIN} **Coin gain:** ${formatMultiplier(coinMult)}`,
      `${config.ICONS.GOOP} **Goop find:** ${formatMultiplier(goopMult)}`,
      `${config.ICONS.SLIME} **Slime drops:** ${formatMultiplier(slimeMult)}`,
      `${config.ICONS.XP} **XP events:** ${formatMultiplier(eventXpMult)}`,
      `${config.ICONS.XP} **XP total:** ${formatMultiplier(totalXpMult)}`,
      `${config.ICONS.DEFEAT} **Attack danger:** ${formatMultiplier(attackDangerMult)}`,
    ];

    const personalLines = [];
    if (rebirthMult > 1) personalLines.push(`${config.ICONS.REBIRTH} **Rebirth coins:** ${formatMultiplier(rebirthMult)}`);
    if (items.lucky_charm > 0) personalLines.push(`${config.ICONS.COIN} **Lucky Charm:** x1.10 coin gains`);
    if (items.goop_magnet > 0) personalLines.push(`${config.ICONS.GOOP} **Goop Magnet:** +10% goop chance`);
    if (items.slime_treat > 0) personalLines.push(`${config.ICONS.SLIME} **Slime Treat:** +15% slime drop chance`);
    if (items.clover_leaf > 0) personalLines.push(`${config.ICONS.GAMBLE} **Four-Leaf Clover:** x2 Big/Critical roll chance`);
    if (items.safety_gloves > 0) personalLines.push(`${config.ICONS.SHIELD} **Safety Gloves:** x0.50 attack losses`);
    if ((user.variants || []).some((variant) => variant.id === "fire_slime")) {
      personalLines.push(`${config.ICONS.SLIME} **Fire Slime:** x1.20 attack coin gains`);
    }
    if ((user.variants || []).some((variant) => variant.id === "ice_slime")) {
      personalLines.push(`${config.ICONS.REFRESH} **Ice Slime:** x0.75 cooldowns`);
    }
    if (effects.slimeShieldCharges > 0) {
      personalLines.push(`${config.ICONS.SHIELD} **Slime Shield:** ${effects.slimeShieldCharges.toLocaleString()} active charges`);
    }
    if (effects.expBoostRemainingMs > 0) {
      personalLines.push(`${config.ICONS.XP} **EXP Booster:** x2.00 for ${formatDuration(effects.expBoostRemainingMs)}`);
    }

    const embed = new EmbedBuilder()
      .setTitle(`${config.ICONS.STATS} Current Multipliers`)
      .setColor(COLORS.INFO)
      .setDescription(
        activeEvents.length
          ? `${config.ICONS.EVENT} **Events stacked:** ${activeEvents.map((event) => event.name).join(", ")}`
          : `${config.ICONS.EVENT} No active event multipliers.`
      )
      .addFields(
        {
          name: "Global Totals",
          value: globalLines.join("\n"),
          inline: false,
        },
        {
          name: "Your Boosts",
          value: personalLines.length ? personalLines.join("\n") : "No personal boosts active.",
          inline: false,
        }
      )
      .setFooter({ text: "Attack danger rises with coin event stacks and caps from config." })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};
