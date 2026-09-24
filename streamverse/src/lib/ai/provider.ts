import "server-only";

import { serverEnv } from "@/lib/env";
import type { AssistantMessage } from "@/types/assistant";
import { instrumentedFetch } from "@/lib/adapters/tmdb/client";

export interface AIProvider {
  streamChat(
    messages: AssistantMessage[],
    systemInstruction: string
  ): Promise<ReadableStream<Uint8Array>>;

  generateJSON(
    prompt: string,
    systemInstruction?: string,
    temperature?: number
  ): Promise<string>;
}

export class GroqProvider implements AIProvider {
  private apiKey = serverEnv.groqApiKey;
  private model = serverEnv.groqModel;
  private baseUrl = "https://api.groq.com/openai/v1";

  async streamChat(
    messages: AssistantMessage[],
    systemInstruction: string
  ): Promise<ReadableStream<Uint8Array>> {
    if (!this.apiKey) {
      const encoder = new TextEncoder();
      return new ReadableStream({
        start(controller) {
          const friendlyMessage = "Groq API key is missing. Please configure GROQ_API_KEY in your environment variables.";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: friendlyMessage })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
    }

    const url = `${this.baseUrl}/chat/completions`;
    const formattedMessages = [
      { role: "system", content: systemInstruction },
      ...messages.slice(-30).map((msg) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      })),
    ];

    const encoder = new TextEncoder();

    const candidateModels = [this.model, "qwen/qwen3.8-27b", "openai/gpt-oss-20b"].filter(
      (m, i, arr) => Boolean(m) && arr.indexOf(m) === i
    );

    try {
      let response: Response | null = null;
      let lastError = "";

      for (const model of candidateModels) {
        const res = await instrumentedFetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: formattedMessages,
            temperature: 0.7,
            stream: true,
          }),
        });

        if (res.ok) {
          response = res;
          break;
        }

        const errorText = await res.text().catch(() => "");
        lastError = `Groq request failed (${res.status}): ${errorText}`;
        if (res.status !== 404) {
          throw new Error(lastError);
        }
      }

      if (!response) {
        throw new Error(lastError || "Failed to start stream with available models");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let pending = "";

      return new ReadableStream({
        async start(controller) {
          if (!reader) {
            controller.close();
            return;
          }
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              pending += decoder.decode(value, { stream: true });
              const lines = pending.split("\n");
              pending = lines.pop() ?? "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith("data: ")) continue;
                const rawData = trimmed.slice(6);
                if (rawData === "[DONE]") continue;

                try {
                  const data = JSON.parse(rawData);
                  const text = data.choices?.[0]?.delta?.content;
                  if (text) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                  }
                } catch {
                  // Ignore malformed JSON chunks
                }
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error) {
            controller.error(error);
          } finally {
            reader.releaseLock();
          }
        },
      });
    } catch (error: unknown) {
      console.error("Groq connection error:", error);
      return new ReadableStream({
        start(controller) {
          const friendlyMessage = "The AI service (Groq) is currently unavailable. Please verify your API key and connection.";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: friendlyMessage })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
    }
  }

  async generateJSON(
    prompt: string,
    systemInstruction?: string,
    temperature = 0.7
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Groq API key is missing. Please set GROQ_API_KEY.");
    }

    const url = `${this.baseUrl}/chat/completions`;
    const messages = [];
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    const candidateModels = [this.model, "qwen/qwen3.8-27b", "openai/gpt-oss-20b"].filter(
      (m, i, arr) => Boolean(m) && arr.indexOf(m) === i
    );

    let lastError = "";

    for (const model of candidateModels) {
      const response = await instrumentedFetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          stream: false,
          response_format: { type: "json_object" },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
      }

      const errorText = await response.text().catch(() => "");
      lastError = `Groq JSON request failed (${response.status}): ${errorText}`;

      // If error is not a 404 model not found, don't try different models
      if (response.status !== 404) {
        throw new Error(lastError);
      }
    }

    throw new Error(lastError || "Failed to generate JSON with available models");
  }
}

export function getAIProvider(): AIProvider {
  return new GroqProvider();
}
