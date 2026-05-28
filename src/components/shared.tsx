import type { ReactNode } from "react"
import { formatDistanceToNow } from "date-fns"
import type { Bot, BotType, DatasetStatus, WebhookStatus } from "@/lib/types"
import { isBotPublished } from "@/lib/bot"
import {
  botTypeLabel,
  isSecretaryPublishBlocked,
  resolveSecretaryActiveConnections,
} from "@/lib/bot-types"
import { Badge } from "@/components/ui/badge"

const datasetVariants: Record<
  DatasetStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  processing: "outline",
  completed: "default",
  failed: "destructive",
}

export function DatasetStatusBadge({ status }: { status: DatasetStatus }) {
  return <Badge variant={datasetVariants[status]}>{status}</Badge>
}

export function DatasetDraftBadge() {
  return (
    <Badge variant="secondary" className="font-normal">
      Draft edit
    </Badge>
  )
}

const webhookVariants: Record<
  WebhookStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  active: "default",
  failed: "destructive",
}

export function WebhookStatusBadge({ status }: { status: WebhookStatus }) {
  return <Badge variant={webhookVariants[status]}>{status}</Badge>
}

export function BotPublishStatusBadge({
  bot,
  activeBusinessConnections,
}: {
  bot: Bot
  activeBusinessConnections?: number
}) {
  if (!isBotPublished(bot)) {
    return <Badge variant="outline">Unpublished</Badge>
  }
  if (
    isSecretaryPublishBlocked(
      bot,
      activeBusinessConnections ?? resolveSecretaryActiveConnections(bot),
    )
  ) {
    return <Badge variant="secondary">Awaiting Business link</Badge>
  }
  if (bot.hasUnpublishedChanges) {
    return <Badge variant="secondary">Draft changes</Badge>
  }
  return (
    <Badge variant="default">
      Live v{bot.publishedVersion ?? bot.published?.version ?? "?"}
    </Badge>
  )
}

export function BotTypeBadge({ botType }: { botType?: BotType }) {
  if (!botType) return null
  return (
    <Badge variant="outline" className="font-normal">
      {botTypeLabel(botType)}
    </Badge>
  )
}

export function RelativeTime({ date }: { date: string }) {
  return (
    <span className="text-muted-foreground" title={new Date(date).toLocaleString()}>
      {formatDistanceToNow(new Date(date), { addSuffix: true })}
    </span>
  )
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
      <h3 className="font-medium">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  )
}
