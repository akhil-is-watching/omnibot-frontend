import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import type { Dataset } from "@/lib/types"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ErrorMessage } from "@/components/shared"
import { Skeleton } from "@/components/ui/skeleton"

export function EditTextDatasetDialog({
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
  const [content, setContent] = useState("")
  const queryClient = useQueryClient()

  const detail = useQuery({
    queryKey: ["bot-dataset", botId, dataset._id],
    queryFn: () => getBotDataset(botId, dataset._id),
    enabled: open,
  })

  useEffect(() => {
    if (open && detail.data?.content) {
      setContent(detail.data.content)
    } else if (open && !detail.isLoading) {
      setContent("")
    }
  }, [open, detail.data?.content, detail.isLoading])

  const contentBytes = useMemo(() => textContentByteSize(content), [content])
  const contentError = useMemo(
    () => (content.trim() ? validateTextDatasetContent(content) : null),
    [content],
  )

  const mutation = useMutation({
    mutationFn: () => updateBotDataset(botId, dataset._id, { content }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["bot-datasets", botId] })
      queryClient.invalidateQueries({ queryKey: ["bot-dataset", botId, dataset._id] })
      queryClient.invalidateQueries({ queryKey: ["bot", botId] })
      toast.success(`"${updated.name}" updated — re-ingesting`)
      onOpenChange(false)
      mutation.reset()
    },
  })

  const canSubmit = !!content.trim() && !contentError && !mutation.isPending

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setContent("")
          mutation.reset()
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit text dataset</DialogTitle>
          <DialogDescription>
            Update content for &quot;{dataset.name}&quot;. Saving re-enqueues
            ingestion.
          </DialogDescription>
        </DialogHeader>
        {detail.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="grid gap-4">
            {!detail.data?.content && !detail.isLoading && (
              <p className="text-xs text-muted-foreground">
                Previous content is not available from the API — paste the full
                updated text below.
              </p>
            )}
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
                {formatByteSize(contentBytes)} / {formatByteSize(MAX_TEXT_DATASET_BYTES)}
              </p>
              {contentError && (
                <p className="text-xs text-destructive">{contentError}</p>
              )}
            </div>
            {mutation.error && (
              <ErrorMessage message={(mutation.error as Error).message} />
            )}
          </div>
        )}
        <DialogFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || detail.isLoading}
          >
            {mutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
