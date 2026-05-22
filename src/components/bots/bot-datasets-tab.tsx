import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  linkDatasetsToBot,
  listBotDatasets,
  listDatasets,
  unlinkDatasetFromBot,
} from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
  DatasetStatusBadge,
  EmptyState,
  ErrorMessage,
  RelativeTime,
} from "@/components/shared"
import { Skeleton } from "@/components/ui/skeleton"
import { Link2, Unlink } from "lucide-react"

function LinkDatasetsDialog({
  botId,
  linkedIds,
}: {
  botId: string
  linkedIds: Set<string>
}) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()

  const { data: allDatasets, isLoading } = useQuery({
    queryKey: ["datasets", "all-for-link"],
    queryFn: async () => {
      const page = await listDatasets({ limit: 100 })
      return page.data
    },
    enabled: open,
  })

  const available = useMemo(
    () => allDatasets?.filter((d) => !linkedIds.has(d._id)) ?? [],
    [allDatasets, linkedIds],
  )

  const mutation = useMutation({
    mutationFn: () => linkDatasetsToBot(botId, [...selected]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-datasets", botId] })
      queryClient.invalidateQueries({ queryKey: ["bot", botId] })
      toast.success("Datasets linked")
      setOpen(false)
      setSelected(new Set())
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setSelected(new Set())
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Link2 />
          Link datasets
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link datasets</DialogTitle>
          <DialogDescription>
            Select completed datasets to attach as knowledge sources.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : available.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No unlinked datasets available. Create datasets first.
          </p>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {available.map((dataset) => (
              <label
                key={dataset._id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/50"
              >
                <Checkbox
                  checked={selected.has(dataset._id)}
                  onCheckedChange={() => toggle(dataset._id)}
                  disabled={dataset.status !== "completed"}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{dataset.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="uppercase">{dataset.type}</span>
                    <DatasetStatusBadge status={dataset.status} />
                    {dataset.status !== "completed" && (
                      <span>Not ready for RAG</span>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button
            disabled={selected.size === 0 || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Linking…" : `Link ${selected.size || ""} dataset${selected.size === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function BotDatasetsTab({ botId }: { botId: string }) {
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({
    queryKey: ["bot-datasets", botId],
    queryFn: () => listBotDatasets(botId),
  })

  const unlink = useMutation({
    mutationFn: (datasetId: string) => unlinkDatasetFromBot(botId, datasetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-datasets", botId] })
      queryClient.invalidateQueries({ queryKey: ["bot", botId] })
      toast.success("Dataset unlinked")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const linkedIds = useMemo(() => new Set(data?.map((d) => d._id) ?? []), [data])

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
      <p className="text-sm text-muted-foreground">
        Draft knowledge links — publish to update what Telegram and Discord use
        for RAG.
      </p>
      <div className="flex justify-end">
        <LinkDatasetsDialog botId={botId} linkedIds={linkedIds} />
      </div>
      {!data?.length ? (
        <EmptyState
          title="No linked datasets"
          description="Link knowledge datasets for RAG-powered responses."
        />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Chunks</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((dataset) => (
                <TableRow key={dataset._id}>
                  <TableCell className="font-medium">{dataset.name}</TableCell>
                  <TableCell className="uppercase">{dataset.type}</TableCell>
                  <TableCell>
                    <DatasetStatusBadge status={dataset.status} />
                  </TableCell>
                  <TableCell>{dataset.chunkCount ?? "—"}</TableCell>
                  <TableCell>
                    <RelativeTime date={dataset.createdAt} />
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <Unlink className="text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Unlink dataset?</AlertDialogTitle>
                          <AlertDialogDescription>
                            The bot will no longer use &quot;{dataset.name}&quot; for
                            RAG context.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => unlink.mutate(dataset._id)}
                          >
                            Unlink
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
