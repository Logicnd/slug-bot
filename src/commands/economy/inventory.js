const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getUser, getActiveItemEffects } = require("../../utils/economy");
const config = require("../../../config");
const { COLORS } = require("../../utils/embed");

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
    .setName("inventory")
    .setDescription("View your collected items and resources"),

  async execute(interaction) {
    const user = getUser(interaction.user.id);
    const items = user.items || {};
    const effects = getActiveItemEffects(interaction.user.id);

    // Filter out slimes which are shown on profile, and items with 0 count
    const ownedItems = Object.entries(items).filter(
      ([key, count]) => key !== "slimes" && count > 0
    );

    const activeFields = [];
    if (effects.slimeShieldCharges > 0) {
      activeFields.push({
        name: `${config.ICONS.SHIELD} Active Shield Charges`,
        value: `**${effects.slimeShieldCharges.toLocaleString()}** defeat blocks ready.`,
        inline: true,
      });
    }

    if (effects.expBoostRemainingMs > 0) {
      activeFields.push({
        name: `${config.ICONS.XP} EXP Booster`,
        value: `Double XP for **${formatDuration(effects.expBoostRemainingMs)}**.`,
        inline: true,
      });
    }

    if (ownedItems.length === 0 && activeFields.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle(`${config.ICONS.INVENTORY} ${interaction.user.username}'s Inventory`)
        .setDescription("Your inventory is currently empty. Go explore or visit the `/shop`!")
        .setColor(COLORS.NEUTRAL);

      return interaction.reply({ embeds: [embed] });
    }

    const fields = ownedItems.map(([id, count]) => {
      const itemInfo = (config.SHOP_POOL || []).find((i) => i.id === id);
      const name = itemInfo ? itemInfo.name : id.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      const description = itemInfo ? itemInfo.description : "No description available.";
      
      return {
        name: `${name} (x${count})`,
        value: description,
        inline: true,
      };
    });

    const embed = new EmbedBuilder()
      .setTitle(`${config.ICONS.INVENTORY} ${interaction.user.username}'s Inventory`)
      .addFields([...fields, ...activeFields])
      .setColor(COLORS.INFO)
      .setFooter({ text: `${config.ICONS.SLIME} You also have ${(user.slimes ? user.slimes.length : 0)} slimes in your farm.` });

    return interaction.reply({ embeds: [embed] });
  },
};
