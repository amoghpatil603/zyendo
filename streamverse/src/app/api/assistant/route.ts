import { z } from "zod";

import { streamAssistantReply } from "@/lib/ai/assistant";
import { getCurrentUser } from "@/lib/supabase/server";
import { getPersonalizationContext } from "@/lib/ai/personal-context";
import { isAIConfigured } from "@/lib/env";

export const runtime = "nodejs";

const requestSchema = z.object({
  messages: z.array(z.object({ id: z.string().min(1).max(100), role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(2000) })).min(1).max(20),
});

export async function POST(request: Request) {
  if (!isAIConfigured()) return Response.json({ error: "AI assistant is not configured." }, { status: 503 });
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in to use the assistant." }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid assistant request." }, { status: 400 });
  try {
    console.log(JSON.stringify(parsed.data.messages, null, 2));
    const startPersonalContext = Date.now();
    const personalContext = await getPersonalizationContext(user.id);
    console.log(`[Timing] Personal context loaded in ${Date.now() - startPersonalContext}ms`);

    const stream = await streamAssistantReply(parsed.data.messages, personalContext);
    return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive" } });
  } catch (error) {
    console.error("Assistant Route Error:", error);
    return Response.json({ error: "The assistant is temporarily unavailable. Please try again." }, { status: 502 });
  }
}
