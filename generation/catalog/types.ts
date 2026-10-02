export type Surface = "image" | "video"
export type MediaKind = "image" | "video" | "audio"
export type MediaRole =
  "start" | "end" | "reference" | "video" | "audio" | "source"

export type MediaItem = {
  id: string
  url: string
  role: MediaRole
  kind?: MediaKind
  name?: string
}

export type MediaMode = {
  id: string
  label: string
  roles: Partial<Record<MediaRole, number>>
  requireAny?: boolean
}

export type SettingField =
  | {
      type: "enum"
      values: readonly string[]
      default: string
      hint?: string
    }
  | {
      type: "range"
      min: number
      max: number
      default: number
      step?: number
      hint?: string
    }
  | { type: "boolean"; default: boolean; hint?: string }
  | {
      type: "preset"
      /** Empty means unset; ids are UUIDs from the platform's live catalog. */
      default: string
      /** GET path under the platform origin that lists this field's options. */
      source: string
      label: string
      /** Only offer the field while this other setting is truthy. */
      showWhen?: string
      hint?: string
    }

export type PlatformPaths = {
  text?: string
  image?: string
  firstLast?: string
  reference?: string
}

/** Platform request: model path (appended to HF_API_BASE_URL) and JSON body. */
export type PlatformRequest = { path: string; body: Record<string, unknown> }

export type ModelEntry = {
  id: string
  surface: Surface
  label: string
  roles: Partial<Record<MediaRole, number>>
  mediaModes?: MediaMode[]
  requiredRoles?: MediaRole[]
  requirePrompt?: boolean
  settings: Record<string, SettingField>
  /** Submit paths when the shared mapper is enough. Soul, Kling 3, and Seedance keep custom maps. */
  paths?: PlatformPaths
  /** Custom mapper; wins over `paths`. */
  toPlatform?: (plane: GenerationPlane) => PlatformRequest
  /** Brand file name in /public/model-icons (without .svg). */
  icon?: string
  /** Picker order, lower first. Unset sorts last. */
  order?: number
  /** Short badge shown beside the model in its picker (e.g. "New"). */
  tag?: string
}

export type GenerationPlane = {
  model: string
  inputMode?: string
  prompt: { text: string }
  media: Partial<Record<MediaRole, MediaItem[]>>
  settings: Record<string, unknown>
}
