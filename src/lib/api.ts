import type {
  ApiErrorBody,
  AuthResponse,
  AuthUser,
  Bot,
  CreateDiscordIntegrationRequest,
  CreateIntegrationRequest,
  CreateIntegrationResponse,
  CreateDatasetRequest,
  Dataset,
  HealthReadyResponse,
  HealthResponse,
  Integration,
  LoginRequest,
  Paginated,
  PresignUploadResponse,
  RegisterRequest,
  UpdateBotRequest,
  UpdateDatasetRequest,
} from "@/lib/types"
import { validateTextDatasetContent } from "@/lib/datasets"
import {
  clearAuthStorage,
  getAccessToken,
  setAccessToken as persistAccessToken,
  setStoredUser,
} from "@/lib/auth-storage"

const BOTMANAGER_URL =
  import.meta.env.VITE_BOTMANAGER_URL ?? "http://localhost:3000"
const API_PREFIX = "/api/hub"

/** Bot Manager routes are mounted under /api/hub on the service origin. */
export function hubPath(path: string): string {
  if (path.startsWith(API_PREFIX)) return path
  return `${API_PREFIX}${path.startsWith("/") ? path : `/${path}`}`
}

export function getApiPrefix(): string {
  return API_PREFIX
}

let accessToken: string | null = getAccessToken()
let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

export function setAccessToken(token: string): void {
  accessToken = token
  persistAccessToken(token)
}

export function clearAccessToken(): void {
  accessToken = null
  clearAuthStorage()
}

export class ApiError extends Error {
  status: number
  body: ApiErrorBody & Record<string, unknown>

  constructor(message: string, status: number, body: ApiErrorBody = {}) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.body = body as ApiErrorBody & Record<string, unknown>
  }
}

function formatErrorMessage(body: ApiErrorBody, status: number): string {
  const msg = body.message
  if (Array.isArray(msg)) return msg.join(", ")
  if (typeof msg === "string") return msg
  if (msg && typeof msg === "object" && "message" in msg) {
    const nested = msg.message
    if (typeof nested === "string") return nested
  }
  return `HTTP ${status}`
}

export async function botmanagerFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers)
  if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }
  const token = accessToken ?? getAccessToken()
  if (token) headers.set("Authorization", `Bearer ${token}`)

  const res = await fetch(`${BOTMANAGER_URL}${hubPath(path)}`, {
    ...init,
    headers,
    credentials: "include",
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody
    if (res.status === 401 && token) {
      clearAccessToken()
      onUnauthorized?.()
    }
    throw new ApiError(formatErrorMessage(body, res.status), res.status, body)
  }
  return res
}

export function getBotmanagerUrl(): string {
  return BOTMANAGER_URL
}

function normalizeAuthResponse(data: Record<string, unknown>): AuthResponse {
  const token = data.accessToken ?? data.access_token
  if (typeof token !== "string" || !token) {
    throw new ApiError("No access token in response", 500)
  }
  const user = data.user
  return {
    accessToken: token,
    user:
      user && typeof user === "object"
        ? (user as AuthUser)
        : undefined,
  }
}

async function publicJsonFetch<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  const res = await fetch(`${BOTMANAGER_URL}${hubPath(path)}`, {
    ...init,
    headers,
    credentials: "include",
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody
    throw new ApiError(formatErrorMessage(body, res.status), res.status, body)
  }
  return res.json() as Promise<T>
}

// ——— Auth ———

export async function login(input: LoginRequest): Promise<AuthResponse> {
  const data = await publicJsonFetch<Record<string, unknown>>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  })
  return normalizeAuthResponse(data)
}

export async function register(input: RegisterRequest): Promise<AuthResponse> {
  const data = await publicJsonFetch<Record<string, unknown>>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  })
  return normalizeAuthResponse(data)
}

export function applyAuthSession(response: AuthResponse): void {
  setAccessToken(response.accessToken)
  if (response.user) setStoredUser(response.user)
}

