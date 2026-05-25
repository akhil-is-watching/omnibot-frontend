import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  createBotDatasetWithFile,
  createBotTextDataset,
  createBotWebsiteDataset,
} from "@/lib/api"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ErrorMessage } from "@/components/shared"

type DatasetMode = "file" | "text" | "website"

function inferTypeFromFile(file: File): "pdf" | "txt" | "md" {
  const ext = file.name.split(".").pop()?.toLowerCase()
  if (ext === "pdf") return "pdf"
  if (ext === "md") return "md"
  return "txt"
}

export function CreateDatasetDialog({ botId }: { botId: string }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [content, setContent] = useState("")
  const [url, setUrl] = useState("")
  const [mode, setMode] = useState<DatasetMode>("file")
  const queryClient = useQueryClient()

  const contentBytes = useMemo(() => textContentByteSize(content), [content])
  const contentError = useMemo(
    () => (content.trim() ? validateTextDatasetContent(content) : null),
    [content],
  )

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === "website") {
        return createBotWebsiteDataset(botId, { name, url })
      }
      if (mode === "text") {
        return createBotTextDataset(botId, { name, content })
      }
      if (!file) throw new Error("Select a file")
      return createBotDatasetWithFile(botId, {
        name,
        type: inferTypeFromFile(file),
        file,
      })
    },
    onSuccess: (dataset) => {
      queryClient.invalidateQueries({ queryKey: ["bot-datasets", botId] })
      queryClient.invalidateQueries({ queryKey: ["bot", botId] })
      toast.success(`Dataset "${dataset.name}" created`)
      setOpen(false)
      resetForm()
    },
  })

  function resetForm() {
    setName("")
    setFile(null)
    setContent("")
    setUrl("")
    setMode("file")
    mutation.reset()
  }

  const canSubmit =
    name.trim() &&
    !mutation.isPending &&
    (mode === "file"
      ? !!file
      : mode === "text"
        ? !!content.trim() && !contentError
        : !!url.trim())

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) resetForm()
      }}
    >
      <DialogTrigger asChild>
        <Button>Add dataset</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add dataset</DialogTitle>
          <DialogDescription>
            Upload a document, paste text, or add a website URL for this bot.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={mode} onValueChange={(v) => setMode(v as DatasetMode)}>
          <TabsList className="w-full">
            <TabsTrigger value="file" className="flex-1">
              File
            </TabsTrigger>
            <TabsTrigger value="text" className="flex-1">
              Paste text
            </TabsTrigger>
            <TabsTrigger value="website" className="flex-1">
              Website
            </TabsTrigger>
          </TabsList>
          <form
            className="mt-4 grid gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              mutation.mutate()
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="dataset-name">Name</Label>
              <Input
                id="dataset-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Product FAQ"
                required
              />
            </div>
            <TabsContent value="file" className="mt-0 grid gap-2">
              <Label htmlFor="dataset-file">File (PDF, TXT, MD — max 10 MB)</Label>
              <Input
                id="dataset-file"
                type="file"
                accept=".pdf,.txt,.md,text/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required={mode === "file"}
              />
              {file && (
                <p className="text-xs text-muted-foreground">
                  Type: {inferTypeFromFile(file)}
                </p>
              )}
            </TabsContent>
            <TabsContent value="text" className="mt-0 grid gap-2">
              <Label htmlFor="dataset-content">Content</Label>
              <Textarea
                id="dataset-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste FAQ, policy, or notes…"
                rows={8}
                required={mode === "text"}
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
            </TabsContent>
            <TabsContent value="website" className="mt-0 grid gap-2">
              <Label htmlFor="dataset-url">Website URL</Label>
              <Input
                id="dataset-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/docs"
                required={mode === "website"}
              />
              <p className="text-xs text-muted-foreground">
                Ingestion is async and uses Firecrawl on the ingestor service.
              </p>
            </TabsContent>
            {mutation.error && (
              <ErrorMessage message={(mutation.error as Error).message} />
            )}
            <DialogFooter>
              <Button type="submit" disabled={!canSubmit}>
                {mutation.isPending ? "Creating…" : "Create dataset"}
              </Button>
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
