const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require("discord.js");
const { simple, error, COLORS } = require("../../utils/embed");
const { getUser, claimQuestReward, getShopCountdown } = require("../../utils/economy");
const config = require("../../../config");
const VFX = require("../../utils/vfx");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("quests")
    .setDescription("View and claim your daily quests")
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("View your current quest progress")
    )
    .addSubcommand((sub) =>
      sub
        .setName("claim")
        .setDescription("Claim rewards for a completed quest")
        .addStringOption((opt) =>
          opt
            .setName("id")
            .setDescription("The ID of the quest to claim")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const user = getUser(interaction.user.id);
    const countdown = getShopCountdown(); // Quests reset same time as shop

    if (sub === "list") {
      if (!user.quests || !user.quests.current.length) {
        return interaction.reply({
          embeds: [error({ description: "No quests available right now. Check back later!" })],
          flags: [MessageFlags.Ephemeral],
        });
      }

      const fields = user.quests.current.map((q) => {
        const questDef = config.QUESTS.POOL.find((pd) => pd.id === q.id);
        if (!questDef) return null;

        const status = q.claimed
          ? `${config.ICONS.SUCCESS} **Claimed**`
          : q.completed
          ? `${config.ICONS.SUCCESS} **Completed** — claim with \`/quests claim id:${q.id}\``
          : `${config.ICONS.STATS} **Progress:** \`${q.progress}/${questDef.goal}\` ${VFX.progressBarSlim(q.progress, questDef.goal, 10)}`;

        return {
          name: `${questDef.name}`,
          value: `${questDef.description}\n${status}\n**Rewards:** ${config.ICONS.COIN} **${questDef.reward.coins.toLocaleString()}** • ${config.ICONS.XP} **${questDef.reward.xp.toLocaleString()} XP**`,
          inline: false,
        };
      }).filter(Boolean);

      const embed = new EmbedBuilder()
        .setTitle(`${config.ICONS.QUEST} ${interaction.user.username}'s Daily Quests`)
        .setDescription(`${config.ICONS.REFRESH} **Refresh In:** ${countdown}`)
        .addFields(fields)
        .setColor(COLORS.INFO)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 128 }))
        .setFooter({ text: "Quests reset daily at 00:00 GMT" });

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === "claim") {
      const questId = interaction.options.getString("id");
      const res = claimQuestReward(interaction.user.id, questId);

      if (!res.ok) {
        return interaction.reply({
          embeds: [error({ description: res.msg })],
          flags: [MessageFlags.Ephemeral],
        });
      }

      const particles = VFX.burst("GOLD", 5);
      const embed = simple({
        title: `${particles} Quest Claimed! ${particles}`,
        description: `You've completed the quest and received your rewards:\n\n${config.ICONS.COIN} **${res.reward.coins.toLocaleString()} coins**\n${config.ICONS.XP} **${res.reward.xp} XP**`,
        color: COLORS.SUCCESS,
      });

      return interaction.reply({ embeds: [embed] });
    }
  },
};
