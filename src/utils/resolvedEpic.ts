import { ChatInputCommandInteraction } from "discord.js";
import { getEpicById, getEpicByChannelId, EpicRow } from "../db/db";

export function resolveEpic(interaction: ChatInputCommandInteraction): EpicRow | null {
  const inputEpicId = interaction.options.getString("epic_id");
  const channelId = interaction.channelId;

  if (inputEpicId) {
    return getEpicById(inputEpicId) || null;
  }
  return getEpicByChannelId(channelId) || null;
}