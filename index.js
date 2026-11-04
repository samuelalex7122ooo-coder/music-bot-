const musicCity = require("./music");
const community = require("./community");
require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Message, Partials.Channel]
});

const DATA = path.join(__dirname, "data");
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });

function readFile(name, fallback = {}) {
  const file = path.join(DATA, name);
  try {
    return fs.existsSync(file)
      ? JSON.parse(fs.readFileSync(file, "utf8"))
      : fallback;
  } catch {
    return fallback;
  }
}

function writeFile(name, data) {
  fs.writeFileSync(
    path.join(DATA, name),
    JSON.stringify(data, null, 2)
  );
}

function getConfig(id) {
  return readFile(`${id}.json`);
}

function saveConfig(id, config) {
  writeFile(`${id}.json`, config);
}

function makeEmbed(title, description, color = "#8A2BE2") {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: "𝐌𝐔𝐒𝐈𝐂 𝐂𝐈𝐓𝐘 🕷️🕸️" })
    .setTimestamp();
}

function validImage(url) {
  return /^https:\/\/\S+$/i.test(url);
}

async function sendLog(guild, embed) {
  const config = getConfig(guild.id);
  const channelId = config.verifyLogChannel || config.logChannel;
  if (!channelId) return;

  try {
    const channel = await guild.channels.fetch(channelId);
    if (channel && channel.isTextBased()) {
      await channel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error("Error enviando log de verificación:", error.message);
  }
}

async function sendGeneralLog(guild, embed) {
  const config = getConfig(guild.id);
  if (!config.generalLogChannel) return;

  try {
    const channel = await guild.channels.fetch(config.generalLogChannel);
    if (channel && channel.isTextBased()) {
      await channel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error("Error enviando log general:", error.message);
  }
}

function panelEmbed(config) {
  const embed = makeEmbed(
    config.panelTitle || "🕷️ 𝐌𝐔𝐒𝐈𝐂 𝐂𝐈𝐓𝐘 🕸️",
    config.panelDescription ||
      "¡Bienvenido a nuestra comunidad!\n\nPulsa el botón para verificarte y acceder al servidor.",
    config.panelColor || "#8A2BE2"
  );

  if (config.panelImage) embed.setImage(config.panelImage);
  if (config.panelThumbnail) embed.setThumbnail(config.panelThumbnail);

  return embed;
}

function panelButton(config) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("music_verify")
      .setLabel(config.buttonText || "VERIFICARME")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success)
  );
}

client.once("ready", () => {
  community.init(client);
  console.log("----------------------------------");
  console.log(`MUSIC CITY conectado: ${client.user.tag}`);
  console.log("Verificación y logs activados.");
  console.log("----------------------------------");
  client.user.setActivity("MUSIC CITY 🕷️🕸️");
});

