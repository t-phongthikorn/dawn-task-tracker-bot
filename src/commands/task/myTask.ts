import {
  SlashCommandSubcommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { getEpicPriorityEmoji, getTasksByUserId, UserTaskSummary } from "../../db/db";

export const myTaskSubCommand = {
  build: (sub: SlashCommandSubcommandBuilder) =>
    sub
      .setName("my-task")
      .setDescription("ดูสรุปรายการ Task ทั้งหมดของผู้ใช้")
      .addUserOption((opt) =>
        opt
          .setName("user")
          .setDescription("ผู้ใช้ที่ต้องการดู Task (หากเว้นว่างจะแสดงของตัวเอง)")
          .setRequired(false)
      ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    await interaction.reply({ content: "⏳ กำลังดึงข้อมูล Task...", flags: MessageFlags.Ephemeral });

    // หากไม่ระบุ user ให้ใช้ user คนที่เรียกคำสั่ง
    const targetUser = interaction.options.getUser("user") || interaction.user;
    const userTasks = getTasksByUserId(targetUser.id);

    const embed = new EmbedBuilder()
      .setTitle(`📋 รายการ Task ของ ${targetUser.displayName || targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .setColor(0x3498db)
      .setTimestamp();

    if (userTasks.length === 0) {
      embed.setDescription(`*ขณะนี้ไม่มี Task ที่มอบหมายให้กับ <@${targetUser.id}>*`);
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const activeTasks = userTasks.filter((t) => !t.done);
    const completedTasks = userTasks.filter((t) => t.done);

    embed.setDescription(
      `👤 **ผู้รับผิดชอบ:** <@${targetUser.id}>\n📊 **สรุปงาน:** ทั้งหมด **${userTasks.length}** งาน | ค้างอยู่ **${activeTasks.length}** งาน | เสร็จแล้ว **${completedTasks.length}** งาน`
    );

    // จัดกลุ่ม Task ตาม Epic
    const tasksByEpic = userTasks.reduce<Record<string, UserTaskSummary[]>>((acc, task) => {
      if (!acc[task.epic_id]) acc[task.epic_id] = [];
      acc[task.epic_id].push(task);
      return acc;
    }, {});

    const now = new Date();
    let charsCount = 0;
    const MAX_CHARS = 3800; // ลิมิตความยาวป้องกัน Embed ล้น

    for (const [epicId, tasks] of Object.entries(tasksByEpic)) {
      const epicInfo = tasks[0];
      const priorityEmoji = getEpicPriorityEmoji(epicInfo.epic_priority);

      const taskLines = tasks.map((t) => {
        let statusBadge = "";
        if (t.done) {
          statusBadge = "✅";
        } else if (t.due_date) {
          const dueDate = new Date(t.due_date);
          const diffTime = dueDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays < 0) {
            statusBadge = `🔴 *เลยกำหนด ${Math.abs(diffDays)} วัน*`;
          } else if (diffDays === 0) {
            statusBadge = `🟡 *ส่งวันนี้*`;
          } else {
            statusBadge = `⏳ *เหลือ ${diffDays} วัน*`;
          }
        } else {
          statusBadge = "📌";
        }

        // const titleText = t.done ? `~~**#${t.task_num}** ${t.task_title}~~` : `**#${t.task_num}** ${t.task_title}`;
        return `> ${statusBadge} `;
      });

      const fieldName = `${priorityEmoji} ${epicInfo.epic_title} (\`${epicId}\`)`;
      const fieldValue = `🔗 <#${epicInfo.epic_channel_id}>\n` + taskLines.join("\n");

      if (charsCount + fieldName.length + fieldValue.length > MAX_CHARS) {
        embed.addFields({
          name: "⚠️ ข้อมูลเพิ่มเติมถูกซ่อน",
          value: "*รายการ Task มีจำนวนมากเกินขีดจำกัดการแสดงผล*",
        });
        break;
      }

      embed.addFields({
        name: fieldName,
        value: fieldValue,
        inline: false,
      });

      charsCount += fieldName.length + fieldValue.length;
    }

    await interaction.editReply({ embeds: [embed] });
  },
};