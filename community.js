const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionsBitField,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const DATA = path.join(__dirname, "data");
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });

let botClient;

function readConfig(guildId) {
  const file = path.join(DATA, `${guildId}.json`);
  try {
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  } catch {
    return {};
  }
}

function saveConfig(guildId, config) {
  fs.writeFileSync(
    path.join(DATA, `${guildId}.json`),
    JSON.stringify(config, null, 2)
  );
}

function communityEmbed(title, description, color = "#8A2BE2") {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: "𝐌𝐔𝐒𝐈𝐂 𝐂𝐈𝐓𝐘 🕷️🕸️" })
    .setTimestamp();
}

function isAdmin(interaction) {
  return interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild);
}

function findCategory(config, value) {
  const categories = config.ticketCategories || [];
  const key = String(value || "").toLowerCase();
  return categories.find(c =>
    c.id === value || c.name.toLowerCase() === key
  );
}

function ticketMeta(channel) {
  const parts = (channel.topic || "").split("|");
  if (parts.length < 4 || parts[0] !== "mc-ticket") return null;
  return {
    ownerId: parts[1],
    categoryId: parts[2],
    claimedId: parts[3] === "0" ? null : parts[3]
  };
}

function staffCanManage(interaction, category) {
  const hasManage = interaction.memberPermissions?.has(
    PermissionsBitField.Flags.ManageChannels
  );
  const memberRoles = interaction.member?.roles;
  const hasRole = category?.roleId && (
    memberRoles?.cache?.has(category.roleId) ||
    (Array.isArray(memberRoles) && memberRoles.includes(category.roleId))
  );
  return Boolean(hasManage || hasRole);
}

function ticketButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("mc_ticket_claim")
      .setLabel("Reclamar")
      .setEmoji("🙋")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("mc_ticket_release")
      .setLabel("Liberar")
      .setEmoji("🔓")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("mc_ticket_close")
      .setLabel("Cerrar")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger)
  );
}