// ——— Health ———

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${BOTMANAGER_URL}${hubPath("/health")}`)
  return res.json() as Promise<HealthResponse>
}

export async function getHealthReady(): Promise<HealthReadyResponse> {
  const res = await fetch(`${BOTMANAGER_URL}${hubPath("/health/ready")}`)
  return res.json() as Promise<HealthReadyResponse>
}

// ——— Uploads ———

export async function presignUpload(
  input:
    | { purpose: "avatar"; filename: string; contentType: string }
    | {
        purpose: "dataset"
        botId: string
        filename: string
        contentType: string
      },
): Promise<PresignUploadResponse> {
  const res = await botmanagerFetch("/uploads/presign", {
    method: "POST",
    body: JSON.stringify(input),
  })
  return res.json() as Promise<PresignUploadResponse>
}

export async function uploadToPresignedUrl(
  uploadUrl: string,
  file: File,
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  })
  if (!res.ok) throw new ApiError(`Upload failed: HTTP ${res.status}`, res.status)
}

// ——— Bots ———

export async function listBots(params?: {
  limit?: number
  cursor?: string
}): Promise<Paginated<Bot>> {
  const search = new URLSearchParams()
  if (params?.limit) search.set("limit", String(params.limit))
  if (params?.cursor) search.set("cursor", params.cursor)
  const qs = search.toString()
  const res = await botmanagerFetch(`/bots${qs ? `?${qs}` : ""}`)
  return res.json() as Promise<Paginated<Bot>>
}

export async function getBot(botId: string): Promise<Bot> {
  const res = await botmanagerFetch(`/bots/${botId}`)
  return res.json() as Promise<Bot>
}

export async function createBot(input: {
  name: string
  selectedModel: string
  description?: string
  systemPrompt?: string
  avatarKey?: string
}): Promise<Bot> {
  const res = await botmanagerFetch("/bots", {
    method: "POST",
    body: JSON.stringify(input),
  })
  return res.json() as Promise<Bot>
}

export async function createBotWithAvatar(input: {
  name: string
  selectedModel: string
  description?: string
  systemPrompt?: string
  file: File
}): Promise<Bot> {
  const presign = await presignUpload({
    purpose: "avatar",
    filename: input.file.name,
    contentType: input.file.type,
  })
  await uploadToPresignedUrl(presign.uploadUrl, input.file)
  return createBot({
    name: input.name,
    selectedModel: input.selectedModel,
    description: input.description,
    systemPrompt: input.systemPrompt,
    avatarKey: presign.key,
  })
}

export async function updateBot(
  botId: string,
  input: UpdateBotRequest,
): Promise<Bot> {
  const res = await botmanagerFetch(`/bots/${botId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
  return res.json() as Promise<Bot>
}

export async function updateBotWithAvatar(
  botId: string,
  input: UpdateBotRequest & { file: File },
): Promise<Bot> {
  const presign = await presignUpload({
    purpose: "avatar",
    filename: input.file.name,
    contentType: input.file.type,
  })
  await uploadToPresignedUrl(presign.uploadUrl, input.file)
  const { file: _, ...rest } = input
  return updateBot(botId, { ...rest, avatarKey: presign.key })
}

export async function deleteBot(botId: string): Promise<void> {
  await botmanagerFetch(`/bots/${botId}`, { method: "DELETE" })
}

export async function publishBot(botId: string): Promise<Bot> {
  const res = await botmanagerFetch(`/bots/${botId}/publish`, { method: "POST" })
  return res.json() as Promise<Bot>
}

export async function discardBotDraft(botId: string): Promise<Bot> {
  const res = await botmanagerFetch(`/bots/${botId}/discard-draft`, {
    method: "POST",
  })
  return res.json() as Promise<Bot>
}

export async function playgroundChat(
  botId: string,
  message: string,
): Promise<Record<string, unknown>> {
  const res = await botmanagerFetch(`/bots/${botId}/playground/chat`, {
    method: "POST",
    body: JSON.stringify({ message }),
  })
  return res.json() as Promise<Record<string, unknown>>
}

// ——— Bot datasets ———

export async function listBotDatasets(
  botId: string,
  params?: { limit?: number; cursor?: string },
): Promise<Paginated<Dataset>> {
  const search = new URLSearchParams()
  if (params?.limit) search.set("limit", String(params.limit))
  if (params?.cursor) search.set("cursor", params.cursor)
  const qs = search.toString()
  const res = await botmanagerFetch(
    `/bots/${botId}/datasets${qs ? `?${qs}` : ""}`,
  )
  return res.json() as Promise<Paginated<Dataset>>
}

export async function getBotDataset(
  botId: string,
  datasetId: string,
): Promise<Dataset> {
  const res = await botmanagerFetch(`/bots/${botId}/datasets/${datasetId}`)
  return res.json() as Promise<Dataset>
}

