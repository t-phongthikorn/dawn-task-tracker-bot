import { TextChannel } from "discord.js";
import { getTasksByEpicId, EpicRow } from "../db/db";
import { buildEpicEmbed } from "./embeded/epic";
import { updateStatusTracker } from "./statusTracker";
import { updateUserTaskTrackers } from "./userTracker";

export async function refreshEpicEmbed(channel: TextChannel, epic: EpicRow) {
  if (epic.message_id) {
    try {
      const embedMessage = await channel.messages.fetch(epic.message_id);
      const tasks = getTasksByEpicId(epic.id);
      const updatedEmbed = buildEpicEmbed(epic.title, epic.id, tasks);
      await embedMessage.edit({ embeds: [updatedEmbed] });
    } catch (err) {
      console.warn(`[Embed Update Warning] ไม่สามารถอัปเดต Embed ข้อความในห้อง ${channel.id} ได้:`, err);
    }
  }

  if (channel.guild) {
    await updateStatusTracker(channel.guild);
  }
  
  // อัปเดต Live Tracker ของสมาชิกทุกคนทั่วทั้ง Server แบบ Real-time
  await updateUserTaskTrackers(channel.client);
}