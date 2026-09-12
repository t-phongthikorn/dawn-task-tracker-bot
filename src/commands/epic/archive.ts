import {
  SlashCommandSubcommandBuilder,
  ChatInputCommandInteraction,
  TextChannel,
  MessageFlags,
} from "discord.js";
import {
  getEpicById,
  getEpicByChannelId,
  archiveEpic,
} from "../../db/db";
import { updateStatusTracker } from "../../utils/statusTracker";
import { refreshAllTrackers } from "../../utils/trackerNotifier";

const ARCHIVE_CATEGORY_ID = process.env.ARCHIVE_CATEGORY_ID || "1547932386422165545";

export const archiveSubCommand = {
  build: (sub: SlashCommandSubcommandBuilder) =>
    sub
      .setName("archive")
      .setDescription("ย้าย Epic และ Task ทั้งหมดไปยังคลังเก็บ (Archive)")
      .addStringOption((opt) =>
        opt
          .setName("epic_id")
          .setDescription("ID ของ Epic (หากเว้นว่างจะอ้างอิงจากห้องปัจจุบัน)")
          .setRequired(false)
      ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    await interaction.reply({
      content: "⏳ กำลังย้าย Epic เข้าคลังเก็บ...",
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

    const epic = getEpicById(targetIdentifier) || getEpicByChannelId(targetIdentifier);

    if (!epic) {
      await interaction.editReply({
        content: "❌ ไม่พบ Epic ที่ระบุ หรือ Epic นี้ถูก Archive ไปก่อนหน้านี้แล้ว",
      });
      return;
    }

    try {
      const success = archiveEpic(epic.id);
      if (!success) {
        await interaction.editReply({ content: "❌ ไม่สามารถอัปเดตข้อมูลใน DB ได้" });
        return;
      }

      // ย้าย Category
      const targetChannel = (await interaction.guild.channels.fetch(
        epic.channel_id
      )) as TextChannel | null;

      if (targetChannel) {
        await targetChannel.setParent(ARCHIVE_CATEGORY_ID, { lockPermissions: false });
      }

      // 🔔 อัปเดต Status Tracker เพื่อซ่อน Epic ที่ถูก Archive ออกทันที
      await updateStatusTracker(interaction.guild);
      await refreshAllTrackers(interaction.client, interaction.guild);
      await interaction.editReply({
        content: `📦 ย้าย Epic **\`${epic.id}\`** (${epic.title}) เข้าคลังเก็บเรียบร้อยแล้ว!`,
      });
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการ Archive Epic:", error);
      await interaction.editReply({
        content: "❌ ไม่สามารถย้าย Channel ได้ กรุณาตรวจสอบสิทธิ์ของบอท (Manage Channels)",
      });
    }
  },
};