import {
  SlashCommandSubcommandBuilder,
  ChatInputCommandInteraction,
  TextChannel,
  ChannelType,
  MessageFlags,
} from "discord.js";
import { buildEpicEmbed } from "../../utils/embeded/epic";
import { addEpic, editTaskListMessageIdByChannel } from "../../db/db";
import { generateEpicId } from "../../utils/slug";
import { updateStatusTracker } from "../../utils/statusTracker";

export const addSubCommand = {
  build: (sub: SlashCommandSubcommandBuilder) =>
    sub
      .setName("add")
      .setDescription("สร้าง Epic และ Channel ใหม่สำหรับติดตามงาน")
      .addStringOption((opt) =>
        opt.setName("title").setDescription("ชื่อ Epic").setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("priority")
          .setDescription("เลือกระดับความสำคัญของ Epic")
          .setRequired(true)
          .addChoices(
            { name: "🔴 High (สูง)", value: "high" },
            { name: "🟡 Medium (ปานกลาง)", value: "medium" },
            { name: "🟢 Low (ต่ำ)", value: "low" }
          )
      ),

  async execute(interaction: ChatInputCommandInteraction) {
    const title = interaction.options.getString("title", true);
    const priority = interaction.options.getString("priority", true);

    if (!interaction.guild) return;

    await interaction.reply({
      content: `⏳ กำลังสร้างห้อง Epic "${title}"...`,
      flags: MessageFlags.Ephemeral,
    });

    //ตรวจสอบจำนวน Channel ทั้งหมดใน Server ป้องกันการเกินลิมิต 500 ห้อง
    const allChannels = await interaction.guild.channels.fetch();
    if (allChannels.size >= 500) {
      await interaction.editReply({
        content:
          "❌ **สร้าง Epic ไม่สำเร็จ!** เซิร์ฟเวอร์นี้มีจำนวน Channel ครบขีดจำกัดสูงสุดของ Discord แล้ว (500 ห้อง) กรุณาลบห้องที่ไม่จำเป็นออกก่อน",
      });
      return;
    }

    const epicId = generateEpicId(title);

    //สร้าง Channel โดยใส่ 📦 นำหน้าชื่อห้องทันที
    const newChannel = (await interaction.guild.channels.create({
      name: `📦 ${title}`,
      type: ChannelType.GuildText,
      parent: process.env.EPIC_CATEGORY_ID,
    })) as TextChannel;

    if (!newChannel) return;

    // บันทึก Epic พร้อม Priority ลงฐานข้อมูล
    addEpic(epicId, newChannel.id, interaction.user.id, title, priority);

    // สร้าง Live Embed สารบัญแรกเริ่ม
    const initialEmbed = buildEpicEmbed(title, epicId, []);
    const newMessage = await newChannel.send({ embeds: [initialEmbed] });

    editTaskListMessageIdByChannel(newChannel.id, newMessage.id);

    await updateStatusTracker(interaction.guild);

    await interaction.editReply({
      content: `✅ สร้าง Epic **\`${epicId}\`** [Priority: **${priority.toUpperCase()}**] ในห้อง <#${newChannel.id}> เรียบร้อยแล้ว!`,
    });
  },
};