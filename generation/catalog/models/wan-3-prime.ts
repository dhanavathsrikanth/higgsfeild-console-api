import type { GenerationPlane, ModelEntry, PlatformRequest } from "../types"

const PREFIX = "alibaba/wan-3.0-prime"

const ASPECT = ["16:9", "4:3", "1:1", "3:4", "9:16", "adaptive"] as const
const RESOLUTION = ["480p", "720p", "1080p"] as const

/**
 * Wan 3.0 Prime — text-to-video with clips up to 30 seconds, native audio, and
 * optional deep thinking.
 */
const model: ModelEntry = {
  id: "wan-3-prime",
  surface: "video",
  label: "Wan 3.0 Prime",
  roles: {},
  requirePrompt: true,
  settings: {
    aspectRatio: { type: "enum", values: ASPECT, default: "adaptive" },
    resolution: { type: "enum", values: RESOLUTION, default: "1080p" },
    duration: { type: "range", min: 2, max: 30, default: 5 },
    generateAudio: { type: "boolean", default: true },
    enableThinking: {
      type: "boolean",
      default: false,
      hint: "Deep thinking reasons about the prompt before rendering, which takes longer.",
    },
  },
  toPlatform: mapWanPrime,
  icon: "wan",
  order: -1,
  tag: "New",
}

function mapWanPrime(plane: GenerationPlane): PlatformRequest {
  return {
    path: `${PREFIX}/text-to-video`,
    body: {
      prompt: plane.prompt.text,
      aspect_ratio: plane.settings.aspectRatio,
      resolution: plane.settings.resolution,
      duration: plane.settings.duration,
      generate_audio: plane.settings.generateAudio,
      enable_thinking: plane.settings.enableThinking,
    },
  }
}

export default model