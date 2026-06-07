/**
 * VFX Utility for SlugBot
 * Simulates game-like animations and visual effects within Discord's constraints.
 */

const config = require("../../config");

const VFX = {
  // Particle effects represented by emoji bursts
  PARTICLES: {
    CRITICAL: [config.ICONS.DEFEAT, config.ICONS.ERROR, config.ICONS.SUCCESS],
    HEAL: [config.ICONS.GOOP, config.ICONS.SUCCESS, config.ICONS.XP],
    ICE: [config.ICONS.XP, config.ICONS.STATS],
    VOID: [config.ICONS.GOOP, config.ICONS.ERROR, config.ICONS.STATS],
    GOLD: [config.ICONS.COIN, config.ICONS.SUCCESS, config.ICONS.XP],
    LOOT: [config.ICONS.INVENTORY, config.ICONS.COIN, config.ICONS.SLIME],
  },

  /**
   * Generates a "Screen Shake" effect for text
   * @param {string} text - The text to shake
   * @returns {string} - Formatted text
   */
  screenShake(text) {
    return `***[ ${text.toUpperCase()} ]***`;
  },

  /**
   * Generates a progress bar for health/casting
   * @param {number} current - Current value
   * @param {number} max - Max value
   * @param {number} size - Number of segments
   * @returns {string} - Progress bar string
   */
  progressBar(current, max, size = 15) {
    const progress = Math.min(Math.max(current / max, 0), 1);
    const filled = Math.round(size * progress);
    const empty = size - filled;

    // Choose bar style based on health percentage
    let barChar = "█";
    if (progress < 0.25) barChar = "▒";
    else if (progress < 0.5) barChar = "▓";

    return barChar.repeat(filled) + "░".repeat(empty);
  },

  progressBarSlim(current, max, size = 10) {
    const progress = Math.min(Math.max(current / max, 0), 1);
    const filled = Math.round(size * progress);
    const empty = size - filled;
    return "▰".repeat(filled) + "▱".repeat(empty);
  },

  /**
   * Generates a "Particle Burst" string
   * @param {string[]} type - Key from VFX.PARTICLES
   * @param {number} intensity - Number of emojis
   * @returns {string}
   */
  burst(type, intensity = 3) {
    const particles = VFX.PARTICLES[type] || VFX.PARTICLES.CRITICAL;
    let result = "";
    for (let i = 0; i < intensity; i++) {
      result += particles[Math.floor(Math.random() * particles.length)];
    }
    return result;
  },

  /**
   * Animates a combat sequence (simulated via message edits)
   * Note: Use sparingly to avoid rate limits.
   * @param {import("discord.js").Interaction} interaction
   * @param {Function} frameGenerator - Callback that returns an embed for each frame
   * @param {number} frameCount - Total frames
   * @param {number} delay - Delay between frames in ms
   */
  async animate(interaction, frameGenerator, frameCount = 3, delay = 800) {
    for (let i = 0; i < frameCount; i++) {
      const embed = frameGenerator(i);
      if (i === 0) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.editReply({ embeds: [embed] });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  },
};

module.exports = VFX;