// VERIFICACIONES
client.on("interactionCreate", async interaction => {
  try {
    if (await community.handleInteraction(interaction)) return;
    if (interaction.isChatInputCommand() && await community.handleCommand(interaction)) return;
    if (interaction.isButton() && interaction.customId === "music_verify") {
      const config = getConfig(interaction.guildId);

      if (!config.verifiedRole || !(config.verifyLogChannel || config.logChannel)) {
        return interaction.reply({
          content: "❌ El sistema no está configurado.",
          ephemeral: true
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const member = await interaction.guild.members.fetch(interaction.user.id);
      const role = await interaction.guild.roles.fetch(config.verifiedRole);

      if (!role) {
        return interaction.editReply("❌ El rol configurado ya no existe.");
      }

      if (member.roles.cache.has(role.id)) {
        return interaction.editReply("✅ Ya estás verificado en MUSIC CITY.");
      }

      if (role.managed || role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.editReply("❌ El bot no puede entregar ese rol. Revisa la posición de sus roles.");
      }

      await member.roles.add(role, "Verificación MUSIC CITY");

      const now = new Date();
      const timestamp = Math.floor(now.getTime() / 1000);
      const localTime = now.toLocaleString("es-SV", {
        timeZone: "America/El_Salvador",
        dateStyle: "full",
        timeStyle: "long"
      });

      const stats = readFile(`stats-${interaction.guildId}.json`, {
        total: 0,
        users: []
      });

      stats.total++;
      stats.users.push({
        userId: interaction.user.id,
        roleId: role.id,
        channelId: interaction.channelId,
        timestamp,
        localTime
      });

      writeFile(`stats-${interaction.guildId}.json`, stats);

      const log = new EmbedBuilder()
        .setColor("#2ECC71")
        .setTitle("✅ NUEVO USUARIO VERIFICADO")
        .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: "👤 Usuario", value: `${interaction.user}`, inline: true },
          { name: "🆔 ID", value: `\`${interaction.user.id}\``, inline: true },
          { name: "🎭 Rol entregado", value: `${role}`, inline: true },
          { name: "📍 Canal", value: `${interaction.channel}`, inline: true },
          { name: "📅 Fecha y hora", value: localTime, inline: false },
          { name: "⏰ Hora de Discord", value: `<t:${timestamp}:F>`, inline: false },
          { name: "📊 Total verificados", value: `${stats.total}`, inline: true }
        )
        .setFooter({ text: "MUSIC CITY • Sistema de verificación" })
        .setTimestamp();

      await sendLog(interaction.guild, log);

      await interaction.editReply(
        "✅ ¡Ya estás verificado! Bienvenido a 𝐌𝐔𝐒𝐈𝐂 𝐂𝐈𝐓𝐘 🕷️🕸️"
      );

      // Mensaje privado opcional
      if (config.welcomeDM) {
        await interaction.user.send({
          embeds: [
            makeEmbed(
              "🎵 ¡BIENVENIDO A MUSIC CITY!",
              config.welcomeDM
            )
          ]
        }).catch(() => {});
      }

      return;
    }

    if (!interaction.isChatInputCommand()) return;

    if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)) {
      return interaction.reply({
        content: "❌ Necesitas el permiso Administrar servidor.",
        ephemeral: true
      });
    }

    const command = interaction.commandName;

    if (command === "configurar-verificacion") {
      const channel = interaction.options.getChannel("canal");
      const role = interaction.options.getRole("rol");
      const logs = interaction.options.getChannel("logs");

      if (role.managed || role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({
          content: "❌ El rol del bot debe estar por encima del rol de verificación.",
          ephemeral: true
        });
      }

      const config = getConfig(interaction.guildId);
      config.verifyChannel = channel.id;
      config.verifiedRole = role.id;
      config.verifyLogChannel = logs.id;
      saveConfig(interaction.guildId, config);

      return interaction.reply({
        content: `✅ Configuración guardada.\nCanal: ${channel}\nRol: ${role}\nLogs: ${logs}`,
        ephemeral: true
      });
    }

    if (command === "configurar-logs") {
      const channel = interaction.options.getChannel("canal");
      const config = getConfig(interaction.guildId);

      config.generalLogChannel = channel.id;
      saveConfig(interaction.guildId, config);

      return interaction.reply({
        content: `✅ Logs generales configurados en ${channel}.\n\nLos logs de verificación seguirán en su canal independiente.`,
        ephemeral: true
      });
    }
    if (command === "editar-panel") {
      const config = getConfig(interaction.guildId);

      const title = interaction.options.getString("titulo");
      const description = interaction.options.getString("descripcion");
      const color = interaction.options.getString("color");
      const image = interaction.options.getString("imagen");
      const thumbnail = interaction.options.getString("miniatura");
      const button = interaction.options.getString("boton");
      const welcome = interaction.options.getString("bienvenida");

      if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return interaction.reply({
          content: "❌ Color inválido. Ejemplo: #8A2BE2",
          ephemeral: true
        });
      }

      if (image && !validImage(image)) {
        return interaction.reply({
          content: "❌ La imagen debe tener una URL HTTPS.",
          ephemeral: true
        });
      }

      if (thumbnail && !validImage(thumbnail)) {
        return interaction.reply({
          content: "❌ La miniatura debe tener una URL HTTPS.",
          ephemeral: true
        });
      }

      if (title !== null) config.panelTitle = title;
      if (description !== null) config.panelDescription = description;
      if (color !== null) config.panelColor = color;
      if (image !== null) config.panelImage = image;
      if (thumbnail !== null) config.panelThumbnail = thumbnail;
      if (button !== null) config.buttonText = button;
      if (welcome !== null) config.welcomeDM = welcome;

      saveConfig(interaction.guildId, config);

      return interaction.reply({
        content:
          "✅ **Panel actualizado y guardado.**\n" +
          "Ejecuta `/verificacion` para publicar el panel con los nuevos cambios.\n\n" +
          "Tus ajustes se conservan aunque reinicies el bot.",
        ephemeral: true
      });
    }

    if (command === "verificacion") {
      const config = getConfig(interaction.guildId);

      if (!config.verifyChannel || !config.verifiedRole || !(config.verifyLogChannel || config.logChannel)) {
        return interaction.reply({
          content: "❌ Primero configura el sistema con `/configurar-verificacion`.",
          ephemeral: true
        });
      }

      const channel = await interaction.guild.channels.fetch(config.verifyChannel);

      if (!channel || !channel.isTextBased()) {
        return interaction.reply({
          content: "❌ El canal del panel no está disponible.",
          ephemeral: true
        });
      }

      await channel.send({
        embeds: [panelEmbed(config)],
        components: [panelButton(config)]
      });

      return interaction.reply({
        content: `✅ Panel publicado en ${channel}.`,
        ephemeral: true
      });
    }

    if (command === "logs") {
      const config = getConfig(interaction.guildId);
      const stats = readFile(`stats-${interaction.guildId}.json`, {
        total: 0,
        users: []
      });

      return interaction.reply({
        content:
          `✅ **LOGS DE VERIFICACIÓN:** ${config.verifyLogChannel || config.logChannel ? `<#${config.verifyLogChannel || config.logChannel}>` : "No configurado"}\n` +
          `📋 **LOGS GENERALES:** ${config.generalLogChannel ? `<#${config.generalLogChannel}>` : "No configurado"}\n` +
          `📊 **Total de verificaciones:** ${stats.total}`,
        ephemeral: true
      });
    }

    if (command === "dm") {
      const user = interaction.options.getUser("usuario");
      const message = interaction.options.getString("mensaje");

      await user.send({
        embeds: [makeEmbed("🕷️ 𝐌𝐔𝐒𝐈𝐂 𝐂𝐈𝐓𝐘 🕸️", message)]
      });

      return interaction.reply({
        content: `✅ Mensaje enviado a ${user.tag}.`,
        ephemeral: true
      });
    }

    if (command === "embed") {
      const channel = interaction.options.getChannel("canal");
      const title = interaction.options.getString("titulo");
      const description = interaction.options.getString("descripcion");
      const color = interaction.options.getString("color") || "#8A2BE2";
      const image = interaction.options.getString("imagen");

      if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return interaction.reply({
          content: "❌ Color inválido.",
          ephemeral: true
        });
      }

      if (image && !validImage(image)) {
        return interaction.reply({
          content: "❌ La imagen debe tener una URL HTTPS.",
          ephemeral: true
        });
      }

      const embed = makeEmbed(title, description, color);
      if (image) embed.setImage(image);

      await channel.send({ embeds: [embed] });

      return interaction.reply({
        content: `✅ Embed enviado a ${channel}.`,
        ephemeral: true
      });
    }
  } catch (error) {
    console.error("Error:", error);

    const message = "❌ Ocurrió un error. Revisa los permisos y la consola.";
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(message).catch(() => {});
    } else {
      await interaction.reply({
        content: message,
        ephemeral: true
      }).catch(() => {});
    }
  }
});

