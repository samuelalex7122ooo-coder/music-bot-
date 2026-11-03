require("dotenv").config();
const { REST, Routes } = require("discord.js");
const commands = require("./commands");

async function main() {
  if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
    throw new Error("Faltan DISCORD_TOKEN o CLIENT_ID en .env");
  }

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

  if (process.env.GUILD_ID) {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("Comandos registrados en el servidor.");
  } else {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log("Comandos globales registrados. Pueden tardar en aparecer.");
  }
}

main().catch(console.error);
