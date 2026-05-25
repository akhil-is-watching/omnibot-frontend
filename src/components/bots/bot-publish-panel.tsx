import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { Bot } from "@/lib/types"
import { discardBotDraft, publishBot } from "@/lib/api"
import { isBotPublished } from "@/lib/bot"
import { getModelLabel } from "@/lib/models"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { BotPublishStatusBadge, ErrorMessage, RelativeTime } from "@/components/shared"

export function BotPublishPanel({ bot }: { bot: Bot }) {
  const queryClient = useQueryClient()
  const published = isBotPublished(bot)

  function refreshBot(updated: Bot) {
    queryClient.setQueryData(["bot", bot._id], updated)
    queryClient.invalidateQueries({ queryKey: ["bots"] })
  }

  const publish = useMutation({
    mutationFn: () => publishBot(bot._id),
    onSuccess: (updated) => {
      refreshBot(updated)
      toast.success(`Published v${updated.published?.version ?? updated.publishedVersion}`)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const discard = useMutation({
    mutationFn: () => discardBotDraft(bot._id),
    onSuccess: (updated) => {
      refreshBot(updated)
      queryClient.invalidateQueries({ queryKey: ["bot-datasets", bot._id] })
      toast.success("Draft reset to live configuration")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const canPublish = !published || bot.hasUnpublishedChanges

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <BotPublishStatusBadge bot={bot} />
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            Overview and knowledge edits are <strong>draft</strong> until you publish.
            Playground tests the draft. Telegram and Discord use the{" "}
            <strong>live</strong> snapshot only.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {published && bot.hasUnpublishedChanges && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={discard.isPending}>
                  Discard draft
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Discard draft changes?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This resets draft settings to match the last published
                    version (v{bot.publishedVersion}). Datasets added since that
                    publish will be deleted. Datasets you removed during this
                    draft are not restored.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => discard.mutate()}>
                    Discard draft
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button
            onClick={() => publish.mutate()}
            disabled={!canPublish || publish.isPending}
          >
            {publish.isPending ? "Publishing…" : published ? "Publish changes" : "Publish bot"}
          </Button>
        </div>
      </div>

      {(publish.error || discard.error) && (
        <ErrorMessage
          message={((publish.error ?? discard.error) as Error).message}
        />
      )}

      {bot.published && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium">Live configuration</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Published{" "}
            <RelativeTime date={bot.published.publishedAt} /> — used by Telegram /
            Discord
          </p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd>{bot.published.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Model</dt>
              <dd>{getModelLabel(bot.published.selectedModel)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Knowledge datasets</dt>
              <dd>
                {bot.published.datasetIds.length
                  ? `${bot.published.datasetIds.length} dataset${bot.published.datasetIds.length === 1 ? "" : "s"}`
                  : "None"}
              </dd>
            </div>
            {bot.published.systemPrompt && (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">System prompt</dt>
                <dd className="line-clamp-3 whitespace-pre-wrap text-muted-foreground">
                  {bot.published.systemPrompt}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  )
}
