import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";

/**
 * AI provider abstraction.
 *
 * LovableAIProvider  -> real model calls through the Lovable AI Gateway.
 * MockAIProvider     -> deterministic offline output when no key is configured.
 *
 * Business logic never talks to a vendor SDK directly; it calls `runAIService`.
 */

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-5.6-sol";
const MAX_INPUT_CHARS = 24_000;

export const INTEGRITY_RULES = `
You are part of a career evidence system. Integrity rules are absolute:
- NEVER invent employers, job titles, dates, responsibilities, achievements, metrics,
  qualifications, outcomes or project details. Use null when something is unknown.
- If a conclusion is an inference rather than a stated fact, say so in the reasoning.
- Prefer "insufficient evidence" over a confident but unsupported conclusion.
- Distinguish transferable evidence from direct evidence. Transferable experience is
  NEVER equivalent to identical experience; say so explicitly.
- Judge level, not keywords: consider scope, complexity, autonomy, decision authority,
  team size, stakeholder seniority and business impact.
- Weigh evidence quality: quantified outcomes and externally validated results are much
  stronger than self-declared skills or course certificates.
- Answer only with the requested JSON object.
`.trim();

export type AIRunMeta = {
  isMock: boolean;
  cached: boolean;
  latencyMs: number;
  provider: string;
};

export type AIRunResult<T> = { data: T; meta: AIRunMeta };

export class AIServiceError extends Error {
  constructor(
    message: string,
    readonly userMessage: string,
  ) {
    super(message);
    this.name = "AIServiceError";
  }
}

export function truncateInput(text: string): string {
  return text.length > MAX_INPUT_CHARS ? `${text.slice(0, MAX_INPUT_CHARS)}\n…[truncated]` : text;
}

export function hasLiveProvider(): boolean {
  return Boolean(process.env["LOVABLE_API_KEY"]);
}

/** Stable, dependency-free content fingerprint used for the analysis cache. */
export function fingerprint(...parts: unknown[]): string {
  const text = parts.map((p) => (typeof p === "string" ? p : JSON.stringify(p))).join("|");
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 + c, 2654435761) >>> 0;
  }
  return `${h1.toString(16)}${h2.toString(16)}`;
}

type SSEEvent = { type?: string; delta?: string };

async function readStreamedText(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new AIServiceError("No response body", "The AI service returned no data.");
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload) as SSEEvent;
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
          text += event.delta;
        }
      } catch {
        // Ignore keep-alive / partial frames.
      }
    }
  }
  return text;
}

async function callGateway(args: {
  system: string;
  input: string;
  schemaName: string;
  jsonSchema: unknown;
}): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AIServiceError("Missing LOVABLE_API_KEY", "AI is not configured.");

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      store: false,
      instructions: `${INTEGRITY_RULES}\n\n${args.system}`,
      input: args.input,
      text: {
        format: {
          type: "json_schema",
          name: args.schemaName,
          strict: true,
          schema: args.jsonSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    if (response.status === 429) {
      throw new AIServiceError(
        `rate limited: ${body}`,
        "The AI service is busy right now. Please try again in a moment.",
      );
    }
    if (response.status === 402) {
      throw new AIServiceError(
        `credits exhausted: ${body}`,
        "AI credits are exhausted for this workspace. Add credits to continue analysing.",
      );
    }
    throw new AIServiceError(
      `gateway ${response.status}: ${body.slice(0, 400)}`,
      "We couldn't reach the AI service. Please try again.",
    );
  }

  return readStreamedText(response);
}

export type AIServiceRun<T> = {
  service: string;
  system: string;
  input: string;
  schemaName: string;
  jsonSchema: unknown;
  schema: z.ZodType<T>;
  mock: () => T;
  cache?: { supabase: SupabaseClient; userId: string; fingerprint: string } | undefined;
};

/**
 * Runs one AI service end to end: cache lookup, provider call (one retry),
 * schema validation, cache write and usage logging.
 */
export async function runAIService<T>(run: AIServiceRun<T>): Promise<AIRunResult<T>> {
  const started = Date.now();

  if (run.cache) {
    const { data } = await run.cache.supabase
      .from("ai_analyses")
      .select("result, is_mock")
      .eq("user_id", run.cache.userId)
      .eq("service", run.service)
      .eq("fingerprint", run.cache.fingerprint)
      .maybeSingle();
    if (data?.result) {
      const parsed = run.schema.safeParse(data.result);
      if (parsed.success) {
        return {
          data: parsed.data,
          meta: {
            isMock: Boolean(data.is_mock),
            cached: true,
            latencyMs: 0,
            provider: data.is_mock ? "mock" : "lovable-ai",
          },
        };
      }
    }
  }

  let result: T;
  let isMock = false;

  if (!hasLiveProvider()) {
    result = run.mock();
    isMock = true;
  } else {
    let lastError: unknown;
    let parsed: T | undefined;
    // One automatic retry only — malformed output or a transient upstream failure.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await callGateway(run);
        if (!raw.trim()) throw new AIServiceError("empty output", "The AI returned no answer.");
        const json: unknown = JSON.parse(raw);
        parsed = run.schema.parse(json);
        break;
      } catch (error) {
        lastError = error;
        if (error instanceof AIServiceError && error.userMessage.includes("credits")) throw error;
      }
    }
    if (parsed === undefined) {
      await logRun(run, { isMock: false, latencyMs: Date.now() - started, error: lastError });
      if (lastError instanceof AIServiceError) throw lastError;
      throw new AIServiceError(
        `unusable AI output: ${String(lastError)}`,
        "The AI response couldn't be read. Try again, or shorten the text you pasted.",
      );
    }
    result = parsed;
  }

  const latencyMs = Date.now() - started;
  await logRun(run, { isMock, latencyMs, result });

  return {
    data: result,
    meta: { isMock, cached: false, latencyMs, provider: isMock ? "mock" : "lovable-ai" },
  };
}

async function logRun<T>(
  run: AIServiceRun<T>,
  info: { isMock: boolean; latencyMs: number; result?: T; error?: unknown },
): Promise<void> {
  if (!run.cache) return;
  // Never log the user's raw career content — only the service, timing and outcome.
  await run.cache.supabase.from("ai_analyses").upsert(
    {
      user_id: run.cache.userId,
      service: run.service,
      fingerprint: run.cache.fingerprint,
      provider: info.isMock ? "mock" : "lovable-ai",
      is_mock: info.isMock,
      latency_ms: info.latencyMs,
      result: (info.result ?? null) as never,
      error: info.error ? String(info.error).slice(0, 500) : null,
    },
    { onConflict: "user_id,service,fingerprint" },
  );
}
