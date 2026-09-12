import {
  SlashCommandSubcommandBuilder,
  ChatInputCommandInteraction,
  TextChannel,
  MessageFlags,
} from "discord.js";
import { addTask } from "../../db/db";
import { resolveEpic } from "../../utils/resolvedEpic";
import { refreshEpicEmbed } from "../../utils/updateEpicEmbeded";

export const addSubCommand = {
  build: (sub: SlashCommandSubcommandBuilder) =>
    sub
      .setName("add")
      .setDescription("เพิ่ม Task ใหม่เข้า Epic")
      .addStringOption((opt) =>
        opt.setName("title").setDescription("ชื่อ Task").setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName("epic_id").setDescription("ID ของ Epic (หากเว้นว่างจะอ้างอิงจากห้องนี้)")
      )
      .addUserOption((opt) =>
        opt.setName("assignee").setDescription("ระบุผู้รับผิดชอบงาน")
      )
      .addStringOption((opt) =>
        opt.setName("due_date").setDescription("วันกำหนดส่ง (เช่น 2026-12-31)")
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

    const title = interaction.options.getString("title", true);
    const assignee = interaction.options.getUser("assignee");
    const dueDate = interaction.options.getString("due_date");

    addTask(epic.id, interaction.user.id, title, dueDate, assignee?.id);

    const targetChannel = (await interaction.guild.channels.fetch(epic.channel_id)) as TextChannel | null;
    if (targetChannel) await refreshEpicEmbed(targetChannel, epic);

    await interaction.editReply({
      content: `✅ เพิ่ม Task **"${title}"** เข้า Epic \`${epic.id}\` เรียบร้อยแล้ว!`,
    });
  },
};