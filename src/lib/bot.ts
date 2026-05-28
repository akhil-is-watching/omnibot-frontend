import type { Bot, PlaygroundChatResponse } from "@/lib/types"

export function isBotPublished(bot: Bot): boolean {
  return bot.published != null && bot.published.version > 0
}

export function parsePlaygroundReply(body: PlaygroundChatResponse): string {
  if (typeof body.reply === "string") return body.reply
  return JSON.stringify(body)
}
