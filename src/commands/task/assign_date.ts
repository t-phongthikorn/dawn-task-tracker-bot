import {
  SlashCommandSubcommandBuilder,
  ChatInputCommandInteraction,
  TextChannel,
  MessageFlags,
} from "discord.js";
import { resolveEpic } from "../../utils/resolvedEpic";
import { getTaskIdByNum, updateTaskDueDate } from "../../db/db";
import { refreshEpicEmbed } from "../../utils/updateEpicEmbeded";

export const assignDateSubCommand = {
  build: (sub: SlashCommandSubcommandBuilder) =>
    sub
      .setName("assign-date")
      .setDescription("กำหนดหรือลบวันส่งงานให้กับ Task")
      .addIntegerOption((opt) =>
        opt.setName("task_num").setDescription("ลำดับ Task (1, 2, 3...)").setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName("due_date").setDescription("วันกำหนดส่ง (เช่น 2026-12-31) หากไม่ใส่จะลบวันส่งออก").setRequired(false)
      )
      .addStringOption((opt) =>
        opt.setName("epic_id").setDescription("ID ของ Epic (หากเว้นว่างจะอ้างอิงจากห้องนี้)")
      ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    await interaction.reply({ content: "⏳ กำลังประมวลผล...", flags: MessageFlags.Ephemeral });

    const epic = resolveEpic(interaction);
    if (!epic) {
      await interaction.editReply({
        content: "❌ ไม่พบ Epic ที่ระบุ หรือห้องนี้ไม่ใช่ Epic Channel",
      });
      return;
    }

    const taskNum = interaction.options.getInteger("task_num", true);
    const dueDateInput = interaction.options.getString("due_date");
    const taskId = getTaskIdByNum(epic.id, taskNum);

    if (!taskId) {
      await interaction.editReply({ content: `❌ ไม่พบ Task ลำดับที่ **#${taskNum}** ใน Epic นี้` });
      return;
    }

    const finalDate = dueDateInput && dueDateInput.trim() !== "" ? dueDateInput : null;
    updateTaskDueDate(taskId, finalDate);

    const targetChannel = (await interaction.guild.channels.fetch(epic.channel_id)) as TextChannel | null;
    if (targetChannel) await refreshEpicEmbed(targetChannel, epic);

    await interaction.editReply({
      content: finalDate
        ? `📅 อัปเดตวันส่ง Task **#${taskNum}** เป็น \`${finalDate}\` เรียบร้อยแล้ว!`
        : `🗑️ ลบวันกำหนดส่ง Task **#${taskNum}** เรียบร้อยแล้ว!`,
    });
  },
};