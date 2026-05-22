import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { getBot } from "@/lib/api"
import { getModelLabel } from "@/lib/models"
import { BotDatasetsTab } from "@/components/bots/bot-datasets-tab"
import { BotIntegrationsTab } from "@/components/bots/bot-integrations-tab"
import { BotOverviewTab } from "@/components/bots/bot-overview-tab"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ErrorMessage, RelativeTime } from "@/components/shared"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft } from "lucide-react"

export function BotDetailPage() {
  const { botId } = useParams<{ botId: string }>()
  const { data: bot, isLoading, error } = useQuery({
    queryKey: ["bot", botId],
    queryFn: () => getBot(botId!),
    enabled: !!botId,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (error || !bot) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/bots">
            <ArrowLeft />
            Back to bots
          </Link>
        </Button>
        <ErrorMessage message={(error as Error)?.message ?? "Bot not found"} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/bots">
          <ArrowLeft />
          Back to bots
        </Link>
      </Button>

      <div className="flex items-start gap-4">
        <Avatar className="size-16">
          {bot.avatarUrl && <AvatarImage src={bot.avatarUrl} alt={bot.name} />}
          <AvatarFallback className="text-lg">
            {bot.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{bot.name}</h1>
          {bot.description && (
            <p className="mt-1 text-sm text-muted-foreground">{bot.description}</p>
          )}
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div>
              <dt className="text-muted-foreground">Model</dt>
              <dd>{getModelLabel(bot.selectedModel)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd>
                <RelativeTime date={bot.createdAt} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Org</dt>
              <dd className="font-mono text-xs">{bot.orgId}</dd>
            </div>
          </dl>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <BotOverviewTab bot={bot} />
        </TabsContent>
        <TabsContent value="knowledge" className="mt-4">
          <BotDatasetsTab botId={bot._id} />
        </TabsContent>
        <TabsContent value="integrations" className="mt-4">
          <BotIntegrationsTab botId={bot._id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
