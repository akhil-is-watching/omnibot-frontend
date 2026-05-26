import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import type { Dataset, UpdateDatasetRequest } from "@/lib/types"
import { getBotDataset, updateBotDataset } from "@/lib/api"
import {
  formatByteSize,
  MAX_TEXT_DATASET_BYTES,
  textContentByteSize,
  validateTextDatasetContent,
} from "@/lib/datasets"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ErrorMessage } from "@/components/shared"
import { Skeleton } from "@/components/ui/skeleton"

export function EditDatasetDialog({
  botId,
  dataset,
  open,
  onOpenChange,
}: {
  botId: string
  dataset: Dataset
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState("")
  const [content, setContent] = useState("")
  const queryClient = useQueryClient()

  const detail = useQuery({
    queryKey: ["bot-dataset", botId, dataset._id],
    queryFn: () => getBotDataset(botId, dataset._id),
    enabled: open,
  })

  useEffect(() => {
    if (!open || detail.isLoading || !detail.data) return
    setName(detail.data.name)
    setContent(detail.data.content ?? "")
  }, [open, detail.data, detail.isLoading])

  const contentBytes = useMemo(() => textContentByteSize(content), [content])
  const contentError = useMemo(() => {
    if (dataset.type !== "text" || !detail.data) return null
    if (content === (detail.data.content ?? "")) return null
    return validateTextDatasetContent(content)
  }, [content, detail.data, dataset.type])

  const hasChanges = useMemo(() => {
    if (!detail.data) return false
    const nameChanged = name.trim() !== detail.data.name
    const contentChanged =
      dataset.type === "text" && content !== (detail.data.content ?? "")
    return nameChanged || contentChanged
  }, [name, content, detail.data, dataset.type])

  const mutation = useMutation({
    mutationFn: () => {
      if (!detail.data) throw new Error("Dataset not loaded")
      const payload: UpdateDatasetRequest = {}
      const trimmedName = name.trim()
      if (trimmedName !== detail.data.name) payload.name = trimmedName
      if (
        dataset.type === "text" &&
        content !== (detail.data.content ?? "")
      ) {
        payload.content = content
      }
      if (Object.keys(payload).length === 0) {
        throw new Error("No changes to save")
      }
      return updateBotDataset(botId, dataset._id, payload)
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["bot-datasets", botId] })
      queryClient.invalidateQueries({ queryKey: ["bot-dataset", botId, dataset._id] })
      queryClient.invalidateQueries({ queryKey: ["bot", botId] })
      toast.success(
        `"${updated.name}" staged — publish to apply (text may need two publish steps)`,
      )
      onOpenChange(false)
    },
  })

  const canSubmit =
    hasChanges &&
    name.trim() &&
    !contentError &&
    !mutation.isPending &&
    !detail.isLoading

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) mutation.reset()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit dataset</DialogTitle>
          <DialogDescription>
            Changes are staged until you publish the bot. Live Telegram, Discord,
            and indexed RAG chunks stay unchanged until then.
          </DialogDescription>
        </DialogHeader>
        {detail.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-dataset-name">Name</Label>
              <Input
                id="edit-dataset-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            {dataset.type === "text" && (
              <div className="grid gap-2">
                <Label htmlFor="edit-dataset-content">Content</Label>
                <Textarea
                  id="edit-dataset-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={10}
                />
                <p
                  className={`text-xs ${
                    contentBytes > MAX_TEXT_DATASET_BYTES
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {formatByteSize(contentBytes)} /{" "}
                  {formatByteSize(MAX_TEXT_DATASET_BYTES)}
                </p>
                {contentError && (
                  <p className="text-xs text-destructive">{contentError}</p>
                )}
              </div>
            )}
            {mutation.error && (
              <ErrorMessage message={(mutation.error as Error).message} />
            )}
          </div>
        )}
        <DialogFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
          >
            {mutation.isPending ? "Saving…" : "Stage changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
