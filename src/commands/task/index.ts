import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { addSubCommand } from "./add";
import { deleteSubCommand } from "./delete";
import { doneSubCommand } from "./done";
import { listSubCommand } from "./list";
import { assignUserSubCommand } from "./assign_user";
import { assignDateSubCommand } from "./assign_date";
import { myTaskSubCommand } from "./myTask";
import { trackerSubCommand } from "./taskTracker";

const subcommands = new Map([
  ["add", addSubCommand],
  ["delete", deleteSubCommand],
  ["done", doneSubCommand],
  ["list", listSubCommand],
  ["assign-user", assignUserSubCommand],
  ["assign-date", assignDateSubCommand],  
  ['my-task', myTaskSubCommand],
  ['task-tracker', trackerSubCommand],
]);

export const taskCommand = {
  data: new SlashCommandBuilder()
    .setName("task")
    .setDescription("ระบบจัดการ Task ภายใน Epic")
    .addSubcommand(addSubCommand.build)
    .addSubcommand(deleteSubCommand.build)
    .addSubcommand(doneSubCommand.build)
    .addSubcommand(listSubCommand.build)
    .addSubcommand(assignUserSubCommand.build)
    .addSubcommand(myTaskSubCommand.build)
    .addSubcommand(trackerSubCommand.build)
    .addSubcommand(assignDateSubCommand.build),

  async execute(interaction: ChatInputCommandInteraction) {
    const subName = interaction.options.getSubcommand();
    const targetSubcommand = subcommands.get(subName);

    if (targetSubcommand) {
      await targetSubcommand.execute(interaction);
    }
  },
};