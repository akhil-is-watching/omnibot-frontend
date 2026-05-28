import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import type { Bot, DatasetNotReady } from "@/lib/types"
import { discardBotDraft, publishBot } from "@/lib/api"
import { isBotPublished } from "@/lib/bot"
import { botTypeLabel, isSecretaryPublishBlocked } from "@/lib/bot-types"
import { getModelLabel } from "@/lib/models"
import { getPublishNotReadyDatasets } from "@/lib/publish"
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

function IngestPendingNotice({ datasets }: { datasets: DatasetNotReady[] }) {
  return (
    <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm">
      <p className="font-medium">Ingestion in progress — publish again when ready</p>
      <p className="mt-1 text-muted-foreground">
        Your staged edits were applied and re-ingestion started. This is expected
        after text changes: publish once more after all datasets show status{" "}
        <strong>completed</strong> on the Knowledge tab.
      </p>
      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
        {datasets.map((d) => (
          <li key={d.datasetId ?? `${d.status}-unknown`}>
            {d.datasetId ? `Dataset ${d.datasetId}` : "Dataset"}:{" "}
            <span className="font-medium text-foreground">{d.status ?? "unknown"}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function BotPublishPanel({ bot }: { bot: Bot }) {
  const queryClient = useQueryClient()
  const published = isBotPublished(bot)
  const [ingestPending, setIngestPending] = useState<DatasetNotReady[] | null>(
    null,
  )

  function refreshBot(updated: Bot) {
    queryClient.setQueryData(["bot", bot._id], updated)
    queryClient.invalidateQueries({ queryKey: ["bots"] })
  }

  function refreshAfterPartialPublish() {
    queryClient.invalidateQueries({ queryKey: ["bot-datasets", bot._id] })
    queryClient.invalidateQueries({ queryKey: ["bot", bot._id] })
  }

  const publish = useMutation({
    mutationFn: () => publishBot(bot._id),
    onSuccess: (updated) => {
      setIngestPending(null)
      refreshBot(updated)
      queryClient.invalidateQueries({ queryKey: ["bot-datasets", bot._id] })
      toast.success(`Published v${updated.published?.version ?? updated.publishedVersion}`)
    },
    onError: (err: Error) => {
      const notReady = getPublishNotReadyDatasets(err)
      if (notReady) {
        setIngestPending(notReady)
        refreshAfterPartialPublish()
        toast.info(
          "Staged edits applied — waiting for ingestion. Publish again when datasets are completed.",
        )
        return
      }
      setIngestPending(null)
      toast.error(err.message)
    },
  })

  const discard = useMutation({
    mutationFn: () => discardBotDraft(bot._id),
    onSuccess: (updated) => {
      setIngestPending(null)
      refreshBot(updated)
      queryClient.invalidateQueries({ queryKey: ["bot-datasets", bot._id] })
      toast.success("Draft reset to live configuration")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const secretaryBlocked = isSecretaryPublishBlocked(bot)
  const canPublish =
    (!published || bot.hasUnpublishedChanges || !!ingestPending) &&
    !secretaryBlocked

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <BotPublishStatusBadge bot={bot} />
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            Bot settings and staged dataset edits are <strong>draft</strong> until
            you publish. Playground uses draft settings with{" "}
            <strong>currently indexed</strong> chunks. Text edits often need{" "}
            <strong>two publishes</strong>: first applies drafts and starts
            re-ingest (may show ingestion pending), second freezes live config
            once all datasets are <strong>completed</strong>. Telegram and Discord
            use the live snapshot only. Secretary bots also need an active Telegram
            Business link before publish.
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
                    This resets draft bot settings to match the last published
                    version (v{bot.publishedVersion}), clears staged dataset
                    name/text edits (live ingested content stays as published),
                    and deletes datasets added since that publish. Datasets you
                    removed during this draft are not restored.
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
            title={
              secretaryBlocked
                ? "Connect Telegram and wait for an active Business link"
                : undefined
            }
          >
            {publish.isPending
              ? "Publishing…"
              : ingestPending
                ? "Publish again"
                : published
                  ? "Publish changes"
                  : "Publish bot"}
          </Button>
        </div>
      </div>

      {ingestPending && <IngestPendingNotice datasets={ingestPending} />}

      {secretaryBlocked && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="font-medium">Waiting for Telegram Business link</p>
          <p className="mt-1 text-muted-foreground">
            Connect Telegram on the Integrations tab, enable Secretary Mode in
            @BotFather, then have the owner link this bot in Telegram Business
            settings. Publish unlocks when{" "}
            <code className="text-xs">secretaryPublishReady</code> is true (
            {bot.activeBusinessConnections ?? 0} active connection
            {(bot.activeBusinessConnections ?? 0) === 1 ? "" : "s"}).
          </p>
        </div>
      )}

      {publish.error && !ingestPending && (
        <ErrorMessage message={(publish.error as Error).message} />
      )}
      {discard.error && <ErrorMessage message={(discard.error as Error).message} />}

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
              <dt className="text-muted-foreground">Bot type</dt>
              <dd>{botTypeLabel(bot.published?.botType ?? bot.botType)}</dd>
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
