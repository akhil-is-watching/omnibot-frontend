import { useMutation } from "@tanstack/react-query"
import { useRef, useState } from "react"
import { playgroundChat } from "@/lib/api"
import { parsePlaygroundReply } from "@/lib/bot"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ErrorMessage } from "@/components/shared"
import { cn } from "@/lib/utils"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export function BotPlaygroundTab({ botId }: { botId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  const chat = useMutation({
    mutationFn: (message: string) => playgroundChat(botId, message),
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: parsePlaygroundReply(data) },
      ])
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
      })
    },
  })

  function send() {
    const text = input.trim()
    if (!text || chat.isPending) return
    setMessages((prev) => [...prev, { role: "user", content: text }])
    setInput("")
    chat.mutate(text)
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Test the <strong>draft</strong> bot (model, prompt, linked datasets). Uses
        OpenRouter on Bot Manager — not sent to Telegram or Discord.
      </p>

      <div
        ref={scrollRef}
        className="flex min-h-[280px] max-h-[420px] flex-col gap-3 overflow-y-auto rounded-xl border bg-muted/20 p-4"
      >
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Send a message to try RAG + completion against draft settings.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
              msg.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "bg-background border",
            )}
          >
            {msg.content}
          </div>
        ))}
        {chat.isPending && (
          <p className="text-sm text-muted-foreground">Thinking…</p>
        )}
      </div>

      {chat.error && <ErrorMessage message={(chat.error as Error).message} />}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something your bot should answer from its knowledge…"
          rows={2}
          className="min-h-0 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <Button type="submit" disabled={!input.trim() || chat.isPending} className="shrink-0">
          Send
        </Button>
      </form>
    </div>
  )
}
