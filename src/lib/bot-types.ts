import type { Bot, BotType, BusinessConnection, Integration, Platform } from "@/lib/types"
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

export function countActiveBusinessConnections(
  connections: BusinessConnection[] | undefined,
): number {
  return connections?.filter((c) => c.isEnabled && c.canReply).length ?? 0
}

/** Best available active Business link count (bot, integrations, or polled list). */
export function resolveSecretaryActiveConnections(
  bot: Bot,
  options?: {
    integrations?: Integration[]
    businessConnections?: BusinessConnection[]
  },
): number {
  const fromList = countActiveBusinessConnections(options?.businessConnections)
  const fromIntegrations =
    options?.integrations?.reduce(
      (max, i) => Math.max(max, i.activeBusinessConnections ?? 0),
      0,
    ) ?? 0
  return Math.max(
    bot.activeBusinessConnections ?? 0,
    fromIntegrations,
    fromList,
  )
}

export function isSecretaryPublishBlocked(
  bot: Bot,
  activeConnections = resolveSecretaryActiveConnections(bot),
): boolean {
  if (!isSecretaryBot(bot)) return false
  if (bot.secretaryPublishReady === true) return false
  if (activeConnections >= 1) return false
  if (bot.secretaryPublishReady === false) return true
  return !isBotPublished(bot)
}
