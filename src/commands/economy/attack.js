const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { simple, error, COLORS } = require("../../utils/embed");
const { getUser, setUser, addCoins, addGoop, addItem, addSlime, canAttack, setLastAttack, addXP, trackQuestProgress, getEventMultiplier, getActiveEvents, getXPBoostMultiplier, consumeShieldCharge } = require("../../utils/economy");
const config = require("../../../config");
const VFX = require("../../utils/vfx");

module.exports = {
  data: new SlashCommandBuilder().setName("attack").setDescription("Attack a wild slime for coins, slimes, and goop"),

  async execute(interaction) {
    try {
      const user = getUser(interaction.user.id);
      const cooldown = config.SLIMES.COOLDOWN_MS;
      const check = canAttack(interaction.user.id, cooldown);
      if (!check.ok) {
        const remaining = check.remaining;
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        return interaction.reply({ embeds: [error({ description: `${config.ICONS.REFRESH} You must wait **${mins}m ${secs}s** before attacking again.` })], flags: [MessageFlags.Ephemeral] });
      }

      // Track quest progress
      trackQuestProgress(interaction.user.id, "attack");

      // Event Multipliers
      const coinMult = getEventMultiplier("coin_gain");
      const goopMult = getEventMultiplier("goop_find");
      const slimeMult = getEventMultiplier("slime_drop");
      const xpBoostMult = getXPBoostMultiplier(interaction.user.id);
      const xpMult = getEventMultiplier("xp_gain") * xpBoostMult;
      const activeEvents = getActiveEvents();

      // Initial "Charging" Frame
      const chargingEmbed = simple({
        title: `${config.ICONS.ATTACK} Preparing Attack...`,
        description: `*You spot a wild slime in the distance and ready your weapon...*\n\n\`[ CHARGING ]\` ${VFX.progressBar(0.5, 1, 10)}${activeEvents.length ? `\n\n${config.ICONS.EVENT} **Events Active:** ${activeEvents.map((e) => e.name).join(", ")}` : ""}`,
        color: COLORS.INFO,
      });
      await interaction.reply({ embeds: [chargingEmbed] });

      // Small delay for "animation" feel
      await new Promise(resolve => setTimeout(resolve, 1000));

      const win = Math.random() < (config.SLIMES.WIN_CHANCE || 0.6);
      setLastAttack(interaction.user.id, Date.now());

      if (win) {
        const roll = Math.random();
        // Apply Luck Multiplier (Clover Leaf)
        const hasClover = user.items && user.items.clover_leaf > 0;
        let finalLootTiers = config.SLIMES.LUCK_TIERS;
        if (hasClover) {
          // Double the chance of Big and Critical finds
          finalLootTiers = config.SLIMES.LUCK_TIERS.map(t => ({
            ...t,
            chance: t.multiplier > 1 ? t.chance * 2 : t.chance
          }));
        }

        const tier = finalLootTiers.find(t => roll < t.chance) || finalLootTiers[2];
        const isCritical = tier.multiplier > 1;
        
        // Dynamic Coin Gaining: 10% - 30% of current coins (capped at reward max)
        const userCoins = user.coins || 0;
        const minGain = Math.max(config.SLIMES.REWARD_MIN, Math.floor(userCoins * 0.1));
        const maxGain = Math.max(config.SLIMES.REWARD_MAX, Math.floor(userCoins * 0.3));
        let baseReward = Math.floor(Math.random() * (maxGain - minGain + 1)) + minGain;
        
        // Apply Coin Boost (Lucky Charm)
        const hasLuckyCharm = user.items && user.items.lucky_charm > 0;
        if (hasLuckyCharm) baseReward = Math.floor(baseReward * 1.1);

        // Apply Fire Slime Bonus (20% coin boost)
        const hasFireSlime = user.variants && user.variants.some(v => v.id === "fire_slime");
        if (hasFireSlime) baseReward = Math.floor(baseReward * 1.2);

        const reward = Math.floor(baseReward * tier.multiplier * coinMult);

        // Apply Loot Luck (Goop Magnet)
        let goopChance = config.SLIMES.GOOP_CHANCE * goopMult;
        if (user.items && user.items.goop_magnet > 0) goopChance += 0.1;
        
        const goop = Math.random() < goopChance ? Math.floor(Math.random() * (config.SLIMES.GOOP_MAX - config.SLIMES.GOOP_MIN + 1)) + config.SLIMES.GOOP_MIN : 0;
        
        // Apply Slime Luck (Slime Treat)
        let slimeChance = config.SLIMES.SLIME_DROP_CHANCE * slimeMult;
        if (user.items && user.items.slime_treat > 0) slimeChance += 0.15;

        let droppedSlime = null;
        if (Math.random() < slimeChance) {
          const { generateRandomSlime } = require("../../utils/slimes");
          const luck = (user.items && user.items.slime_treat > 0) ? 1.5 : 1.0;
          droppedSlime = generateRandomSlime({ luck });
          addSlime(interaction.user.id, droppedSlime);
        }

        addCoins(interaction.user.id, reward);
        if (goop) addGoop(interaction.user.id, goop);

        const xpAmount = Math.floor((Math.floor(Math.random() * 15) + 10) * xpMult);
        const xpRes = addXP(interaction.user.id, xpAmount);

        let extraMsg = "";

        // Active Slime XP progression
        if (user.selectedSlimeId && user.slimes && user.slimes.length > 0) {
          const activeSlime = user.slimes.find(s => s.uid === user.selectedSlimeId);
          if (activeSlime) {
            const slimeXpAmount = Math.floor((Math.floor(Math.random() * 8) + 4) * xpMult);
            const { addSlimeXP } = require("../../utils/slimes");
            const slimeXpRes = addSlimeXP(activeSlime, slimeXpAmount);

            // Save updated slime list
            const updatedSlimes = user.slimes.map(s => s.uid === user.selectedSlimeId ? slimeXpRes.slime : s);
            setUser(interaction.user.id, { slimes: updatedSlimes });

            extraMsg += `\n${config.ICONS.SLIME} **${activeSlime.displayName}** gained **+${slimeXpAmount} Slime XP**!${slimeXpRes.leveledUp ? ` **Leveled Up to Lv.${slimeXpRes.level}!**` : ""}`;
          }
        }

        if (xpRes.leveledUp) extraMsg += `\n\n${config.ICONS.LEVEL_UP} **Level Up!** You are now level **${xpRes.level}**!`;
        if (xpBoostMult > 1) extraMsg += `\n${config.ICONS.XP} **EXP Booster active:** x${xpBoostMult.toFixed(2)}`;
        if (activeEvents.length) extraMsg += `\n${config.ICONS.EVENT} **Ongoing Events (${activeEvents.length}):** ${activeEvents.map((e) => e.name).join(", ")}`;

        const winMessages = [
          `You cornered a rogue slime and squeezed out some loot!`,
          `Bullseye! The slime burst into a shower of coins.`,
          `Victory! You scraped some valuable remains off the floor.`,
          `The slime stood no chance against your tactics.`,
          `A clean strike! You harvested the essence of your fallen foe.`,
          `With a swift blow, you forced the slime to surrender its stash.`
        ];
        const msg = winMessages[Math.floor(Math.random() * winMessages.length)];

        const parts = [`${config.ICONS.COIN} **${reward.toLocaleString()} coins**`];
        if (goop) parts.push(`${config.ICONS.GOOP} **${goop.toLocaleString()} goop**`);
        if (droppedSlime) parts.push(`${config.ICONS.SLIME} **${droppedSlime.displayName}** *(Rarity: ${droppedSlime.rarityId.toUpperCase()})*`);

        const title = isCritical ? VFX.screenShake(tier.label) : "Slime Defeated";

        const embed = simple({ 
          title: `${config.ICONS.SLIME_DEFEATED} ${title}`, 
          description: `${msg}\n\n${parts.join(" • ")}\n+${xpAmount} XP${extraMsg}`, 
          color: COLORS.SUCCESS
        });
        return interaction.editReply({ embeds: [embed] });
      } else {
        const roll = Math.random();
        const tier = config.SLIMES.RISK_TIERS.find(t => roll < t.chance) || config.SLIMES.RISK_TIERS[2];
        const isCriticalFailure = tier.multiplier > 1;
        
        const userCoins = Math.max(0, Math.floor(Number(user.coins) || 0));
        const configuredMin = Math.max(0, Number(config.SLIMES.PENALTY_MIN) || 0);
        const percentMin = Math.max(0, Number(config.SLIMES.PENALTY_PERCENT_MIN) || 0.12);
        const percentMax = Math.max(percentMin, Number(config.SLIMES.PENALTY_PERCENT_MAX) || 0.28);
        const balanceCap = Math.min(1, Math.max(0.1, Number(config.SLIMES.PENALTY_BALANCE_CAP) || 0.8));
        const eventRiskCap = Math.max(1, Number(config.SLIMES.PENALTY_EVENT_MULT_CAP) || 3);
        const eventRiskMult = Math.min(Math.max(1, coinMult), eventRiskCap);
        const lossPercent = Math.random() * (percentMax - percentMin) + percentMin;
        const percentPenalty = Math.floor(userCoins * lossPercent);
        const basePenalty = Math.min(userCoins, Math.max(configuredMin, percentPenalty));

        const shield = consumeShieldCharge(interaction.user.id);
        if (shield.ok) {
          const embed = simple({
            title: `${config.ICONS.SHIELD} Shield Protected!`,
            description: `You were defeated by a **${tier.label}** hit, but your **Slime Shield** absorbed the impact. You lost 0 coins!\n\n**Shield charges remaining:** ${shield.chargesRemaining.toLocaleString()}`,
            color: COLORS.INFO
          });
          return interaction.editReply({ embeds: [embed] });
        }

        const maxPenalty = Math.max(1, Math.floor(userCoins * balanceCap));
        let penalty = Math.min(userCoins, maxPenalty, Math.floor(basePenalty * tier.multiplier * eventRiskMult));

        // Apply Loss Reduction (Safety Gloves)
        const hasGloves = user.items && user.items.safety_gloves > 0;
        if (hasGloves) penalty = Math.floor(penalty * 0.5);
        
        addCoins(interaction.user.id, -penalty);
        
        const loseMessages = [
          `The slime counter-attacked! You had to pay for medical supplies.`,
          `Ouch! The slime dissolved a hole in your pocket.`,
          `You slipped on some goop and lost your wallet.`,
          `The slime was surprisingly aggressive. You retreated in shame.`,
          `You underestimated your opponent... it cost you dearly.`,
          `The slime's acidic touch burned through your coin pouch.`
        ];
        const msg = loseMessages[Math.floor(Math.random() * loseMessages.length)];

        const title = isCriticalFailure ? VFX.screenShake(tier.label) : "Defeat";

        const embed = simple({ 
          title: `${config.ICONS.DEFEAT} ${title}`, 
          description: `${msg}\n\nYou lost ${config.ICONS.COIN} **${penalty.toLocaleString()} coins** in the retreat.${eventRiskMult > 1 ? `\n${config.ICONS.EVENT} **Event danger:** x${eventRiskMult.toFixed(2)}` : ""}${activeEvents.length ? `\n${config.ICONS.EVENT} **Ongoing Events (${activeEvents.length}):** ${activeEvents.map((e) => e.name).join(", ")}` : ""}`, 
          color: COLORS.ERROR 
        });
        return interaction.editReply({ embeds: [embed] });
      }
    } catch (err) {
      console.error("Error in /attack:", err);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ embeds: [error({ description: "Something broke while processing the attack — check logs." })], flags: [MessageFlags.Ephemeral] });
        } else {
          await interaction.followUp({ embeds: [error({ description: "Something broke while processing the attack — check logs." })], flags: [MessageFlags.Ephemeral] });
        }
      } catch (e) {
        console.error("Failed to send error message in /attack:", e);
      }
    }
  },
};
