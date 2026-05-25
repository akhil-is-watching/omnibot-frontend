import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import type { Dataset } from "@/lib/types"
import { deleteBotDataset, listBotDatasets } from "@/lib/api"
import { CreateDatasetDialog } from "@/components/datasets/create-dataset-dialog"
import { EditTextDatasetDialog } from "@/components/datasets/edit-text-dataset-dialog"
import { Button } from "@/components/ui/button"
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
import { Pencil, Trash2 } from "lucide-react"

function isPollingStatus(status: Dataset["status"]) {
  return status === "pending" || status === "processing"
}

export function BotDatasetsTab({ botId }: { botId: string }) {
  const queryClient = useQueryClient()
  const [editingDataset, setEditingDataset] = useState<Dataset | null>(null)

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["bot-datasets", botId],
    queryFn: ({ pageParam }) =>
      listBotDatasets(botId, { limit: 20, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) =>
      last.hasMore ? (last.nextCursor ?? undefined) : undefined,
    refetchInterval: (query) => {
      const datasets = query.state.data?.pages.flatMap((p) => p.data) ?? []
      return datasets.some((d) => isPollingStatus(d.status)) ? 3000 : false
    },
  })

  const remove = useMutation({
    mutationFn: (datasetId: string) => deleteBotDataset(botId, datasetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-datasets", botId] })
      queryClient.invalidateQueries({ queryKey: ["bot", botId] })
      toast.success("Dataset deleted")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const datasets = data?.pages.flatMap((p) => p.data) ?? []

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
        Knowledge sources for this bot. Publish to update what Telegram and
        Discord use for RAG.
      </p>
      <div className="flex justify-end">
        <CreateDatasetDialog botId={botId} />
      </div>
      {datasets.length === 0 ? (
        <EmptyState
          title="No datasets yet"
          description="Add documents, pasted text, or website URLs for this bot."
          action={<CreateDatasetDialog botId={botId} />}
        />
      ) : (
        <>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Chunks</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-[88px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {datasets.map((dataset) => (
                  <TableRow key={dataset._id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{dataset.name}</p>
                        {dataset.errorMessage && (
                          <p className="text-xs text-destructive">
                            {dataset.errorMessage}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="uppercase">{dataset.type}</TableCell>
                    <TableCell>
                      <DatasetStatusBadge status={dataset.status} />
                    </TableCell>
                    <TableCell>{dataset.chunkCount ?? "—"}</TableCell>
                    <TableCell>
                      <RelativeTime date={dataset.createdAt} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {dataset.type === "text" && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setEditingDataset(dataset)}
                          >
                            <Pencil />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <Trash2 className="text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete dataset?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This permanently removes &quot;{dataset.name}&quot;
                                , its file, and search index from this bot.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => remove.mutate(dataset._id)}
                              >
                                Delete
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
          {hasNextPage && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
      {editingDataset && (
        <EditTextDatasetDialog
          botId={botId}
          dataset={editingDataset}
          open={!!editingDataset}
          onOpenChange={(open) => {
            if (!open) setEditingDataset(null)
          }}
        />
      )}
    </div>
  )
}
