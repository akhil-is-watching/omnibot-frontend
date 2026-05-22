/** Default Discord slash command when none is configured. */
export const DEFAULT_DISCORD_COMMAND = "ask"

export function formatDiscordCommand(command?: string): string {
  return `/${command?.trim() || DEFAULT_DISCORD_COMMAND}`
}

export function formatDiscordCommandUsage(command?: string): string {
  const name = command?.trim() || DEFAULT_DISCORD_COMMAND
  return `/${name} question:Your question here`
}
