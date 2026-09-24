import "server-only";

import { searchMulti, getTrendingAll } from "@/lib/adapters/tmdb";
import { getMediaDetail } from "@/lib/adapters/registry";
import { getAIProvider } from "@/lib/ai/provider";
import type { AssistantMessage } from "@/types/assistant";

function isEntertainmentQuery(query: string): boolean {
  const normalized = query.toLowerCase().trim();

  // Greeting detector:
  const greetings = [
    /\bhello\b/,
    /\bhi\b/,
    /\bhey\b/,
    /\bhallo\b/,
    /\bhola\b/,
    /\bbonjour\b/,
    /\bciao\b/,
    /\bnamaste\b/,
    /\bgood morning\b/,
    /\bgood evening\b/,
    /\bgood afternoon\b/
  ];
  if (greetings.some((regex) => regex.test(normalized))) {
    return false;
  }

  const keywords = [
    /\bmovie(s)?\b/,
    /\bfilm(s)?\b/,
    /\bshow(s)?\b/,
    /\bseries\b/,
    /\btv\b/,
    /\bactor(s)?\b/,
    /\bactress(es)?\b/,
    /\bdirect(or|ed|ing)?(s)?\b/,
    /\bcast\b/,
    /\bstar(s|ring)?\b/,
    /\brecommend(ed|ing|ation|ations)?\b/,
    /\bwatch(list|ed|ing)?\b/,
    /\bgenre(s)?\b/,
    /\btrending\b/,
    /\bpopular\b/,
    /\blatest\b/,
    /\brelease(s|d)?\b/,
    /\bcinema\b/,
    /\b(action|comedy|drama|horror|sci-fi|thriller|romance|documentary|animation|anime|fantasy|mystery|suspense|adventure|biography)\b/,
  ];
  return keywords.some((regex) => regex.test(normalized));
}

async function fetchDetailedTmdbData(
  items: { type: string; externalId: string }[]
) {
  return Promise.all(
    items.slice(0, 5).map(async (item) => {
      try {
        const detail = await getMediaDetail(item.type, item.externalId);
        if (!detail) return null;
        
        const director = detail.people
          ?.filter((p) => p.role === "Director")
          ?.map((p) => p.name)
          ?.join(", ") || "Unknown";
          
        const cast = detail.people
          ?.filter(
            (p) =>
              p.role !== "Director" &&
              p.role !== "Creator" &&
              p.role !== "Writer" &&
              p.role !== "Screenplay" &&
              p.role !== "Crew"
          )
          ?.slice(0, 5)
          ?.map((p) => p.name) || [];

        const providers = detail.watchProviders
          ?.filter((p) => p.type === "stream")
          ?.map((p) => p.name) || [];

        const trailer = detail.trailers?.[0]?.key
          ? `https://www.youtube.com/watch?v=${detail.trailers[0].key}`
          : undefined;

        return {
          type: detail.type,
          id: detail.externalId,
          title: detail.title,
          originalTitle: detail.originalTitle || detail.title,
          year: detail.releaseDate?.slice(0, 4) || "Unknown",
          runtime: detail.runtimeMinutes ? `${detail.runtimeMinutes} minutes` : "Unknown",
          genres: detail.genres,
          overview: detail.synopsis,
          rating: detail.voteAverage ? `${detail.voteAverage}/10` : "Unknown",
          director,
          cast,
          posterUrl: detail.coverImageUrl,
          backdropUrl: detail.backdropImageUrl,
          trailer,
          streamingProviders: providers,
          imdbId: detail.imdbId,
        };
      } catch (err) {
        console.error(`Failed to fetch TMDB details for ${item.type}:${item.externalId}`, err);
        return null;
      }
    })
  ).then((res) => res.filter((r) => r !== null));
}

