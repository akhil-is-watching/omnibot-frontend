import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import type { HandoffCategory, Integration } from "@/lib/types"
import { updateHandoffConfig } from "@/lib/api"
import {
  buildHandoffConfigInput,
  validateHandoffConfig,
} from "@/lib/handoff"
import { HandoffConfigFields } from "@/components/bots/handoff-config-fields"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ErrorMessage } from "@/components/shared"

function stateFromIntegration(integration: Integration) {
  const config = integration.handoffConfig
  return {
    enabled: config?.enabled ?? false,
    categories: config?.categories ?? ([] as HandoffCategory[]),
    notifyInstructions: config?.notifyInstructions ?? "",
    handoffMessage: config?.handoffMessage ?? "",
  }
}

export function HandoffConfigDialog({
  botId,
  integration,
  open,
  onOpenChange,
}: {
  botId: string
  integration: Integration
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [enabled, setEnabled] = useState(false)
  const [categories, setCategories] = useState<HandoffCategory[]>([])
  const [notifyInstructions, setNotifyInstructions] = useState("")
  const [handoffMessage, setHandoffMessage] = useState("")
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const next = stateFromIntegration(integration)
    setEnabled(next.enabled)
    setCategories(next.categories)
    setNotifyInstructions(next.notifyInstructions)
    setHandoffMessage(next.handoffMessage)
    setValidationError(null)
  }, [open, integration])

  const save = useMutation({
    mutationFn: () =>
      updateHandoffConfig(
        botId,
        integration._id,
        buildHandoffConfigInput({
          enabled,
          categories,
          notifyInstructions,
          handoffMessage,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", botId] })
      toast.success("Handoff settings saved")
      onOpenChange(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function toggleCategory(category: HandoffCategory, checked: boolean) {
    setCategories((prev) =>
      checked ? [...prev, category] : prev.filter((c) => c !== category),
    )
    setValidationError(null)
  }

  function handleSave() {
    const error = validateHandoffConfig({
      enabled,
      categories,
      notifyInstructions,
    })
    if (error) {
      setValidationError(error)
      return
    }
    setValidationError(null)
    save.mutate()
  }

  const saveDisabled =
    save.isPending ||
    !!validateHandoffConfig({ enabled, categories, notifyInstructions })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Handoff settings</DialogTitle>
          <DialogDescription>
            Configure escalation for{" "}
            <span className="capitalize">{integration.platform}</span> (
            {integration.platformUsername ?? integration._id}). When triggered,
            the end user sees your handoff message and an agent is notified via
            DM on the same platform.
          </DialogDescription>
        </DialogHeader>

        <HandoffConfigFields
          enabled={enabled}
          onEnabledChange={(next) => {
            setEnabled(next)
            setValidationError(null)
          }}
          categories={categories}
          onToggleCategory={toggleCategory}
          notifyInstructions={notifyInstructions}
          onNotifyInstructionsChange={(value) => {
            setNotifyInstructions(value)
            setValidationError(null)
          }}
          handoffMessage={handoffMessage}
          onHandoffMessageChange={setHandoffMessage}
          validationError={validationError}
        />

        {save.error && <ErrorMessage message={(save.error as Error).message} />}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveDisabled}>
            {save.isPending ? "Saving…" : "Save handoff"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
