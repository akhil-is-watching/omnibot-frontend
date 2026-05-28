import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import type { Bot, CreateIntegrationResponse, Platform } from "@/lib/types"
import {
  buildDiscordIntegrationBody,
  createIntegration,
  deleteIntegration,
  listIntegrations,
  reregisterWebhook,
} from "@/lib/api"
import {
  canConnectIntegrations,
  isSecretaryBot,
  requiresPublishBeforeConnect,
} from "@/lib/bot-types"
import { isBotPublished } from "@/lib/bot"
import {
  DEFAULT_DISCORD_COMMAND,
  formatDiscordCommand,
  formatDiscordCommandUsage,
} from "@/lib/discord"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import {
  EmptyState,
  ErrorMessage,
  RelativeTime,
  WebhookStatusBadge,
} from "@/components/shared"
import { Skeleton } from "@/components/ui/skeleton"
import { ExternalLink, RefreshCw, Trash2 } from "lucide-react"
import { BusinessConnectionsPanel } from "@/components/bots/business-connections-panel"
import { BotTypeBadge } from "@/components/shared"

type SuccessState = CreateIntegrationResponse & {
  usedGuildId: boolean
}

const DISCORD_COMMAND_PATTERN = /^[\w-]{1,32}$/

function ConnectIntegrationDialog({
  bot,
  disabled,
}: {
  bot: Bot
  disabled?: boolean
}) {
  const botId = bot._id
  const [open, setOpen] = useState(false)
  const [platform, setPlatform] = useState<Platform>("telegram")
  const [botToken, setBotToken] = useState("")
  const [discordPublicKey, setDiscordPublicKey] = useState("")
  const [discordCommand, setDiscordCommand] = useState("")
  const [discordGuildId, setDiscordGuildId] = useState("")
  const [commandError, setCommandError] = useState<string | null>(null)
  const [success, setSuccess] = useState<SuccessState | null>(null)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => {
      if (platform === "telegram") {
        return createIntegration(botId, { platform: "telegram", botToken })
      }
      return createIntegration(
        botId,
        buildDiscordIntegrationBody({
          botToken,
          discordPublicKey,
          discordGuildId,
          discordCommand,
        }),
      )
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["integrations", botId] })
      queryClient.invalidateQueries({ queryKey: ["bot", botId] })
      setSuccess({
        ...data,
        usedGuildId: !!discordGuildId.trim(),
      })
      toast.success(`${platform} integration connected`)
    },
  })

  function resetForm() {
    setPlatform("telegram")
    setBotToken("")
    setDiscordPublicKey("")
    setDiscordCommand("")
    setDiscordGuildId("")
    setCommandError(null)
    setSuccess(null)
    mutation.reset()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) resetForm()
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={disabled}>Connect integration</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Connect integration</DialogTitle>
          <DialogDescription>
            Link a Telegram or Discord bot. One integration per platform per bot.
          </DialogDescription>
        </DialogHeader>
        {success ? (
          <div className="grid gap-4 text-sm">
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="font-medium">{success.platformUsername ?? "Connected"}</p>
              <div className="mt-1">
                <WebhookStatusBadge status={success.webhookStatus} />
              </div>
            </div>

            {success.platform === "discord" && success.discordInviteUrl && (
              <Button asChild className="w-full">
                <a
                  href={success.discordInviteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink />
                  Invite bot to server
                </a>
              </Button>
            )}

            {success.platform === "discord" && (
              <div className="space-y-2 text-muted-foreground">
                <p>
                  Command:{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">
                    {formatDiscordCommand(success.discordCommand)}
                  </code>
                </p>
                <p>
                  Users run{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">
                    {formatDiscordCommandUsage(success.discordCommand)}
                  </code>{" "}
                  in Discord.
                </p>
                {success.usedGuildId ? (
                  <p>
                    {formatDiscordCommand(success.discordCommand)} is available
                    immediately in that server.
                  </p>
                ) : (
                  <p>
                    Global {formatDiscordCommand(success.discordCommand)} may
                    take up to ~1 hour. Invite the bot above, then disconnect
                    and connect again with a server ID for instant availability.
                    To rename the command, disconnect and reconnect with a new
                    name.
                  </p>
                )}
              </div>
            )}

            {success.platform === "telegram" && isSecretaryBot(bot) && (
              <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-muted-foreground">
                <p className="font-medium text-foreground">Secretary next steps</p>
                <ol className="list-decimal space-y-1 pl-4 text-xs">
                  <li>Enable Secretary Mode in @BotFather for this bot.</li>
                  <li>
                    Owner links the bot in Telegram → Settings → Telegram Business
                    → Chatbots.
                  </li>
                  <li>
                    Wait for an active Business connection, then publish from the
                    bot detail page.
                  </li>
                </ol>
              </div>
            )}

            {(success.webhookSecret ||
              success.discordPublicKey ||
              success.discordApplicationId) && (
              <>
                <p className="font-medium text-amber-600 dark:text-amber-400">
                  Copy these values now — they are shown once.
                </p>
                {success.webhookSecret && (
                  <div className="grid gap-1">
                    <Label>Webhook secret</Label>
                    <code className="rounded-md bg-muted px-2 py-1 text-xs break-all">
                      {success.webhookSecret}
                    </code>
                  </div>
                )}
                {success.discordPublicKey && (
                  <div className="grid gap-1">
                    <Label>Discord public key</Label>
                    <code className="rounded-md bg-muted px-2 py-1 text-xs break-all">
                      {success.discordPublicKey}
                    </code>
                  </div>
                )}
                {success.discordApplicationId && (
                  <div className="grid gap-1">
                    <Label>Discord application ID</Label>
                    <code className="rounded-md bg-muted px-2 py-1 text-xs break-all">
                      {success.discordApplicationId}
                    </code>
                  </div>
                )}
              </>
            )}
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (platform === "discord") {
                const cmd = discordCommand.trim()
                if (cmd && !DISCORD_COMMAND_PATTERN.test(cmd)) {
                  setCommandError(
                    "Use 1–32 lowercase letters, numbers, underscores, or hyphens.",
                  )
                  return
                }
                setCommandError(null)
              }
              mutation.mutate()
            }}
          >
            <div className="grid gap-2">
              <Label>Platform</Label>
              <Select
                value={platform}
                onValueChange={(v) => setPlatform(v as Platform)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="discord">Discord</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bot-token">Bot token</Label>
              <Input
                id="bot-token"
                type="password"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder={
                  platform === "telegram"
                    ? "From @BotFather"
                    : "From Discord Developer Portal → Bot"
                }
                required
              />
            </div>
            {platform === "discord" && (
              <>
                <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Recommended flow</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-4">
                    <li>
                      Connect with token + public key + optional command name
                      (default {DEFAULT_DISCORD_COMMAND}) — leave server ID blank.
                    </li>
                    <li>Invite the bot via the link on the success screen.</li>
                    <li>
                      Optional: disconnect, then reconnect with the same
                      credentials plus server ID for instant command availability.
                    </li>
                  </ol>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="discord-key">Application public key (hex)</Label>
                  <Input
                    id="discord-key"
                    value={discordPublicKey}
                    onChange={(e) => setDiscordPublicKey(e.target.value)}
                    placeholder="0123abcd…"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Developer Portal → General Information → Public Key
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="discord-command">Slash command name (optional)</Label>
                  <Input
                    id="discord-command"
                    value={discordCommand}
                    onChange={(e) => {
                      setDiscordCommand(e.target.value.toLowerCase())
                      setCommandError(null)
                    }}
                    placeholder={DEFAULT_DISCORD_COMMAND}
                    aria-invalid={!!commandError}
                  />
                  {commandError && (
                    <p className="text-xs text-destructive">{commandError}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Registers /{"{name}"} with a required question option. Default:{" "}
                    {DEFAULT_DISCORD_COMMAND}. Rename only via disconnect +
                    reconnect.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="discord-guild">Server ID (optional)</Label>
                  <Input
                    id="discord-guild"
                    value={discordGuildId}
                    onChange={(e) => setDiscordGuildId(e.target.value)}
                    placeholder="123456789012345678"
                  />
                  <p className="text-xs text-muted-foreground">
                    Skip on first connect. Use after inviting the bot, or now if
                    the bot is already in that server. Developer Mode →
                    right-click server → Copy Server ID.
                  </p>
                </div>
              </>
            )}
            {platform === "telegram" && isSecretaryBot(bot) && (
              <p className="rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
                Secretary bots can connect Telegram before first publish. Enable
                Secretary Mode in @BotFather, then have the business owner link the
                bot in Telegram Business settings.
              </p>
            )}
            {platform === "discord" && !isBotPublished(bot) && (
              <p className="text-xs text-destructive">
                Discord requires the bot to be published first.
              </p>
            )}
            {platform === "telegram" &&
              !isSecretaryBot(bot) &&
              !isBotPublished(bot) && (
                <p className="text-xs text-destructive">
                  Moderator Telegram requires the bot to be published first.
                </p>
              )}
            {mutation.error && (
              <ErrorMessage message={(mutation.error as Error).message} />
            )}
            <DialogFooter>
              <Button
                type="submit"
                disabled={
                  !botToken.trim() ||
                  mutation.isPending ||
                  (platform === "discord" && !discordPublicKey.trim()) ||
                  requiresPublishBeforeConnect(bot, platform)
                }
              >
                {mutation.isPending ? "Connecting…" : "Connect"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function BotIntegrationsTab({ bot }: { bot: Bot }) {
  const botId = bot._id
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({
    queryKey: ["integrations", botId],
    queryFn: () => listIntegrations(botId),
  })

  const reregister = useMutation({
    mutationFn: (integrationId: string) => reregisterWebhook(botId, integrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", botId] })
      queryClient.invalidateQueries({ queryKey: ["bot", botId] })
      toast.success("Webhook re-registered")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const remove = useMutation({
    mutationFn: (integrationId: string) => deleteIntegration(botId, integrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", botId] })
      toast.success("Integration removed")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (error) {
    return <ErrorMessage message={(error as Error).message} />
  }

  return (
    <div className="space-y-4">
      {!canConnectIntegrations(bot) && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="font-medium">Publish required</p>
          <p className="mt-1 text-muted-foreground">
            Connect Telegram (moderator) or Discord after the bot has been published
            at least once. Secretary Telegram bots may connect before publish — see
            below.
          </p>
        </div>
      )}
      {isSecretaryBot(bot) && !isBotPublished(bot) && (
        <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm">
          <p className="font-medium">Secretary setup order</p>
          <p className="mt-1 text-muted-foreground">
            Finish datasets → connect Telegram → owner links in Telegram Business →
            publish when ready.
          </p>
        </div>
      )}
      <div className="flex justify-end">
        <ConnectIntegrationDialog
          bot={bot}
          disabled={!canConnectIntegrations(bot)}
        />
      </div>
      {!data?.length ? (
        <EmptyState
          title="No integrations"
          description="Connect Telegram or Discord to receive messages."
        />
      ) : (
        <>
          {data.some((i) => i.platform === "discord") && (
            <p className="text-sm text-muted-foreground">
              Discord users run slash commands such as{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                {formatDiscordCommandUsage(
                  data.find((i) => i.platform === "discord")?.discordCommand,
                )}
              </code>
              . Invite links are only shown once at connect time. For instant
              commands, disconnect and reconnect with a server ID after inviting
              the bot.
            </p>
          )}
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Platform</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Webhook</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Connected</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((integration) => (
                  <TableRow key={integration._id}>
                    <TableCell className="capitalize">{integration.platform}</TableCell>
                    <TableCell>
                      <div>
                        <p>{integration.platformUsername ?? "—"}</p>
                        {integration.platform === "discord" &&
                          integration.webhookStatus === "active" && (
                            <p className="text-xs text-muted-foreground">
                              Users run{" "}
                              {formatDiscordCommand(integration.discordCommand)} in
                              Discord
                            </p>
                          )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <BotTypeBadge botType={integration.botType} />
                      {integration.platform === "telegram" &&
                        integration.botType === "secretary" && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {integration.activeBusinessConnections ?? 0} active Business
                            link
                            {(integration.activeBusinessConnections ?? 0) === 1
                              ? ""
                              : "s"}
                          </p>
                        )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <WebhookStatusBadge status={integration.webhookStatus} />
                        {integration.webhookError && (
                          <span className="text-xs text-destructive">
                            {integration.webhookError}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {integration.botToken}
                    </TableCell>
                    <TableCell>
                      <RelativeTime date={integration.createdAt} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Re-register webhook"
                          disabled={reregister.isPending}
                          onClick={() => reregister.mutate(integration._id)}
                        >
                          <RefreshCw />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <Trash2 className="text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Disconnect integration?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This removes the {integration.platform} integration,
                                unregisters the webhook
                                {integration.platform === "discord" &&
                                  `, and removes the ${formatDiscordCommand(integration.discordCommand)} slash command`}
                                .
                                {integration.platform === "discord" &&
                                  " You can reconnect with the same token and a server ID for instant command availability."}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => remove.mutate(integration._id)}
                              >
                                Disconnect
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data
            .filter(
              (i) =>
                i.platform === "telegram" &&
                (i.botType === "secretary" || bot.botType === "secretary"),
            )
            .map((integration) => (
              <BusinessConnectionsPanel
                key={integration._id}
                botId={botId}
                integration={integration}
              />
            ))}
        </>
      )}
    </div>
  )
}