async function publishTicketPanel(interaction, config) {
  const channel = await interaction.guild.channels.fetch(config.ticketPanelChannel).catch(() => null);
  if (!channel?.isTextBased()) {
    await interaction.reply({
      content: "❌ El canal del panel de tickets no está disponible.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const categories = config.ticketCategories || [];
  if (!categories.length) {
    await interaction.reply({
      content: "❌ Primero crea categorías con `/ticket-categoria-crear`.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }
  if (categories.length > 25) {
    await interaction.reply({
      content: "❌ Discord permite hasta 25 opciones en un menú. Reduce las categorías a 25 o menos.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId("mc_ticket_select")
    .setPlaceholder("🎫 Selecciona el tipo de ticket")
    .addOptions(categories.map(category => {
      const option = {
        label: category.name.slice(0, 100),
        value: category.id,
        description: (category.description || "Abrir un ticket").slice(0, 100)
      };
      if (category.emoji) {
        try { option.emoji = category.emoji; } catch {}
      }
      return option;
    }));

  await channel.send({
    embeds: [communityEmbed(
      config.ticketPanelTitle || "🎫 SOPORTE • MUSIC CITY",
      config.ticketPanelDescription ||
        "Selecciona una categoría para abrir un ticket privado. Nuestro equipo te atenderá lo antes posible."
    )],
    components: [new ActionRowBuilder().addComponents(menu)]
  });

  await interaction.reply({
    content: `✅ Panel de tickets publicado en ${channel}.`,
    flags: MessageFlags.Ephemeral
  });
}

async function openTicket(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const config = readConfig(interaction.guildId);
  const category = findCategory(config, interaction.values[0]);
  if (!category) {
    return interaction.editReply("❌ Esa categoría ya no existe. Pide al equipo que actualice el panel.");
  }

  const alreadyOpen = interaction.guild.channels.cache.find(channel => {
    const meta = channel.type === ChannelType.GuildText ? ticketMeta(channel) : null;
    return meta?.ownerId === interaction.user.id;
  });
  if (alreadyOpen) {
    return interaction.editReply(`⚠️ Ya tienes un ticket abierto: ${alreadyOpen}`);
  }

  const safeUser = interaction.user.username
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 18) || "usuario";
  const safeCategory = category.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 18) || "soporte";

  const overwrites = [
    {
      id: interaction.guild.roles.everyone.id,
      deny: [PermissionsBitField.Flags.ViewChannel]
    },
    {
      id: botClient.user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.ManageChannels
      ]
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.EmbedLinks
      ]
    }
  ];

  if (category.roleId && interaction.guild.roles.cache.has(category.roleId)) {
    overwrites.push({
      id: category.roleId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory
      ]
    });
  }

  const channel = await interaction.guild.channels.create({
    name: `ticket-${safeCategory}-${safeUser}`.slice(0, 90),
    type: ChannelType.GuildText,
    topic: `mc-ticket|${interaction.user.id}|${category.id}|0`,
    permissionOverwrites: overwrites,
    reason: `Ticket de ${interaction.user.tag}`
  });

  await channel.send({
    content: `${interaction.user}${category.roleId ? ` <@&${category.roleId}>` : ""}`,
    embeds: [communityEmbed(
      `${category.emoji || "🎫"} ${category.name}`,
      `Hola ${interaction.user}, tu ticket está abierto.\n\n**Motivo:** ${category.description || "Atención del equipo"}\nUn miembro del equipo te atenderá pronto.`
    )],
    components: [ticketButtons()]
  });

  await interaction.editReply(`✅ Tu ticket fue creado: ${channel}`);
}

async function handleTicketButton(interaction) {
  const channel = interaction.channel;
  const meta = ticketMeta(channel);
  if (!meta) {
    return interaction.reply({
      content: "❌ Este canal no parece ser un ticket de MUSIC CITY.",
      flags: MessageFlags.Ephemeral
    });
  }

  const config = readConfig(interaction.guildId);
  const category = (config.ticketCategories || []).find(c => c.id === meta.categoryId);
  const staff = staffCanManage(interaction, category);
  const isOwner = interaction.user.id === meta.ownerId;

  if (interaction.customId === "mc_ticket_claim") {
    if (!staff) {
      return interaction.reply({
        content: "❌ Solo el equipo autorizado puede reclamar este ticket.",
        flags: MessageFlags.Ephemeral
      });
    }
    if (meta.claimedId) {
      return interaction.reply({
        content: `⚠️ Este ticket ya está reclamado por <@${meta.claimedId}>.`,
        flags: MessageFlags.Ephemeral
      });
    }
    await channel.setTopic(`mc-ticket|${meta.ownerId}|${meta.categoryId}|${interaction.user.id}`);
    return interaction.reply(`🙋 ${interaction.user} se ha encargado de este ticket.`);
  }

  if (interaction.customId === "mc_ticket_release") {
    if (!staff || (meta.claimedId && meta.claimedId !== interaction.user.id &&
        !interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageChannels))) {
      return interaction.reply({
        content: "❌ No puedes liberar este ticket.",
        flags: MessageFlags.Ephemeral
      });
    }
    await channel.setTopic(`mc-ticket|${meta.ownerId}|${meta.categoryId}|0`);
    return interaction.reply("🔓 Ticket liberado. Otro miembro del equipo puede reclamarlo.");
  }

  if (interaction.customId === "mc_ticket_close") {
    if (!isOwner && !staff) {
      return interaction.reply({
        content: "❌ Solo quien abrió el ticket o el equipo autorizado puede cerrarlo.",
        flags: MessageFlags.Ephemeral
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`mc_ticket_close_modal|${channel.id}`)
      .setTitle("Cerrar ticket");

    const reason = new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("Motivo del cierre")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Escribe brevemente el motivo...")
      .setMaxLength(500)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(reason));
    return interaction.showModal(modal);
  }
}

async function closeTicket(interaction) {
  const channelId = interaction.customId.split("|")[1];
  const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
  const meta = channel && ticketMeta(channel);
  if (!channel || !meta) {
    return interaction.reply({
      content: "❌ No se encontró el canal del ticket.",
      flags: MessageFlags.Ephemeral
    });
  }

  const config = readConfig(interaction.guildId);
  const category = (config.ticketCategories || []).find(c => c.id === meta.categoryId);
  const staff = staffCanManage(interaction, category);
  if (interaction.user.id !== meta.ownerId && !staff) {
    return interaction.reply({
      content: "❌ No tienes permiso para cerrar este ticket.",
      flags: MessageFlags.Ephemeral
    });
  }

  const reason = interaction.fields.getTextInputValue("reason");
  const logChannel = config.ticketLogChannel
    ? await interaction.guild.channels.fetch(config.ticketLogChannel).catch(() => null)
    : null;

  if (logChannel?.isTextBased()) {
    await logChannel.send({
      embeds: [communityEmbed(
        "🔒 TICKET CERRADO",
        `**Canal:** #${channel.name}\n**Usuario:** <@${meta.ownerId}>\n**Cerrado por:** ${interaction.user}\n**Categoría:** ${category?.name || "Eliminada"}\n**Motivo:** ${reason}`,
        "#E74C3C"
      )]
    }).catch(() => {});
  }

  await interaction.reply({
    content: "🔒 Ticket cerrado. El canal se eliminará.",
    flags: MessageFlags.Ephemeral
  });
  await channel.delete(`Ticket cerrado por ${interaction.user.tag}: ${reason}`).catch(console.error);
}

async function handleCommand(interaction) {
  const name = interaction.commandName;
  const supported = [
    "configurar-bienvenida",
    "ticket-configurar",
    "ticket-categoria-crear",
    "ticket-categoria-editar",
    "ticket-categoria-eliminar",
    "ticket-panel"
  ];
  if (!supported.includes(name)) return false;

  if (!isAdmin(interaction)) {
    await interaction.reply({
      content: "❌ Necesitas el permiso Administrar servidor.",
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  const config = readConfig(interaction.guildId);

  if (name === "configurar-bienvenida") {
    const channel = interaction.options.getChannel("canal", true);
    const title = interaction.options.getString("titulo") || "🎵 ¡BIENVENIDO A MUSIC CITY!";
    const message = interaction.options.getString("mensaje") ||
      "¡Hola {user}! Te damos la bienvenida a **{server}**. Ahora somos **{count}** miembros.";
    const color = interaction.options.getString("color") || "#8A2BE2";

    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      await interaction.reply({
        content: "❌ Color inválido. Usa formato hexadecimal, por ejemplo #8A2BE2.",
        flags: MessageFlags.Ephemeral
      });
      return true;
    }

    config.welcomeConfig = { channelId: channel.id, title, message, color };
    saveConfig(interaction.guildId, config);
    await interaction.reply({
      content: `✅ Bienvenidas configuradas en ${channel}.\nPuedes usar {user}, {server} y {count} en el mensaje.`,
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  if (name === "ticket-configurar") {
    const panel = interaction.options.getChannel("canal-panel", true);
    const logs = interaction.options.getChannel("canal-logs", true);
    config.ticketPanelChannel = panel.id;
    config.ticketLogChannel = logs.id;
    saveConfig(interaction.guildId, config);
    await interaction.reply({
      content: `✅ Sistema de tickets configurado.\nPanel: ${panel}\nRegistros: ${logs}`,
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  if (name === "ticket-categoria-crear") {
    const categories = config.ticketCategories || [];
    if (categories.length >= 25) {
      await interaction.reply({
        content: "❌ Ya tienes 25 categorías. Discord permite hasta 25 opciones por panel.",
        flags: MessageFlags.Ephemeral
      });
      return true;
    }
    const nameValue = interaction.options.getString("nombre", true);
    if (categories.some(c => c.name.toLowerCase() === nameValue.toLowerCase())) {
      await interaction.reply({
        content: "❌ Ya existe una categoría con ese nombre.",
        flags: MessageFlags.Ephemeral
      });
      return true;
    }
    const role = interaction.options.getRole("rol");
    categories.push({
      id: crypto.randomUUID(),
      name: nameValue,
      emoji: interaction.options.getString("emoji") || "🎫",
      description: interaction.options.getString("descripcion") || "Atención del equipo MUSIC CITY",
      roleId: role?.id || null
    });
    config.ticketCategories = categories;
    saveConfig(interaction.guildId, config);
    await interaction.reply({
      content: `✅ Categoría **${nameValue}** creada. ${role ? `Equipo: ${role}` : "No se asignó un rol de atención."}`,
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  if (name === "ticket-categoria-editar") {
    const category = findCategory(config, interaction.options.getString("categoria", true));
    if (!category) {
      await interaction.reply({
        content: "❌ No encontré esa categoría. Escribe su nombre exacto.",
        flags: MessageFlags.Ephemeral
      });
      return true;
    }
    const newName = interaction.options.getString("nombre");
    const emoji = interaction.options.getString("emoji");
    const description = interaction.options.getString("descripcion");
    const role = interaction.options.getRole("rol");
    if (newName) category.name = newName;
    if (emoji) category.emoji = emoji;
    if (description) category.description = description;
    if (role) category.roleId = role.id;
    saveConfig(interaction.guildId, config);
    await interaction.reply({
      content: `✅ Categoría actualizada: **${category.name}**. Ejecuta \`/ticket-panel\` para publicar el panel actualizado.`,
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  if (name === "ticket-categoria-eliminar") {
    const value = interaction.options.getString("categoria", true);
    const category = findCategory(config, value);
    if (!category) {
      await interaction.reply({
        content: "❌ No encontré esa categoría.",
        flags: MessageFlags.Ephemeral
      });
      return true;
    }
    config.ticketCategories = (config.ticketCategories || []).filter(c => c.id !== category.id);
    saveConfig(interaction.guildId, config);
    await interaction.reply({
      content: `🗑️ Categoría **${category.name}** eliminada. Los tickets que ya están abiertos no se borran.`,
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  if (name === "ticket-panel") {
    if (!config.ticketPanelChannel || !config.ticketLogChannel) {
      await interaction.reply({
        content: "❌ Primero ejecuta `/ticket-configurar`.",
        flags: MessageFlags.Ephemeral
      });
      return true;
    }
    await publishTicketPanel(interaction, config);
    return true;
  }

  return false;
}

async function handleInteraction(interaction) {
  if (interaction.isStringSelectMenu() && interaction.customId === "mc_ticket_select") {
    await openTicket(interaction);
    return true;
  }

  if (interaction.isButton() && [
    "mc_ticket_claim",
    "mc_ticket_release",
    "mc_ticket_close"
  ].includes(interaction.customId)) {
    await handleTicketButton(interaction);
    return true;
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith("mc_ticket_close_modal|")) {
    await closeTicket(interaction);
    return true;
  }

  return false;
}

function init(client) {
  botClient = client;

  client.on("guildMemberAdd", async member => {
    const config = readConfig(member.guild.id);
    const welcome = config.welcomeConfig;
    if (!welcome?.channelId) return;

    const channel = await member.guild.channels.fetch(welcome.channelId).catch(() => null);
    if (!channel?.isTextBased()) return;

    const raw = welcome.message ||
      "¡Hola {user}! Te damos la bienvenida a **{server}**. Ahora somos **{count}** miembros.";
    const description = raw
      .replaceAll("{user}", `${member}`)
      .replaceAll("{server}", member.guild.name)
      .replaceAll("{count}", String(member.guild.memberCount));

    await channel.send({
      embeds: [communityEmbed(
        welcome.title || "🎵 ¡BIENVENIDO A MUSIC CITY!",
        description,
        welcome.color || "#8A2BE2"
      ).setThumbnail(member.user.displayAvatarURL({ size: 256 }))],
    }).catch(error => console.error("[WELCOME]", error));
  });

  console.log("[MUSIC CITY] Bienvenidas y tickets inicializados.");
}

module.exports = { init, handleInteraction, handleCommand };
