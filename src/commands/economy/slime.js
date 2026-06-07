const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getUser, setUser, setSelectedSlime } = require("../../utils/economy");
const { getSlimeLevelProgress, addSlimeXP, repairSlime } = require("../../utils/slimes");
const { simple, error, COLORS } = require("../../utils/embed");
const config = require("../../../config");
const VFX = require("../../utils/vfx");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("slime")
    .setDescription("Interact with your slimes")
    .addSubcommand(sub =>
      sub
        .setName("view")
        .setDescription("View details of a slime")
        .addStringOption(opt =>
          opt
            .setName("uid")
            .setDescription("UID of the slime (defaults to active slime)")
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("set")
        .setDescription("Set a slime as your active companion")
        .addStringOption(opt =>
          opt
            .setName("uid")
            .setDescription("UID of the slime to set as active")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("feed")
        .setDescription("Feed goop to a slime to grant XP")
        .addStringOption(opt =>
          opt
            .setName("uid")
            .setDescription("UID of the slime to feed")
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt
            .setName("goop")
            .setDescription("Amount of goop to feed (1 goop = 10 XP)")
            .setMinValue(1)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("rename")
        .setDescription("Give your companion a custom nickname")
        .addStringOption(opt =>
          opt
            .setName("uid")
            .setDescription("UID of the slug to rename")
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName("nickname")
            .setDescription("The new nickname for your slug")
            .setMaxLength(32)
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const user = getUser(interaction.user.id);
    const slimes = user.slimes || [];

    if (slimes.length === 0) {
      return interaction.reply({
        embeds: [error({ description: "You don't own any slimes yet! Use `/attack` to find some." })],
        flags: [MessageFlags.Ephemeral]
      });
    }

    // ===================================
    // VIEW SUBCOMMAND
    // ===================================
    if (sub === "view") {
      const uid = interaction.options.getString("uid");
      let slime = null;

      if (uid) {
        slime = slimes.find(s => s.uid.toLowerCase() === uid.toLowerCase());
        if (!slime) {
          return interaction.reply({
            embeds: [error({ description: `Could not find a slime with UID \`${uid}\`. Check \`/slimes\`.` })],
            flags: [MessageFlags.Ephemeral]
          });
        }
      } else {
        if (user.selectedSlimeId) {
          slime = slimes.find(s => s.uid === user.selectedSlimeId);
        }
        if (!slime) {
          slime = slimes[0]; // fallback to first slime
        }
      }

      const progress = getSlimeLevelProgress(slime);
      const isSelected = slime.uid === user.selectedSlimeId ? "⭐ **Active Companion**\n" : "";

      const details = [
        isSelected,
        `**Species:** ${slime.speciesId.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}`,
        `**Rarity:** ${slime.rarityId.toUpperCase()}`,
        `**Visual:** ${slime.visualId.toUpperCase()}`,
        `**Size:** ${slime.sizeId.toUpperCase()}`,
        `**Level:** ${slime.level} (${progress.percent}%)`,
        `**XP:** \`${progress.xp.toLocaleString()} / ${progress.needed.toLocaleString()} XP\` ${VFX.progressBarSlim(progress.xp, progress.needed, 10)}\n`,
        `**Stats:**`,
        `${config.ICONS.STATS} **Power:** \`${slime.power.toLocaleString()}\``,
        `❤️ **HP:** \`${slime.stats?.hp.toLocaleString()}\``,
        `⚔️ **Damage:** \`${slime.stats?.damage.toLocaleString()}\``,
        `\n*Created on:* <t:${Math.floor(slime.createdAt / 1000)}:f> \`[UID: ${slime.uid}]\``
      ];

      const embed = simple({
        title: `${config.ICONS.SLIME} Slime Details: ${slime.displayName}`,
        description: details.join("\n"),
        color: slime.displayColor || COLORS.INFO
      });

      return interaction.reply({ embeds: [embed] });
    }

    // ===================================
    // SET SUBCOMMAND
    // ===================================
    if (sub === "set") {
      const uid = interaction.options.getString("uid");
      const slime = slimes.find(s => s.uid.toLowerCase() === uid.toLowerCase());

      if (!slime) {
        return interaction.reply({
          embeds: [error({ description: `Could not find a slime with UID \`${uid}\`. Check \`/slimes\`.` })],
          flags: [MessageFlags.Ephemeral]
        });
      }

      setSelectedSlime(interaction.user.id, slime.uid);

      const embed = simple({
        title: `${config.ICONS.SUCCESS} Active Companion Set`,
        description: `You set **${slime.displayName}** (Lv. ${slime.level}) as your active companion!\nIt will now join you in \`/attack\` battles and the \`/arena\`.`,
        color: slime.displayColor || COLORS.SUCCESS
      });

      return interaction.reply({ embeds: [embed] });
    }

    // ===================================
    // FEED SUBCOMMAND
    // ===================================
    if (sub === "feed") {
      const uid = interaction.options.getString("uid");
      const goopAmount = interaction.options.getInteger("goop");

      const slime = slimes.find(s => s.uid.toLowerCase() === uid.toLowerCase());
      if (!slime) {
        return interaction.reply({
          embeds: [error({ description: `Could not find a slime with UID \`${uid}\`. Check \`/slimes\`.` })],
          flags: [MessageFlags.Ephemeral]
        });
      }

      if (user.goop < goopAmount) {
        return interaction.reply({
          embeds: [error({ description: `You only have ${config.ICONS.GOOP} **${user.goop} goop**. You need **${goopAmount}**.` })],
          flags: [MessageFlags.Ephemeral]
        });
      }

      // Deduct goop
      const newGoop = user.goop - goopAmount;
      const xpToAdd = goopAmount * 10;
      
      const xpRes = addSlimeXP(slime, xpToAdd);
      
      // Update slimes list in user cache
      const updatedSlimes = slimes.map(s => s.uid === slime.uid ? xpRes.slime : s);
      setUser(interaction.user.id, { goop: newGoop, slimes: updatedSlimes });

      const embed = simple({
        title: `Slime Fed! 🧪`,
        description: `You fed **${goopAmount} goop** to **${slime.displayName}**.\n` +
          `It consumed the essence and gained **+${xpToAdd.toLocaleString()} XP**!\n\n` +
          `**New Level:** Lv. ${xpRes.level} (XP: \`${xpRes.slime.xp}/${xpRes.nextXP} XP\`)${xpRes.leveledUp ? `\n${config.ICONS.LEVEL_UP} **Leveled Up!**` : ""}`,
        color: xpRes.slime.displayColor || COLORS.SUCCESS
      });

      return interaction.reply({ embeds: [embed] });
    }

    // ===================================
    // RENAME SUBCOMMAND
    // ===================================
    if (sub === "rename") {
      const uid = interaction.options.getString("uid");
      const nickname = interaction.options.getString("nickname").trim();

      const slime = slimes.find(s => s.uid.toLowerCase() === uid.toLowerCase());
      if (!slime) {
        return interaction.reply({
          embeds: [error({ description: `Could not find a companion with UID \`${uid}\`. Check \`/slimes\`.` })],
          flags: [MessageFlags.Ephemeral]
        });
      }

      // Update nickname
      const oldName = slime.displayName;
      const updatedSlime = repairSlime({ ...slime, nickname });
      
      // Update slimes list in user cache
      const updatedSlimes = slimes.map(s => s.uid === slime.uid ? updatedSlime : s);
      setUser(interaction.user.id, { slimes: updatedSlimes });

      const embed = simple({
        title: `${config.ICONS.SUCCESS} Companion Renamed`,
        description: `Successfully renamed **${oldName}** to **${updatedSlime.displayName}**!`,
        color: updatedSlime.displayColor || COLORS.SUCCESS
      });

      return interaction.reply({ embeds: [embed] });
    }
  }
};
