const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const PREFIX = '^';

client.once('ready', () => {
  console.log(`Bot přihlášen jako ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  // Parsování příkazu: ^addrole <název_role> @user1 @user2 ...
  const content = message.content.slice(PREFIX.length).trim();
  const args = content.split(/\s+/);

  const command = args.shift().toLowerCase();

  if (command !== 'addrole' && command !== 'removerole') return;

  const isAdding = command === 'addrole';

  // Kontrola oprávnění uživatele
  if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
    return message.reply('❌ Nemáš oprávnění spravovat role.');
  }

  // Druhý argument = název role (bez @, jen text, např. "Pay5")
  const roleName = args.shift();
  if (!roleName) {
    return message.reply(`❌ Zadej název role. Použití: \`^${command} <role> @user1 @user2 ...\``);
  }

  // Najdi roli na serveru (case-insensitive)
  const role = message.guild.roles.cache.find(
    (r) => r.name.toLowerCase() === roleName.toLowerCase()
  );

  if (!role) {
    return message.reply(`❌ Role **${roleName}** nebyla nalezena na tomto serveru.`);
  }

  // Kontrola, zda má bot vyšší roli než upravovaná role
  if (role.position >= message.guild.members.me.roles.highest.position) {
    return message.reply(`❌ Nemohu upravit roli **${role.name}** — je výše než moje nejvyšší role.`);
  }

  // Získej všechny zmíněné uživatele z message.mentions
  const mentionedMembers = message.mentions.members;

  if (!mentionedMembers || mentionedMembers.size === 0) {
    return message.reply(`❌ Neotagoval jsi žádné uživatele. Použití: \`^${command} <role> @user1 @user2 ...\``);
  }

  const results = { success: [], failed: [] };

  for (const [, member] of mentionedMembers) {
    try {
      if (isAdding) {
        if (member.roles.cache.has(role.id)) {
          results.failed.push(`${member.user.tag} (už má roli)`);
        } else {
          await member.roles.add(role);
          results.success.push(member.user.tag);
        }
      } else {
        if (!member.roles.cache.has(role.id)) {
          results.failed.push(`${member.user.tag} (roli nemá)`);
        } else {
          await member.roles.remove(role);
          results.success.push(member.user.tag);
        }
      }
    } catch (err) {
      results.failed.push(`${member.user.tag} (chyba: ${err.message})`);
    }
  }

  // Sestavení odpovědi
  let reply = '';
  const action = isAdding ? 'přidána' : 'odebrána';

  if (results.success.length > 0) {
    reply += `✅ Role **${role.name}** ${action} (${results.success.length}): ${results.success.join(', ')}\n`;
  }
  if (results.failed.length > 0) {
    reply += `⚠️ Nepodařilo se (${results.failed.length}): ${results.failed.join(', ')}`;
  }

  message.reply(reply || 'Žádná akce neprovedena.');
});

// Spuštění bota — token dej do proměnné prostředí DISCORD_TOKEN
client.login(process.env.DISCORD_TOKEN);
