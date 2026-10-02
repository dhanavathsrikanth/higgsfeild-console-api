/* eslint-disable @next/next/no-img-element */
"use client"

import type { KeyboardEvent, ReactNode } from "react"
import {
  Aperture,
  Camera,
  Clapperboard,
  Layers,
  Megaphone,
  Repeat2,
  Sparkles,
  User,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Templates — the "what you can make" examples. A `TemplateItem` seeds the
 * prompt dock (prompt text + optional model/settings) when its Try action fires.
 * `TemplateCard` and `ExamplePresets` render them; the Explore tab on Home uses
 * `ExamplePresets`.
 */

/** Concept art for each starting point, authored at the 3:4 card ratio. */
const THUMBS = {
  productStill: "/presets/product-still.svg",
  posterType: "/presets/poster-type.svg",
  campaignLifestyle: "/presets/campaign-lifestyle.svg",
  portraitStudio: "/presets/portrait-studio.svg",
  productOrbit: "/presets/product-orbit.svg",
  transitionFrame: "/presets/transition-frame.svg",
  verticalSocial: "/presets/vertical-social.svg",
  characterScene: "/presets/character-scene.svg",
} as const

export interface TemplateItem {
  id: string
  title: string
  subtitle: string
  /** Free-form filter category used by the picker tabs. */
  category: string
  kind: "image" | "video"
  images: [string, string, string]
  icon: LucideIcon
  /** What the Try action puts in the dock. */
  prompt: string
  /** Catalog model id to switch to, when the template needs a specific one. */
  modelId?: string
  settings?: Record<string, unknown>
}

// Starting points, split evenly between the image and video surfaces. Each one
// names a model from `generation/catalog` and only settings that model accepts,
// so Try always switches to a model that can run the prompt as written.
export const TEMPLATES: TemplateItem[] = [
  {
    id: "studio-product-still",
    title: "Studio product still",
    subtitle: "Lime key light on a dark set",
    category: "commercial",
    kind: "image",
    images: [
      THUMBS.productStill,
      THUMBS.posterType,
      THUMBS.productOrbit,
    ],
    icon: Camera,
    prompt:
      "Commercial still life on a charcoal seamless backdrop, matte cylinder catching a hard lime key light from the right, deep falloff, subtle haze in the air, crisp product edges.",
    modelId: "marketing-studio-image",
    settings: { aspectRatio: "auto", resolution: "2k", enhancePrompt: true },
  },
  {
    id: "product-lifestyle-shot",
    title: "Product lifestyle shot",
    subtitle: "Natural lighting for product context",
    category: "commercial",
    kind: "video",
    images: [
      THUMBS.campaignLifestyle,
      THUMBS.productStill,
      THUMBS.characterScene,
    ],
    icon: Clapperboard,
    prompt:
      ""Product shots featuring a red Rouja face-cream tube surrounded by tomatoes on green tiles. Center the product against a cream background with its label clearly readable. Use direct light, crisp shadows, and subtle grain.",
    modelId: "marketing-studio-image",
    settings: {
      aspectRatio: "16:9",
      duration: 8,
      resolution: "720p",
      generateAudio: true,
      bitrateMode: "high",
    },
  },
  {
    id: "vertical-ad-still",
    title: "Vertical ad still",
    subtitle: "Neon energy for 9:16 feeds",
    category: "social",
    kind: "image",
    images: [
      THUMBS.verticalSocial,
      THUMBS.posterType,
      THUMBS.productStill,
    ],
    icon: Megaphone,
    prompt:
      "Vertical social ad key visual, neon light streaks raking across a dark set, glossy highlights, bokeh points, clean space at the top for type.",
    modelId: "flux-2",
    settings: { aspectRatio: "9:16", resolution: "2k" },
  },
  {
    id: "creator-scene-with-audio",
    title: "Creator scene with audio",
    subtitle: "Subject, room tone and ambience",
    category: "social",
    kind: "video",
    images: [
      THUMBS.characterScene,
      THUMBS.verticalSocial,
      THUMBS.campaignLifestyle,
    ],
    icon: Sparkles,
    prompt:
      "A creator walks through volumetric haze toward camera, single lime backlight, dust drifting in the beam, room tone and distant city ambience.",
    modelId: "marketing-studio-image",
    settings: {
      aspectRatio: "9:16",
      duration: 6,
      resolution: "720p",
      generateAudio: true,
      bitrateMode: "high",
    },
  },
  {
    id: "launch-key-visual",
    title: "Launch key visual",
    subtitle: "Bold geometry, type-ready layout",
    category: "cinematic",
    kind: "image",
    images: [THUMBS.posterType, THUMBS.productStill, THUMBS.portraitStudio],
    icon: Aperture,
    prompt:
      "High-contrast launch key visual, oversized lime wedge cutting across a charcoal field, crisp geometric bands, generous negative space, poster-grade finish.",
    modelId: "ideogram-4",
    settings: { aspectRatio: "16:9", resolution: "2k" },
  },
  {
    id: "product-orbit-reveal",
    title: "Product orbit reveal",
    subtitle: "Locked-off camera, moving subject",
    category: "cinematic",
    kind: "video",
    images: [
      THUMBS.productOrbit,
      THUMBS.productStill,
      THUMBS.transitionFrame,
    ],
    icon: Layers,
    prompt:
      "Product on a dark stage rotating on its own axis while the camera stays locked, concentric lime reflections sweeping the surface, controlled specular highlights.",
    modelId: "kling-3-std",
    settings: { aspectRatio: "16:9", duration: 6, sound: false },
  },
  {
    id: "editorial-portrait",
    title: "Editorial portrait",
    subtitle: "Rim-lit, shallow falloff",
    category: "portrait",
    kind: "image",
    images: [
      THUMBS.portraitStudio,
      THUMBS.productStill,
      THUMBS.posterType,
    ],
    icon: User,
    prompt:
      "Editorial portrait, single lime rim light separating the subject from a black background, soft fill, 85mm compression, visible skin texture.",
    modelId: "soul-2",
    settings: { aspectRatio: "3:4", resolution: "1080p" },
  },
  {
    id: "first-last-transition",
    title: "First-to-last transition",
    subtitle: "One clip, two states",
    category: "portrait",
    kind: "video",
    images: [
      THUMBS.transitionFrame,
      THUMBS.portraitStudio,
      THUMBS.productOrbit,
    ],
    icon: Repeat2,
    prompt:
      "A single subject holds a pose as the light and framing morph from a dark studio state into a bright lime-lit state, smooth motivated transition, no cuts.",
    modelId: "kling-3-pro",
    settings: { aspectRatio: "9:16", duration: 5, sound: false },
  },
]

function gradientFromSeed(seed: string): string {
  let hash = 0
  for (const c of seed) hash = (hash * 31 + c.charCodeAt(0)) >>> 0
  const start = hash % 360
  const end = (start + 36 + ((hash >>> 8) % 72)) % 360
  return `linear-gradient(135deg, hsl(${start} 62% 52%) 0%, hsl(${end} 76% 27%) 100%)`
}

function GradientBadge({ as: Glyph, seed }: { as: LucideIcon; seed: string }) {
  return (
    <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-white/25 text-white shadow-[0_5px_3px_rgba(0,0,0,0.08),inset_0_3px_5px_rgba(255,255,255,0.24)]">
      <span
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundImage: gradientFromSeed(seed) }}
      />
      <span
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20 mix-blend-overlay"
      />
      <Glyph className="relative size-5" />
    </span>
  )
}

