import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { Dataset } from "@/lib/types"
import { deleteDataset, listDatasets } from "@/lib/api"
import { CreateDatasetDialog } from "@/components/datasets/create-dataset-dialog"
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
  PageHeader,
  RelativeTime,
} from "@/components/shared"
import { Skeleton } from "@/components/ui/skeleton"
import { Trash2 } from "lucide-react"

function isPollingStatus(status: Dataset["status"]) {
  return status === "pending" || status === "processing"
}

export function DatasetsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["datasets"],
      queryFn: ({ pageParam }) => listDatasets({ limit: 20, cursor: pageParam }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) =>
        last.hasMore ? (last.nextCursor ?? undefined) : undefined,
      refetchInterval: (query) => {
        const datasets = query.state.data?.pages.flatMap((p) => p.data) ?? []
        return datasets.some((d) => isPollingStatus(d.status)) ? 3000 : false
      },
    })

  const remove = useMutation({
    mutationFn: deleteDataset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] })
      toast.success("Dataset deleted")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const datasets = data?.pages.flatMap((p) => p.data) ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Datasets"
        description="Knowledge sources for bot RAG — documents and websites."
        actions={<CreateDatasetDialog />}
      />

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {error && <ErrorMessage message={(error as Error).message} />}

      {!isLoading && !error && datasets.length === 0 && (
        <EmptyState
          title="No datasets yet"
          description="Upload documents or add website URLs for ingestion."
          action={<CreateDatasetDialog />}
        />
      )}

      {datasets.length > 0 && (
        <>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Chunks</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[60px]" />
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
                              This removes &quot;{dataset.name}&quot; and unlinks it from
                              any bots. Linked bots may lose RAG context.
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
    </div>
  )
}
