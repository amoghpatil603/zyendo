"use client";

import { useState, useCallback, useEffect } from "react";
import { MessageSquare, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ReviewComment } from "@/types/social";

interface CommentThreadProps {
  reviewId: string;
}

export function CommentThread({ reviewId }: CommentThreadProps) {
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const mod = await import("@/lib/social/social-actions");
      const data = await mod.getCommentsForReview(reviewId);
      setComments(data);
    } finally {
      setLoading(false);
    }
  }, [reviewId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  async function handleSubmit(parentId?: string) {
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const mod = await import("@/lib/social/social-actions");
      const r = await mod.addComment(reviewId, body, parentId);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setBody("");
      setReplyingTo(null);
      await loadComments();
    } finally {
      setSubmitting(false);
    }
  }

  function renderComment(comment: ReviewComment, depth = 0) {
    return (
      <div
        key={comment.id}
        className={cn(
          "rounded-xl border border-border/60 glass p-3",
          depth > 0 && "ml-6"
        )}
      >
        <div className="flex items-start gap-3">
          <Avatar className="size-8">
            {comment.userAvatarUrl && <AvatarImage src={comment.userAvatarUrl} alt={comment.userName ?? "User"} className="object-cover" />}
            <AvatarFallback>
              {comment.userName?.charAt(0)?.toUpperCase() ?? <User className="size-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{comment.userName ?? "Anonymous"}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(comment.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="mt-1 text-sm text-foreground/90">{comment.body}</p>
            {depth === 0 && (
              <button
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="mt-1 text-xs text-muted-foreground hover:text-primary transition"
              >
                Reply
              </button>
            )}
          </div>
        </div>

        {/* Reply form */}
        {replyingTo === comment.id && (
          <div className="mt-3 ml-6 space-y-2">
            <Textarea
              placeholder="Write a reply..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[60px] text-sm"
              rows={2}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleSubmit(comment.id)}
                disabled={submitting || !body.trim()}
              >
                {submitting ? "Posting..." : "Reply"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setReplyingTo(null); setBody(""); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Nested replies */}
        {comment.replies?.map((reply) => renderComment(reply, depth + 1))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* New comment form */}
      <div className="space-y-2">
        <Textarea
          placeholder="Add a comment..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-[80px]"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => handleSubmit()}
            disabled={submitting || !body.trim()}
          >
            {submitting ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </div>

      {/* Comments */}
      {loading ? (
        <div className="flex justify-center py-4">
          <span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : comments.length === 0 ? (
        <div className="glass rounded-2xl border border-border/60 p-6 text-center text-sm text-muted-foreground">
          <MessageSquare className="mx-auto mb-2 size-6" />
          No comments yet. Be the first!
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => renderComment(comment))}
        </div>
      )}
    </div>
  );
}
