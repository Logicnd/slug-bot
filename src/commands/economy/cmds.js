const fs = require("fs");
const path = require("path");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { isOwner } = require("../../utils/owners");

function titleCase(str = "") {
  return String(str)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function extractCommandLines(commandModule, fileName) {
  if (!commandModule || !commandModule.data) {
    return [`/${fileName.replace(/\.js$/i, "")}`];
  }

  let json;
  try {
    json =
      typeof commandModule.data.toJSON === "function"
        ? commandModule.data.toJSON()
        : commandModule.data;
  } catch {
    json = commandModule.data;
  }

  const baseName = json?.name || fileName.replace(/\.js$/i, "");
  const description = json?.description ? ` — ${json.description}` : "";

  const options = Array.isArray(json?.options) ? json.options : [];
  const subcommands = options.filter((opt) => opt.type === 1); // 1 = SUB_COMMAND

  if (subcommands.length === 0) {
    return [`/${baseName}${description}`];
  }

  const lines = [];
  for (const sub of subcommands) {
    const subDesc = sub.description ? ` — ${sub.description}` : "";
    lines.push(`/${baseName} ${sub.name}${subDesc}`);
  }

  return lines;
}

function collectCommands(showOwner = false) {
  const commandsRoot = path.join(__dirname, "..");
  const result = [];

  const folders = fs
    .readdirSync(commandsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));

  for (const folder of folders) {
    if (folder === "owner" && !showOwner) continue;

    const folderPath = path.join(commandsRoot, folder);
    const files = fs
      .readdirSync(folderPath)
      .filter((f) => f.endsWith(".js"))
      .sort((a, b) => a.localeCompare(b));

    const lines = [];

    for (const file of files) {
      const filePath = path.join(folderPath, file);

      try {
        delete require.cache[require.resolve(filePath)];
        const command = require(filePath);
        lines.push(...extractCommandLines(command, file));
      } catch {
        lines.push(`/${file.replace(/\.js$/i, "")}`);
      }
    }

    if (lines.length) {
      result.push({
        folder,
        lines,
      });
    }
  }

  return result;
}

function buildCmdsEmbed(userId, userAvatarUrlFn) {
  const showOwner = isOwner(userId);
  const grouped = collectCommands(showOwner);

  const embed = new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle("📘 SlugBot Commands")
    .setDescription("All available slash commands, grouped by category.")
    .setTimestamp();

  for (const group of grouped) {
    embed.addFields({
      name: titleCase(group.folder),
      value: group.lines.map((line) => `\`${line}\``).join("\n"),
      inline: false,
    });
  }

  if (typeof userAvatarUrlFn === "function") {
    embed.setThumbnail(userAvatarUrlFn({ dynamic: true, size: 128 }));
  }

  embed.setFooter({ text: "SlugBot" });

  return embed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cmds")
    .setDescription("Show every available slash command grouped by folder"),

  async execute(interaction) {
    const embed = buildCmdsEmbed(
      interaction.user.id,
      interaction.user.displayAvatarURL.bind(interaction.user),
    );

    return interaction.reply({ embeds: [embed] });
  },
};
