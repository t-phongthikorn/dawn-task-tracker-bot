import {
  SlashCommandSubcommandBuilder,
  ChatInputCommandInteraction,
  TextChannel,
  MessageFlags,
} from "discord.js";
import {
  getEpicByIdOrChannelAnyStatus,
  updateEpicTitle,
  getTasksByEpicId,
  checkRenameCooldown,
} from "../../db/db";
import { buildEpicEmbed } from "../../utils/embeded/epic";
import { syncEpicChannelName } from "../../utils/channel";

export const renameSubCommand = {
  build: (sub: SlashCommandSubcommandBuilder) =>
    sub
      .setName("rename")
      .setDescription("เปลี่ยนชื่อ Epic (พิมพ์ในห้อง Epic หรือระบุ ID)")
      .addStringOption((opt) =>
        opt
          .setName("title")
          .setDescription("ชื่อใหม่ที่ต้องการเปลี่ยน")
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName("epic_id")
          .setDescription("ID ของ Epic (หากเว้นว่างจะอ้างอิงจากห้องปัจจุบัน)")
          .setRequired(false)
      ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    await interaction.reply({
      content: "⏳ กำลังตรวจสอบข้อมูล...",
      flags: MessageFlags.Ephemeral,
    });

    const newTitle = interaction.options.getString("title", true);
    const inputEpicId = interaction.options.getString("epic_id");
    const currentChannel = interaction.channel as TextChannel | null;

    const targetIdentifier = inputEpicId || currentChannel?.id;
    if (!targetIdentifier) {
      await interaction.editReply({
        content: "❌ กรุณาระบุ `epic_id` หรือเรียกใช้คำสั่งนี้ภายใน Epic Channel",
      });
      return;
    }

    const epic = getEpicByIdOrChannelAnyStatus(targetIdentifier);
    if (!epic) {
      await interaction.editReply({
        content: inputEpicId
          ? `❌ ไม่พบ Epic ID \`${inputEpicId}\` ในระบบ`
          : "❌ ห้องนี้ไม่ใช่ Epic Channel",
      });
      return;
    }

    // 1. เช็ก Rate Limit Cooldown 10 นาที
    const cooldown = checkRenameCooldown(epic);
    if (!cooldown.allowed) {
      await interaction.editReply({
        content: `⏱️ **ติด Cooldown ของ Discord Rate Limit!**\nEpic นี้เพิ่งถูกเปลี่ยนชื่อไปเมื่อไม่นาน กรุณารออีกประมาณ **${cooldown.remainingMinutes} นาที** ก่อนลองใหม่อีกครั้ง`,
      });
      return;
    }

    try {
      // 2. อัปเดต DB
      updateEpicTitle(epic.id, newTitle);
      const updatedEpic = { ...epic, title: newTitle };

      // 3. ดึง TextChannel แล้วอัปเดตทั้ง Embed และชื่อห้อง
      const targetChannel = (await interaction.guild.channels.fetch(
        epic.channel_id
      )) as TextChannel | null;

      if (targetChannel) {
        if (epic.message_id) {
          try {
            const embedMessage = await targetChannel.messages.fetch(epic.message_id);
            const tasks = getTasksByEpicId(epic.id);
            const updatedEmbed = buildEpicEmbed(newTitle, epic.id, tasks);
            await embedMessage.edit({ embeds: [updatedEmbed] });
          } catch {
            // ละเว้นกรณี Embed โดนลบมือ
          }
        }

        await syncEpicChannelName(targetChannel, updatedEpic);
      }

      await interaction.editReply({
        content: `✏️ เปลี่ยนชื่อ Epic ID **\`${epic.id}\`** เป็น **"${newTitle}"** เรียบร้อยแล้ว!`,
      });
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการ Rename Epic:", error);
      await interaction.editReply({
        content: "❌ ไม่สามารถเปลี่ยนชื่อได้ กรุณาตรวจสอบสิทธิ์ของบอท",
      });
    }
  },
};