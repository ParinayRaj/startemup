import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ideaSchema = z.object({ idea: z.string().trim().min(10).max(5000) });
const chatSchema = z.object({
  message: z.string().trim().min(1).max(5000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(5000) })).max(200).default([]),
});
const eligibilitySchema = z.object({ profile: z.string().trim().min(3).max(5000), requirements: z.string().trim().min(3).max(12000) });

async function run<T>(fn: () => Promise<T>): Promise<T> {
  const { AiError } = await import("./ai.server");
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AiError) throw new Error(e.message);
    console.error(e);
    throw new Error("The AI request failed. Please try again.");
  }
}

export const analyzeIdea = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ideaSchema.parse(d))
  .handler(({ data }) =>
    run(async () => {
      const { gemmaJson, MODEL_LABEL } = await import("./ai.server");
      const prompt = `You are FoundrLens, a careful startup analyst helping an early-stage founder. Analyze the idea below. Do not invent market statistics, competitor facts, customer interviews, or evidence. Mark uncertain statements as assumptions and suggest how to validate them. Return ONLY valid JSON with these keys: summary (string), problem (string), customers (array of strings), strengths (array), risks (array), competitors_to_research (array of strings; say categories/names to investigate, don't claim exhaustive research), mvp (array of strings), validation_questions (array of strings), next_steps (array of strings), assumptions (array of strings), monetization (array of strings), confidence (string: low, medium or high, reflecting how much depends on unverified assumptions), verdict (string), score (integer 1-10). Be practical and specific.\nIDEA: ${data.idea}`;
      const result = await gemmaJson(prompt, "analysis");
      return { ...result, idea: data.idea, model: MODEL_LABEL } as Record<string, unknown>;
    }),
  );

export const buildRoadmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ideaSchema.parse(d))
  .handler(({ data }) =>
    run(async () => {
      const { gemmaJson } = await import("./ai.server");
      const prompt = `Create a realistic 30-day validation-first startup roadmap for this idea: ${data.idea}
Return ONLY JSON with keys: goal (string), week_1, week_2, week_3, week_4 (each an object with focus (string), tasks (array of 3-5 strings), days (array of 7 objects with day (integer 1-30) and task (string)), deliverable (string)), success_metrics (array of strings), risks (array of strings). Assume a student founder with a small budget and limited time. Prioritize customer discovery and validation before building too much. Do not claim results have already happened.`;
      return (await gemmaJson(prompt, "roadmap")) as Record<string, unknown>;
    }),
  );

export const coFounderChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => chatSchema.parse(d))
  .handler(({ data }) =>
    run(async () => {
      const { gemmaChat, MODEL_LABEL } = await import("./ai.server");
      const system =
        "You are FoundrLens AI, a grounded and encouraging startup co-founder for students and first-time founders. Give actionable, concise advice. Ask clarifying questions when needed. Never fabricate live grants, deadlines, market numbers, or legal/financial certainty; explain how to verify them.";
      const reply = await gemmaChat(system, [...data.history.slice(-12), { role: "user", content: data.message }], 0.5);
      return { reply, model: MODEL_LABEL };
    }),
  );

export const checkEligibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => eligibilitySchema.parse(d))
  .handler(({ data }) =>
    run(async () => {
      const { gemmaJson } = await import("./ai.server");
      const prompt = `Compare the founder profile with the opportunity requirements. Do not guess missing facts. Return JSON with: status (exactly one of "Eligible", "Potentially eligible", "Ineligible", "Insufficient information"), match_score (integer 0-100), matched (array of strings, each quoting the requirement text from the document and the profile fact that satisfies it), missing (array), concerns (array), questions_to_confirm (array), disclaimer (string). Distinguish explicit requirements from assumptions. Use "Insufficient information" when the profile or document lacks the facts needed. Never claim eligibility without quoted evidence.\nPROFILE:\n${data.profile}\nREQUIREMENTS:\n${data.requirements}`;
      return (await gemmaJson(prompt, "eligibility result")) as Record<string, unknown>;
    }),
  );

export const extractDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    if (!(d instanceof FormData)) throw new Error("Upload a PDF or TXT file.");
    const file = d.get("file");
    if (!(file instanceof File)) throw new Error("Upload a PDF or TXT file.");
    if (file.size > 8 * 1024 * 1024) throw new Error("File must be smaller than 8 MB.");
    return file;
  })
  .handler(async ({ data: file }) => {
    const name = file.name.toLowerCase();
    let text: string;
    if (name.endsWith(".txt")) text = await file.text();
    else if (name.endsWith(".pdf")) {
      try {
        const { extractText, getDocumentProxy } = await import("unpdf");
        const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
        const out = await extractText(pdf, { mergePages: true });
        text = Array.isArray(out.text) ? out.text.join("\n") : out.text;
      } catch {
        throw new Error("Could not read this PDF. Copy the requirements into the text box instead.");
      }
    } else throw new Error("Upload a PDF or TXT file.");
    if (!text.trim()) throw new Error("No selectable text found. For scanned PDFs, copy the requirements into the text box.");
    return { text: text.slice(0, 12000), filename: file.name };
  });
