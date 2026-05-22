import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { deleteBot, listBots } from "@/lib/api"
import { getModelLabel } from "@/lib/models"
import { CreateBotDialog } from "@/components/bots/create-bot-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  EmptyState,
  ErrorMessage,
  PageHeader,
  RelativeTime,
  BotPublishStatusBadge,
} from "@/components/shared"
import { Skeleton } from "@/components/ui/skeleton"
import { Trash2 } from "lucide-react"

export function BotsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["bots"],
      queryFn: ({ pageParam }) => listBots({ limit: 20, cursor: pageParam }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) =>
        last.hasMore ? (last.nextCursor ?? undefined) : undefined,
    })

  const remove = useMutation({
    mutationFn: deleteBot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bots"] })
      toast.success("Bot deleted")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const bots = data?.pages.flatMap((p) => p.data) ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bots"
        description="Create and manage AI bots with models and knowledge."
        actions={<CreateBotDialog />}
      />

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {error && <ErrorMessage message={(error as Error).message} />}

      {!isLoading && !error && bots.length === 0 && (
        <EmptyState
          title="No bots yet"
          description="Create your first bot to get started."
          action={<CreateBotDialog />}
        />
      )}

      {bots.length > 0 && (
        <>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bot</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {bots.map((bot) => (
                  <TableRow key={bot._id}>
                    <TableCell>
                      <Link
                        to={`/bots/${bot._id}`}
                        className="flex items-center gap-3 hover:underline"
                      >
                        <Avatar className="size-8">
                          {bot.avatarUrl && (
                            <AvatarImage src={bot.avatarUrl} alt={bot.name} />
                          )}
                          <AvatarFallback>
                            {bot.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{bot.name}</p>
                          {bot.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {bot.description}
                            </p>
                          )}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {getModelLabel(bot.selectedModel)}
                    </TableCell>
                    <TableCell>
                      <BotPublishStatusBadge bot={bot} />
                    </TableCell>
                    <TableCell>
                      <RelativeTime date={bot.createdAt} />
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
                            <AlertDialogTitle>Delete bot?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently deletes &quot;{bot.name}&quot;, its
                              dataset links, and integrations.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => remove.mutate(bot._id)}
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
