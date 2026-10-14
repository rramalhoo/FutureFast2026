"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Popover as P } from "radix-ui";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";

type Notification = Tables<"notifications">;

export function NotificationsBell({ userId }: { userId: string }) {
  const router = useRouter();
  const [items, setItems] = React.useState<Notification[]>([]);
  const [open, setOpen] = React.useState(false);
  const unread = items.filter((n) => !n.read_at).length;

  React.useEffect(() => {
    const supabase = getBrowserSupabase();
    void supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(12)
      .then(({ data }) => setItems(data ?? []));
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
        setItems((prev) => [payload.new as Notification, ...prev].slice(0, 12));
        router.refresh();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router, userId]);

  async function markAllRead() {
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    if (ids.length === 0) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await getBrowserSupabase().from("notifications").update({ read_at: now }).in("id", ids);
  }

  async function openItem(n: Notification) {
    if (!n.read_at) {
      const now = new Date().toISOString();
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: now } : x)));
      await getBrowserSupabase().from("notifications").update({ read_at: now }).eq("id", n.id);
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <P.Root open={open} onOpenChange={setOpen}>
      <P.Trigger
        className="relative rounded-xl p-2.5 text-foreground transition-colors hover:bg-surface-sunken"
        aria-label={unread ? `Notificações: ${unread} não lidas` : "Notificações"}
      >
        <Bell className="size-5" />
        {unread ? (
          <span className="absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] leading-4 font-semibold text-primary-foreground ring-2 ring-surface">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </P.Trigger>
      <P.Portal>
        <P.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-border bg-surface shadow-lg data-[state=open]:[animation:gv-pop_160ms_cubic-bezier(0.22,1,0.36,1)]"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-semibold text-foreground-strong">Notificações</p>
            <button
              onClick={markAllRead}
              disabled={!unread}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary-soft disabled:opacity-40"
            >
              <CheckCheck className="size-3.5" /> Marcar todas como lidas
            </button>
          </div>
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-muted-foreground">
              <BellOff className="size-6 text-subtle-foreground" aria-hidden />
              Você não tem notificações.
            </div>
          ) : (
            <ul className="scrollbar-thin max-h-[60vh] divide-y divide-border overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <button onClick={() => openItem(n)} className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-muted">
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-primary")} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground-strong">{n.title}</span>
                      {n.body ? <span className="mt-0.5 block text-sm text-muted-foreground">{n.body}</span> : null}
                      <span className="mt-1 block text-caption text-subtle-foreground">{fmt.relative(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link href="/notificacoes" onClick={() => setOpen(false)} className="block border-t border-border px-4 py-3 text-center text-sm font-medium text-primary hover:bg-surface-muted">
            Ver todas
          </Link>
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}
