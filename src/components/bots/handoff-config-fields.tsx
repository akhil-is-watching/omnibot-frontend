import type { HandoffCategory } from "@/lib/types"
import {
  DEFAULT_HANDOFF_MESSAGE,
  HANDOFF_CATEGORY_OPTIONS,
} from "@/lib/handoff"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function HandoffConfigFields({
  enabled,
  onEnabledChange,
  categories,
  onToggleCategory,
  notifyInstructions,
  onNotifyInstructionsChange,
  handoffMessage,
  onHandoffMessageChange,
  validationError,
}: {
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  categories: HandoffCategory[]
  onToggleCategory: (category: HandoffCategory, checked: boolean) => void
  notifyInstructions: string
  onNotifyInstructionsChange: (value: string) => void
  handoffMessage: string
  onHandoffMessageChange: (value: string) => void
  validationError?: string | null
}) {
  return (
    <div className="space-y-4 rounded-lg border border-dashed p-3">
      <div className="flex items-start gap-2">
        <Checkbox
          id="handoff-enabled"
          checked={enabled}
          onCheckedChange={(checked) => onEnabledChange(checked === true)}
        />
        <div className="space-y-1">
          <Label htmlFor="handoff-enabled" className="font-medium">
            Enable bot-to-agent handoff
          </Label>
          <p className="text-xs text-muted-foreground">
            Escalate live conversations to a human on the same platform (Telegram
            or Discord DM). Takes effect on the live pipeline after save.
          </p>
        </div>
      </div>

      {enabled && (
        <>
          <div className="space-y-2">
            <Label>Categories</Label>
            <div className="flex flex-wrap gap-3">
              {HANDOFF_CATEGORY_OPTIONS.map(({ value, label }) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={categories.includes(value)}
                    onCheckedChange={(checked) =>
                      onToggleCategory(value, checked === true)
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="handoff-notify">Notify instructions</Label>
            <Textarea
              id="handoff-notify"
              value={notifyInstructions}
              onChange={(e) => onNotifyInstructionsChange(e.target.value)}
              placeholder="Notify 123456789 for partnerships and support; 987654321 for investments"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Include platform user IDs (Telegram / Discord snowflakes) and which
              categories each person handles.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="handoff-message">Message to user (optional)</Label>
            <Textarea
              id="handoff-message"
              value={handoffMessage}
              onChange={(e) => onHandoffMessageChange(e.target.value)}
              placeholder={DEFAULT_HANDOFF_MESSAGE}
              rows={2}
            />
          </div>
        </>
      )}

      {validationError && (
        <p className="text-xs text-destructive">{validationError}</p>
      )}
    </div>
  )
}
