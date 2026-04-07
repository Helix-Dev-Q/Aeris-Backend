import path from "path";
import logger from "../core/logger.js";
import { dirname } from "dirname-filename-esm";
const __dirname = dirname(import.meta);
import { REST, Routes } from "discord.js";
const token = process.env.BOT_TOKEN;
import fs from "node:fs";
import dotenv from "dotenv";
dotenv.config();

const commands = [];
const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = await import("file://" + filePath);
    commands.push(command.data.toJSON());
  }
}

const rest = new REST().setToken(token);

(async () => {
  try {
    const clientId = process.env.CLIENT_ID || global.clientId;
    if (!clientId) {
      logger.error("CLIENT_ID not set in .env — skipping command registration.");
      return;
    }
    await rest.put(Routes.applicationGuildCommands(clientId, process.env.GUILD_ID), {
      body: commands,
    });
    logger.debug(`Aeris Command Services Refreshed`);
  } catch (error) {
    if (error.code === 50001) {
      logger.error("Missing Access — Bot needs 'applications.commands' scope. Re-invite the bot with the correct permissions.");
    } else {
      console.error(error);
    }
  }
})();
  