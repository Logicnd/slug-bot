const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getUser, addCoins, addSlime } = require("../../utils/economy");
const { generateGachaSlime } = require("../../utils/slimes");
const { simple, error, COLORS } = require("../../utils/embed");
const config = require("../../../config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Summon/roll a new companion slug for 1,000 coins"),

  async execute(interaction) {
    const user = getUser(interaction.user.id);
    const cost = config.SLIMES.ROLL_COST || 1000;

    if (user.coins < cost) {
      return interaction.reply({
        embeds: [error({ description: `Summoning a slug requires ${config.ICONS.COIN} **${cost.toLocaleString()} coins**. You only have **${Number(user.coins).toLocaleString()}**.` })],
        flags: [MessageFlags.Ephemeral]
      });
    }

    // Deduct cost
    addCoins(interaction.user.id, -cost);

    // Roll slug
    const slug = generateGachaSlime();
    addSlime(interaction.user.id, slug);

    const isLucky = slug.visualId !== "normal" || slug.sizeId !== "normal";
    const particles = isLucky ? "✨" : "";

    const details = [
      `You spent ${config.ICONS.COIN} **${cost.toLocaleString()} coins** to roll a new companion...\n`,
      `🎉 **You summoned: ${particles}${slug.displayName}${particles}**!`,
      `\n**Rarity:** ${slug.rarityId.toUpperCase()}`,
      `**Visual:** ${slug.visualId.toUpperCase()}`,
      `**Size:** ${slug.sizeId.toUpperCase()}`,
      `💪 **Calculated Power:** \`${slug.power.toLocaleString()}\` (HP: ${slug.stats?.hp} • DMG: ${slug.stats?.damage})`,
      `\nUse \`/slime set uid:${slug.uid}\` to set it as your active companion!`
    ];

    const embed = simple({
      title: `${config.ICONS.SLIME} Slug Summoned!`,
      description: details.join("\n"),
      color: slug.displayColor || COLORS.SUCCESS
    });

    embed.setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 128 }));

    return interaction.reply({ embeds: [embed] });
  }
};
