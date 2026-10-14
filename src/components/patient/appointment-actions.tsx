"use client";

import * as React from "react";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import { availableSlotsAction, patientCancelAppointmentAction, rescheduleAppointmentAction } from "@/server/actions/appointments";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SlotPicker, type Slot } from "./slot-picker";
import { todayISO } from "@/lib/format";

export function AppointmentActions({ id, doctorId, modality, role = "patient" }: { id: string; doctorId: string; modality: "in_person" | "telehealth"; role?: "patient" | "doctor" }) {
  const [open, setOpen] = React.useState(false);
  const [slots, setSlots] = React.useState<Slot[] | null>(null);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let active = true;
    void availableSlotsAction(doctorId, todayISO(), 21).then((s) => active && setSlots((s as Slot[]).filter((x) => x.modality === modality)));
    return () => {
      active = false;
    };
  }, [open, doctorId, modality]);

  return (
    <div className="flex flex-wrap gap-2">
      <Dialog open={open} onOpenChange={(v) => { if (v) setSlots(null); setOpen(v); }}>
        <DialogTrigger asChild>
          <Button variant="secondary" size="sm"><CalendarClock /> Remarcar</Button>
        </DialogTrigger>
        <DialogContent size="lg" title="Remarcar consulta" description="Escolha um novo horário disponível.">
          <SlotPicker slots={slots} selected={selected} onSelect={setSelected} />
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Voltar</Button>
            <Button
              disabled={!selected}
              loading={saving}
              onClick={async () => {
                if (!selected) return;
                setSaving(true);
                const r = await rescheduleAppointmentAction(id, selected);
                setSaving(false);
                if (r.ok) {
                  toast.success(r.message);
                  setOpen(false);
                } else toast.error(r.error);
              }}
            >
              Confirmar novo horário
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {role === "patient" ? (
        <ConfirmDialog
          tone="danger"
          title="Cancelar consulta?"
          description="O médico será notificado do cancelamento."
          confirmLabel="Cancelar consulta"
          cancelLabel="Manter"
          onConfirm={async () => {
            const r = await patientCancelAppointmentAction(id);
            if (r.ok) toast.success(r.message);
            else toast.error(r.error);
          }}
          trigger={<Button variant="ghost" size="sm" className="text-danger-foreground">Cancelar</Button>}
        />
      ) : null}
    </div>
  );
}
