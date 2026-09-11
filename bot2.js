const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField,
    ChannelType
} = require('discord.js');
const mongoose = require('mongoose');
const http = require('http');
const User = require('./User');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const ROLES_STAFF = ['ADMINS | NOVA BET', 'OWNERS | NOVA BET', 'ADM | FILA'];
const CATEGORIA_TICKETS_ID = 'AQUÍ_ID_CATEGORIA_TIENDA';

// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Base de datos MongoDB conectada en Bot 2.'))
    .catch(err => console.error('❌ Error al conectar MongoDB:', err));

async function obtenerOIniciarUsuario(userId) {
    let usuario = await User.findOne({ userId });
    if (!usuario) {
        usuario = await User.create({ userId });
    }
    return usuario;
}

// TIENDA 1: ROLES Y RANGOS
const PRODUCTOS_TIENDA_1 = {
    'rol_imparavel': { nombre: '🔥 IMPARAVEL', precio: 400, tipo: 'rol', roleName: 'IMPARAVEL' },
    'rol_rei': { nombre: '👑 REI', precio: 300, tipo: 'rol', roleName: 'REI' },
    'rol_aura_farmer': { nombre: '✨ AURA FARMER', precio: 200, tipo: 'rol', roleName: 'AURA FARMER' },
    'rol_ego': { nombre: '⚡ EGO', precio: 100, tipo: 'rol', roleName: 'EGO' },
    'rol_farmer': { nombre: '🌾 FARMER', precio: 50, tipo: 'rol', roleName: 'FARMER' }
};

// TIENDA 2: PREMIOS ESPECIALES Y KEYS
const PRODUCTOS_TIENDA_2 = {
    'num_virtual': { nombre: '📱 1 Número Virtual (+55 +44 +84 +27 +1 +91)', precio: 4000, tipo: 'ticket' },
    'chip_56': { nombre: '📞 Chip +56', precio: 6000, tipo: 'ticket' },
    'ig_followers': { nombre: '📸 1.5k Seguidores de IG', precio: 8000, tipo: 'ticket' },
    'bot_tg': { nombre: '🤖 Bot de Telegram (Números Virtuales)', precio: 10000, tipo: 'ticket' },
    'key_1dia': { nombre: '🔑 Key de 1 Día', precio: 15000, tipo: 'ticket' },
    'key_1semana': { nombre: '🔑 Key de 1 Semana', precio: 25000, tipo: 'ticket' }
};

function esStaff(member) {
    return member.roles.cache.some(r => ROLES_STAFF.includes(r.name));
}

