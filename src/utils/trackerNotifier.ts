import { Client, Guild } from "discord.js";
import { updateStatusTracker } from "./statusTracker";
import { updateUserTaskTrackers } from "./userTracker";

export async function refreshAllTrackers(client: Client, guild?: Guild | null): Promise<void> {
  if (guild) {
    await updateStatusTracker(guild).catch(() => null);
  }
  await updateUserTaskTrackers(client).catch(() => null);
}