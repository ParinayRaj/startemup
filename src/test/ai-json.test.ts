import { describe, expect, it } from "vitest";
import { MODEL_ID, MODEL_LABEL, parseJson } from "@/lib/ai.server";

describe("Gemini API", () => {
  it("uses a Gemini model and never exposes its name", () => {
    expect(MODEL_ID.startsWith("gemini-")).toBe(true);
    expect(MODEL_LABEL.toLowerCase()).not.toMatch(/gemma|gemini/);
  });

  it("parses JSON wrapped in markdown fences", () => {
    expect(parseJson('```json\n{"score": 7}\n```')).toEqual({ score: 7 });
  });

  it("rejects non-object replies", () => {
    expect(() => parseJson("no json here")).toThrow();
  });
});
