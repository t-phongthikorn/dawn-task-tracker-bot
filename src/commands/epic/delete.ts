import {
  SlashCommandSubcommandBuilder,
  ChatInputCommandInteraction,
  TextChannel,
  MessageFlags,
} from "discord.js";
import {
  getEpicById,
  getEpicByChannelId,
  deleteEpic,
} from "../../db/db";
import { updateStatusTracker } from "../../utils/statusTracker";
import { refreshAllTrackers } from "../../utils/trackerNotifier";

export const deleteEpicSubCommand = {
  build: (sub: SlashCommandSubcommandBuilder) =>
    sub
      .setName("delete")
      .setDescription("ลบ Epic, Task ทั้งหมดในระบบ และลบ Channel ทิ้งถาวร")
      .addStringOption((opt) =>
        opt
          .setName("epic_id")
          .setDescription("ID ของ Epic (หากเว้นว่างจะอ้างอิงจากห้องปัจจุบัน)")
          .setRequired(false)
      ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    // 1. ซื้อเวลาประมวลผลจาก Discord ทันที (ป้องกัน Timeout 3 วินาที)
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    try {
      const inputEpicId = interaction.options.getString("epic_id");
      const currentChannel = interaction.channel as TextChannel | null;

      const targetIdentifier = inputEpicId || currentChannel?.id;
      if (!targetIdentifier) {
        await interaction.editReply({
          content: "❌ กรุณาระบุ `epic_id` หรือเรียกใช้คำสั่งนี้ภายใน Epic Channel",
        });
        return;
      }

      const epic = getEpicById(targetIdentifier) || getEpicByChannelId(targetIdentifier);

      if (!epic) {
        await interaction.editReply({
          content: "❌ ไม่พบ Epic ที่ระบุในระบบ",
        });
        return;
      }

      // 2. ลบ Epic และ Task ทั้งหมดออกจาก Database
      const success = deleteEpic(epic.id);
      if (!success) {
        await interaction.editReply({ content: "❌ ไม่สามารถลบข้อมูลออกจาก DB ได้" });
        return;
      }

      // 3. อัปเดต Status Tracker
      await updateStatusTracker(interaction.guild);

      // 4. แจ้งผู้ใช้ว่าลบสำเร็จ ก่อนทำการลบ Channel ทิ้ง
      await interaction.editReply({
        content: `🗑️ ลบ Epic **\`${epic.id}\`** (${epic.title}) และข้อมูลทั้งหมดเรียบร้อยแล้ว!`,
      });

      // 5. ลบ Channel เป็นลำดับสุดท้าย (เว้นระยะ 1.5 วินาทีเพื่อให้ส่งข้อความเสร็จสมบูรณ์)
      const targetChannel = (await interaction.guild.channels.fetch(
        epic.channel_id
      ).catch(() => null)) as TextChannel | null;

      if (targetChannel) {
        setTimeout(async () => {
            await refreshAllTrackers(interaction.client, interaction.guild);
          await targetChannel.delete(`Epic deleted by ${interaction.user.tag}`).catch(console.error);
        }, 1500);
      }
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการลบ Epic:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: "❌ เกิดข้อผิดพลาดในการลบ Epic กรุณาตรวจสอบ Console Log",
        });
      }
    }
  },
};