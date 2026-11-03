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
    .addStringOption(o => o.setName("imagen").setDescription("URL de imagen"))
].map(c => c.toJSON());

