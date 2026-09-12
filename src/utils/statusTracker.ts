import { Guild, TextChannel, EmbedBuilder } from "discord.js";
import { 
  getAllActiveEpicsStatus, 
  getEpicPriorityEmoji, 
  getStatusTracker, 
  saveStatusTracker 
} from "../db/db";

const TRACKER_CHANNEL_ID : any = process.env.TASK_STATUS_CHANNEL_ID;

function createProgressBar(completed: number, total: number): string {
  if (total === 0) return "`[▱▱▱▱▱▱▱▱▱▱]` **0%**";
  const percentage = Math.round((completed / total) * 100);
  const filled = Math.round((percentage / 100) * 10);
  const empty = 10 - filled;
  return `\`[${"▰".repeat(filled)}${"▱".repeat(empty)}]\` **${percentage}%** (${completed}/${total})`;
}

export async function updateStatusTracker(guild: Guild): Promise<void> {
  try {
    const channel = (await guild.channels.fetch(TRACKER_CHANNEL_ID).catch(() => null)) as TextChannel | null;
    if (!channel) return;

    const epicsData = getAllActiveEpicsStatus();

    // กรณีไม่มี Epic ที่ Active อยู่
    if (epicsData.length === 0) {
      const emptyEmbed = new EmbedBuilder()
        .setTitle("📊 Status Tracking Overview")
        .setColor(0x3498db)
        .setDescription(
          "ภาพรวม Epic และความคืบหน้าของงานทั้งหมดในระบบ\n\n📌 **ไม่มี Epic ที่กำลังดำเนินการ**\nขณะนี้ยังไม่มี Epic ที่ Active อยู่ในระบบ"
        )
        .setTimestamp();

      await sendOrEditTrackerMessage(guild.id, channel, [emptyEmbed]);
      return;
    }

    const epicsWithChannel = await Promise.all(
      epicsData.map(async (epic) => {
        const ch = await guild.channels.fetch(epic.channel_id).catch(() => null);
        return {
          ...epic,
          channelMention: ch ? `<#${epic.channel_id}>` : "⚠️ *ไม่พบ Channel*",
        };
      })
    );

    const embeds: EmbedBuilder[] = [];
    const MAX_TOTAL_CHARS = 5500;
    const MAX_DESC_CHARS = 3500;

    let currentDescription = "ภาพรวม Epic และความคืบหน้าของงานทั้งหมดในระบบ\n\n";
    let currentEmbedIndex = 1;
    let totalCharsUsed = currentDescription.length;
    let omittedCount = 0;

    let currentEmbed = new EmbedBuilder()
      .setTitle("📊 Status Tracking Overview")
      .setColor(0x3498db);

    for (let i = 0; i < epicsWithChannel.length; i++) {
      const epic = epicsWithChannel[i];
      const priorityEmoji = getEpicPriorityEmoji(epic.priority);
      const progressStr = createProgressBar(epic.completed_count, epic.total_count);
      const assigneesStr =
        epic.assignees.length > 0
          ? epic.assignees.map((id) => `<@${id}>`).join(", ")
          : "*ยังไม่มีผู้รับผิดชอบ*";

      const block = [
        `### ${priorityEmoji} ${epic.title} \`(${epic.id})\``,
        `> 🔗 **Channel:** ${epic.channelMention}`,
        `> 📊 **Progress:** ${progressStr}`,
        `> 👥 **Assignees:** ${assigneesStr}`,
      ].join("\n");

      const separator = currentDescription.endsWith("\n\n") ? "" : "\n───────────────────\n";
      const addedLength = separator.length + block.length;

      if (totalCharsUsed + addedLength > MAX_TOTAL_CHARS) {
        omittedCount = epicsWithChannel.length - i;
        break;
      }

      if (currentDescription.length + addedLength > MAX_DESC_CHARS) {
        currentEmbed.setDescription(currentDescription);
        embeds.push(currentEmbed);

        currentEmbedIndex++;
        currentEmbed = new EmbedBuilder()
          .setTitle(`📊 Status Tracking Overview (ส่วนที่ ${currentEmbedIndex})`)
          .setColor(0x3498db);

        currentDescription = block;
        totalCharsUsed += block.length;
      } else {
        currentDescription += separator + block;
        totalCharsUsed += addedLength;
      }
    }

    if (omittedCount > 0) {
      currentDescription += `\n\n───────────────────\n⚠️ *และอีก ${omittedCount} Epic ที่ไม่ได้แสดงเนื่องจากเกินขีดจำกัดความยาวของ Discord*`;
    }

    currentEmbed.setDescription(currentDescription);
    currentEmbed.setTimestamp();
    embeds.push(currentEmbed);

    await sendOrEditTrackerMessage(guild.id, channel, embeds);
  } catch (err) {
    console.warn("[Status Tracker Warning] ไม่สามารถอัปเดต Status Tracking ได้:", err);
  }
}

async function sendOrEditTrackerMessage(
  guildId: string,
  channel: TextChannel,
  embeds: EmbedBuilder[] = []
) {
  const savedTracker = getStatusTracker(guildId);

  // 1. ถ้ามี ID ใน Database และอยู่ในห้องเดียวกัน ให้พยายาม Fetch และ Edit ข้อความเดิม
  if (savedTracker && savedTracker.channel_id === channel.id) {
    const existingMsg = await channel.messages.fetch(savedTracker.message_id).catch(() => null);
    if (existingMsg) {
      await existingMsg.edit({ embeds });
      return;
    }
  }

  // 2. ถ้ายังไม่มีใน DB หรือข้อความเดิมถูกลบไปแล้ว ให้ส่งข้อความใหม่แล้วอัปเดต DB ทันที
  const newMsg = await channel.send({ embeds });
  saveStatusTracker(guildId, channel.id, newMsg.id);
}