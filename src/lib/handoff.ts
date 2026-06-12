import type { HandoffCategory, HandoffConfigInput } from "@/lib/types"

export const DEFAULT_HANDOFF_MESSAGE =
  "A member of our team has been notified and will reply to you shortly."

export const HANDOFF_CATEGORY_OPTIONS: {
  value: HandoffCategory
  label: string
}[] = [
  { value: "partnerships", label: "Partnerships" },
  { value: "investments", label: "Investments" },
  { value: "support", label: "Support" },
]

export function handoffCategoryLabel(category: HandoffCategory): string {
  return (
    HANDOFF_CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? category
  )
}

export function validateHandoffConfig(input: {
  enabled: boolean
  categories: HandoffCategory[]
  notifyInstructions: string
}): string | null {
  if (!input.enabled) return null
  if (input.categories.length === 0) {
    return "Select at least one handoff category."
  }
  if (!input.notifyInstructions.trim()) {
    return "Notify instructions are required when handoff is enabled."
  }
  return null
}

export function buildHandoffConfigInput(input: {
  enabled: boolean
  categories: HandoffCategory[]
  notifyInstructions: string
  handoffMessage?: string
}): HandoffConfigInput {
  const message = input.handoffMessage?.trim()
  if (!input.enabled) {
    return message ? { enabled: false, handoffMessage: message } : { enabled: false }
  }
  return {
    enabled: true,
    categories: input.categories,
    notifyInstructions: input.notifyInstructions.trim(),
    ...(message ? { handoffMessage: message } : {}),
  }
}
