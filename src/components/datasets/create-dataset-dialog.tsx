import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import type { DatasetType } from "@/lib/types"
import { createDataset, createDatasetWithFile } from "@/lib/api"
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
import { ErrorMessage } from "@/components/shared"

function inferTypeFromFile(file: File): DatasetType {
  const ext = file.name.split(".").pop()?.toLowerCase()
  if (ext === "pdf") return "pdf"
  if (ext === "md") return "md"
  return "txt"
}

export function CreateDatasetDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState("")
  const [mode, setMode] = useState<"file" | "website">("file")
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === "website") {
        return createDataset({ name, type: "website", url })
      }
      if (!file) throw new Error("Select a file")
      return createDatasetWithFile({
        name,
        type: inferTypeFromFile(file),
        file,
      })
    },
    onSuccess: (dataset) => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] })
      toast.success(`Dataset "${dataset.name}" created`)
      setOpen(false)
      resetForm()
    },
  })

  function resetForm() {
    setName("")
    setFile(null)
    setUrl("")
    setMode("file")
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
        <Button>Add dataset</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add dataset</DialogTitle>
          <DialogDescription>
            Upload a document or add a website URL for ingestion.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={mode} onValueChange={(v) => setMode(v as "file" | "website")}>
          <TabsList className="w-full">
            <TabsTrigger value="file" className="flex-1">
              Document
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
                Ingestion is async and uses Firecrawl on the ingestor service
                (operators configure FIRECRAWL_API_KEY — not a frontend env).
                Multiple linked pages are crawled and indexed.
              </p>
            </TabsContent>
            {mutation.error && (
              <ErrorMessage message={(mutation.error as Error).message} />
            )}
            <DialogFooter>
              <Button
                type="submit"
                disabled={
                  !name.trim() ||
                  mutation.isPending ||
                  (mode === "file" ? !file : !url.trim())
                }
              >
                {mutation.isPending ? "Creating…" : "Create dataset"}
              </Button>
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}