client.once('ready', () => console.log(`🛍️ Bot 2 (Tiendas Actualizadas) conectado como ${client.user.tag}`));

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // DESPLEGAR TIENDA 1 (ROLES)
    if (message.content === '!setup-tienda1') {
        if (!esStaff(message.member)) return;

        const embed = new EmbedBuilder()
            .setTitle('👑 TIENDA DE ROLES Y RANGOS - NOVA BET')
            .setDescription('¡Canjea tus **Coins** acumuladas por rangos exclusivos en el servidor!\n\nSelecciona un rol del menú desplegable de abajo:')
            .setColor('#F1C40F');

        const opciones = Object.keys(PRODUCTOS_TIENDA_1).map(key => ({
            label: PRODUCTOS_TIENDA_1[key].nombre,
            description: `Precio: ${PRODUCTOS_TIENDA_1[key].precio} Coins`,
            value: `t1_${key}`,
            emoji: '👑'
        }));

        const selectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_tienda_1')
                .setPlaceholder('Explorar Roles Disponibles...')
                .addOptions(opciones)
        );

        await message.channel.send({ embeds: [embed], components: [selectMenu] });
        return message.delete().catch(() => {});
    }

    // DESPLEGAR TIENDA 2 (PREMIOS ESPECIALES)
    if (message.content === '!setup-tienda2') {
        if (!esStaff(message.member)) return;

        const embed = new EmbedBuilder()
            .setTitle('🎁 TIENDA DE PREMIOS ESPECIALES - NOVA BET')
            .setDescription('¡Canjea tus **Coins** por números virtuales, seguidores, bots o keys!\n\nAl realizar la compra se creará un canal privado con el Staff para realizar la entrega.')
            .setColor('#3498DB');

        const opciones = Object.keys(PRODUCTOS_TIENDA_2).map(key => ({
            label: PRODUCTOS_TIENDA_2[key].nombre,
            description: `Precio: ${PRODUCTOS_TIENDA_2[key].precio.toLocaleString()} Coins`,
            value: `t2_${key}`,
            emoji: '🎁'
        }));

        const selectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_tienda_2')
                .setPlaceholder('Explorar Premios Disponibles...')
                .addOptions(opciones)
        );

        await message.channel.send({ embeds: [embed], components: [selectMenu] });
        return message.delete().catch(() => {});
    }

    // CERRAR CANAL DE ENTREGA
    if (message.content === '.cerrar') {
        if (!message.channel.name.startsWith('🛒-')) return;
        if (!esStaff(message.member)) return;

        await message.channel.send('🔒 **Entrega finalizada.** Este canal se eliminará en 5 segundos...');
        setTimeout(() => message.channel.delete().catch(() => {}), 5000);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton() && interaction.customId === 'cerrar_ticket') {
        if (!esStaff(interaction.member)) {
            return interaction.reply({ content: '❌ Solo el Staff puede finalizar este ticket.', ephemeral: true });
        }
        await interaction.reply('🔒 **Entrega completada.** Eliminando canal en 5 segundos...');
        return setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }

    if (!interaction.isStringSelectMenu()) return;
    if (!['menu_tienda_1', 'menu_tienda_2'].includes(interaction.customId)) return;

    const val = interaction.values[0];
    let producto;

    if (val.startsWith('t1_')) producto = PRODUCTOS_TIENDA_1[val.replace('t1_', '')];
    else if (val.startsWith('t2_')) producto = PRODUCTOS_TIENDA_2[val.replace('t2_', '')];

    if (!producto) return;

    const userId = interaction.user.id;
    const usuarioData = await obtenerOIniciarUsuario(userId);

    if (usuarioData.coins < producto.precio) {
        return interaction.reply({ 
            content: `❌ No tienes suficientes coins. Saldo actual: **${usuarioData.coins.toLocaleString()} Coins**. Precio: **${producto.precio.toLocaleString()} Coins**.`, 
            ephemeral: true 
        });
    }

    usuarioData.coins -= producto.precio;
    await usuarioData.save();

    if (producto.tipo === 'rol') {
        const rol = interaction.guild.roles.cache.find(r => r.name === producto.roleName);
        if (rol) {
            await interaction.member.roles.add(rol).catch(() => {});
            return interaction.reply({ content: `🎉 ¡Felicidades! Compraste **${producto.nombre}** por **${producto.precio.toLocaleString()} Coins**. Rol asignado automáticamente.`, ephemeral: true });
        } else {
            return interaction.reply({ content: `✅ Compra realizada por **${producto.precio.toLocaleString()} Coins**, pero el rol no se encontró en el servidor. Revisa que el rol exista exactamente con ese nombre.`, ephemeral: true });
        }
    }

    // ENTREGA MANUAL (TICKET PRIVADO)
    const guild = interaction.guild;
    const overwrites = [
        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: userId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] }
    ];

    guild.roles.cache.forEach(r => {
        if (ROLES_STAFF.includes(r.name)) {
            overwrites.push({ id: r.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] });
        }
    });

    const ch = await guild.channels.create({
        name: `🛒-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: CATEGORIA_TICKETS_ID !== 'AQUÍ_ID_CATEGORIA_TIENDA' ? CATEGORIA_TICKETS_ID : null,
        permissionOverwrites: overwrites
    });

    const embedTicket = new EmbedBuilder()
        .setTitle('📦 RECLAMO DE RECOMPENSA')
        .setDescription(`¡Hola <@${userId}>! Gracias por tu compra.\n\n` +
            `📌 **DETALLES DEL CANJE:**\n` +
            `• **Producto:** ${producto.nombre}\n` +
            `• **Precio:** ${producto.precio.toLocaleString()} Coins\n` +
            `• **Saldo Restante:** ${usuarioData.coins.toLocaleString()} Coins\n\n` +
            `💬 *Usa este canal para coordinar la entrega de tu premio con el Staff.*`)
        .setColor('#2ECC71')
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cerrar_ticket').setLabel('Finalizar Entrega (Staff)').setStyle(ButtonStyle.Danger).setEmoji('🔒')
    );

    await ch.send({ content: `<@${userId}> | Staff Atención`, embeds: [embedTicket], components: [row] });

    await interaction.reply({ content: `🎉 ¡Compra exitosa! Se creó el canal privado <#${ch.id}> para coordinar la entrega de tu premio.`, ephemeral: true });
});

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot en linea 24/7');
}).listen(process.env.PORT || 3000);

client.login(process.env.TOKEN);
