"use client"

import { useEffect, useState } from "react"
import type { ReactElement } from "react"

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { listModelPresets } from "@/generation/actions"
import type { PresetOption } from "@/generation/platform"
import type { ModelEntry, SettingField } from "@/generation/catalog/types"
import { cn } from "@/lib/utils"

/** Every setting the active model declares, rendered from the catalog. */
export interface SettingsDialogProps {
  trigger: ReactElement
  model: ModelEntry
  values: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

export function SettingsDialog({
  trigger,
  model,
  values,
  onChange,
}: SettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const entries = Object.entries(model.settings).filter(([, field]) =>
    isFieldVisible(field, values)
  )
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{model.label} settings</DialogTitle>
          <DialogDescription>Applied to the next generation.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {entries.length === 0 ? (
            <p className="text-q-body-sm-regular text-q-text-secondary">
              This model has no settings.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {entries.map(([key, field]) =>
                field.type === "preset" ? (
                  <PresetRow
                    key={key}
                    name={key}
                    field={field}
                    value={values[key]}
                    onChange={(v) => onChange(key, v)}
                  />
                ) : (
                  <SettingRow
                    key={key}
                    name={key}
                    field={field}
                    value={values[key]}
                    onChange={(v) => onChange(key, v)}
                  />
                ),
              )}
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

export function settingLabel(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase())
}

function SettingRow({
  name,
  field,
  value,
  onChange,
}: {
  name: string
  field: SettingField
  value: unknown
  onChange: (v: unknown) => void
}) {
  const label = settingLabel(name)
  const hint = field.hint ? (
    <p className="text-q-caption-sm-regular text-q-text-tertiary">
      {field.hint}
    </p>
  ) : null

  if (field.type === "enum") {
    const current = typeof value === "string" ? value : field.default
    return (
      <div className="flex flex-col gap-1">
        <label className="flex min-h-11 items-center justify-between gap-4 px-1 text-q-body-sm-medium">
          <span>{label}</span>
          <Select value={current} onValueChange={(v) => onChange(v)}>
            <SelectTrigger size="sm" className="w-auto min-w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent variant="picker" surface="solid" align="end">
              {field.values.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        {hint}
      </div>
    )
  }
  if (field.type === "range") {
    const current = typeof value === "number" ? value : field.default
    return (
      <div className="flex flex-col gap-2 px-1 py-2 text-q-body-sm-medium">
        <div className="flex items-center justify-between">
          <span>{label}</span>
          <span className="text-q-caption-sm-regular text-q-text-secondary tabular-nums">
            {current}
          </span>
        </div>
        <Slider
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          value={[current]}
          onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
        />
        {hint}
      </div>
    )
  }
  if (field.type === "preset") return null
  const current = typeof value === "boolean" ? value : field.default
  return (
    <div className="flex flex-col gap-1">
      <div className="flex min-h-11 items-center justify-between gap-4 px-1 text-q-body-sm-medium">
        <span>{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={current}
          onClick={() => onChange(!current)}
          className={cn(
            "relative h-6 w-10 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            current ? "bg-q-brand-primary" : "bg-q-transparent-light-15"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 size-5 rounded-full bg-background transition-transform",
              current ? "translate-x-4" : "translate-x-0"
            )}
          />
        </button>
      </div>
      {hint}
    </div>
  )
}

function PresetRow({
  name,
  field,
  value,
  onChange,
}: {
  name: string
  field: Extract<SettingField, { type: "preset" }>
  value: unknown
  onChange: (v: unknown) => void
}) {
  const model = field.source.replace(/\/presets$/, "")
  // Keyed by model so switching models re-reads instead of reusing the last list.
  const [loaded, setLoaded] = useState<{
    model: string
    options: PresetOption[]
  } | null>(null)
  const [failure, setFailure] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    listModelPresets({ model }).then(
      (options) => {
        if (live) setLoaded({ model, options })
      },
      () => {
        if (live) setFailure(model)
      }
    )
    return () => {
      live = false
    }
  }, [model])

  const options = loaded?.model === model ? loaded.options : []
  const loading = loaded?.model !== model && failure !== model
  const current = typeof value === "string" ? value : field.default
  const label = field.label || settingLabel(name)
  return (
    <div className="flex flex-col gap-1 px-1 py-2 text-q-body-sm-medium">
      <div className="flex min-h-11 items-center justify-between gap-4">
        <span>{label}</span>
        <Select
          value={current}
          onValueChange={(v) => onChange(v == null ? "" : String(v))}
        >
          <SelectTrigger size="sm" className="w-auto min-w-40">
            <SelectValue
              placeholder={loading ? "Loading presets…" : "Select preset"}
            />
          </SelectTrigger>
          <SelectContent variant="picker" surface="solid" align="end">
            {options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {failure === model ? (
        <p className="text-q-caption-sm-regular text-q-text-tertiary">
          Presets could not be loaded. Check your API key and try again.
        </p>
      ) : null}
      {!loading && failure !== model && options.length === 0 ? (
        <p className="text-q-caption-sm-regular text-q-text-tertiary">
          No presets are visible for this account.
        </p>
      ) : null}
      {field.hint ? (
        <p className="text-q-caption-sm-regular text-q-text-tertiary">
          {field.hint}
        </p>
      ) : null}
    </div>
  )
}

/** A `preset` field only appears while the setting it depends on is on. */
function isFieldVisible(
  field: SettingField,
  values: Record<string, unknown>
): boolean {
  if (field.type !== "preset" || !field.showWhen) return true
  return values[field.showWhen] === true
}
