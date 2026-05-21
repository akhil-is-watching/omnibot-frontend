import { useQuery } from "@tanstack/react-query"
import { getBotmanagerUrl, getHealth, getHealthReady } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PageHeader, ErrorMessage } from "@/components/shared"
import { Skeleton } from "@/components/ui/skeleton"

export function SettingsPage() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    retry: 1,
    refetchInterval: 30000,
  })

  const ready = useQuery({
    queryKey: ["health-ready"],
    queryFn: getHealthReady,
    retry: 1,
    refetchInterval: 30000,
    enabled: health.data?.service === "botmanager",
  })

  const orgId = import.meta.env.VITE_ORG_ID as string | undefined
  const isBotmanager = health.data?.service === "botmanager"

  function refreshAll() {
    health.refetch()
    if (isBotmanager) ready.refetch()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Environment and backend connectivity for local/staging."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Environment</CardTitle>
            <CardDescription>Frontend configuration from .env</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Bot Manager URL</p>
              <code className="text-xs">{getBotmanagerUrl()}</code>
            </div>
            <div>
              <p className="text-muted-foreground">Org ID (X-Org-Id)</p>
              <code className="text-xs">{orgId ?? "(not set — server default)"}</code>
            </div>
            <p className="text-xs text-muted-foreground">
              Copy <code>.env.example</code> to <code>.env</code> and set{" "}
              <code>VITE_BOTMANAGER_URL</code> to your Bot Manager public URL.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Backend health</CardTitle>
              <CardDescription>
                GET /health must return service &quot;botmanager&quot;
              </CardDescription>
            </div>
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={refreshAll}
              disabled={health.isFetching || ready.isFetching}
            >
              {health.isFetching || ready.isFetching ? "Checking…" : "Refresh"}
            </button>
          </CardHeader>
          <CardContent className="space-y-4">
            {health.isLoading && <Skeleton className="h-24 w-full" />}
            {health.error && (
              <ErrorMessage
                message={`Cannot reach Bot Manager: ${(health.error as Error).message}. Check VITE_BOTMANAGER_URL — CORS errors often mean the URL is wrong or the service is down.`}
              />
            )}
            {health.data && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/health</span>
                  <Badge variant={health.data.status === "ok" ? "default" : "destructive"}>
                    {health.data.status}
                  </Badge>
                  <Badge
                    variant={isBotmanager ? "secondary" : "destructive"}
                  >
                    {health.data.service}
                  </Badge>
                </div>
                {!isBotmanager && (
                  <p className="text-xs text-destructive">
                    Expected service &quot;botmanager&quot; — got &quot;
                    {health.data.service}&quot;. Your URL may point at the webhook
                    service or another app.
                  </p>
                )}
              </div>
            )}

            {isBotmanager && (
              <>
                {ready.isLoading && <Skeleton className="h-16 w-full" />}
                {ready.error && (
                  <ErrorMessage message={(ready.error as Error).message} />
                )}
                {ready.data && (
                  <div className="space-y-2 border-t pt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">/health/ready</span>
                      <Badge
                        variant={ready.data.status === "ready" ? "default" : "destructive"}
                      >
                        {ready.data.status}
                      </Badge>
                    </div>
                    {ready.data.checks && (
                      <ul className="space-y-1 text-sm">
                        {Object.entries(ready.data.checks).map(([name, check]) => (
                          <li key={name} className="flex items-center justify-between">
                            <span className="text-muted-foreground">{name}</span>
                            <Badge
                              variant={
                                check.status === "up" || check.status === "ok"
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {check.status}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
