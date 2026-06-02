const { SlashCommandBuilder } = require("discord.js");
const { simple, COLORS } = require("../../utils/embed");
const { addCoins, addGoop, getUser } = require("../../utils/economy");
const config = require("../../../config");

module.exports = {
  data: new SlashCommandBuilder().setName("search").setDescription("Search the area for coins or goop"),

  async execute(interaction) {
    const user = getUser(interaction.user.id);
    
    // Apply Rebirth Multiplier
    const multi = 1 + (Number(user.rebirths || 0) * (config.REBIRTH.MULTIPLIER_PER_REBIRTH || 0));
    
    const baseReward = Math.floor(Math.random() * (config.SEARCH.MAX - config.SEARCH.MIN + 1)) + config.SEARCH.MIN;
    const reward = Math.floor(baseReward * multi);
    
    addCoins(interaction.user.id, reward);

    let goop = 0;
    if (Math.random() < config.SEARCH.GOOP_CHANCE) {
      goop = Math.floor(Math.random() * (config.SEARCH.GOOP_MAX - config.SEARCH.GOOP_MIN + 1)) + config.SEARCH.GOOP_MIN;
      if (goop > 0) addGoop(interaction.user.id, goop);
    }

    let extraMsg = "";
    if (multi > 1) extraMsg = `\n*(x${multi.toFixed(2)} Rebirth Multiplier)*`;

    const embed = simple({ 
      title: "Search Result", 
      description: `You scoured the area and found:\n\n${config.ICONS.COIN} **${reward.toLocaleString()} coins**${goop ? `\n${config.ICONS.GOOP} **${goop.toLocaleString()} goop**` : ""}${extraMsg}`, 
      color: COLORS.SUCCESS 
    });
    return interaction.reply({ embeds: [embed] });
  },
};
