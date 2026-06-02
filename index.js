require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client, Collection, GatewayIntentBits } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();

// --------------------
// LOAD COMMANDS (defensive)
// --------------------
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

        if (!command.data || !command.data.name) {
          console.warn(`[WARN] Skipping command file (missing data.name): ${filePath}`);
          continue;
        }

        if (typeof command.execute !== "function") {
          console.warn(`[WARN] Skipping command file (missing execute): ${filePath}`);
          continue;
        }

        client.commands.set(command.data.name, command);
      } catch (err) {
        console.warn(`[WARN] Failed to load command ${filePath}:`, err.message);
      }
    }
  }
} catch (err) {
  console.warn("[WARN] No commands folder found or failed to read commands:", err.message);
}

  // load events
  try {
    const eventFiles = fs.readdirSync(path.join(__dirname, "src/events")).filter((file) => file.endsWith(".js"));

    for (const file of eventFiles) {
      const filePath = path.join(__dirname, "src/events", file);
      try {
        const event = require(filePath);
        if (!event.name || typeof event.execute !== "function") {
          console.warn(`[WARN] Skipping event file (missing name/execute): ${filePath}`);
          continue;
        }

        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args, client));
        } else {
          client.on(event.name, (...args) => event.execute(...args, client));
        }
      } catch (err) {
        console.warn(`[WARN] Failed to load event ${filePath}:`, err.message);
      }
    }
  } catch (err) {
    console.warn("[WARN] No events folder found or failed to read events:", err.message);
  }

// --------------------
if (!process.env.TOKEN) {
  console.error("Missing TOKEN in .env — cannot login");
  process.exit(1);
}

client.login(process.env.TOKEN).catch((err) => {
  console.error("Failed to login:", err);
});
