import { ApiError } from "@/lib/api"
import type { DatasetNotReady } from "@/lib/types"

function datasetsFromBody(body: Record<string, unknown>): DatasetNotReady[] | null {
  const direct = body.datasetsNotReady
  if (Array.isArray(direct) && direct.length > 0) {
    return direct as DatasetNotReady[]
  }
  const message = body.message
  if (message && typeof message === "object" && !Array.isArray(message)) {
    const nested = (message as { datasetsNotReady?: DatasetNotReady[] })
      .datasetsNotReady
    if (Array.isArray(nested) && nested.length > 0) return nested
  }
  return null
}

/** 409 after publish applied staged text but ingest has not finished yet. */
export function getPublishNotReadyDatasets(error: unknown): DatasetNotReady[] | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null
  return datasetsFromBody(error.body)
}

export function isPublishIngestPendingError(error: unknown): boolean {
  return getPublishNotReadyDatasets(error) !== null
}
