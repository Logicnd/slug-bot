const { EmbedBuilder } = require("discord.js");

const COLORS = {
  SUCCESS: 0x57f287,
  ERROR: 0xed4245,
  WARNING: 0xfee75c,
  INFO: 0x5865f2,
  NEUTRAL: 0x2f3136,
};

function createEmbed({
  title,
  description,
  color = COLORS.INFO,
  fields = [],
  thumbnail,
  image,
  footer,
  timestamp = true,
}) {
  const embed = new EmbedBuilder().setColor(color);

  if (title) embed.setTitle(title);

  if (description) embed.setDescription(description);

  if (thumbnail) embed.setThumbnail(thumbnail);

  if (image) embed.setImage(image);

  if (fields.length) embed.addFields(fields);

  if (footer) embed.setFooter(footer);

  if (timestamp) embed.setTimestamp();

  return embed;
}

function success(options = {}) {
  return createEmbed({
    color: COLORS.SUCCESS,
    ...options,
  });
}

function error(options = {}) {
  return createEmbed({
    color: COLORS.ERROR,
    ...options,
  });
}

function warning(options = {}) {
  return createEmbed({
    color: COLORS.WARNING,
    ...options,
  });
}

function info(options = {}) {
  return createEmbed({
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
