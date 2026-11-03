const {
  DisTube
} = require("distube");

const { YouTubePlugin } = require("@distube/youtube");

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require("discord.js");

const panels = new Map();
const volumes = new Map();
const repeats = new Map();

let distube;
let botClient;

const repeatNames = ["Desactivado", "Canción", "Cola"];

function guildKey(queue) {
  return queue.id || queue.textChannel?.guildId;
}

function currentSong(queue) {
  return queue.songs?.[0] || null;
}

function duration(song) {
  if (!song) return "Desconocida";
  if (typeof song.formattedDuration === "string") return song.formattedDuration;
  if (typeof song.formatDuration === "function") return song.formatDuration();
  return String(song.duration || "Desconocida");
}

function buildPanel(queue) {
  const id = guildKey(queue);
  const song = currentSong(queue);
  const volume = volumes.get(id) ?? 50;
  const repeat = repeats.get(id) ?? 0;
  const upcoming = (queue.songs || []).slice(1, 6);

  const embed = new EmbedBuilder()
    .setColor("#8A2BE2")
    .setTitle("𝐌𝐔𝐒𝐈𝐂 𝐂𝐈𝐓𝐘 🕷️🕸️")
    .setDescription(
      song
        ? `🎶 **${song.name}**\n\n⏱️ Duración: ${duration(song)}`
        : "No hay ninguna canción reproduciéndose."
    )
    .addFields(
      { name: "🔊 Volumen", value: `${volume}%`, inline: true },
      { name: "🔁 Repetición", value: repeatNames[repeat], inline: true },
      {
        name: "📋 Próximas canciones",
        value: upcoming.length
          ? upcoming.map((s, i) => `${i + 1}. ${s.name}`).join("\n").slice(0, 1000)
          : "No hay canciones pendientes.",
        inline: false
      }
    )
    .setFooter({ text: "Panel oficial de MUSIC CITY" })
    .setTimestamp();

  if (song?.url) embed.setURL(song.url);

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("mc_pause")
      .setLabel("Pausar")
      .setEmoji("⏸️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!!queue.paused),

    new ButtonBuilder()
      .setCustomId("mc_resume")
      .setLabel("Continuar")
      .setEmoji("▶️")
      .setStyle(ButtonStyle.Success)
      .setDisabled(!queue.paused),

    new ButtonBuilder()
      .setCustomId("mc_skip")
      .setLabel("Saltar")
      .setEmoji("⏭️")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("mc_shuffle")
      .setLabel("Aleatorio")
      .setEmoji("🔀")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("mc_repeat")
      .setLabel("Repetir")
      .setEmoji("🔁")
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("mc_vol_down")
      .setLabel("-10")
      .setEmoji("🔉")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("mc_vol_up")
      .setLabel("+10")
      .setEmoji("🔊")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("mc_queue")
      .setLabel("Cola")
      .setEmoji("📋")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("mc_stop")
      .setLabel("Detener")
      .setEmoji("⏹️")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("mc_leave")
      .setLabel("Salir")
      .setEmoji("👋")
      .setStyle(ButtonStyle.Danger)
  );

  return {
    embeds: [embed],
    components: [row1, row2]
  };
}

async function refreshPanel(queue) {
  const id = guildKey(queue);
  if (!id) return;

  const payload = buildPanel(queue);
  const old = panels.get(id);

  if (old) {
    const channel = await botClient.channels.fetch(old.channelId).catch(() => null);
    const message = channel?.messages
      ? await channel.messages.fetch(old.messageId).catch(() => null)
      : null;

    if (message) {
      await message.edit(payload).catch(console.error);
      return;
    }
  }

  const channel = queue.textChannel;

  if (!channel?.send) return;

  const message = await channel.send(payload).catch(error => {
    console.error("[MUSIC PANEL]", error);
    return null;
  });

  if (message) {
    panels.set(id, {
      channelId: channel.id,
      messageId: message.id
    });
  }
}

function queueText(queue) {
  return (queue.songs || [])
    .slice(0, 10)
    .map((song, i) => `${i === 0 ? "🎵" : `${i}.`} ${song.name}`)
    .join("\n")
    .slice(0, 1800) || "Cola vacía.";
}

