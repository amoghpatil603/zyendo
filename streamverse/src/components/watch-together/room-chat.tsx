"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Send, Smile, X } from "lucide-react";
import { toast } from "sonner";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { sendChatMessage } from "@/app/actions/watch-together";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessage, ReactionType, TypingEvent } from "@/types/watch-together";

const REACTION_EMOJIS: ReactionType[] = ["❤️", "😂", "😮", "😢", "🔥", "👏"];

export function RoomChat({
  sessionId,
  currentUserId,
  currentUserName,
  currentUserAvatar,
}: {
  sessionId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [isSending, setIsSending] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [reactions, setReactions] = useState<Array<{ emoji: ReactionType; x: number; y: number; id: string }>>(
    [],
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const shouldAutoScrollRef = useRef(true);

  // Load initial messages
  useEffect(() => {
    async function loadMessages() {
      try {
        const response = await fetch(`/api/watch-together/${sessionId}/messages`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages);
        }
      } catch {
        // Messages will load via realtime
      }
    }
    loadMessages();
  }, [sessionId]);

  // Setup realtime subscriptions
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase.channel(`room:${sessionId}`);

    // Listen for new messages
    (channel as any).on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "watch_session_messages",
        filter: `session_id=eq.${sessionId}`,
      },
      (payload: any) => {
        const msg = payload.new as {
          id: string;
          user_id: string;
          display_name: string;
          avatar_url: string | null;
          body: string;
          created_at: string;
        };
        setMessages((prev) => [
          ...prev,
          {
            id: msg.id,
            sessionId,
            userId: msg.user_id,
            displayName: msg.display_name,
            avatarUrl: msg.avatar_url,
            body: msg.body,
            createdAt: msg.created_at,
          },
        ]);
        if (shouldAutoScrollRef.current) {
          scrollToBottom();
        }
      },
    );

    // Listen for typing events
    (channel as any).on("broadcast", { type: "typing" }, (payload: any) => {
      const data = payload.payload as TypingEvent;
      if (data.sessionId !== sessionId) return;

      setTypingUsers((prev) => {
        const newMap = new Map(prev);
        if (data.userId !== currentUserId) {
          newMap.set(data.userId, data.displayName);
        }
        return newMap;
      });

      // Clear typing indicator after 3 seconds
      setTimeout(() => {
        setTypingUsers((prev) => {
          const newMap = new Map(prev);
          newMap.delete(data.userId);
          return newMap;
        });
      }, 3000);
    });

    // Listen for reaction events
    (channel as any).on("broadcast", { type: "reaction" }, (payload: any) => {
      const data = payload.payload as { emoji: ReactionType; userId: string; displayName: string };
      if (data.userId === currentUserId) return; // Don't show own reactions

      // Create floating reaction animation
      const reactionId = `${Date.now()}-${Math.random()}`;
      const x = 20 + Math.random() * 60; // Random position
      const y = 20 + Math.random() * 60;
      setReactions((prev) => [...prev, { emoji: data.emoji, x, y, id: reactionId }]);

      // Remove after animation
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== reactionId));
      }, 3000);
    });

    (channel as any).subscribe();
    channelRef.current = channel;

    return () => {
      (channel as any).unsubscribe();
    };
  }, [sessionId, currentUserId]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Handle scroll to determine auto-scroll
  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      // If near bottom, continue auto-scrolling
      shouldAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;
    }
  }, []);

  // Send message
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    const body = newMessage.trim();
    setNewMessage("");

    const result = await sendChatMessage(sessionId, body);
    if (!result.ok) {
      toast.error("Failed to send message");
      setNewMessage(body); // Restore message on failure
    }
    setIsSending(false);
  }, [newMessage, isSending, sessionId]);

  // Send typing indicator (debounced)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (channelRef.current) {
      (channelRef.current as any).send({
        type: "typing",
        payload: {
          userId: currentUserId,
          displayName: currentUserName,
          sessionId,
          timestamp: Date.now(),
        } as TypingEvent,
      });
    }

    // Throttle to once per second
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 1000);
  }, [currentUserId, currentUserName, sessionId]);

  // Send reaction
  const handleReaction = useCallback(
    (emoji: ReactionType) => {
      if (channelRef.current) {
        (channelRef.current as any).send({
          type: "reaction",
          payload: { emoji, userId: currentUserId, displayName: currentUserName },
        });
      }
      setShowReactions(false);
    },
    [currentUserId, currentUserName],
  );

  // Format time
  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="glass flex h-full flex-col rounded-2xl">
      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef} onScrollCapture={handleScroll}>
        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-2">
              {msg.avatarUrl ? (
                <img
                  src={msg.avatarUrl}
                  alt=""
                  className="size-6 rounded-full"
                />
              ) : (
                <div className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-xs">
                  {msg.displayName.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">{msg.displayName}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
                <p className="text-sm break-words">{msg.body}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Typing indicator */}
      {typingUsers.size > 0 && (
        <div className="px-3 pb-1 text-xs text-muted-foreground">
          {Array.from(typingUsers.values()).join(", ")} is typing...
        </div>
      )}

      {/* Reaction overlay */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {reactions.map((r) => (
          <div
            key={r.id}
            className="absolute animate-bounce text-2xl"
            style={{
              left: `${r.x}%`,
              top: `${r.y}%`,
              animation: "float-up 3s ease-out forwards",
            }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-border/60 p-3">
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message..."
            className="min-h-[40px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            maxLength={1000}
          />
          <div className="flex flex-col gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setShowReactions(!showReactions)}
              aria-label="Add reaction"
            >
              <Smile />
            </Button>
            <Button
              size="icon-sm"
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSending}
              aria-label="Send message"
            >
              <Send />
            </Button>
          </div>
        </div>

        {/* Reaction picker */}
        {showReactions && (
          <div className="absolute bottom-full right-3 mb-2 flex gap-1 rounded-lg border bg-background p-2 shadow-lg">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleReaction(emoji)}
                className="text-lg hover:scale-125"
              >
                {emoji}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowReactions(false)}
              className="ml-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}