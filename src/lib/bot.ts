import type { Bot } from "@/lib/types"

export function isBotPublished(bot: Bot): boolean {
  return bot.published != null && bot.published.version > 0
}

import type { PlaygroundChatResponse } from "@/lib/types"

export function parsePlaygroundReply(body: PlaygroundChatResponse): string {
  if (typeof body.reply === "string") return body.reply
  return JSON.stringify(body)
}
