import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import type { Bot, BotType, UpdateBotRequest } from "@/lib/types"
import { updateBot, updateBotWithAvatar } from "@/lib/api"
import { BOT_TYPE_OPTIONS } from "@/lib/bot-types"
import { OPENROUTER_MODELS } from "@/lib/models"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ErrorMessage } from "@/components/shared"

const MAX_SYSTEM_PROMPT = 4000

export function BotOverviewTab({ bot }: { bot: Bot }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(bot.name)
  const [description, setDescription] = useState(bot.description ?? "")
  const [selectedModel, setSelectedModel] = useState(bot.selectedModel)
  const [botType, setBotType] = useState<BotType>(bot.botType ?? "moderator")
  const [systemPrompt, setSystemPrompt] = useState(bot.systemPrompt ?? "")
  const [avatar, setAvatar] = useState<File | null>(null)

  useEffect(() => {
    setName(bot.name)
    setDescription(bot.description ?? "")
    setSelectedModel(bot.selectedModel)
    setBotType(bot.botType ?? "moderator")
    setSystemPrompt(bot.systemPrompt ?? "")
    setAvatar(null)
  }, [bot])

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: UpdateBotRequest = {}
      const trimmedName = name.trim()
      const trimmedDescription = description.trim()

      if (trimmedName !== bot.name) payload.name = trimmedName
      if (trimmedDescription !== (bot.description ?? "")) {
        payload.description = trimmedDescription
      }
      if (selectedModel !== bot.selectedModel) payload.selectedModel = selectedModel
      if (botType !== (bot.botType ?? "moderator")) payload.botType = botType
      if (systemPrompt !== (bot.systemPrompt ?? "")) {
        payload.systemPrompt = systemPrompt
      }

      if (avatar) {
        return updateBotWithAvatar(bot._id, { ...payload, file: avatar })
      }
      return updateBot(bot._id, payload)
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["bot", bot._id], updated)
      queryClient.invalidateQueries({ queryKey: ["bots"] })
      toast.success("Bot settings saved")
      setAvatar(null)
    },
  })

  const hasChanges =
    name.trim() !== bot.name ||
    (description.trim() || "") !== (bot.description ?? "") ||
    selectedModel !== bot.selectedModel ||
    botType !== (bot.botType ?? "moderator") ||
    systemPrompt !== (bot.systemPrompt ?? "") ||
    avatar !== null

  return (
    <form
      className="max-w-xl space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
    >
      <p className="text-sm text-muted-foreground">
        These fields edit the <strong>draft</strong>. Publish to push changes live
        for Telegram and Discord.
      </p>
      <div className="flex items-center gap-4">
        <Avatar className="size-14">
          {bot.avatarUrl && !avatar && (
            <AvatarImage src={bot.avatarUrl} alt={bot.name} />
          )}
          <AvatarFallback>{name.slice(0, 2).toUpperCase() || "??"}</AvatarFallback>
        </Avatar>
        <div className="grid flex-1 gap-2">
          <Label htmlFor="bot-avatar-edit">Avatar</Label>
          <Input
            id="bot-avatar-edit"
            type="file"
            accept="image/*"
            onChange={(e) => setAvatar(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="bot-name-edit">Name</Label>
        <Input
          id="bot-name-edit"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="bot-description-edit">Description</Label>
        <Textarea
          id="bot-description-edit"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      <div className="grid gap-2">
        <Label>Bot type</Label>
        <Select value={botType} onValueChange={(v) => setBotType(v as BotType)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BOT_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {BOT_TYPE_OPTIONS.find((o) => o.value === botType)?.description}. Changing
          type re-registers an active Telegram webhook; publish still required for
          live replies.
        </p>
      </div>

      <div className="grid gap-2">
        <Label>Model</Label>
        <Select value={selectedModel} onValueChange={setSelectedModel}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPENROUTER_MODELS.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.label}
              </SelectItem>
            ))}
            {!OPENROUTER_MODELS.some((m) => m.id === selectedModel) && (
              <SelectItem value={selectedModel}>{selectedModel}</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="bot-system-prompt">System prompt</Label>
        <Textarea
          id="bot-system-prompt"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value.slice(0, MAX_SYSTEM_PROMPT))}
          placeholder="Optional tone and style instructions…"
          rows={5}
        />
        <p className="text-xs text-muted-foreground">
          Customizes tone and style. RAG context is always applied separately.
          Clear the field and save to reset to default. Max {MAX_SYSTEM_PROMPT}{" "}
          characters ({systemPrompt.length}/{MAX_SYSTEM_PROMPT}).
        </p>
      </div>

      {mutation.error && (
        <ErrorMessage message={(mutation.error as Error).message} />
      )}

      <Button
        type="submit"
        disabled={!hasChanges || !name.trim() || mutation.isPending}
      >
        {mutation.isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  )
}
