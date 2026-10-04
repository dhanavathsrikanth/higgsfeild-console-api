import { urls } from "../mappers"
import type { GenerationPlane, ModelEntry, PlatformRequest } from "../types"

const PATH = "higgsfield/cinema-studio/4.0"

const ERA = ["1960s", "1980s", "1990s", "2000s", "2020s"] as const
const GENRE = ["epic", "drama", "noir", "comedy", "horror", "action"] as const
const LIGHT = [
  "silhouette",
  "practicals",
  "window",
  "overhead-fall",
  "contre-jour",
  "soft-cross",
] as const
const PACING = ["chaotic", "dynamic", "calm", "single-shot"] as const

const ASPECT = ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"] as const
const RESOLUTION = ["480p", "720p"] as const

const CAMERA_LENS = [
  "clean-sharp",
  "anamorphic",
  "vintage-anamorphic",
  "warm-vintage",
  "halation-vintage",
] as const
const CAMERA_MODEL = ["modern", "35mm-film", "8mm-film", "dv-camcorder"] as const
const CAMERA_APERTURE = ["f14-wide-open", "f4-moderate", "f11-deep-focus"] as const
const CAMERA_MOVEMENT = [
  "snorricam",
  "robot-arm",
  "tilt-up",
  "rack-focus",
  "tilt-down",
  "pov",
  "pan-left",
  "crane-up",
  "pan-right",
  "crane-down",
  "side-tracking",
  "pedestal-up",
  "pedestal-down",
  "handheld",
  "tracking",
  "drone-orbit",
  "dolly-zoom",
  "aerial-pullback",
  "static-shot",
  "bullet-time",
  "whip-pan",
  "slow-zoom-in",
  "arc-left",
  "slow-zoom-out",
  "arc-right",
  "truck-right",
  "dolly-in",
  "truck-left",
  "dolly-out",
  "slider-right",
  "crush-zoom",
  "slider-left",
  "helicopter-shot",
] as const

const COLOR_PALETTE = [
  "static-noon",
  "twilight-fable",
  "back-row-kissing-seats",
  "on-the-other-side-of-the-porthole",
  "the-emerald-ambush",
  "highway-standoff",
  "the-faded-fresco",
  "oil-ochre",
  "the-mountain-convent",
  "ghost-in-the-code",
  "pink-velvet",
  "two-days-to-the-horizon",
  "industrial-fog",
  "stairs-go-up",
  "field-post",
  "home-is-the-next-gas-station",
  "glossy-flesh",
  "the-crimson-ballet",
  "neon-rain-at-midnight",
  "the-morning-after-rain",
  "the-iron-borough",
  "the-ground",
  "the-investigation",
  "turquoise-mirage",
  "a-dream-in-color",
  "breakfast-on-schedule",
  "favela-gold",
  "a-hotel-for-one",
  "after-dark",
  "crimson-vigi",
  "the-neighbors-saw-everything",
  "the-grey-channel",
  "mirage-at-noon",
  "bubblegum-boulevard",
  "yellow-room",
  "the-earth-keeps-things-reluctantly",
  "tropic-fever-dream",
  "bioluminescent-night",
  "dont-turn-it-off-im-watching",
  "the-silk-curtain-falls",
  "the-butterfly",
  "playtime",
  "wallpaper-romance",
  "overtime",
  "the-way-home-is-longer",
  "everyone-speaks-in-whispers",
  "runaway-summer",
  "amber-wasteland",
  "the-circus",
  "gasoline-sunset",
] as const

const MAX_IMAGES = 30
const MAX_VIDEOS = 10
const MAX_AUDIOS = 10

/**
 * The platform's direction values are kebab-case slugs (and the palettes are
 * full film titles), which are unreadable as picker labels. Title-case them for
 * display; the request body still sends the raw value.
 */
function labels(values: readonly string[]): Record<string, string> {
  return Object.fromEntries(
    values.map((value) => [
      value,
      value
        .split("-")
        .map((part) =>
          /^\d/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)
        )
        .join(" "),
    ])
  )
}

/** Readable labels for an optional direction setting. */
function direction(values: readonly string[]) {
  return {
    type: "optional-enum",
    values,
    unsetLabel: "Auto",
    optionLabels: labels(values),
  } as const
}

/**
 * Scene-direction settings the platform leaves to its own taste. Each one is
 * catalog key -> request key; unset entries are omitted from the body entirely.
 */
const DIRECTION: readonly (readonly [string, string])[] = [
  ["era", "era"],
  ["genre", "genre"],
  ["light", "light"],
  ["pacing", "pacing"],
  ["cameraLens", "camera_lens"],
  ["cameraModel", "camera_model"],
  ["cameraAperture", "camera_aperture"],
  ["cameraMovement", "camera_movement"],
  ["colorPalette", "color_palette"],
]

/**
 * Cinema Studio 4.0 — one endpoint for text, image, and video references with
 * automatic scene direction. Direction settings are optional on the platform,
 * so they are `optional-enum` and only sent once chosen.
 */
const model: ModelEntry = {
  id: "cinema-studio-4",
  surface: "video",
  label: "Cinema Studio 4.0",
  roles: { reference: MAX_IMAGES, video: MAX_VIDEOS, audio: MAX_AUDIOS },
  requirePrompt: true,
  settings: {
    era: direction(ERA),
    genre: direction(GENRE),
    light: direction(LIGHT),
    pacing: direction(PACING),
    cameraLens: direction(CAMERA_LENS),
    cameraModel: direction(CAMERA_MODEL),
    cameraAperture: direction(CAMERA_APERTURE),
    cameraMovement: direction(CAMERA_MOVEMENT),
    colorPalette: direction(COLOR_PALETTE),
    aspectRatio: { type: "enum", values: ASPECT, default: "16:9" },
    resolution: { type: "enum", values: RESOLUTION, default: "720p" },
    duration: { type: "range", min: 4, max: 30, default: 5 },
    generateAudio: {
      type: "boolean",
      default: true,
      hint: "Video references count toward the billable duration.",
    },
  },
  toPlatform: mapCinemaStudio,
  icon: "higgsfield",
  order: 5,
  tag: "New",
}

function mapCinemaStudio(plane: GenerationPlane): PlatformRequest {
  const body: Record<string, unknown> = {
    prompt: plane.prompt.text,
    duration: plane.settings.duration,
    resolution: plane.settings.resolution,
    aspect_ratio: plane.settings.aspectRatio,
    generate_audio: plane.settings.generateAudio,
  }
  for (const [key, requestKey] of DIRECTION) {
    const value = plane.settings[key]
    if (typeof value === "string" && value) body[requestKey] = value
  }
  const refs = urls(plane, "reference")
  const videos = urls(plane, "video")
  const audios = urls(plane, "audio")
  if (refs.length) body.image_urls = refs
  if (videos.length) body.video_urls = videos
  if (audios.length) body.audio_urls = audios
  return { path: PATH, body }
}

export default model