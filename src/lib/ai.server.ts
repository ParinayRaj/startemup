// Server-only Gemma 4 calls through the Google Gemini API.
export const MODEL_ID = "gemma-4-26b-a4b-it";
export const MODEL_LABEL = "Gemma 4";

type Msg = { role: "user" | "assistant"; content: string };

export class AiError extends Error {}

export async function gemmaChat(system: string, messages: Msg[], temperature = 0.25): Promise<string> {
  const key = process.env["GEMINI_API_KEY"];
  if (!key) throw new AiError("The AI service is not configured yet.");
  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        generationConfig: { temperature },
      }),
      signal: AbortSignal.timeout(170_000),
    });
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") throw new AiError("Gemma 4 took too long to respond. Please try again.");
    throw new AiError("Could not reach Gemma 4. Please try again.");
  }
  if (res.status === 429) throw new AiError("Gemma 4 is busy right now (rate limit). Please wait a moment and retry.");
  if (!res.ok) {
    console.error("Gemini API error", res.status, (await res.text()).slice(0, 300));
    throw new AiError("Gemma 4 returned an error. Please try again.");
  }
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };
  const text = (data.candidates?.[0]?.content?.parts ?? []).filter((p) => !p.thought && p.text).map((p) => p.text).join("").trim();
  if (!text) throw new AiError("Gemma 4 returned an empty reply. Please retry.");
  return text;
}

export function parseJson(raw: string): Record<string, unknown> {
  let s = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  const parsed = JSON.parse(s);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
  return parsed as Record<string, unknown>;
}

export async function gemmaJson(prompt: string, what: string) {
  const raw = await gemmaChat("Return valid JSON only. No markdown fences, no commentary.", [{ role: "user", content: prompt }]);
  try {
    return parseJson(raw);
  } catch {
    throw new AiError(`The model returned an unreadable ${what}. Please retry.`);
  }
}
