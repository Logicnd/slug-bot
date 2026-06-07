require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client, Collection, GatewayIntentBits, Constants } = require("discord.js");
const config = require("./config");
const { startRandomEvent } = require("./src/utils/economy");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.MessageReactions,
  ],
});

client.commands = new Collection();

client.on("warn", (warning) => {
  console.warn(`[WARN] ${warning}`);
});

client.on("error", (error) => {
  console.error(`[ERROR] ${error}`);
});

client.on("ready", () => {
  console.log(`[OK] Logged in as ${client.user.tag}`);
});

// --------------------
// EVENT SCHEDULER
// --------------------
function startEventScheduler() {
  setInterval(
    () => {
      try {
        const roll = Math.random();
        if (roll < (config.EVENTS.CHANCE_PER_HOUR || 0.15)) {
          const event = startRandomEvent();
          if (event) console.log(`[OK] Global Event Triggered: ${event.name}`);
        }
      } catch (error) {
        console.error(`[ERROR] Failed to start event: ${error}`);
      }
    },
    60 * 60 * 1000,
  );
}
startEventScheduler();

// --------------------
// LOAD COMMANDS
// --------------------
const commandsRoot = path.join(__dirname, "src", "commands");
try {
  const commandFolders = fs
    .readdirSync(commandsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const folder of commandFolders) {
    const folderPath = path.join(commandsRoot, folder);
    const commandFiles = fs
      .readdirSync(folderPath)
      .filter((f) => f.endsWith(".js"));

    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);
      try {
        const command = require(filePath);

        if (!command.data || !command.data.name) {
          console.warn(
            `[WARN] Skipping command file (missing data.name): ${filePath}`,
          );
          continue;
        }

        if (typeof command.execute !== "function") {
          console.warn(
            `[WARN] Skipping command file (missing execute): ${filePath}`,
          );
          continue;
        }

        client.commands.set(command.data.name, command);
      } catch (err) {
        console.warn(`[WARN] Failed to load command ${filePath}:`, err.message);
      }
    }
  }
} catch (err) {
  console.warn(
    `[WARN] No commands folder found or failed to read commands:`,
    err.message,
  );
}

// --------------------
// LOAD EVENTS
// --------------------
try {
  const eventsPath = path.join(__dirname, "src/events");
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    try {
      const event = require(filePath);

      if (!event.name || typeof event.execute !== "function") {
        console.warn(
          `[WARN] Skipping event file (missing name/execute): ${filePath}`,
        );
        continue;
      }

      if (event.once) {
        client.once(event.name, (...args) =>
          event.execute(...args, client)
        );
      } else {
        client.on(event.name, (...args) =>
          event.execute(...args, client)
        );
      }
    } catch (err) {
      console.warn(`[WARN] Failed to load event ${filePath}:`, err.message);
    }
  }
} catch (err) {
  console.warn(
    `[WARN] No events folder found or failed to read events:`,
    err.message,
  );
}

// --------------------
if (!process.env.TOKEN) {
  console.error("Missing TOKEN in .env — cannot login");
  process.exit(1);
}

client.login(process.env.TOKEN).catch((err) => {
  console.error(`[ERROR] Failed to login: ${err}`);
});
