export type DatasetType = "pdf" | "txt" | "md" | "website"
export type DatasetStatus = "pending" | "processing" | "completed" | "failed"
export type Platform = "telegram" | "discord"
export type WebhookStatus = "pending" | "active" | "failed"

export interface Bot {
  _id: string
  orgId: string
  name: string
  description?: string
  selectedModel: string
  avatarUrl?: string
  avatarKey?: string
  createdAt: string
  updatedAt: string
}

export interface Dataset {
  _id: string
  orgId: string
  name: string
  type: DatasetType
  sourceUrl: string
  storageKey?: string
  status: DatasetStatus
  jobId?: string
  errorMessage?: string | null
  chunkCount?: number
  createdAt: string
  updatedAt: string
}

export interface Integration {
  _id: string
  botId: string
  platform: Platform
  webhookId: string
  webhookUrl: string
  webhookStatus: WebhookStatus
  webhookError?: string | null
  webhookRegisteredAt?: string
  platformBotId?: string
  platformUsername?: string
  botToken: string
  createdAt: string
  updatedAt: string
}

export interface CreateIntegrationResponse extends Integration {
  webhookSecret: string
  discordPublicKey?: string
  discordInviteUrl?: string
  discordApplicationId?: string
}

export interface CreateDiscordIntegrationRequest {
  platform: "discord"
  botToken: string
  discordPublicKey?: string
  /** Guild-scoped /ask (instant). Omit for global registration (~1h). */
  discordGuildId?: string
}

export interface CreateTelegramIntegrationRequest {
  platform: "telegram"
  botToken: string
}

export type CreateIntegrationRequest =
  | CreateDiscordIntegrationRequest
  | CreateTelegramIntegrationRequest

export interface Paginated<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
}

export interface PresignUploadResponse {
  key: string
  uploadUrl: string
  publicUrl: string
  expiresInSeconds: number
}

export interface HealthResponse {
  status: string
  service: string
}

export interface HealthReadyResponse {
  status: string
  checks?: Record<string, { status: string; message?: string }>
}

export interface ApiErrorBody {
  statusCode?: number
  message?: string | string[]
}
