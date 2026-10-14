"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, CheckCheck, Loader2, Send } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { markConversationReadAction, sendMessageAction } from "@/server/actions/messages";
import type { Tables } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { fmt, localDateISO } from "@/lib/format";
import { cn } from "@/lib/utils";

type Message = Tables<"messages">;

export function MessageThread({ conversationId, currentUserId, initial, disabledReason }: { conversationId: string; currentUserId: string; initial: Message[]; disabledReason?: string }) {
  const [messages, setMessages] = React.useState<Message[]>(initial);
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    void markConversationReadAction(conversationId);
    const supabase = getBrowserSupabase();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const msg = payload.new as Message;
        setMessages((prev) => {
          const exists = prev.findIndex((m) => m.id === msg.id);
          if (exists >= 0) return prev.map((m) => (m.id === msg.id ? msg : m));
          return [...prev, msg];
        });
        if (payload.eventType === "INSERT" && msg.sender_id !== currentUserId) void markConversationReadAction(conversationId);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    const r = await sendMessageAction({ conversationId, body: text });
    setSending(false);
    if (r.ok) {
      setBody("");
      // Atualização otimista caso o realtime esteja indisponível
      const { data } = await getBrowserSupabase().from("messages").select("*").eq("conversation_id", conversationId).order("created_at");
      if (data) setMessages(data);
    } else toast.error(r.error);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="scrollbar-thin min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite" aria-label="Mensagens">
        {messages.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma mensagem ainda. Escreva a primeira.</p> : null}
        {messages.map((m, i) => {
          const mine = m.sender_id === currentUserId;
          const day = localDateISO(m.created_at);
          const showDay = i === 0 || localDateISO(messages[i - 1]!.created_at) !== day;
          return (
            <React.Fragment key={m.id}>
              {showDay ? <p className="py-2 text-center text-caption font-medium text-subtle-foreground">{fmt.dateLong(m.created_at)}</p> : null}
              <div className={cn("flex [animation:gv-fade_200ms_ease-out]", mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 text-[0.9375rem] leading-relaxed shadow-xs", mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border border-border bg-surface text-foreground-strong")}>
                  <p className="break-words whitespace-pre-wrap">{m.body}</p>
                  <p className={cn("mt-1 flex items-center justify-end gap-1 text-[0.7rem]", mine ? "text-white/75" : "text-subtle-foreground")}>
                    {fmt.time(m.created_at)}
                    {mine ? (m.read_at ? <CheckCheck className="size-3.5" aria-label="Lida" /> : <Check className="size-3.5" aria-label="Enviada" />) : null}
                  </p>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="border-t border-border bg-surface p-3 sm:p-4">
        {disabledReason ? (
          <p className="text-center text-sm text-muted-foreground">{disabledReason}</p>
        ) : (
          <div className="flex items-end gap-2">
            <label htmlFor="msg-body" className="sr-only">Mensagem</label>
            <textarea
              id="msg-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(e);
                }
              }}
              rows={1}
              maxLength={4000}
              placeholder="Escreva uma mensagem…"
              className="max-h-40 min-h-11 flex-1 resize-none rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-[0.9375rem] outline-none focus:border-primary focus:ring-4 focus:ring-ring/25"
            />
            <Button type="submit" size="icon" disabled={!body.trim() || sending} aria-label="Enviar">
              {sending ? <Loader2 className="animate-spin" /> : <Send />}
            </Button>
          </div>
        )}
        <p className="mt-2 text-center text-[0.7rem] text-subtle-foreground">Chat não é canal de emergência. Em urgências, ligue 192.</p>
      </form>
    </div>
  );
}
