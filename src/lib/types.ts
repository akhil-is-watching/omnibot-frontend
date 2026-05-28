export type DatasetType = "pdf" | "txt" | "md" | "text" | "website"
export type DatasetStatus = "pending" | "processing" | "completed" | "failed"
export type BotType = "moderator" | "secretary"
export type Platform = "telegram" | "discord"
export type WebhookStatus = "pending" | "active" | "failed"

/** Standard Bot Manager JSON envelope (except GET /api/hub/metrics). */
export interface ApiEnvelope<T = Record<string, unknown>> {
  success: boolean
  data: T
  error: string
}

export interface PublishedBotSnapshot {
  version: number
  publishedAt: string
  name: string
  description?: string
  selectedModel: string
  botType: BotType
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
  botType?: BotType
  systemPrompt?: string
  avatarUrl?: string
  avatarKey?: string
  published?: PublishedBotSnapshot
  hasUnpublishedChanges?: boolean
  publishedVersion?: number | null
  draftLinkedDatasetIds?: string[]
  /** Secretary bots only — gate Publish until true */
  secretaryPublishReady?: boolean
  activeBusinessConnections?: number
  businessConnectionCount?: number
  createdAt: string
  updatedAt: string
}

export interface UpdateBotRequest {
  name?: string
  description?: string
  selectedModel?: string
  botType?: BotType
  /** Empty string clears to server default. */
  systemPrompt?: string
  avatarKey?: string
}

export interface Dataset {
  _id: string
  orgId: string
  botId: string
  /** Effective display name (staged rename returned when present) */
  name: string
  type: DatasetType
  sourceUrl: string
  storageKey?: string
  /** Present on GET/create/PATCH for `type: "text"` (draft body when staged); omitted from paginated list */
  content?: string
  /** True when staged name/content edits are not yet applied via Publish */
  hasDraftChanges?: boolean
  status: DatasetStatus
  jobId?: string
  errorMessage?: string | null
  chunkCount?: number
  createdAt: string
  updatedAt: string
}

/** POST /api/hub/bots/:botId/datasets — discriminated by `type`. */
export type CreateDatasetRequest =
  | { name: string; type: "pdf" | "txt" | "md"; storageKey: string }
  | { name: string; type: "text"; content: string }
  | { name: string; type: "website"; url: string }

/** PATCH /api/hub/bots/:botId/datasets/:datasetId — stages edits until Publish */
export interface UpdateDatasetRequest {
  name?: string
  /** Text datasets only — stages content; committed and re-ingested on Publish */
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
  /** Denormalized from parent bot — moderator vs secretary Telegram routing */
  botType?: BotType
  /** Telegram only — linked Business connections (secretary bots) */
  businessConnectionCount?: number
  activeBusinessConnections?: number
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

export interface BusinessConnection {
  connectionId: string
  userId: string
  userChatId: number
  canReply: boolean
  isEnabled: boolean
  updatedAt: string
}

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

export interface DeletedResponse {
  deleted: true
}

export interface PlaygroundChatResponse {
  reply: string
  rag: {
    chunkCount: number
    topScore: number
    hasViableContext: boolean
    chunks: Array<{
      datasetId: string
      score: number
      textPreview: string
    }>
  }
}

export interface HealthResponse {
  status: string
  service: string
}

export interface HealthReadyResponse {
  status: string
  checks?: Record<string, { status: string; message?: string }>
}

export interface DatasetNotReady {
  datasetId?: string
  status?: string
}

export interface ApiErrorBody {
  success?: boolean
  error?: string
  data?: Record<string, unknown> & {
    datasetsNotReady?: DatasetNotReady[]
    activeBusinessConnections?: number
    businessConnectionCount?: number
  }
  /** Legacy NestJS-style errors */
  statusCode?: number
  message?:
    | string
    | string[]
    | {
        message?: string
        datasetsNotReady?: DatasetNotReady[]
      }
  datasetsNotReady?: DatasetNotReady[]
}

export interface AuthUser {
  id?: string
  email: string
  orgId?: string
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
