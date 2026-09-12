import {
  SlashCommandSubcommandBuilder,
  ChatInputCommandInteraction,
  TextChannel,
  MessageFlags,
} from "discord.js";
import {
  getArchivedEpicById,
  getArchivedEpicByChannelId,
  unarchiveEpic,
  getTasksByEpicId,
} from "../../db/db";
import { buildEpicEmbed } from "../../utils/embeded/epic";
import { updateStatusTracker } from "../../utils/statusTracker";
import { refreshAllTrackers } from "../../utils/trackerNotifier";

const ACTIVE_CATEGORY_ID = process.env.ACTIVE_CATEGORY_ID || "1547424230935765092";

export const unarchiveSubCommand = {
  build: (sub: SlashCommandSubcommandBuilder) =>
    sub
      .setName("unarchive")
      .setDescription("นำ Epic และ Task ทั้งหมดกลับมาจากคลังเก็บ")
      .addStringOption((opt) =>
        opt
          .setName("epic_id")
          .setDescription("ID ของ Epic (หากเว้นว่างจะอ้างอิงจากห้องปัจจุบัน)")
          .setRequired(false)
      ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    await interaction.reply({
      content: "⏳ กำลังนำ Epic กลับมาจากคลังเก็บ...",
      flags: MessageFlags.Ephemeral,
    });

    const inputEpicId = interaction.options.getString("epic_id");
    const currentChannel = interaction.channel as TextChannel | null;

    const targetIdentifier = inputEpicId || currentChannel?.id;
    if (!targetIdentifier) {
      await interaction.editReply({
        content: "❌ กรุณาระบุ `epic_id` หรือเรียกใช้คำสั่งนี้ภายใน Epic Channel",
      });
      return;
    }

    const epic =
      getArchivedEpicById(targetIdentifier) ||
      getArchivedEpicByChannelId(targetIdentifier);

    if (!epic) {
      await interaction.editReply({
        content: "❌ ไม่พบ Epic ที่ถูก Archive ตามที่ระบุ",
      });
      return;
    }

    try {
      const success = unarchiveEpic(epic.id);
      if (!success) {
        await interaction.editReply({ content: "❌ ไม่สามารถอัปเดตข้อมูลใน DB ได้" });
        return;
      }

      const restoredEpic = { ...epic, is_archived: 0 };
      const targetChannel = (await interaction.guild.channels.fetch(
        epic.channel_id
      )) as TextChannel | null;

      if (targetChannel) {
        await targetChannel.setParent(ACTIVE_CATEGORY_ID, { lockPermissions: false });

        if (epic.message_id) {
          try {
            const embedMessage = await targetChannel.messages.fetch(epic.message_id);
            const tasks = getTasksByEpicId(epic.id);
            const updatedEmbed = buildEpicEmbed(restoredEpic.title, epic.id, tasks);
            await embedMessage.edit({ embeds: [updatedEmbed] });
          } catch {
            // ละเว้นกรณีข้อความถูกลบ
          }
        }
      }

      // 🔔 อัปเดต Status Tracker เพื่อดึง Epic กลับขึ้นมาแสดงอีกครั้ง
      await updateStatusTracker(interaction.guild);
      await refreshAllTrackers(interaction.client, interaction.guild);
      await interaction.editReply({
        content: `🟢 คืนสถานะ Epic **\`${epic.id}\`** (${restoredEpic.title}) เข้าสู่หมวดหมู่หลักเรียบร้อยแล้ว!`,
      });
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการ Unarchive Epic:", error);
      await interaction.editReply({
        content: "❌ ไม่สามารถย้าย Channel ได้ กรุณาตรวจสอบสิทธิ์ของบอท (Manage Channels)",
      });
    }
  },
};