"use client";

import { useTransition } from "react";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markAllNotificationsReadAction } from "@/server/actions/account";

export function MarkAllReadButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await markAllNotificationsReadAction();
          if (!r.ok) toast.error(r.error);
        })
      }
    >
      <CheckCheck /> Marcar todas como lidas
    </Button>
  );
}
