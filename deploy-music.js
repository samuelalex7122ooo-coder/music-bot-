const fs = require("node:fs");
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

function readEnv() {
  const result = {};

  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([\w]+)\s*=\s*(.*?)\s*$/);
    if (!match) continue;

    result[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }

  return result;
}

async function main() {
  const env = readEnv();

  const token =
    env.DISCORD_TOKEN || env.TOKEN || env.BOT_TOKEN;

  const clientId =
    env.CLIENT_ID || env.DISCORD_CLIENT_ID || env.APPLICATION_ID;

  const guildId =
    env.GUILD_ID || env.DISCORD_GUILD_ID || env.SERVER_ID;

  if (!token || !clientId) {
    throw new Error("No encontré el token o CLIENT_ID en .env.");
  }

  const commands = [
    new SlashCommandBuilder()
      .setName("play")
      .setDescription("Reproducir una canción de YouTube")
      .addStringOption(o =>
        o.setName("enlace")
          .setDescription("Enlace de YouTube")
          .setRequired(true)
      ),

    new SlashCommandBuilder().setName("skip").setDescription("Saltar canción"),
    new SlashCommandBuilder().setName("pause").setDescription("Pausar música"),
    new SlashCommandBuilder().setName("resume").setDescription("Continuar música"),
    new SlashCommandBuilder().setName("stop").setDescription("Detener la música"),
    new SlashCommandBuilder().setName("queue").setDescription("Consultar la cola"),
    new SlashCommandBuilder().setName("nowplaying").setDescription("Ver canción actual"),
    new SlashCommandBuilder().setName("leave").setDescription("Desconectar el bot de voz"),

    new SlashCommandBuilder()
      .setName("volume")
      .setDescription("Cambiar volumen")
      .addIntegerOption(o =>
        o.setName("nivel")
          .setDescription("Volumen de 0 a 100")
          .setMinValue(0)
          .setMaxValue(100)
          .setRequired(true)
      )
  ].map(command => command.toJSON());

  const rest = new REST({ version: "10" }).setToken(token);

  const route = guildId
    ? Routes.applicationGuildCommands(clientId, guildId)
    : Routes.applicationCommands(clientId);

  console.log("Leyendo comandos que ya existen...");

  const existing = await rest.get(route);
  const merged = new Map(existing.map(command => [command.name, command]));

  for (const command of commands) {
    merged.set(command.name, command);
  }

  await rest.put(route, { body: [...merged.values()] });

  console.log("Comandos musicales registrados sin borrar los anteriores.");
  console.log(guildId ? "Registro en servidor." : "Registro global.");
}

main().catch(error => {
  console.error("ERROR REGISTRANDO COMANDOS:", error);
  process.exitCode = 1;
});