// LOGS DE ENTRADA Y SALIDA
client.on("guildMemberAdd", async member => {
  await sendGeneralLog(member.guild, makeEmbed(
    "📥 NUEVO MIEMBRO",
    `**Usuario:** ${member.user.tag}\n**ID:** ${member.id}`
  ));
});

client.on("guildMemberRemove", async member => {
  await sendGeneralLog(member.guild, makeEmbed(
    "📤 MIEMBRO SALIÓ",
    `**Usuario:** ${member.user.tag}\n**ID:** ${member.id}`,
    "#E74C3C"
  ));
});

// LOGS DE MENSAJES
client.on("messageDelete", async message => {
  if (!message.guild || message.author?.bot) return;

  await sendGeneralLog(message.guild, makeEmbed(
    "🗑️ MENSAJE ELIMINADO",
    `**Usuario:** ${message.author?.tag || "Desconocido"}\n**Canal:** ${message.channel}\n**Contenido:** ${(message.content || "No disponible").slice(0, 1500)}`
  ));
});

client.on("messageUpdate", async (oldMessage, newMessage) => {
  if (!newMessage.guild || newMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;

  await sendGeneralLog(newMessage.guild, makeEmbed(
    "✏️ MENSAJE EDITADO",
    `**Usuario:** ${newMessage.author?.tag || "Desconocido"}\n**Canal:** ${newMessage.channel}\n**Antes:** ${(oldMessage.content || "No disponible").slice(0, 600)}\n**Después:** ${(newMessage.content || "No disponible").slice(0, 600)}`
  ));
});

if (!process.env.DISCORD_TOKEN) {
  throw new Error("Falta DISCORD_TOKEN en .env");
}

musicCity.init(client);
client.login(process.env.DISCORD_TOKEN);




