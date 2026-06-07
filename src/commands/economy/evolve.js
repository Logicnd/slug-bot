const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { simple, error, COLORS } = require("../../utils/embed");
const { getUser, setUser, removeSlime, addGoop, trackQuestProgress } = require("../../utils/economy");
const config = require("../../../config");
const { RARITY_TIERS, VISUAL_MODIFIERS, SIZE_MODIFIERS, repairSlime } = require("../../utils/slimes");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("evolve")
    .setDescription("Use Goop to evolve a slime, risking its dissolution for a rare upgrade")
    .addStringOption((opt) =>
      opt
        .setName("slime")
        .setDescription("The UID of the slime to evolve (defaults to active/first slime)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const user = getUser(interaction.user.id);
    const slimes = user.slimes || [];
    const goop = user.goop || 0;

    if (slimes.length < 1) {
      return interaction.reply({
        embeds: [error({ description: "You don't have any slimes to evolve! Go `/attack` some first." })],
        flags: [MessageFlags.Ephemeral],
      });
    }

    if (goop < config.EVOLUTIONS.GOOP_COST) {
      return interaction.reply({
        embeds: [error({ description: `Evolution requires ${config.ICONS.GOOP} **${config.EVOLUTIONS.GOOP_COST} goop**. You only have **${goop}**.` })],
        flags: [MessageFlags.Ephemeral],
      });
    }

    const selectedId = interaction.options.getString("slime");
    let targetSlime = null;

    if (selectedId) {
      targetSlime = slimes.find(s => s.uid.toLowerCase() === selectedId.toLowerCase());
      if (!targetSlime) {
        return interaction.reply({
          embeds: [error({ description: `You don't own a slime with UID \`${selectedId}\`. Check \`/slimes\`.` })],
          flags: [MessageFlags.Ephemeral],
        });
      }
    } else {
      if (user.selectedSlimeId) {
        targetSlime = slimes.find(s => s.uid === user.selectedSlimeId);
      }
      if (!targetSlime) {
        targetSlime = slimes[0]; // fallback to first slime
      }
    }

    // Track quest progress
    trackQuestProgress(interaction.user.id, "evolve");

    // Deduct cost
    addGoop(interaction.user.id, -config.EVOLUTIONS.GOOP_COST);

    const roll = Math.random();
    const success = roll < config.EVOLUTIONS.SUCCESS_CHANCE;

    if (success) {
      const oldName = targetSlime.displayName;
      const oldPower = targetSlime.power;

      // Perform upgrade logic
      const upgradeRoll = Math.random();
      let upgradedSlime = { ...targetSlime };

      if (upgradeRoll < 0.45) {
        // Upgrade rarity tier if not max
        const currentRarityIdx = RARITY_TIERS.findIndex(r => r.id === targetSlime.rarityId);
        if (currentRarityIdx !== -1 && currentRarityIdx < RARITY_TIERS.length - 1) {
          upgradedSlime.rarityId = RARITY_TIERS[currentRarityIdx + 1].id;
        } else {
          upgradedSlime.visualId = "dark_matter";
        }
      } else if (upgradeRoll < 0.80) {
        // Upgrade visual modifier if not max
        const currentVisualIdx = VISUAL_MODIFIERS.findIndex(v => v.id === targetSlime.visualId);
        if (currentVisualIdx !== -1 && currentVisualIdx < VISUAL_MODIFIERS.length - 1) {
          upgradedSlime.visualId = VISUAL_MODIFIERS[currentVisualIdx + 1].id;
        } else {
          upgradedSlime.sizeId = "gigantic";
        }
      } else {
        // Upgrade size modifier if not max
        const currentSizeIdx = SIZE_MODIFIERS.findIndex(s => s.id === targetSlime.sizeId);
        if (currentSizeIdx !== -1 && currentSizeIdx < SIZE_MODIFIERS.length - 1) {
          upgradedSlime.sizeId = SIZE_MODIFIERS[currentSizeIdx + 1].id;
        } else {
          upgradedSlime.rarityId = "cosmic";
        }
      }

      // Repair/recalculate stats
      const finalizedSlime = repairSlime(upgradedSlime);

      // Update user's slimes collection
      const updatedSlimes = slimes.map(s => s.uid === targetSlime.uid ? finalizedSlime : s);
      setUser(interaction.user.id, { slimes: updatedSlimes });

      const embed = simple({
        title: "Evolution Success! 🧬",
        description: `Your **${oldName}** (Power: **${oldPower}**) absorbed the goop and mutated into:\n**${finalizedSlime.displayName}** (Power: **${finalizedSlime.power}**)!`,
        color: finalizedSlime.displayColor || COLORS.SUCCESS,
      });

      return interaction.reply({ embeds: [embed] });
    } else {
      // Remove the slime (it dissolves)
      removeSlime(interaction.user.id, targetSlime.uid);

      const embed = simple({
        title: "Evolution Failed 💀",
        description: `The goop reaction was too unstable! Your **${targetSlime.displayName}** has dissolved into nothingness.`,
        color: COLORS.ERROR,
      });

      return interaction.reply({ embeds: [embed] });
    }
  },
};
