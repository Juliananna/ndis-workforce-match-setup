import { useState, useEffect, useCallback, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import type { Message } from "~backend/messages/messages";

interface Props {
  offerId: string;
  myRole: "EMPLOYER" | "WORKER";
}

export function MessageThread({ offerId, myRole }: Props) {
  const api = useAuthedBackend();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!api) return;
    try {
      const res = await api.messages.listMessages({ offerId });
      setMessages(res.messages);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [api, offerId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!body.trim() || !api) return;
    setSending(true);
    setError(null);
    try {
      const msg = await api.messages.sendMessage({ offerId, body: body.trim() });
      setMessages((prev) => [...prev, msg]);
      setBody("");
    } catch (e: unknown) {
      console.error("Failed to send message:", e);
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />Loading messages…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground italic text-center py-4">
            No messages yet. Start the conversation.
          </p>
        ) : (
          messages.map((m) => {
            const isMine = m.senderRole === myRole;
            return (
              <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-xl px-3 py-2 text-sm break-words ${
                    isMine
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <p>{m.body}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {m.senderRole} &bull; {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2 items-end">
        <textarea
          rows={2}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          placeholder="Type a message… (Enter to send)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKey}
          maxLength={2000}
          disabled={sending}
        />
        <Button size="sm" onClick={handleSend} disabled={sending || !body.trim()} className="h-[58px] px-3">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
