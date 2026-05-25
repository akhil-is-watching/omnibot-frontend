export type DatasetType = "pdf" | "txt" | "md" | "text" | "website"
export type DatasetStatus = "pending" | "processing" | "completed" | "failed"
export type Platform = "telegram" | "discord"
export type WebhookStatus = "pending" | "active" | "failed"

export interface BotPublishedSnapshot {
  version: number
  publishedAt: string
  name: string
  description?: string
  selectedModel: string
  systemPrompt?: string
  avatarUrl?: string
  avatarKey?: string
  datasetIds: string[]
}

export interface Bot {
  _id: string
  orgId: string
  name: string
  description?: string
  selectedModel: string
  systemPrompt?: string
  avatarUrl?: string
  avatarKey?: string
  published?: BotPublishedSnapshot
  hasUnpublishedChanges?: boolean
  publishedVersion?: number
  draftLinkedDatasetIds?: string[]
  createdAt: string
  updatedAt: string
}

export interface UpdateBotRequest {
  name?: string
  description?: string
  selectedModel?: string
  /** Empty string clears to server default. */
  systemPrompt?: string
  avatarKey?: string
}

export interface Dataset {
  _id: string
  orgId: string
  botId: string
  name: string
  type: DatasetType
  sourceUrl: string
  storageKey?: string
  status: DatasetStatus
  jobId?: string
  errorMessage?: string | null
  chunkCount?: number
  /** May be returned for `text` datasets when fetching a single record. */
  content?: string
  createdAt: string
  updatedAt: string
}

/** POST /api/hub/bots/:botId/datasets — discriminated by `type`. */
export type CreateDatasetRequest =
  | { name: string; type: "pdf" | "txt" | "md"; storageKey: string }
  | { name: string; type: "text"; content: string }
  | { name: string; type: "website"; url: string }

/** PATCH /api/hub/bots/:botId/datasets/:datasetId */
export interface UpdateDatasetRequest {
  name?: string
  /** Text datasets only — replaces content and re-enqueues ingestion */
  content?: string
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
  /** Discord only — registered slash command name (default: ask) */
  discordCommand?: string
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
  /** Slash command name (default: ask). Registers /{name} with a required question option. */
  discordCommand?: string
  /** Guild-scoped command (instant). Omit for global registration (~1h). */
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

export interface AuthUser {
  id?: string
  email?: string
  name?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
}

export interface AuthResponse {
  accessToken: string
  user?: AuthUser
}
