import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import type { Bot, ExecuteActionResponse } from "@/lib/types"
import { executeAction } from "@/lib/api"
import { isBotPublished } from "@/lib/bot"
import { isSecretaryBot } from "@/lib/bot-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ErrorMessage } from "@/components/shared"

interface QueuedAction extends ExecuteActionResponse {
  query: string
  queuedAt: string
}

export function BotExecuteActionTab({ bot }: { bot: Bot }) {
  const [input, setInput] = useState("")
  const [history, setHistory] = useState<QueuedAction[]>([])

  const published = isBotPublished(bot)
  const secretary = isSecretaryBot(bot)

  const action = useMutation({
    mutationFn: (query: string) => executeAction(bot._id, query),
    onSuccess: (data, query) => {
      setHistory((prev) => [
        {
          ...data,
          query,
          queuedAt: new Date().toISOString(),
        },
        ...prev,
      ])
      setInput("")
      toast.success("Action queued for live delivery")
    },
  })

  function submit() {
    const query = input.trim()
    if (!query || action.isPending) return
    action.mutate(query)
  }

  if (!secretary) {
    return (
      <p className="text-sm text-muted-foreground">
        Live actions are available for <strong>secretary</strong> bots only.
      </p>
    )
  }

  if (!published) {
    return (
      <div className="max-w-2xl rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
        <p className="font-medium">Publish required</p>
        <p className="mt-1 text-muted-foreground">
          Execute action uses the <strong>published</strong> bot and the live
          Telegram Business pipeline. Publish after connecting Telegram and
          linking a Business account.
        </p>
      </div>
    )
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Send a natural-language command against the <strong>published</strong>{" "}
        secretary bot. Bot Manager queues it for the processor → sender pipeline
        (Telegram Business). Delivery is async — recipients must have messaged
        the linked business account before.
      </p>

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='e.g. send @username a message asking if they need consulting support'
          rows={3}
          className="min-h-0 resize-none"
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={!input.trim() || action.isPending}>
            {action.isPending ? "Queueing…" : "Execute action"}
          </Button>
        </div>
      </form>

      {action.error && <ErrorMessage message={(action.error as Error).message} />}

      {history.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Recent queued actions</h3>
          <ul className="space-y-2">
            {history.map((item) => (
              <li
                key={`${item.eventId}-${item.queuedAt}`}
                className="rounded-lg border bg-muted/20 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{item.status}</Badge>
                  <code className="text-xs text-muted-foreground">{item.eventId}</code>
                </div>
                <p className="mt-2 whitespace-pre-wrap">{item.query}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
