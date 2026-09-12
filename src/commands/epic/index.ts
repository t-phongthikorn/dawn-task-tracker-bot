import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { addSubCommand  } from './add';
import { archiveSubCommand } from './archive';
import { unarchiveSubCommand } from './unarchive';
import { renameSubCommand } from './rename';
import { deleteEpicSubCommand } from './delete';

const subcommands = new Map([
  ['add', addSubCommand],
  ['archive', archiveSubCommand],
  ['unarchive', unarchiveSubCommand],
  ['rename', renameSubCommand],
  ['delete', deleteEpicSubCommand],
]);

export const epicCommand = {
  data: new SlashCommandBuilder()
    .setName('epic')
    .setDescription("Manage this channel's task list")
    .addSubcommand(addSubCommand.build)
    .addSubcommand(archiveSubCommand.build)
    .addSubcommand(unarchiveSubCommand.build)
    .addSubcommand(renameSubCommand.build)
    .addSubcommand(deleteEpicSubCommand.build),

  async execute(interaction: ChatInputCommandInteraction) {
    const subName = interaction.options.getSubcommand();
    const targetSubcommand = subcommands.get(subName);

    if (targetSubcommand) {
      await targetSubcommand.execute(interaction);
    }
  },
};