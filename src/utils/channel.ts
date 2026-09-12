import { TextChannel } from "discord.js";
import { EpicRow } from "../db/db";

export async function syncEpicChannelName(
  channel: TextChannel,
  epic: EpicRow
): Promise<string> {
  // ใช้ 📦 นำหน้าชื่อห้องเสมอทุกกรณี
  const formattedName = `📦 ${epic.title}`;

  try {
    await channel.setName(formattedName);
  } catch (err) {
    console.warn(`[Channel Rename Warning] ไม่สามารถเปลี่ยนชื่อห้อง ${channel.id} ได้:`, err);
  }

  return formattedName;
}

export const syncEpicChannelMetadata = syncEpicChannelName;