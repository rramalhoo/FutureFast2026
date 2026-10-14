import Link from "next/link";
import { ArrowLeft, MessagesSquare } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ConversationItem = { id: string; name: string; subtitle: string; lastMessageAt: string; unread: number };

export function MessagesLayout({
  basePath,
  conversations,
  activeId,
  header,
  thread,
  emptyAction,
}: {
  basePath: string;
  conversations: ConversationItem[];
  activeId?: string;
  header?: React.ReactNode;
  thread?: React.ReactNode;
  emptyAction?: React.ReactNode;
}) {
  return (
    <div className="surface-card grid h-[calc(100dvh-14rem)] min-h-[480px] overflow-hidden md:grid-cols-[320px_1fr] lg:h-[calc(100dvh-11rem)]">
      <aside className={cn("flex min-h-0 flex-col border-r border-border", activeId && "hidden md:flex")}>
        <div className="border-b border-border px-4 py-3.5 text-sm font-semibold">Conversas</div>
        {conversations.length === 0 ? (
          <EmptyState compact icon={MessagesSquare} title="Sem conversas" description="As conversas com vínculos ativos aparecem aqui." action={emptyAction} />
        ) : (
          <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link
                  href={`${basePath}?c=${c.id}`}
                  aria-current={c.id === activeId ? "page" : undefined}
                  className={cn("flex items-center gap-3 border-b border-border px-4 py-3.5 transition-colors hover:bg-surface-muted", c.id === activeId && "bg-primary-soft/50")}
                >
                  <Avatar name={c.name} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-foreground-strong">{c.name}</span>
                      <span className="shrink-0 text-[0.7rem] text-subtle-foreground">{fmt.relative(c.lastMessageAt)}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-caption text-muted-foreground">{c.subtitle}</span>
                      {c.unread ? <span className="rounded-full bg-primary px-1.5 text-[0.7rem] font-semibold text-primary-foreground" aria-label={`${c.unread} não lidas`}>{c.unread}</span> : null}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </aside>
      <section className={cn("flex min-h-0 flex-col", !activeId && "hidden md:flex")}>
        {activeId ? (
          <>
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Link href={basePath} className="rounded-lg p-1.5 hover:bg-surface-sunken md:hidden" aria-label="Voltar às conversas"><ArrowLeft className="size-5" /></Link>
              {header}
            </div>
            <div className="min-h-0 flex-1">{thread}</div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState icon={MessagesSquare} title="Selecione uma conversa" description="Mensagens seguras com seus vínculos de cuidado." />
          </div>
        )}
      </section>
    </div>
  );
}
