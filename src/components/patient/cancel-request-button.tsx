"use client";

import { toast } from "sonner";
import { cancelPharmacyRequestAction } from "@/server/actions/patient";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";

export function CancelRequestButton({ id }: { id: string }) {
  return (
    <ConfirmDialog
      tone="danger"
      title="Cancelar solicitação?"
      description="A farmácia será informada do cancelamento."
      confirmLabel="Cancelar solicitação"
      cancelLabel="Manter"
      onConfirm={async () => {
        const r = await cancelPharmacyRequestAction(id);
        if (r.ok) toast.success(r.message);
        else toast.error(r.error);
      }}
      trigger={<Button variant="ghost" size="sm" className="text-danger-foreground">Cancelar</Button>}
    />
  );
}
