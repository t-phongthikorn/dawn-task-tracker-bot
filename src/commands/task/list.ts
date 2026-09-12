import {
  SlashCommandSubcommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { resolveEpic } from "../../utils/resolvedEpic";
import { getTasksByEpicId } from "../../db/db";
import { buildEpicEmbed } from "../../utils/embeded/epic";

export const listSubCommand = {
  build: (sub: SlashCommandSubcommandBuilder) =>
    sub
      .setName("list")
      .setDescription("แสดงรายการ Task ทั้งหมดใน Epic")
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

    const tasks = getTasksByEpicId(epic.id);
    const embed = buildEpicEmbed(epic.title, epic.id, tasks);

    await interaction.editReply({
      content: `📋 รายการ Task ล่าสุดสำหรับ Epic **\`${epic.id}\`**:`,
      embeds: [embed],
    });
  },
};