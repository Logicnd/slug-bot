const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { simple, error, COLORS } = require("../../utils/embed");
const { getUser, addCoins, addGoop, addItem, canAttack, setLastAttack } = require("../../utils/economy");
const config = require("../../../config");

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
        return interaction.reply({ embeds: [error({ description: `You must wait ${mins}m ${secs}s before attacking again.` })], flags: [MessageFlags.Ephemeral] });
      }

      const win = Math.random() < (config.SLIMES.WIN_CHANCE || 0.7);
      setLastAttack(interaction.user.id, Date.now());

      if (!win) {
        // failed attack: lose small coins
        const penalty = config.SLIMES.PENALTY_COINS || 10;
        addCoins(interaction.user.id, -penalty);
        const embed = simple({ title: "Attack Failed", description: `You attacked the slime and it fought back. You lost **${penalty.toLocaleString()} coins**.`, color: COLORS.ERROR });
        return interaction.reply({ embeds: [embed] });
      }

      // win: rewards
      const multi = 1 + (Number(user.rebirths || 0) * (config.REBIRTH.MULTIPLIER_PER_REBIRTH || 0));
      const baseReward = Math.floor(Math.random() * (config.SLIMES.COINS_MAX - config.SLIMES.COINS_MIN + 1)) + config.SLIMES.COINS_MIN;
      const reward = Math.floor(baseReward * multi);
      addCoins(interaction.user.id, reward);

      let goop = 0;
      if (Math.random() < (config.SLIMES.GOOP_CHANCE || 0)) {
        goop = Math.floor(Math.random() * (config.SLIMES.GOOP_MAX - config.SLIMES.GOOP_MIN + 1)) + config.SLIMES.GOOP_MIN;
        if (goop > 0) addGoop(interaction.user.id, goop);
      }

      let slimeCount = 0;
      if (Math.random() < (config.SLIMES.SLIME_DROP_CHANCE || 0.9)) {
        slimeCount = 1; // each successful attack yields one slime item usually
        // Rebirth multi also affects slime drop chance scaling? Nah just coins for now.
        addItem(interaction.user.id, "slimes", slimeCount);
      }

      let extraMsg = "";
      if (multi > 1) extraMsg = `\n*(x${multi.toFixed(2)} Rebirth Multiplier)*`;

      const parts = [`${config.ICONS.COIN} **${reward.toLocaleString()} coins**`];
      if (goop) parts.push(`${config.ICONS.GOOP} **${goop.toLocaleString()} goop**`);
      if (slimeCount) parts.push(`${config.ICONS.SLIME} **${slimeCount.toLocaleString()} slime(s)**`);

      const embed = simple({ title: "Slime Defeated", description: `You took down the slime! Here's what you found:\n\n${parts.join(" • ")}${extraMsg}`, color: COLORS.SUCCESS });
      return interaction.reply({ embeds: [embed] });
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
