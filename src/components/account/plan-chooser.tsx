"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { choosePlanAction, cancelSubscriptionAction } from "@/server/actions/account";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { fmt } from "@/lib/format";
import type { Tables } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export function PlanChooser({ plans, currentPlanId }: { plans: Tables<"plans">[]; currentPlanId?: string }) {
  const [pendingSlug, setPendingSlug] = React.useState<string | null>(null);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        {plans.map((p) => {
          const current = p.id === currentPlanId;
          const price = p.custom_pricing
            ? "Preço personalizado"
            : !p.price_min_cents
              ? "Gratuito"
              : p.price_max_cents && p.price_max_cents !== p.price_min_cents
                ? `${fmt.currency(p.price_min_cents)} – ${fmt.currency(p.price_max_cents)}/mês`
                : `${fmt.currency(p.price_min_cents)}/mês`;
          return (
            <div key={p.id} className={cn("rounded-2xl border p-5", current ? "border-primary bg-primary-soft/30" : "border-border")}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground-strong">{p.name}</p>
                  <p className="text-sm text-muted-foreground">{price}</p>
                </div>
                {current ? <Badge tone="brand">Plano atual</Badge> : null}
              </div>
              <ul className="mt-3 space-y-1.5">
                {p.features.slice(0, 4).map((f) => (
                  <li key={f} className="flex gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> {f}
                  </li>
                ))}
              </ul>
              {!current ? (
                <Button
                  className="mt-4"
                  variant="secondary"
                  size="sm"
                  loading={pendingSlug === p.slug}
                  onClick={async () => {
                    setPendingSlug(p.slug);
                    const r = await choosePlanAction(p.slug);
                    setPendingSlug(null);
                    if (r.ok) toast.success(r.message);
                    else toast.error(r.error);
                  }}
                >
                  Escolher este plano
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
      {currentPlanId ? (
        <ConfirmDialog
          tone="danger"
          title="Cancelar assinatura?"
          description="Você poderá escolher um plano novamente quando quiser."
          confirmLabel="Cancelar assinatura"
          onConfirm={async () => {
            const r = await cancelSubscriptionAction();
            if (r.ok) toast.success(r.message);
            else toast.error(r.error);
          }}
          trigger={
            <Button variant="ghost" size="sm" className="text-danger-foreground">
              Cancelar assinatura
            </Button>
          }
        />
      ) : null}
    </div>
  );
}
