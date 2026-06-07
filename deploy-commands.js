require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

const commands = [];
const commandsRoot = path.join(__dirname, "src", "commands");

try {
  const commandFolders = fs.readdirSync(commandsRoot, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);

  for (const folder of commandFolders) {
    const folderPath = path.join(commandsRoot, folder);
    const commandFiles = fs.readdirSync(folderPath).filter((f) => f.endsWith(".js"));

    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);
      try {
        const command = require(filePath);

        if (!command || !command.data) {
          console.warn(`[WARN] Skipping command file (missing data): ${filePath}`);
          continue;
        }

        if (typeof command.data.toJSON !== "function") {
          console.warn(`[WARN] Skipping command file (data.toJSON missing): ${filePath}`);
          continue;
        }

        commands.push(command.data.toJSON());
        console.log(`[INFO] Prepared command for deploy: ${command.data.name || file}`);
      } catch (err) {
        console.warn(`[WARN] Failed to load command ${filePath}:`, err.message);
      }
    }
  }
} catch (err) {
  console.error("[ERROR] Failed to read commands directory:", err.message);
}

if (!process.env.TOKEN || !process.env.CLIENT_ID) {
  console.error("[ERROR] Missing TOKEN or CLIENT_ID in .env — aborting deploy");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    const useGuild = Boolean(process.env.DEV_GUILD_ID && process.env.DEV_GUILD_ID.trim());

    if (useGuild) console.log(`[INFO] Deploying commands to DEV guild ${process.env.DEV_GUILD_ID} (instant)`);
    else console.log("[INFO] Deploying commands globally (may take up to an hour to appear)");

    const route = useGuild
      ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.DEV_GUILD_ID)
      : Routes.applicationCommands(process.env.CLIENT_ID);

    const res = await rest.put(route, { body: commands });

    const count = Array.isArray(res) ? res.length : commands.length;
    console.log(`[OK] Commands deployed. Count: ${count}`);

    if (!useGuild) console.log("[WARN] Global commands can take up to an hour to appear in clients.");
    else console.log("[OK] Guild commands update instantly for that guild.");
  } catch (error) {
    console.error("[ERROR] Failed to deploy commands:", error);
  }
})();