const TRIPTYCH = [
  "rounded-l-2xl rounded-r-sm",
  "rounded-sm",
  "rounded-r-2xl rounded-l-sm",
] as const

export interface TemplateCardProps {
  template: TemplateItem
  variant?: "single" | "triptych"
  onTry: (template: TemplateItem) => void
  tryLabel?: ReactNode
}

export function TemplateCard({
  template,
  variant = "single",
  onTry,
  tryLabel = "Try",
}: TemplateCardProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.currentTarget !== event.target) return
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onTry(template)
    }
  }
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Use template: ${template.title}`}
      className="relative flex cursor-pointer flex-col gap-2 rounded-[20px] bg-white/5 p-2 shadow-[0_2px_6px_rgba(0,0,0,0.15)] transition-[transform,background-color] duration-200 hover:z-[1] hover:-translate-y-0.5 hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:hover:translate-y-0"
      onClick={() => onTry(template)}
      onKeyDown={onKeyDown}
    >
      <div className="flex h-60 items-stretch gap-1.5">
        {variant === "triptych" ? (
          template.images.map((src, i) => (
            <div
              key={i}
              className={cn(
                "min-w-0 flex-1 overflow-hidden border border-white/10",
                TRIPTYCH[i]
              )}
            >
              <img
                src={src}
                alt={`${template.title} — shot ${i + 1}`}
                className="size-full object-cover"
              />
            </div>
          ))
        ) : (
          <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/10">
            <img
              src={template.images[0]}
              alt={template.title}
              className="size-full object-cover"
            />
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 px-2 py-1">
        <GradientBadge as={template.icon} seed={template.id} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-medium text-foreground">
            {template.title}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {template.subtitle}
          </span>
        </div>
        <Button
          size="sm"
          className="rounded-full font-semibold"
          onClick={(event) => {
            event.stopPropagation()
            onTry(template)
          }}
        >
          {tryLabel}
        </Button>
      </div>
    </div>
  )
}

export interface ExamplePresetsProps {
  items: TemplateItem[]
  onUse: (template: TemplateItem) => void
  tryLabel?: ReactNode
  className?: string
}

/** The Explore grid: two columns of `TemplateCard`s. */
export function ExamplePresets({
  items,
  onUse,
  tryLabel = "Try",
  className = "w-full max-w-[900px]",
}: ExamplePresetsProps) {
  return (
    <div
      className={cn("grid w-full grid-cols-1 gap-5 sm:grid-cols-2", className)}
    >
      {items.map((t) => (
        <TemplateCard
          key={t.id}
          template={t}
          onTry={onUse}
          tryLabel={tryLabel}
        />
      ))}
    </div>
  )
}




