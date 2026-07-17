import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect, useRef } from "react";
import { Send, MessageSquare } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/chat")({
  component: Chat,
});

function Chat() {
  const { user, role } = useAuth();
  const [peer, setPeer] = useState<string | null>(null);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const contacts = useQuery({
    queryKey: ["chat-contacts", role],
    queryFn: () => apiFetch("/chat/contacts").catch(() => []),
  });

  const messages = useQuery({
    queryKey: ["msgs", peer],
    enabled: !!user && !!peer,
    refetchInterval: 3000,
    queryFn: () => apiFetch(`/chat/messages?peerId=${peer}`).catch(() => []),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.data]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !peer) return;
    try {
      await apiFetch("/chat/messages", { 
        method: "POST", 
        body: JSON.stringify({ recipientId: peer, body: text }) 
      });
      setText("");
      messages.refetch();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="font-serif text-3xl font-semibold tracking-tight">Chat</h1><p className="mt-1 text-sm text-muted-foreground">Direct messages</p></div>
      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        <Card className="max-h-[70vh] overflow-hidden">
          <CardHeader className="border-b py-3"><CardTitle className="text-sm">Contacts</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[60vh]">
              {(contacts.data ?? []).filter((c: any) => c.id !== user?.id).map((c: any) => (
                <button key={c.id} onClick={() => setPeer(c.id)} className={`flex w-full items-center gap-2 border-b border-border px-4 py-3 text-left text-sm hover:bg-accent ${peer === c.id ? "bg-accent" : ""}`}>
                  <div className="h-7 w-7 shrink-0 rounded-full bg-primary text-center text-xs font-semibold leading-7 text-primary-foreground">{c.name.slice(0, 2).toUpperCase()}</div>
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
        <Card className="flex max-h-[70vh] flex-col">
          {!peer ? (
            <CardContent className="flex flex-1 items-center justify-center py-12 text-sm text-muted-foreground">
              <div className="text-center"><MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/40" /><p className="mt-3">Select a contact to start.</p></div>
            </CardContent>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
                {(messages.data ?? []).map((m: any) => (
                  <div key={m.id} className={`flex ${m.senderId === user?.id ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-md px-3 py-2 text-sm ${m.senderId === user?.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {m.body}
                      <div className="mt-1 text-[10px] opacity-70">{new Date(m.createdAt).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))}
                {(messages.data ?? []).length === 0 && <p className="text-center text-sm text-muted-foreground">No messages yet — say hello.</p>}
              </div>
              <form onSubmit={send} className="flex gap-2 border-t p-3">
                <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message…" />
                <Button type="submit"><Send className="h-4 w-4" /></Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
