export const MAX_TEXT_DATASET_BYTES = 10 * 1024 * 1024

export function textContentByteSize(content: string): number {
  return new Blob([content]).size
}

export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function validateTextDatasetContent(content: string): string | null {
  const trimmed = content.trim()
  if (!trimmed) return "Content is required"
  if (textContentByteSize(trimmed) > MAX_TEXT_DATASET_BYTES) {
    return "Content exceeds 10 MB limit"
  }
  return null
}
