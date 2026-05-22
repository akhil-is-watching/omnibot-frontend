import type { Bot } from "@/lib/types"

export function isBotPublished(bot: Bot): boolean {
  return bot.published != null && bot.published.version > 0
}

export function parsePlaygroundReply(body: Record<string, unknown>): string {
  if (typeof body.reply === "string") return body.reply
  if (typeof body.content === "string") return body.content
  if (typeof body.message === "string") return body.message
  if (typeof body.text === "string") return body.text
  return JSON.stringify(body)
}
