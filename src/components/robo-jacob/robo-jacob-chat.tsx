"use client";

import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Bot, User } from "lucide-react";
import { toast } from "sonner";
import { chatWithRoboJacob } from "@/lib/actions/robo-jacob";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface RoboJacobChatProps {
  storeId: string;
  storeName: string;
}

export function RoboJacobChat({ storeId, storeName }: RoboJacobChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const { data, error } = await chatWithRoboJacob(storeId, text, history);
      if (error) {
        toast.error(error);
        setMessages((prev) => prev.slice(0, -1));
        return;
      }
      if (data) {
        setMessages((prev) => [...prev, { role: "assistant", content: data }]);
      }
    } catch {
      toast.error("Something went wrong");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-12rem)] min-h-[420px]">
      <CardHeader className="border-b shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Robo Jacob</CardTitle>
            <CardDescription>
              SEO advisor for {storeName}. Ask about your site data, audit results, or next steps.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Bot className="h-12 w-12 mb-4 opacity-50" />
              <p className="font-medium">Ask Robo Jacob anything about this site</p>
              <p className="text-sm mt-1 max-w-md">
                He has access to your store data, audit results, improvements, and keywords. Try:
              </p>
              <ul className="text-sm mt-3 space-y-1 list-disc list-inside">
                <li>What should I fix first?</li>
                <li>Summarize my top SEO issues</li>
                <li>Should I run a site audit?</li>
                <li>How can I improve my product pages?</li>
              </ul>
            </div>
          )}
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}
              >
                {m.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={
                    m.role === "user"
                      ? "rounded-lg bg-primary text-primary-foreground px-4 py-2 max-w-[85%]"
                      : "rounded-lg bg-muted px-4 py-2 max-w-[85%]"
                  }
                >
                  <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                </div>
                {m.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
          {loading && (
            <div className="flex gap-3 mt-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="rounded-lg bg-muted px-4 py-2 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Robo Jacob is thinking...</span>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </ScrollArea>
        <div className="border-t p-3 shrink-0">
          <div className="flex gap-2">
            <Textarea
              placeholder="Ask Robo Jacob..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={2}
              className="min-h-[60px] resize-none"
              disabled={loading}
            />
            <Button
              onClick={send}
              disabled={loading || !input.trim()}
              size="icon"
              className="h-[60px] w-12 shrink-0"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
