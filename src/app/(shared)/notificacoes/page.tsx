import type { Metadata } from "next";
import Link from "next/link";
import { BellOff } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MarkAllReadButton } from "@/components/account/mark-all-read";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notificações" };

export default async function NotificationsPage() {
  await requireSession("/notificacoes");
  const supabase = await getServerSupabase();
  const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
  const items = data ?? [];
  return (
    <div className="space-y-6">
      <PageHeader title="Notificações" description="Avisos sobre consultas, receitas, mensagens e sua conta." actions={items.some((n) => !n.read_at) ? <MarkAllReadButton /> : null} />
      <Card className="overflow-hidden">
        {items.length === 0 ? (
          <EmptyState icon={BellOff} title="Tudo em dia" description="Você ainda não recebeu notificações." />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((n) => {
              const content = (
                <>
                  <span className={cn("mt-2 size-2 shrink-0 rounded-full", n.read_at ? "bg-border-strong" : "bg-primary")} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-foreground-strong">{n.title}</span>
                    {n.body ? <span className="mt-0.5 block text-sm text-muted-foreground">{n.body}</span> : null}
                  </span>
                  <span className="shrink-0 text-caption text-subtle-foreground">{fmt.relative(n.created_at)}</span>
                </>
              );
              return (
                <li key={n.id}>
                  {n.link ? (
                    <Link href={n.link} className="flex gap-4 px-5 py-4 transition-colors hover:bg-surface-muted">{content}</Link>
                  ) : (
                    <div className="flex gap-4 px-5 py-4">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
