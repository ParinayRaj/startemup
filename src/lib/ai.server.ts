// Server-only AI calls through the Google Gemini API. The model name is never shown in the UI.
// flash-lite has a much larger free-tier daily quota than flash (which allows only 20 requests/day).
export const MODEL_ID = "gemini-2.5-flash-lite";
export const MODEL_LABEL = "FoundrLens AI";

type Msg = { role: "user" | "assistant"; content: string };

export class AiError extends Error {}

export async function gemmaChat(system: string, messages: Msg[], temperature = 0.25): Promise<string> {
  const key = process.env["GOOGLE_API_KEY"] || process.env["GEMINI_API_KEY"];
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
    if (e instanceof Error && e.name === "TimeoutError") throw new AiError("The AI took too long to respond. Please try again.");
    throw new AiError("Could not reach the AI. Please try again.");
  }
  if (res.status === 429) {
    console.error("Gemini API rate limit", MODEL_ID, (await res.text()).slice(0, 300));
    throw new AiError("The AI has hit its usage limit for now. Please wait a moment and retry.");
  }
  if (!res.ok) {
    console.error("Gemini API error", res.status, (await res.text()).slice(0, 300));
    if (res.status === 401 || res.status === 403) throw new AiError("The AI service key is invalid. Please update it.");
    throw new AiError("The AI returned an error. Please try again.");
  }
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };
  const text = (data.candidates?.[0]?.content?.parts ?? []).filter((p) => !p.thought && p.text).map((p) => p.text).join("").trim();
  if (!text) throw new AiError("The AI returned an empty reply. Please retry.");
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
