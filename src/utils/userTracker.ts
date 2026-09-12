import { Client, TextChannel, EmbedBuilder, User } from "discord.js";
import { 
  getTasksByUserId, 
  getAllUserTaskTrackers, 
  removeUserTaskTracker, 
  getEpicPriorityEmoji, 
  UserTaskSummary 
} from "../db/db";

export function buildUserTrackerEmbed(user: User, userTasks: UserTaskSummary[]): EmbedBuilder {
  const activeTasks = userTasks.filter((t) => !t.done);
  const completedTasks = userTasks.filter((t) => t.done);
  const total = userTasks.length;

  const percent = total > 0 ? Math.round((completedTasks.length / total) * 100) : 0;
  const filled = Math.round((percent / 100) * 10);
  const progressBar = "▰".repeat(filled) + "▱".repeat(10 - filled);

  const embed = new EmbedBuilder()
    .setTitle(`🎯 Task Tracker • ${user.displayName || user.username}`)
    .setThumbnail(user.displayAvatarURL())
    .setColor(total > 0 && percent === 100 ? 0x57f287 : 0x3498db)
    .setDescription(
      `👤 **ผู้รับผิดชอบ:** <@${user.id}>\n` +
      `📊 **ความคืบหน้า:** \`[${progressBar}]\` **${percent}%** (${completedTasks.length}/${total})\n` +
      `📌 **งานค้าง:** ${activeTasks.length} งาน  |  ✅ **เสร็จแล้ว:** ${completedTasks.length} งาน\n` +
      `───────────────────`
    )
    .setTimestamp();

  if (total === 0) {
    embed.addFields({
      name: "🎉 ไม่มี Task ในระบบ",
      value: "*ขณะนี้ไม่มีรายการงานที่ได้รับมอบหมาย*",
    });
    return embed;
  }

  const tasksByEpic = userTasks.reduce<Record<string, UserTaskSummary[]>>((acc, task) => {
    if (!acc[task.epic_id]) acc[task.epic_id] = [];
    acc[task.epic_id].push(task);
    return acc;
  }, {});

  const epicKeys = Object.keys(tasksByEpic);
  const now = new Date();

  epicKeys.forEach((epicId, index) => {
    const tasks = tasksByEpic[epicId];
    const epicInfo = tasks[0];
    const priorityEmoji = getEpicPriorityEmoji(epicInfo.epic_priority);
    const epicActive = tasks.filter((t) => !t.done);
    const epicDone = tasks.filter((t) => t.done);

    let content = `🔗 **Channel:** <#${epicInfo.epic_channel_id}>`;

    // 1. งานที่ต้องทำ (จัดรูปแบบย่อหน้าให้อ่านง่าย)
    if (epicActive.length > 0) {
      content += `\n\n📌 **งานที่ต้องทำ (${epicActive.length})**\n`;
      content += epicActive
        .map((t, idx) => {
          let badge = "";
          if (t.due_date) {
            const dueDate = new Date(t.due_date);
            const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) badge = ` • 🔴 *เลยกำหนด ${Math.abs(diffDays)} วัน*`;
            else if (diffDays === 0) badge = ` • 🟡 *ส่งวันนี้*`;
            else badge = ` • ⏳ *เหลือ ${diffDays} วัน*`;
          }
          return `> • **#${idx + 1}** ${t.task_title}${badge}`;
        })
        .join("\n");
    }

    // 2. งานที่เสร็จแล้ว
    if (epicDone.length > 0) {
      content += `\n\n✅ **งานที่เสร็จแล้ว (${epicDone.length})**\n`;
      content += epicDone
        .map((t, idx) => `> • ~~**#${idx + 1}** ${t.task_title}~~`)
        .join("\n");
    }

    // ใส่เส้นแบ่งกั้นระหว่าง Epic (ยกเว้น Epic ตัวสุดท้าย)
    if (index < epicKeys.length - 1) {
      content += `\n\n───────────────────`;
    }

    embed.addFields({
      name: `${priorityEmoji} ${epicInfo.epic_title} (\`${epicId}\`)`,
      value: content,
      inline: false,
    });
  });

  return embed;
}

export async function updateUserTaskTrackers(client: Client): Promise<void> {
  const trackers = getAllUserTaskTrackers();

  await Promise.all(
    trackers.map(async (tracker) => {
      try {
        const channel = (await client.channels.fetch(tracker.channel_id).catch(() => null)) as TextChannel | null;
        if (!channel) {
          removeUserTaskTracker(tracker.user_id, tracker.channel_id);
          return;
        }

        const message = await channel.messages.fetch(tracker.message_id).catch(() => null);
        if (!message) {
          removeUserTaskTracker(tracker.user_id, tracker.channel_id);
          return;
        }

        const targetUser = await client.users.fetch(tracker.user_id).catch(() => null);
        if (!targetUser) return;

        const userTasks = getTasksByUserId(tracker.user_id);
        const updatedEmbed = buildUserTrackerEmbed(targetUser, userTasks);

        await message.edit({ embeds: [updatedEmbed] });
      } catch (err) {
        console.warn(`[User Tracker Update Warning] ไม่สามารถอัปเดต Tracker ของ ${tracker.user_id} ได้:`, err);
      }
    })
  );
}