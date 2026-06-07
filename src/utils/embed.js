const { EmbedBuilder } = require("discord.js");
const config = require("../../config");

const COLORS = {
  SUCCESS: 0x57f287,
  ERROR: 0xed4245,
  WARNING: 0xfee75c,
  INFO: 0x5865f2,
  NEUTRAL: 0x2f3136,
};

function createEmbed({
  type,
  title,
  description,
  color = COLORS.INFO,
  fields = [],
  thumbnail,
  image,
  footer,
  timestamp = true,
}) {
  const icons = (config && config.ICONS) || {};
  const typeToColor = {
    success: COLORS.SUCCESS,
    error: COLORS.ERROR,
    warning: COLORS.WARNING,
    info: COLORS.INFO,
    neutral: COLORS.NEUTRAL,
  };

  const resolvedColor = type && typeToColor[type] ? typeToColor[type] : color;
  const embed = new EmbedBuilder().setColor(resolvedColor);

  if (title) {
    const prefix =
      type === "success"
        ? icons.SUCCESS
        : type === "error"
          ? icons.ERROR
          : type === "warning"
            ? icons.WARNING
            : "";
    embed.setTitle(prefix ? `${prefix} ${title}` : title);
  }

  if (description) embed.setDescription(description);

  if (thumbnail) embed.setThumbnail(thumbnail);

  if (image) embed.setImage(image);

  if (fields.length) embed.addFields(fields);

  if (footer) embed.setFooter(typeof footer === "string" ? { text: footer } : footer);
  else embed.setFooter({ text: "SlugBot" });

  if (timestamp) embed.setTimestamp();

  return embed;
}

function success(options = {}) {
  return createEmbed({
    type: "success",
    color: COLORS.SUCCESS,
    ...options,
  });
}

function error(options = {}) {
  return createEmbed({
    type: "error",
    color: COLORS.ERROR,
    ...options,
  });
}

function warning(options = {}) {
  return createEmbed({
    type: "warning",
    color: COLORS.WARNING,
    ...options,
  });
}

function info(options = {}) {
  return createEmbed({
    type: "info",
    color: COLORS.INFO,
    ...options,
  });
}

function simple(options = {}) {
  return createEmbed(options);
}

module.exports = {
  createEmbed,

  success,
  error,
  warning,
  info,

  simple,

  COLORS,
};
