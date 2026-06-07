const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { simple, error, COLORS } = require("../../utils/embed");
const { listJobs, getJob } = require("../../utils/jobs");
const { setJob, getUser } = require("../../utils/economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("job")
    .setDescription("Manage jobs")
    .addSubcommand((sub) => sub.setName("list").setDescription("List available jobs"))
    .addSubcommand((sub) =>
      sub
        .setName("select")
        .setDescription("Select a job to work")
        .addStringOption((o) => o.setName("id").setDescription("Job id to select").setRequired(true)),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "list") {
      const jobs = listJobs();
      const fields = jobs.map((j) => ({ name: `${j.name} — (${j.id})`, value: j.description }));
      const embed = simple({ title: "Available Jobs", color: COLORS.NEUTRAL, fields });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === "select") {
      const id = interaction.options.getString("id");
      const job = getJob(id);
      if (!job) return interaction.reply({ embeds: [error({ description: "Invalid job id" })], flags: [MessageFlags.Ephemeral] });

      setJob(interaction.user.id, job.id);
      const embed = simple({ title: "Job Selected", description: `You are now a **${job.name}**.`, color: COLORS.NEUTRAL });
      return interaction.reply({ embeds: [embed] });
    }
  },
};
