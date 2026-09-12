import {
  SlashCommandSubcommandBuilder,
  ChatInputCommandInteraction,
  TextChannel,
  MessageFlags,
} from "discord.js";
import { resolveEpic } from "../../utils/resolvedEpic";
import { getTaskIdByNum, toggleTaskAssignee } from "../../db/db";
import { refreshEpicEmbed } from "../../utils/updateEpicEmbeded";

export const assignUserSubCommand = {
  build: (sub: SlashCommandSubcommandBuilder) =>
    sub
      .setName("assign-user")
      .setDescription("มอบหมายหรือยกเลิกผู้รับผิดชอบงานให้กับ Task (Toggle)")
      .addIntegerOption((opt) =>
        opt.setName("task_num").setDescription("ลำดับ Task (1, 2, 3...)").setRequired(true)
      )
      .addUserOption((opt) =>
        opt.setName("user").setDescription("ผู้รับผิดชอบ").setRequired(true)
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
    const user = interaction.options.getUser("user", true);
    const taskId = getTaskIdByNum(epic.id, taskNum);

    if (!taskId) {
      await interaction.editReply({ content: `❌ ไม่พบ Task ลำดับที่ **#${taskNum}** ใน Epic นี้` });
      return;
    }

    const result = toggleTaskAssignee(taskId, user.id);
    const targetChannel = (await interaction.guild.channels.fetch(epic.channel_id)) as TextChannel | null;
    if (targetChannel) await refreshEpicEmbed(targetChannel, epic);

    if (result.added) {
      await interaction.editReply({
        content: `👤 มอบหมายงาน Task **#${taskNum}** ให้กับ <@${user.id}> เรียบร้อยแล้ว!`,
      });
    } else {
      await interaction.editReply({
        content: `❌ ยกเลิกการมอบหมายงาน Task **#${taskNum}** ของ <@${user.id}> เรียบร้อยแล้ว!`,
      });
    }
  },
};