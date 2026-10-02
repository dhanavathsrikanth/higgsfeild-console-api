"use server"

import { cookies } from "next/headers"

import { getModel, parseSettings } from "./catalog"
import type { GenerationPlane } from "./catalog/types"
import {
  MissingCredentialsError,
  PLATFORM_KEY_COOKIE,
  PLATFORM_KEY_COOKIE_OPTIONS,
  decodeCredentials,
  encodeCredentials,
  parseCredentialInput,
} from "./credentials"
import { createPlatformClient, isIdempotencyKey, isModelId } from "./platform"
import type { PresetOption, StatusResult } from "./platform"
import { toPlatform } from "./to-platform"

export async function savePlatformCredentials(data: unknown) {
  const { apiKey } = parseCredentialInput(data)
  const jar = await cookies()
  jar.set(
    PLATFORM_KEY_COOKIE,
    encodeCredentials(apiKey),
    PLATFORM_KEY_COOKIE_OPTIONS
  )
}

export async function clearPlatformCredentials() {
  const jar = await cookies()
  jar.set(PLATFORM_KEY_COOKIE, "", {
    ...PLATFORM_KEY_COOKIE_OPTIONS,
    maxAge: 0,
  })
}

export async function hasPlatformCredentials() {
  return (await readStoredCredentials()) !== null
}

/** Every submit carries a caller-generated idempotency key, so a retry of the
    same request — a double click, a reconnecting action, a manual replay — is
    deduplicated by the platform instead of queueing a second generation. */
export async function submitGeneration(
  plane: GenerationPlane,
  idempotencyKey: unknown
) {
  const key = parseIdempotencyKey(idempotencyKey)
  const model = getModel(plane.model)
  const parsed: GenerationPlane = {
    ...plane,
    settings: parseSettings(model, plane.settings),
  }
  const { path, body } = toPlatform(parsed)
  return createPlatformClient(await readCredentials()).submit(path, body, key)
}

/** Every request in flight, answered in one round trip. Next dispatches server
    actions one at a time per client, so a poll per run would queue ahead of the
    next submit — the fan-out belongs on this side of the call, where it is
    genuinely parallel. */
export async function getGenerationStatuses(
  data: unknown
): Promise<StatusResult[]> {
  const requestIds = parseRequestIds(data)
  const client = createPlatformClient(await readCredentials())
  return Promise.all(
    requestIds.map(async (requestId): Promise<StatusResult> => {
      try {
        return { requestId, status: await client.status(requestId) }
      } catch (caught) {
        return {
          requestId,
          error: caught instanceof Error ? caught.message : String(caught),
        }
      }
    })
  )
}

/** Preset-backed models keep their catalog on the platform. This reads it with the
    saved key so the dialog offers the account's currently visible presets. */
export async function listModelPresets(data: unknown): Promise<PresetOption[]> {
  const model = asObject(data, "Invalid preset request").model
  if (typeof model !== "string" || !isModelId(model))
    throw new Error("Invalid preset model")
  return createPlatformClient(await readCredentials()).listPresets(model)
}

export async function cancelGeneration(data: unknown) {
  const [requestId] = parseRequestIds(data)
  await createPlatformClient(await readCredentials()).cancel(requestId!)
}

async function readStoredCredentials() {
  const jar = await cookies()
  return decodeCredentials(jar.get(PLATFORM_KEY_COOKIE)?.value)
}

async function readCredentials() {
  const stored = await readStoredCredentials()
  if (!stored) throw new MissingCredentialsError()
  const baseUrl = process.env.HF_API_BASE_URL
  if (!baseUrl) throw new Error("Missing HF_API_BASE_URL")
  return { ...stored, baseUrl }
}

function parseIdempotencyKey(data: unknown): string {
  if (typeof data !== "string" || !isIdempotencyKey(data)) {
    throw new Error("Invalid idempotency key")
  }
  return data
}

function parseRequestIds(data: unknown): string[] {
  const payload = asObject(data, "Invalid status payload")
  const requestIds = payload.requestIds
  if (!Array.isArray(requestIds) || requestIds.length === 0) {
    throw new Error("Invalid request ids")
  }
  return requestIds.map((requestId) => {
    if (typeof requestId !== "string" || !requestId)
      throw new Error("Invalid request id")
    return requestId
  })
}

function asObject(data: unknown, message: string): Record<string, unknown> {
  if (data === null || typeof data !== "object" || Array.isArray(data))
    throw new Error(message)
  return data as Record<string, unknown>
}