export async function createBotDataset(
  botId: string,
  input: CreateDatasetRequest,
): Promise<Dataset> {
  const res = await botmanagerFetch(`/bots/${botId}/datasets`, {
    method: "POST",
    body: JSON.stringify(input),
  })
  return res.json() as Promise<Dataset>
}

export async function createBotTextDataset(
  botId: string,
  input: { name: string; content: string },
): Promise<Dataset> {
  const trimmed = input.content.trim()
  if (!trimmed) {
    throw new ApiError("Content is required", 400)
  }
  const error = validateTextDatasetContent(trimmed)
  if (error) throw new ApiError(error, 400)
  return createBotDataset(botId, {
    name: input.name,
    type: "text",
    content: trimmed,
  })
}

export async function createBotWebsiteDataset(
  botId: string,
  input: { name: string; url: string },
): Promise<Dataset> {
  return createBotDataset(botId, {
    name: input.name,
    type: "website",
    url: input.url,
  })
}

export async function createBotDatasetWithFile(
  botId: string,
  input: {
    name: string
    type: "pdf" | "txt" | "md"
    file: File
  },
): Promise<Dataset> {
  const presign = await presignUpload({
    purpose: "dataset",
    botId,
    filename: input.file.name,
    contentType: input.file.type,
  })
  await uploadToPresignedUrl(presign.uploadUrl, input.file)
  return createBotDataset(botId, {
    name: input.name,
    type: input.type,
    storageKey: presign.key,
  })
}

export async function updateBotDataset(
  botId: string,
  datasetId: string,
  input: UpdateDatasetRequest,
): Promise<Dataset> {
  if (input.content !== undefined) {
    const trimmed = input.content.trim()
    if (!trimmed) {
      throw new ApiError("Content is required", 400)
    }
    const error = validateTextDatasetContent(trimmed)
    if (error) throw new ApiError(error, 400)
    input = { ...input, content: trimmed }
  }
  const res = await botmanagerFetch(`/bots/${botId}/datasets/${datasetId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
  return res.json() as Promise<Dataset>
}

export async function deleteBotDataset(
  botId: string,
  datasetId: string,
): Promise<void> {
  await botmanagerFetch(`/bots/${botId}/datasets/${datasetId}`, {
    method: "DELETE",
  })
}

// ——— Integrations ———

export function buildDiscordIntegrationBody(input: {
  botToken: string
  discordPublicKey: string
  discordGuildId?: string
  discordCommand?: string
}): CreateDiscordIntegrationRequest {
  const body: CreateDiscordIntegrationRequest = {
    platform: "discord",
    botToken: input.botToken.trim(),
    discordPublicKey: input.discordPublicKey.trim(),
  }
  const guildId = input.discordGuildId?.trim()
  if (guildId) body.discordGuildId = guildId
  const command = input.discordCommand?.trim()
  if (command) body.discordCommand = command
  return body
}

export async function listIntegrations(botId: string): Promise<Integration[]> {
  const res = await botmanagerFetch(`/bots/${botId}/integrations`)
  return res.json() as Promise<Integration[]>
}

export async function createIntegration(
  botId: string,
  input: CreateIntegrationRequest,
): Promise<CreateIntegrationResponse> {
  const body: CreateIntegrationRequest =
    input.platform === "discord"
      ? buildDiscordIntegrationBody({
          botToken: input.botToken,
          discordPublicKey: input.discordPublicKey ?? "",
          discordGuildId: input.discordGuildId,
          discordCommand: input.discordCommand,
        })
      : { platform: "telegram", botToken: input.botToken.trim() }

  const res = await botmanagerFetch(`/bots/${botId}/integrations`, {
    method: "POST",
    body: JSON.stringify(body),
  })
  return res.json() as Promise<CreateIntegrationResponse>
}

export async function reregisterWebhook(
  botId: string,
  integrationId: string,
): Promise<Integration> {
  const res = await botmanagerFetch(
    `/bots/${botId}/integrations/${integrationId}/webhook`,
    { method: "POST" },
  )
  return res.json() as Promise<Integration>
}

export async function deleteIntegration(
  botId: string,
  integrationId: string,
): Promise<void> {
  await botmanagerFetch(`/bots/${botId}/integrations/${integrationId}`, {
    method: "DELETE",
  })
}
