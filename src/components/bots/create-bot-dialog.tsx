import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { createBot, createBotWithAvatar } from "@/lib/api"
import { BOT_TYPE_OPTIONS } from "@/lib/bot-types"
import { OPENROUTER_MODELS } from "@/lib/models"
import type { BotType } from "@/lib/types"
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
import { Textarea } from "@/components/ui/textarea"
import { ErrorMessage } from "@/components/shared"

export function CreateBotDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedModel, setSelectedModel] = useState<string>(OPENROUTER_MODELS[0].id)
  const [botType, setBotType] = useState<BotType>("moderator")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [avatar, setAvatar] = useState<File | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async () => {
      if (avatar) {
        return createBotWithAvatar({
          name,
          selectedModel,
          botType,
          description,
          systemPrompt: systemPrompt.trim() || undefined,
          file: avatar,
        })
      }
      return createBot({
        name,
        selectedModel,
        botType,
        description: description || undefined,
        systemPrompt: systemPrompt.trim() || undefined,
      })
    },
    onSuccess: (bot) => {
      queryClient.invalidateQueries({ queryKey: ["bots"] })
      toast.success(`Bot "${bot.name}" created`)
      setOpen(false)
      resetForm()
      navigate(`/bots/${bot._id}`)
    },
  })

  function resetForm() {
    setName("")
    setDescription("")
    setSelectedModel(OPENROUTER_MODELS[0].id)
    setBotType("moderator")
    setSystemPrompt("")
    setAvatar(null)
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
        <Button>Create bot</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create bot</DialogTitle>
          <DialogDescription>
            Choose a bot type, model, and optional system prompt. Bot type affects
            Telegram routing and cannot be changed lightly after connect.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="bot-name">Name</Label>
            <Input
              id="bot-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Support Bot"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bot-description">Description</Label>
            <Textarea
              id="bot-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
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
              {BOT_TYPE_OPTIONS.find((o) => o.value === botType)?.description}
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
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bot-system-prompt">System prompt (optional)</Label>
            <Textarea
              id="bot-system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value.slice(0, 4000))}
              placeholder="Reply in a warm, professional tone…"
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bot-avatar">Avatar (optional)</Label>
            <Input
              id="bot-avatar"
              type="file"
              accept="image/*"
              onChange={(e) => setAvatar(e.target.files?.[0] ?? null)}
            />
          </div>
          {mutation.error && (
            <ErrorMessage message={(mutation.error as Error).message} />
          )}
          <DialogFooter>
            <Button type="submit" disabled={!name.trim() || mutation.isPending}>
              {mutation.isPending ? "Creating…" : "Create bot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
