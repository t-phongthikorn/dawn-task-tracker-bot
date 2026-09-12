import {
  SlashCommandSubcommandBuilder,
  ChatInputCommandInteraction,
  TextChannel,
  MessageFlags,
} from "discord.js";
import { resolveEpic } from "../../utils/resolvedEpic";
import { getTaskIdByNum, toggleTaskDone } from "../../db/db";
import { refreshEpicEmbed } from "../../utils/updateEpicEmbeded";

export const doneSubCommand = {
  build: (sub: SlashCommandSubcommandBuilder) =>
    sub
      .setName("done")
      .setDescription("สลับสถานะทำเสร็จ / ยังไม่เสร็จ ของ Task")
      .addIntegerOption((opt) =>
        opt.setName("task_num").setDescription("ลำดับ Task (1, 2, 3...)").setRequired(true)
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
    const taskId = getTaskIdByNum(epic.id, taskNum);

    if (!taskId) {
      await interaction.editReply({ content: `❌ ไม่พบ Task ลำดับที่ **#${taskNum}** ใน Epic นี้` });
      return;
    }

    toggleTaskDone(taskId, interaction.user.id);
    const targetChannel = (await interaction.guild.channels.fetch(epic.channel_id)) as TextChannel | null;
    if (targetChannel) await refreshEpicEmbed(targetChannel, epic);

    await interaction.editReply({
      content: `☑️ สลับสถานะ Task ลำดับที่ **#${taskNum}** เรียบร้อยแล้ว!`,
    });
  },
};