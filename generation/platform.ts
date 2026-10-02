import { toAuthorizationHeader } from "./credentials"
import { parseUploadTicket, requireUploadContentType } from "./upload-contract"
import type { UploadTicket } from "./upload-contract"

const UPLOAD_PATH = "/files/generate-upload-url"
const MODEL_ID = /^[a-z0-9][a-z0-9._/-]*$/i
const IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/
const PRESET_PAGE_SIZE = 50

export type PresetOption = { id: string; name: string }

export class PlatformError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown) {
    super(messageFromBody(status, body))
    this.name = "PlatformError"
    this.status = status
    this.body = body
  }
}

export type QueuedGeneration = {
  status: string
  requestId: string
  statusUrl: string
  cancelUrl: string
}

export type GenerationStatus = {
  status: string
  requestId: string
  images?: Array<{ url: string }>
  video?: { url: string }
  error?: unknown
}

/** One request's answer inside a batched status poll. A request that errors
    carries its reason alone, so it cannot lose the answers standing beside it. */
export type StatusResult =
  | { requestId: string; status: GenerationStatus }
  | { requestId: string; error: string }

export type PlatformClientOptions = {
  apiKey: string
  baseUrl: string
  fetch?: typeof fetch
}

export function isModelId(model: string): boolean {
  return MODEL_ID.test(model) && !model.includes("..")
}

/** The platform deduplicates a POST that carries the same `Idempotency-Key`, so a
    retried submit cannot queue a second billable run. */
export function isIdempotencyKey(key: string): boolean {
  return IDEMPOTENCY_KEY.test(key)
}

export function createPlatformClient(options: PlatformClientOptions) {
  const baseUrl = options.baseUrl.replace(/\/$/, "")
  const fetchImpl = options.fetch ?? fetch
  const auth = toAuthorizationHeader(options.apiKey)

  async function send(
    method: "GET" | "POST",
    path: string,
    options_: { body?: Record<string, unknown>; idempotencyKey?: string } = {}
  ) {
    const { body, idempotencyKey } = options_
    const url = `${baseUrl}${path}`
    // Prompts and reference URLs are the user's content; log their shape, not their values.
    console.info("[platform] request", {
      method,
      url,
      fields: body ? Object.keys(body).sort() : [],
    })
    const response = await fetchImpl(url, {
      method,
      headers: {
        Authorization: auth,
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })

    const payload = await readJson(response)
    // Signed upload URLs are credentials; do not write them to logs.
    console.info("[platform] response", {
      method,
      url,
      status: response.status,
      ...(path === UPLOAD_PATH ? {} : { body: payload }),
    })
    if (!response.ok) throw new PlatformError(response.status, payload)
    return payload
  }

  return {
    async createUpload(contentType: unknown): Promise<UploadTicket> {
      const type = requireUploadContentType(contentType)
      return parseUploadTicket(
        await send("POST", UPLOAD_PATH, { body: { content_type: type } }),
        type
      )
    },
    /** Marketing Studio's preset catalog. Presets are CMS-managed, so they are
        fetched per request instead of being pinned as an enum in the catalog. */
    async listPresets(model: string): Promise<PresetOption[]> {
      if (!isModelId(model))
        throw new PlatformError(400, { detail: "Invalid model" })
      const payload = asRecord(
        await send("GET", `/${model}/presets?size=${PRESET_PAGE_SIZE}`)
      )
      return Array.isArray(payload.items)
        ? payload.items.flatMap((item): PresetOption[] => {
            const record = asRecord(item)
            const id = record.id
            if (typeof id !== "string" || !id) return []
            return [
              {
                id,
                name: typeof record.name === "string" ? record.name : id,
              },
            ]
          })
        : []
    },
    async submit(
      model: string,
      input: Record<string, unknown>,
      idempotencyKey: string
    ): Promise<QueuedGeneration> {
      if (!isModelId(model))
        throw new PlatformError(400, { detail: "Invalid model" })
      if (!isIdempotencyKey(idempotencyKey))
        throw new PlatformError(400, { detail: "Invalid idempotency key" })
      return mapQueued(
        await send("POST", `/${model}`, {
          body: input,
          idempotencyKey,
        })
      )
    },
    async status(requestId: string): Promise<GenerationStatus> {
      if (!requestId)
        throw new PlatformError(400, { detail: "Missing request id" })
      return mapStatus(
        await send("GET", `/requests/${encodeURIComponent(requestId)}/status`)
      )
    },
    /** Queued requests only; the platform answers 202 and the status turns "canceled". */
    async cancel(requestId: string): Promise<void> {
      if (!requestId)
        throw new PlatformError(400, { detail: "Missing request id" })
      await send("POST", `/requests/${encodeURIComponent(requestId)}/cancel`, {
        body: {},
      })
    },
  }
}

function mapQueued(payload: unknown): QueuedGeneration {
  const data = asRecord(payload)
  const requestId = stringField(data, "request_id")
  if (!requestId)
    throw new PlatformError(502, {
      detail: "Platform response missing request_id",
    })
  return {
    status: stringField(data, "status") ?? "queued",
    requestId,
    statusUrl: stringField(data, "status_url") ?? "",
    cancelUrl: stringField(data, "cancel_url") ?? "",
  }
}

function mapStatus(payload: unknown): GenerationStatus {
  const data = asRecord(payload)
  const requestId = stringField(data, "request_id") ?? ""
  const images = Array.isArray(data.images)
    ? data.images.flatMap((item) => {
        const url = asRecord(item).url
        return typeof url === "string" ? [{ url }] : []
      })
    : undefined
  const videoUrl = asRecord(data.video).url

  return {
    status: stringField(data, "status") ?? "unknown",
    requestId,
    ...(images?.length ? { images } : {}),
    ...(typeof videoUrl === "string" ? { video: { url: videoUrl } } : {}),
    ...(data.error !== undefined ? { error: data.error } : {}),
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function stringField(
  value: Record<string, unknown>,
  key: string
): string | undefined {
  const field = value[key]
  return typeof field === "string" ? field : undefined
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function messageFromBody(status: number, body: unknown): string {
  const detail = asRecord(body).detail
  if (typeof detail === "string" && detail) return detail
  return `Platform request failed (${status})`
}
