import {
  SlashCommandSubcommandBuilder,
  ChatInputCommandInteraction,
  TextChannel,
  MessageFlags,
} from "discord.js";
import { addUserTaskTracker, getTasksByUserId, getUserTaskTracker, removeUserTaskTracker } from "../../db/db";
import { buildUserTrackerEmbed } from "../../utils/userTracker";


export const trackerSubCommand = {
  build: (sub: SlashCommandSubcommandBuilder) =>
    sub
      .setName("task-tracker")
      .setDescription("เปิด/ปิด Live Embed ติดตาม Task ประจำตัวผู้ใช้ (Toggle)")
      .addUserOption((opt) =>
        opt
          .setName("user")
          .setDescription("ผู้ใช้ที่ต้องการเปิด Tracker (หากเว้นว่างจะแสดงของตนเอง)")
          .setRequired(false)
      ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild || !interaction.channel) return;

    await interaction.reply({ content: "⏳ กำลังประมวลผล...", flags: MessageFlags.Ephemeral });

    const targetUser = interaction.options.getUser("user") || interaction.user;
    const channelId = interaction.channelId;
    const currentTracker = getUserTaskTracker(targetUser.id, channelId);
    const channel = interaction.channel as TextChannel;

    // ถ้ามี Tracker อยู่แล้ว -> ปิดการใช้งาน (ลบข้อความและลบออกจาก DB)
    if (currentTracker) {
      const existingMsg = await channel.messages.fetch(currentTracker.message_id).catch(() => null);
      if (existingMsg) {
        await existingMsg.delete().catch(() => null);
      }
      removeUserTaskTracker(targetUser.id, channelId);

      await interaction.editReply({
        content: `🔴 ปิดการแสดงผล Live Task Tracker ของ <@${targetUser.id}> ในห้องนี้เรียบร้อยแล้ว`,
      });
      return;
    }

    // ถ้ายังไม่มี Tracker -> สร้าง Embed ใหม่ และบันทึกลง DB
    const userTasks = getTasksByUserId(targetUser.id);
    const embed = buildUserTrackerEmbed(targetUser, userTasks);

    const sentMessage = await channel.send({ embeds: [embed] });
    addUserTaskTracker(targetUser.id, channelId, sentMessage.id);

    await interaction.editReply({
      content: `🟢 เปิดการใช้งาน Live Task Tracker ของ <@${targetUser.id}> เรียบร้อยแล้ว!`,
    });
  },
};