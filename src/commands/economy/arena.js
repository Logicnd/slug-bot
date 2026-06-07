const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require("discord.js");
const { simple, error, COLORS } = require("../../utils/embed");
const { getUser, setUser, addCoins, addGoop, addXP, canArena, setLastArena, getEventMultiplier, getActiveEvents, getXPBoostMultiplier } = require("../../utils/economy");
const config = require("../../../config");
const VFX = require("../../utils/vfx");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("arena")
    .setDescription("Fight a Mega Slime boss for massive rewards")
    .addStringOption((opt) =>
      opt
        .setName("slime")
        .setDescription("Choose which rare slime variant to fight with")
        .setRequired(false)
    ),

  async execute(interaction) {
    const user = getUser(interaction.user.id);
    const cooldown = config.ARENA.COOLDOWN_MS;
    const check = canArena(interaction.user.id, cooldown);

    if (!check.ok) {
      const remaining = check.remaining;
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      return interaction.reply({
        embeds: [error({ description: `The Arena is still being cleaned! Wait **${mins}m ${secs}s**.` })],
        flags: [MessageFlags.Ephemeral],
      });
    }

    const selectedId = interaction.options.getString("slime");
    const slimes = user.slimes || [];
    let activeSlime = null;

    if (selectedId) {
      activeSlime = slimes.find(
        (s) => s.uid.toLowerCase() === selectedId.toLowerCase() ||
               s.displayName.toLowerCase().includes(selectedId.toLowerCase())
      );
      if (!activeSlime) {
        return interaction.reply({
          embeds: [error({ description: `You don't own a slime matching \`${selectedId}\`. Check your \`/slimes\` for your slimes list.` })],
          flags: [MessageFlags.Ephemeral],
        });
      }
    } else {
      if (user.selectedSlimeId) {
        activeSlime = slimes.find(s => s.uid === user.selectedSlimeId);
      }
      if (!activeSlime && slimes.length > 0) {
        const { getBestSlime } = require("../../utils/slimes");
        activeSlime = getBestSlime(slimes);
      }
    }

    if (!activeSlime) {
      return interaction.reply({
        embeds: [error({ description: "You don't have any slimes to fight in the Arena! Go \`/attack\` some first." })],
        flags: [MessageFlags.Ephemeral],
      });
    }

    setLastArena(interaction.user.id, Date.now());

    const coinMult = getEventMultiplier("coin_gain");
    const goopMult = getEventMultiplier("goop_find");
    const xpBoostMult = getXPBoostMultiplier(interaction.user.id);
    const xpMult = getEventMultiplier("xp_gain") * xpBoostMult;
    const activeEvents = getActiveEvents();

    // Combat Stats
    const playerMaxHP = (activeSlime.stats?.hp || 35) + (user.level * 5);
    let playerHP = playerMaxHP;
    const bossMaxHP = config.ARENA.BOSS_HP;
    let bossHP = bossMaxHP;
    const combatLog = [];
    const bonus = activeSlime ? config.ARENA.VARIANT_BONUSES[activeSlime.speciesId] : null;

    combatLog.push(`${config.ICONS.ARENA} **Battle Start!** You sent out **${activeSlime.displayName}** (Lv. ${activeSlime.level})!${activeEvents.length ? `\n${config.ICONS.EVENT} **Events Active:** ${activeEvents.map((e) => e.name).join(", ")}` : ""}`);

    // We'll perform the simulation and then "animate" it in 4 key steps
    const simulation = [];
    let turn = 1;
    while (playerHP > 0 && bossHP > 0 && turn <= 15) {
      // Player Turn
      let damage = Math.floor(Math.random() * (activeSlime.stats?.damage || 6)) + Math.floor((activeSlime.stats?.damage || 6) * 0.5) + (user.level * 2);
      if (bonus?.damage_mult) damage = Math.floor(damage * bonus.damage_mult);
      
      let effectText = "";
      if (bonus?.freeze_chance && Math.random() < bonus.freeze_chance) {
        effectText = ` ${config.ICONS.DEFEAT} **FROZEN!**`;
        damage += 20; // Extra dmg for freeze
      }
      if (bonus?.lifesteal) {
        const heal = Math.floor(damage * bonus.lifesteal);
        playerHP = Math.min(playerMaxHP, playerHP + heal);
        effectText = ` ${config.ICONS.SUCCESS} **Healed ${heal} HP!**`;
      }

      bossHP -= damage;
      combatLog.push(`**T${turn}**: You dealt **${damage}** dmg.${effectText}`);

      if (bossHP <= 0) break;

      // Boss Turn
      const bossDmg = Math.floor(Math.random() * (config.ARENA.BOSS_ATTACK_MAX - config.ARENA.BOSS_ATTACK_MIN)) + config.ARENA.BOSS_ATTACK_MIN;
      playerHP -= bossDmg;
      combatLog.push(`**T${turn}**: Boss dealt **${bossDmg}** dmg to you.`);

      // Store a snapshot for animation
      simulation.push({ playerHP, bossHP, log: [...combatLog].slice(-5) });
      turn++;
    }

    const win = bossHP <= 0;
    
    // Animate the battle
    const frames = 4;
    const step = Math.ceil(simulation.length / frames);
    
    for (let i = 0; i < frames; i++) {
      const simIdx = Math.min(i * step, simulation.length - 1);
      const state = simulation[simIdx] || { playerHP, bossHP, log: combatLog.slice(-5) };
      
      const embed = new EmbedBuilder()
        .setTitle(`${config.ICONS.ARENA} Arena Battle: Frame ${i + 1}/${frames}`)
        .setDescription(
          `**Player HP:** ${VFX.progressBar(state.playerHP, playerMaxHP, 12)} (${Math.max(0, state.playerHP)}/${playerMaxHP})\n` +
          `**Boss HP:** ${VFX.progressBar(state.bossHP, bossMaxHP, 12)} (${Math.max(0, state.bossHP)}/${bossMaxHP})\n\n` +
          `**Recent Action:**\n\`\`\`diff\n${state.log.map(l => l.includes("Boss dealt") ? `- ${l}` : `+ ${l}`).join("\n")}\n\`\`\``
        )
        .setColor(COLORS.INFO);

      if (i === 0) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.editReply({ embeds: [embed] });
      }
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    // Final Result Frame
    const finalEmbed = new EmbedBuilder()
      .setTitle(win ? `${VFX.burst("GOLD", 3)} ${VFX.screenShake("ARENA VICTORY")} ${VFX.burst("GOLD", 3)}` : `${config.ICONS.ERROR} ${VFX.screenShake("ARENA DEFEAT")} ${config.ICONS.ERROR}`)
      .setDescription(`**Final Stats:**\nPlayer: **${playerHP > 0 ? playerHP : 0} HP**\nBoss: **${bossHP > 0 ? bossHP : 0} HP**\n\n**Battle Log:**\n${combatLog.join("\n").slice(-1800)}`)
      .setColor(win ? COLORS.SUCCESS : COLORS.ERROR);

    if (win) {
      let coins = config.ARENA.REWARDS.COINS;
      let goop = config.ARENA.REWARDS.GOOP;
      let xp = config.ARENA.REWARDS.XP;

      if (bonus?.reward_mult) {
        coins *= bonus.reward_mult;
        goop *= bonus.reward_mult;
      }

      coins = Math.floor(coins * coinMult);
      goop = Math.floor(goop * goopMult);
      xp = Math.floor(xp * xpMult);

      addCoins(interaction.user.id, coins);
      addGoop(interaction.user.id, goop);
      const xpRes = addXP(interaction.user.id, xp);

      // Give XP to the combat slime
      const { addSlimeXP } = require("../../utils/slimes");
      const slimeXpAmount = Math.floor(25 * xpMult);
      const slimeXpRes = addSlimeXP(activeSlime, slimeXpAmount);

      // Save updated slime list
      const updatedSlimes = user.slimes.map(s => s.uid === activeSlime.uid ? slimeXpRes.slime : s);
      setUser(interaction.user.id, { slimes: updatedSlimes });

      const slimeXpMsg = `\n${config.ICONS.SLIME} **${activeSlime.displayName}** gained **+${slimeXpAmount} Slime XP**!${slimeXpRes.leveledUp ? ` **Leveled Up to Lv.${slimeXpRes.level}!**` : ""}`;

      finalEmbed.addFields({
        name: `${config.ICONS.INVENTORY} Rewards Claimed`,
        value: `${config.ICONS.COIN} **${coins.toLocaleString()}** • ${config.ICONS.GOOP} **${goop}** • ${config.ICONS.XP} **${xp} XP**${slimeXpMsg}${xpBoostMult > 1 ? `\n${config.ICONS.XP} **EXP Booster active:** x${xpBoostMult.toFixed(2)}` : ""}${xpRes.leveledUp ? `\n${config.ICONS.LEVEL_UP} **Level Up!** You are now level **${xpRes.level}**!` : ""}`,
      });
    } else {
      finalEmbed.addFields({ name: "Result", value: "You were knocked out of the arena. No loot this time!" });
    }

    return interaction.editReply({ embeds: [finalEmbed] });
  },
};
