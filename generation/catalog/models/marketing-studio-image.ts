import { urls } from "../mappers"
import type { GenerationPlane, ModelEntry, PlatformRequest } from "../types"

const PATH = "marketing-studio/image"

const ASPECT = [
  "auto",
  "1:1",
  "3:2",
  "2:3",
  "4:3",
  "3:4",
  "16:9",
  "9:16",
  "21:9",
] as const

const RESOLUTION = ["1k", "2k", "4k"] as const
const QUALITY = ["low", "medium", "high"] as const
const MODERATION = ["auto", "low"] as const

/** Preset mode is documented to accept at most two images: the product shot
    plus one optional model reference. Direct editing takes the full sixteen. */
const PRESET_MODE_REFS = 2

/**
 * Marketing Studio Image — text-to-image and image editing at 1K–4K, with an
 * optional preset pass that styles a product photo with a Marketing Studio
 * preset. Presets are owned by the live CMS, so `presetId` is a `preset` setting
 * the settings dialog fills from the platform instead of a hardcoded enum.
 */
const model: ModelEntry = {
  id: "marketing-studio-image",
  surface: "image",
  label: "Marketing Studio Image",
  roles: { reference: 16 },
  requirePrompt: true,
  settings: {
    aspectRatio: { type: "enum", values: ASPECT, default: "auto" },
    resolution: { type: "enum", values: RESOLUTION, default: "2k" },
    quality: {
      type: "enum",
      values: QUALITY,
      default: "high",
      hint: "Preset mode always renders at high quality.",
    },
    moderation: { type: "enum", values: MODERATION, default: "auto" },
    enhancePrompt: {
      type: "boolean",
      default: false,
      hint: "Applies a Marketing Studio preset to a product photo, with an optional model reference as the second image. Preset mode costs 10% more than direct generation and accepts 1 to 2 images.",
    },
    presetId: {
      type: "preset",
      default: "",
      source: `${PATH}/presets`,
      label: "Preset",
      showWhen: "enhancePrompt",
      hint: "Loaded from your account's visible Marketing Studio presets.",
    },
  },
  toPlatform: mapMarketingStudioImage,
  icon: "higgsfield",
  order: -2,
  tag: "New",
}

/** The platform rejects prompts past this; check it here so the dock can show
    the reason instead of a raw 400. */
const PROMPT_MAX = 5000

function mapMarketingStudioImage(plane: GenerationPlane): PlatformRequest {
  if (plane.prompt.text.length > PROMPT_MAX)
    throw new Error(
      `Prompt is ${plane.prompt.text.length} characters — Marketing Studio Image accepts up to ${PROMPT_MAX}.`
    )
  const refs = urls(plane, "reference")
  const base = {
    prompt: plane.prompt.text,
    aspect_ratio: plane.settings.aspectRatio,
    resolution: plane.settings.resolution,
    moderation: plane.settings.moderation,
  }

  if (plane.settings.enhancePrompt !== true) {
    return {
      path: PATH,
      body: {
        ...base,
        quality: plane.settings.quality,
        enhance_prompt: false,
        ...(refs.length ? { image_urls: refs } : {}),
      },
    }
  }

  if (!refs.length)
    throw new Error("Preset mode needs a product image before it can style it.")
  if (refs.length > PRESET_MODE_REFS)
    throw new Error(
      "Preset mode takes one product image plus an optional model reference. Remove the extra images."
    )
  const presetId = plane.settings.presetId
  if (typeof presetId !== "string" || !presetId)
    throw new Error("Choose a Marketing Studio preset.")

  return {
    path: PATH,
    body: {
      ...base,
      image_urls: refs,
      preset_id: presetId,
      quality: "high",
      enhance_prompt: true,
    },
  }
}

export default model
