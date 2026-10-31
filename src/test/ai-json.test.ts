import { describe, expect, it } from "vitest";
import { MODEL_ID, MODEL_LABEL, parseJson } from "@/lib/ai.server";

describe("Gemma 4 via Gemini API", () => {
  it("uses a Gemma 4 model and labels it Gemma 4", () => {
    expect(MODEL_ID.startsWith("gemma-4")).toBe(true);
    expect(MODEL_LABEL).toBe("Gemma 4");
  });

  it("parses JSON wrapped in markdown fences", () => {
    expect(parseJson('```json\n{"score": 7}\n```')).toEqual({ score: 7 });
  });

  it("rejects non-object replies", () => {
    expect(() => parseJson("no json here")).toThrow();
  });
});