async function handleCommand(interaction) {
  const name = interaction.commandName;
  const guildId = interaction.guildId;

  if (name === "play") {
    const voice = interaction.member?.voice?.channel;

    if (!voice) {
      return interaction.reply({
        content: "❌ Primero entra a un canal de voz.",
        flags: MessageFlags.Ephemeral
      });
    }

    const link = interaction.options.getString("enlace", true);

    let parsed;
    try {
      parsed = new URL(link);
    } catch {
      return interaction.reply({
        content: "❌ El enlace no es válido.",
        flags: MessageFlags.Ephemeral
      });
    }

    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

    if (
      parsed.protocol !== "https:" ||
      !["youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"].includes(host)
    ) {
      return interaction.reply({
        content: "❌ Solo se aceptan enlaces HTTPS de YouTube.",
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply();

    try {
      await distube.play(voice, link, {
        textChannel: interaction.channel,
        member: interaction.member
      });

      const queue = distube.getQueue(guildId);

      if (queue) {
        if (!volumes.has(guildId)) {
          volumes.set(guildId, 50);
          queue.setVolume(50);
        }

        await refreshPanel(queue);
      }

      return interaction.editReply("✅ Tu canción fue enviada al reproductor de MUSIC CITY.");
    } catch (error) {
      console.error("[MUSIC PLAY]", error);
      return interaction.editReply(
        "❌ No se pudo reproducir ese enlace. Comprueba que el vídeo esté disponible."
      );
    }
  }

  const queue = distube.getQueue(guildId);

  if (!queue) {
    return interaction.reply({
      content: "❌ No hay música reproduciéndose.",
      flags: MessageFlags.Ephemeral
    });
  }

  if (name === "queue") {
    return interaction.reply({
      content: `📋 **COLA MUSICAL**\n${queueText(queue)}`,
      flags: MessageFlags.Ephemeral
    });
  }

  if (name === "nowplaying") {
    const song = currentSong(queue);

    return interaction.reply({
      content: song
        ? `🎵 **${song.name}**\n⏱️ ${duration(song)}`
        : "No hay canción actual.",
      flags: MessageFlags.Ephemeral
    });
  }

  if (name === "volume") {
    const value = interaction.options.getInteger("nivel", true);
    queue.setVolume(value);
    volumes.set(guildId, value);
    await refreshPanel(queue);

    return interaction.reply(`🔊 Volumen configurado al ${value}%.`);
  }

  const voice = interaction.member?.voice?.channel;

  if (!voice) {
    return interaction.reply({
      content: "❌ Entra al canal de voz para controlar la música.",
      flags: MessageFlags.Ephemeral
    });
  }

  try {
    if (name === "pause") {
      queue.pause();
    } else if (name === "resume") {
      queue.resume();
    } else if (name === "skip") {
      await queue.skip();
    } else if (name === "stop" || name === "leave") {
      await queue.stop();
    }

    if (name !== "stop" && name !== "leave") {
      await refreshPanel(queue);
    }

    return interaction.reply({
      content: "✅ Control musical ejecutado.",
      flags: MessageFlags.Ephemeral
    });
  } catch (error) {
    console.error("[MUSIC COMMAND]", error);

    return interaction.reply({
      content: "❌ No se pudo ejecutar ese control.",
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleButton(interaction) {
  const id = interaction.customId;
  const guildId = interaction.guildId;
  const queue = distube.getQueue(guildId);

  if (!queue) {
    return interaction.reply({
      content: "❌ No hay una reproducción activa.",
      flags: MessageFlags.Ephemeral
    });
  }

  if (id === "mc_queue") {
    return interaction.reply({
      content: `📋 **COLA MUSICAL**\n${queueText(queue)}`,
      flags: MessageFlags.Ephemeral
    });
  }

  const voice = interaction.member?.voice?.channel;

  if (!voice) {
    return interaction.reply({
      content: "❌ Entra al canal de voz para usar el panel.",
      flags: MessageFlags.Ephemeral
    });
  }

  await interaction.deferUpdate();

  try {
    if (id === "mc_pause") {
      queue.pause();
    }

    if (id === "mc_resume") {
      queue.resume();
    }

    if (id === "mc_skip") {
      await queue.skip();
    }

    if (id === "mc_shuffle") {
      queue.shuffle();
    }

    if (id === "mc_repeat") {
      const next = ((repeats.get(guildId) ?? 0) + 1) % 3;
      repeats.set(guildId, next);
      queue.setRepeatMode(next);
    }

    if (id === "mc_vol_down" || id === "mc_vol_up") {
      const oldVolume = volumes.get(guildId) ?? 50;
      const change = id === "mc_vol_up" ? 10 : -10;
      const next = Math.max(0, Math.min(100, oldVolume + change));

      volumes.set(guildId, next);
      queue.setVolume(next);
    }

    if (id === "mc_stop" || id === "mc_leave") {
      await queue.stop();
      return;
    }

    await refreshPanel(queue);
  } catch (error) {
    console.error("[MUSIC BUTTON]", error);
  }
}

function init(client) {
  botClient = client;

  distube = new DisTube(client, {
    plugins: [new YouTubePlugin()],
    emitNewSongOnly: true
  });

  distube.on("playSong", async queue => {
    await refreshPanel(queue);
  });

  distube.on("addSong", async queue => {
    await refreshPanel(queue);
  });

  distube.on("error", (...args) => {
    console.error("[DISTUBE ERROR]", ...args);
  });

  client.on("interactionCreate", async interaction => {
    try {
      if (interaction.isButton() && interaction.customId.startsWith("mc_")) {
        await handleButton(interaction);
        return;
      }

      if (
        interaction.isChatInputCommand() &&
        ["play", "skip", "pause", "resume", "stop", "queue", "nowplaying", "leave", "volume"].includes(interaction.commandName)
      ) {
        await handleCommand(interaction);
      }
    } catch (error) {
      console.error("[MUSIC INTERACTION]", error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ Ocurrió un error con el sistema de música.",
          flags: MessageFlags.Ephemeral
        }).catch(() => {});
      }
    }
  });

  console.log("[MUSIC CITY] Reproductor y panel musical iniciados.");
}

module.exports = { init };
