import type { Bot, BotType, Platform } from "@/lib/types"
import { isBotPublished } from "@/lib/bot"

export const BOT_TYPE_OPTIONS: {
  value: BotType
  label: string
  description: string
}[] = [
  {
    value: "moderator",
    label: "Community moderator",
    description: "Standard Telegram groups and DMs",
  },
  {
    value: "secretary",
    label: "Business secretary",
    description: "Telegram Business inbox — replies as the account owner",
  },
]

export function botTypeLabel(botType?: BotType): string {
  return (
    BOT_TYPE_OPTIONS.find((o) => o.value === botType)?.label ??
    botType ??
    "Unknown"
  )
}

export function isSecretaryBot(bot: Bot): boolean {
  return bot.botType === "secretary"
}

/** Moderator + Discord require publish before connect; secretary Telegram may connect first. */
export function requiresPublishBeforeConnect(
  bot: Bot,
  platform: Platform,
): boolean {
  if (platform === "discord") return !isBotPublished(bot)
  if (isSecretaryBot(bot)) return false
  return !isBotPublished(bot)
}

export function canConnectIntegrations(bot: Bot): boolean {
  if (isBotPublished(bot)) return true
  return isSecretaryBot(bot)
}

export function isSecretaryPublishBlocked(bot: Bot): boolean {
  return isSecretaryBot(bot) && bot.secretaryPublishReady === false
}
