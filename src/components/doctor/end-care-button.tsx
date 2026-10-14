"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserMinus } from "lucide-react";
import { revokeCareAction } from "@/server/actions/care";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";

export function EndCareButton({ patientId }: { patientId: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      tone="danger"
      title="Encerrar acompanhamento?"
      description="Você deixará de acessar os dados deste paciente. Receitas já emitidas permanecem válidas."
      confirmLabel="Encerrar"
      onConfirm={async () => {
        const r = await revokeCareAction(patientId);
        if (r.ok) {
          toast.success(r.message);
          router.push("/medico/pacientes");
        } else toast.error(r.error);
      }}
      trigger={<Button variant="ghost" size="sm" className="text-danger-foreground"><UserMinus /> Encerrar acompanhamento</Button>}
    />
  );
}
