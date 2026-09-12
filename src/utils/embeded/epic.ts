import { EmbedBuilder } from "discord.js";

export interface TaskItem {
  id: number;
  task_num?: number;
  title: string;
  done: boolean;
  assignees: string[];
  dueDate: Date | null;
}

const FIELD_MAX_CHARS = 950;

export function buildEpicEmbed(
  epicTitle: string,
  epicId: string,
  tasks: TaskItem[]
): EmbedBuilder {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.done).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  const filledBlocks = Math.round((percent / 100) * 10);
  const progressBar = "▰".repeat(filledBlocks) + "▱".repeat(10 - filledBlocks);

  const activeTasks = tasks.filter((t) => !t.done);
  const completedTasks = tasks.filter((t) => t.done);
  const now = new Date();

  // 1. จัดการ Active Tasks
  let activeText = "";
  let activeOmittedCount = 0;

  if (activeTasks.length === 0) {
    activeText = "*ยังไม่มี Task ใน Epic นี้ (พิมพ์ `/task add` เพื่อเพิ่มงาน)*";
  } else {
    const lines: string[] = [];
    for (let i = 0; i < activeTasks.length; i++) {
      const task = activeTasks[i];
      const num = task.task_num ?? i + 1;

      const assigneesText =
        task.assignees.length > 0
          ? task.assignees.map((id) => `<@${id}>`).join(" ")
          : "*ยังไม่มีผู้รับผิดชอบ*";

      let timeBadge = "";
      if (task.dueDate) {
        const unixTimestamp = Math.floor(task.dueDate.getTime() / 1000);
        const diffTime = task.dueDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          timeBadge = ` • 🔴 **เลยกำหนด ${Math.abs(diffDays)} วัน**`;
        } else if (diffDays === 0) {
          timeBadge = ` • 🟡 **กำหนดส่งวันนี้!**`;
        } else {
          timeBadge = ` • ⏳ **เหลือ ${diffDays} วัน** (<t:${unixTimestamp}:d>)`;
        }
      }

      const entry = `**#${num}** ${task.title}\n> 👥 ${assigneesText}${timeBadge}`;
      
      const currentLen = lines.join("\n\n").length;
      if (currentLen + entry.length + 2 > FIELD_MAX_CHARS) {
        activeOmittedCount = activeTasks.length - i;
        break;
      }
      lines.push(entry);
    }

    activeText = lines.join("\n\n");
    if (activeOmittedCount > 0) {
      activeText += `\n\n⚠️ *และอีก ${activeOmittedCount} งานที่ค้างอยู่ (ใช้คำสั่ง \`/task list\` เพื่อดูทั้งหมด)*`;
    }
  }

  // 2. จัดการ Completed Tasks
  let completedText = "";
  let completedOmittedCount = 0;

  if (completedTasks.length === 0) {
    completedText = "*ยังไม่มีงานที่ทำเสร็จ*";
  } else {
    const lines: string[] = [];
    for (let i = 0; i < completedTasks.length; i++) {
      const task = completedTasks[i];
      const num = task.task_num ?? i + 1;
      
      const entry = `~~**#${num}** ${task.title}~~`;
      
      const currentLen = lines.join("\n").length;
      if (currentLen + entry.length + 1 > FIELD_MAX_CHARS) {
        completedOmittedCount = completedTasks.length - i;
        break;
      }
      lines.push(entry);
    }

    completedText = lines.join("\n");
    if (completedOmittedCount > 0) {
      completedText += `\n⚠️ *และอีก ${completedOmittedCount} งานที่ทำเสร็จแล้ว...*`;
    }
  }

  // แปะเส้นคั่นต่อท้าย activeText โดยตรง เพื่อไม่ให้เกิดช่องว่างส่วนเกินจาก Discord Field
  activeText += "\n───────────────────────────────────────";

  // 3. ประกอบ Embed
  return new EmbedBuilder()
    .setTitle(`📦 Epic: ${epicTitle}`)
    .setColor(percent === 100 && total > 0 ? 0x57f287 : 0x5865f2)
    .setDescription(
      `🆔 **Epic ID:** \`${epicId}\`\n📊 **Progress Bar**\n\`[${progressBar}]\` **${percent}%** (${completed}/${total} Completed)`
    )
    .addFields(
      {
        name: ``,
        value: "\n───────────────────────────────────────",
        inline: false,
      },
      {
        name: `📌 งานที่ต้องทำ (${activeTasks.length})`,
        value: activeText,
        inline: false,
      },
      {
        name: `✅ งานที่เสร็จแล้ว (${completedTasks.length})`,
        value: completedText,
        inline: false,
      },
      {
        name: ``,
        value: "\n───────────────────────────────────────",
        inline: false,
      },
    )
    .setFooter({
      text: `💡 พิมพ์ /task done <เลข> เพื่อติ๊กงานเสร็จ`,
    })
    .setTimestamp();
}