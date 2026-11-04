const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const admin = PermissionFlagsBits.ManageGuild;

module.exports = [
  new SlashCommandBuilder()
    .setName("configurar-verificacion")
    .setDescription("Configurar el sistema de verificación")
    .setDefaultMemberPermissions(admin)
    .addChannelOption(o => o.setName("canal").setDescription("Canal del panel").addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addRoleOption(o => o.setName("rol").setDescription("Rol de verificado").setRequired(true))
    .addChannelOption(o => o.setName("logs").setDescription("Canal de registros").addChannelTypes(ChannelType.GuildText).setRequired(true)),

  new SlashCommandBuilder()
    .setName("verificacion")
    .setDescription("Publicar el panel de verificación")
    .setDefaultMemberPermissions(admin),

  new SlashCommandBuilder()
    .setName("editar-panel")
    .setDescription("Personalizar el panel de verificación")
    .setDefaultMemberPermissions(admin)
    .addStringOption(o => o.setName("titulo").setDescription("Título del panel").setMaxLength(256))
    .addStringOption(o => o.setName("descripcion").setDescription("Descripción del panel").setMaxLength(4000))
    .addStringOption(o => o.setName("color").setDescription("Color hexadecimal, ejemplo #8A2BE2"))
    .addStringOption(o => o.setName("imagen").setDescription("URL de imagen grande"))
    .addStringOption(o => o.setName("miniatura").setDescription("URL de miniatura"))
    .addStringOption(o => o.setName("boton").setDescription("Texto del botón").setMaxLength(80))
    .addStringOption(o => o.setName("bienvenida").setDescription("Mensaje privado de bienvenida").setMaxLength(1500)),

  new SlashCommandBuilder()
    .setName("configurar-logs")
    .setDescription("Configurar el canal de logs generales")
    .setDefaultMemberPermissions(admin)
    .addChannelOption(o => o.setName("canal").setDescription("Canal de logs generales").addChannelTypes(ChannelType.GuildText).setRequired(true)),

  new SlashCommandBuilder()
    .setName("logs")
    .setDescription("Consultar los registros")
    .setDefaultMemberPermissions(admin),

  new SlashCommandBuilder()
    .setName("dm")
    .setDescription("Enviar mensaje privado")
    .setDefaultMemberPermissions(admin)
    .addUserOption(o => o.setName("usuario").setDescription("Destinatario").setRequired(true))
    .addStringOption(o => o.setName("mensaje").setDescription("Mensaje").setMaxLength(1900).setRequired(true)),

  new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Enviar un embed personalizado")
    .setDefaultMemberPermissions(admin)
    .addChannelOption(o => o.setName("canal").setDescription("Canal de destino").addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addStringOption(o => o.setName("titulo").setDescription("Título").setMaxLength(256).setRequired(true))
    .addStringOption(o => o.setName("descripcion").setDescription("Descripción").setMaxLength(4000).setRequired(true))
    .addStringOption(o => o.setName("color").setDescription("Color hexadecimal"))
    .addStringOption(o => o.setName("imagen").setDescription("URL de imagen")),

  new SlashCommandBuilder()
    .setName("configurar-bienvenida")
    .setDescription("Configurar las bienvenidas automáticas")
    .setDefaultMemberPermissions(admin)
    .addChannelOption(o => o.setName("canal").setDescription("Canal de bienvenida").addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addStringOption(o => o.setName("titulo").setDescription("Título del embed").setMaxLength(256))
    .addStringOption(o => o.setName("mensaje").setDescription("Usa {user}, {server} y {count}").setMaxLength(1800))
    .addStringOption(o => o.setName("color").setDescription("Color hexadecimal, ejemplo #8A2BE2")),

  new SlashCommandBuilder()
    .setName("ticket-configurar")
    .setDescription("Configurar los canales del sistema de tickets")
    .setDefaultMemberPermissions(admin)
    .addChannelOption(o => o.setName("canal-panel").setDescription("Canal donde se publicará el panel").addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addChannelOption(o => o.setName("canal-logs").setDescription("Canal de registros de tickets").addChannelTypes(ChannelType.GuildText).setRequired(true)),

  new SlashCommandBuilder()
    .setName("ticket-categoria-crear")
    .setDescription("Crear una categoría editable de tickets")
    .setDefaultMemberPermissions(admin)
    .addStringOption(o => o.setName("nombre").setDescription("Nombre de la categoría").setMaxLength(80).setRequired(true))
    .addStringOption(o => o.setName("emoji").setDescription("Emoji de la categoría").setMaxLength(50))
    .addStringOption(o => o.setName("descripcion").setDescription("Descripción que verá el usuario").setMaxLength(100))
    .addRoleOption(o => o.setName("rol").setDescription("Rol que atenderá esta categoría")),

  new SlashCommandBuilder()
    .setName("ticket-categoria-editar")
    .setDescription("Editar una categoría de tickets")
    .setDefaultMemberPermissions(admin)
    .addStringOption(o => o.setName("categoria").setDescription("Nombre actual de la categoría").setMaxLength(80).setRequired(true))
    .addStringOption(o => o.setName("nombre").setDescription("Nuevo nombre").setMaxLength(80))
    .addStringOption(o => o.setName("emoji").setDescription("Nuevo emoji").setMaxLength(50))
    .addStringOption(o => o.setName("descripcion").setDescription("Nueva descripción").setMaxLength(100))
    .addRoleOption(o => o.setName("rol").setDescription("Nuevo rol de atención")),

  new SlashCommandBuilder()
    .setName("ticket-categoria-eliminar")
    .setDescription("Eliminar una categoría de tickets")
    .setDefaultMemberPermissions(admin)
    .addStringOption(o => o.setName("categoria").setDescription("Nombre de la categoría").setMaxLength(80).setRequired(true)),

  new SlashCommandBuilder()
    .setName("ticket-panel")
    .setDescription("Publicar o actualizar el panel de tickets")
    .setDefaultMemberPermissions(admin),

  // Comandos de música que ya tienen controlador en music.js
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Reproducir una canción de YouTube")
    .addStringOption(o => o.setName("enlace").setDescription("Enlace HTTPS de YouTube").setRequired(true)),

  new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Saltar la canción actual"),

  new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pausar la reproducción"),

  new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Reanudar la reproducción"),

  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Detener la reproducción"),

  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Mostrar la cola musical"),

  new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Mostrar la canción actual"),

  new SlashCommandBuilder()
    .setName("leave")
    .setDescription("Desconectar el bot del canal de voz"),

  new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Cambiar el volumen de la música")
    .addIntegerOption(o => o.setName("nivel").setDescription("Volumen entre 0 y 100").setMinValue(0).setMaxValue(100).setRequired(true))
].map(command => command.toJSON());
