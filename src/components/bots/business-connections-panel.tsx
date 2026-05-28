import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { listBusinessConnections } from "@/lib/api"
import type { Integration } from "@/lib/types"
import { countActiveBusinessConnections } from "@/lib/bot-types"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ErrorMessage, RelativeTime } from "@/components/shared"
import { Skeleton } from "@/components/ui/skeleton"

export function BusinessConnectionsPanel({
  botId,
  integration,
}: {
  botId: string
  integration: Integration
}) {
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({
    queryKey: ["business-connections", botId, integration._id],
    queryFn: () => listBusinessConnections(botId, integration._id),
    refetchInterval: 10000,
    enabled: integration.platform === "telegram",
  })

  useEffect(() => {
    if (!data) return
    queryClient.invalidateQueries({ queryKey: ["bot", botId] })
    queryClient.invalidateQueries({ queryKey: ["integrations", botId] })
  }, [data, botId, queryClient])

  if (integration.platform !== "telegram") return null

  const active = Math.max(
    integration.activeBusinessConnections ?? 0,
    countActiveBusinessConnections(data),
  )

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-medium">Telegram Business connections</h4>
          <p className="text-xs text-muted-foreground">
            Owner must link this bot in Telegram → Settings → Telegram Business →
            Chatbots. Polls every 10s.
          </p>
        </div>
        <Badge variant={active > 0 ? "default" : "secondary"}>
          {active} active
          {integration.businessConnectionCount != null &&
            ` / ${integration.businessConnectionCount} total`}
        </Badge>
      </div>

      {active === 0 && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-muted-foreground">
          Waiting for owner to link in Telegram Business settings. Publish stays
          blocked until at least one connection is active.
        </p>
      )}

      {isLoading && <Skeleton className="h-20 w-full" />}
      {error && <ErrorMessage message={(error as Error).message} />}

      {data && data.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Connection</TableHead>
                <TableHead>Owner user</TableHead>
                <TableHead>Can reply</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((conn) => (
                <TableRow key={conn.connectionId}>
                  <TableCell className="font-mono text-xs">
                    {conn.connectionId}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{conn.userId}</TableCell>
                  <TableCell>
                    <Badge variant={conn.canReply ? "default" : "destructive"}>
                      {conn.canReply ? "yes" : "no"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={conn.isEnabled ? "secondary" : "outline"}>
                      {conn.isEnabled ? "yes" : "no"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <RelativeTime date={conn.updatedAt} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {data && data.length === 0 && !isLoading && (
        <p className="text-sm text-muted-foreground">No Business connections yet.</p>
      )}
    </div>
  )
}
