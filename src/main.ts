import 'dotenv/config';
import {
  Client,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
} from 'discord.js';
import { taskCommand } from './commands/task';
import { epicCommand } from './commands/epic';

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID; // optional, for instant dev registration

if (!TOKEN || !CLIENT_ID) {
  throw new Error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env');
}

// Intents: only request what you actually need. Guilds is required for
// slash commands to work at all; add more (e.g. GuildMessages) only if
// you plan to read message content too.
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});



// Map สำหรับแมปชื่อคำสั่งเข้ากับ Object คำสั่ง
const commandsMap = new Map([
  [taskCommand.data.name, taskCommand],
  [epicCommand.data.name, epicCommand]
]);

// --- Command registration --------------------------------------------------

async function registerCommands(): Promise<void> {
  try {
    console.log('กำลังลงทะเบียนคำสั่ง Slash Commands...');

    const rest = new REST().setToken(TOKEN!);
    const allCommand = Array.from(commandsMap.values()).map(commands => commands.data.toJSON())
    await rest.put(Routes.applicationCommands(CLIENT_ID!), { body: [] });
    // เลือกระหว่าง Guild Commands ( dev - อัปเดตทันที) หรือ Global Commands ( prod - ใช้เวลาอัปเดต)
    const route = GUILD_ID
      ? Routes.applicationGuildCommands(CLIENT_ID!, GUILD_ID)
      : Routes.applicationCommands(CLIENT_ID!);

    await rest.put(route, { body: allCommand });

    console.log(
      `ลงทะเบียนสำเร็จทั้งหมด ${allCommand.length} คำสั่ง! [โหมด: ${
        GUILD_ID ? 'Guild (Dev)' : 'Global (Prod)'
      }]`
    );
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการลงทะเบียนคำสั่ง:', error);
  }
}


client.once(Events.ClientReady, (readyClient) => {
  console.log(`🤖 Logged in as ${readyClient.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    const command = commandsMap.get(interaction.commandName);
    if (command) {
      await command.execute(interaction);
    }
  } catch (err) {
    console.error('Error handling command:', err);
    const payload = { content: 'Something went wrong running that command.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  }
});


async function main() {
  await registerCommands();
  await client.login(TOKEN);
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});