export async function streamAssistantReply(
  messages: AssistantMessage[],
  personalContext: string
): Promise<ReadableStream<Uint8Array>> {
  const requestStart = Date.now();

  const systemInstructionBase = `You are Zynora, an expert, enthusiastic entertainment assistant designed to help users find their next favorite movie or TV show.
Be concise but incredibly knowledgeable. Recommend ONLY films and TV shows. Use Markdown for formatting.

CRITICAL: When recommending a movie or TV show, you MUST use the exact details (runtime, genres, rating, overview, and streaming providers) from the provided TMDB catalog data.
If TMDB data is unavailable or empty, tell the user naturally that verified TMDB metadata is currently unavailable and you are avoiding guessing details.
For streaming providers, always list them under 'Streaming:' (e.g. 'Streaming: Netflix, Prime Video'). If no providers are listed or TMDB data is unavailable, output 'Streaming: Currently unavailable.' Never output '[Check platform]' or guess/hallucinate provider names, runtimes, or ratings.

If you recommend titles, structure each recommendation exactly like this:
🎬 [Title] ([Release Year])

⭐ TMDB Rating: [Rating value e.g. 8.1/10 or Currently unavailable]

🎭 Genres:
[Genre 1] • [Genre 2]

⏱ Runtime:
[Runtime e.g. 149 minutes or Currently unavailable]

📺 Streaming:
[List streaming providers, or Currently unavailable]

💡 Why you'll like it:
[Your personalized explanation based on user context]

👥 Cast:
[Cast member 1]
[Cast member 2]

🎬 Director:
[Director name]

ALWAYS reply in English unless the user explicitly requests another language.
Never infer the language from greetings like "hallo", "hola", "ciao", etc. Only reply in a different language if the user explicitly asks for another language.
User's personalization context: ${personalContext}`;

  const lastUserMessage = messages.findLast((msg) => msg.role === "user")?.content || "";
  const isEntertainment = isEntertainmentQuery(lastUserMessage);

  // Perform TMDB fetches up front if entertainment-related
  let tmdbData: unknown = null;
  let toolUsed = "None";
  
  const tmdbStart = Date.now();
  if (isEntertainment) {
    const isTrending = /\b(trend|trending|popular|latest|release)\b/i.test(lastUserMessage);
    if (isTrending) {
      toolUsed = "get_trending_titles";
      try {
        const results = await getTrendingAll();
        tmdbData = await fetchDetailedTmdbData(
          results.map((item) => ({ type: item.type, externalId: item.externalId }))
        );
      } catch (e) {
        console.warn("TMDB trending fetch failed (gracefully continuing):", e);
      }
    } else {
      toolUsed = "search_tmdb";
      try {
        const query = lastUserMessage.replace(/\b(recommend|search|find|show me|tell me about|info on|what is|who is)\b/gi, "").trim() || lastUserMessage;
        const results = await searchMulti(query);
        tmdbData = await fetchDetailedTmdbData(
          results.all.map((item) => ({ type: item.type, externalId: item.externalId }))
        );
      } catch (e) {
        console.warn("TMDB search fetch failed (gracefully continuing):", e);
      }
    }
  }
  const tmdbDuration = Date.now() - tmdbStart;
  console.log(`[Timing] TMDB lookup (${toolUsed}) duration: ${tmdbDuration}ms`);
  if (isEntertainment) {
    console.log("[TMDB] Search Count:", tmdbData ? (tmdbData as unknown[]).length : 0);
  }

  // Inject TMDB data directly into the prompt/instruction only if entertainment query
  let systemInstruction = systemInstructionBase;
  if (isEntertainment) {
    if (tmdbData && (tmdbData as unknown[]).length > 0) {
      systemInstruction = `${systemInstructionBase}\n\nHere is the real-time verified TMDB catalog data relevant to the user's request. You MUST use this data to recommend titles: ${JSON.stringify(tmdbData)}`;
    } else {
      systemInstruction = `${systemInstructionBase}\n\nVERIFIED TMDB DATA IS UNAVAILABLE. You should still recommend movies and TV shows using your internal knowledge. However, do not invent or fabricate specific runtimes, streaming providers, ratings, release dates, cast, or directors. Clearly state that verified streaming and metadata details are currently unavailable.`;
    }
  }

  const provider = getAIProvider();
  const groqStart = Date.now();
  const rawStream = await provider.streamChat(messages, systemInstruction);

  // Wrap the stream to log the Groq generation time and total request time when done
  const reader = rawStream.getReader();

  return new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
        const groqDuration = Date.now() - groqStart;
        const totalDuration = Date.now() - requestStart;
        console.log(`[Timing] Groq generation duration: ${groqDuration}ms`);
        console.log(`[Timing] Total assistant request duration: ${totalDuration}ms`);
        controller.close();
      } catch (err) {
        controller.error(err);
      } finally {
        reader.releaseLock();
      }
    }
  });
}
