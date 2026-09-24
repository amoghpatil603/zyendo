"use client";

import { FormEvent, useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AssistantMessage } from "@/types/assistant";
import { cn } from "@/lib/utils";

const moodPrompts = ["I want something funny and light", "Pick a tense thriller for tonight", "Find a cozy comfort watch", "What is trending right now?"];

interface AssistantChatProps {
  compact?: boolean;
  onClose?: () => void;
}

function generateMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function AssistantChat({ compact = false, onClose }: AssistantChatProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(message = input) {
    const content = message.trim();
    if (!content || pending) return;
    const userMessage: AssistantMessage = { id: generateMessageId(), role: "user", content };
    const assistantMessage: AssistantMessage = { id: generateMessageId(), role: "assistant", content: "" };
    const next = [...messages, userMessage];
    setMessages([...next, assistantMessage]);
    setInput(""); setPending(true); setError(null);
    try {
      const response = await fetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: next }) });
      if (!response.ok || !response.body) throw new Error((await response.json().catch(() => ({ error: "Unable to reach the assistant." }))).error);
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n"); buffer = events.pop() ?? "";
        for (const event of events) {
          const data = event.split("\n").find((line) => line.startsWith("data: "))?.slice(6);
          if (!data || data === "[DONE]") continue;
          const chunk = JSON.parse(data) as { text?: string };
          if (chunk.text) setMessages((current) => current.map((item) => item.id === assistantMessage.id ? { ...item, content: item.content + chunk.text! } : item));
        }
      }
    } catch (caught) {
      setMessages((current) => current.filter((item) => item.id !== assistantMessage.id));
      setError(caught instanceof Error ? caught.message : "Unable to reach the assistant.");
    } finally { setPending(false); }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void submit(); }

  const containerClasses = compact
    ? "flex flex-col rounded-2xl border border-border/60 bg-background/95 shadow-2xl shadow-primary/20 backdrop-blur-xl"
    : "glass mx-auto flex min-h-[600px] max-w-3xl flex-col rounded-2xl border border-border/60";

  const widthClasses = compact
    ? "w-[calc(100vw-2rem)] max-w-[460px]"
    : "w-full";

  const heightClasses = compact
    ? "max-h-[560px]"
    : "";

  return (
    <div className={cn(containerClasses, widthClasses, heightClasses)}>
      <div className="border-b border-border/60 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/15 p-2 text-primary">
              <Bot className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold">AI Assistant</h2>
              <p className="text-xs text-muted-foreground">Your entertainment copilot</p>
            </div>
          </div>
          {compact && onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close assistant">
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 ? (
          <div className="space-y-5 py-8 text-center">
            <Sparkles className="mx-auto size-8 text-primary" />
            <div>
              <p className="font-medium">What are you in the mood for?</p>
              <p className="mt-1 text-sm text-muted-foreground">Ask for a title, a mood, or a short list for tonight.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {moodPrompts.map((prompt) => (
                <Button key={prompt} variant="secondary" size="sm" onClick={() => void submit(prompt)}>
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <article
              key={message.id}
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap",
                message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"
              )}
            >
              {message.content || <span className="animate-pulse text-muted-foreground">Thinking…</span>}
            </article>
          ))
        )}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
      <form onSubmit={onSubmit} className="flex gap-2 border-t border-border/60 p-4">
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask Zynora…"
          disabled={pending}
          maxLength={2000}
          aria-label="Assistant message"
        />
        <Button type="submit" size="icon" disabled={pending || !input.trim()} aria-label="Send message">
          <Send />
        </Button>
      </form>
    </div>
  );
}