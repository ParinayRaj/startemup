import { analyzeIdea, buildRoadmap, checkEligibility, coFounderChat, extractDocument } from "./ai.functions";

export interface IdeaAnalysis {
  idea: string; summary: string; problem: string; customers: string[]; strengths: string[];
  risks: string[]; competitors_to_research: string[]; mvp: string[];
  validation_questions: string[]; next_steps: string[]; assumptions: string[];
  verdict: string; score: number; model: string; monetization?: string[]; confidence?: string;
}

export const api = {
  analyze: async (idea: string) => (await analyzeIdea({ data: { idea } })) as unknown as IdeaAnalysis,
  roadmap: (idea: string) => buildRoadmap({ data: { idea } }) as Promise<Record<string, any>>,
  chat: (message: string, history: { role: "user" | "assistant"; content: string }[]) => coFounderChat({ data: { message, history } }),
  extract: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return extractDocument({ data: form });
  },
  eligibility: (profile: string, requirements: string) => checkEligibility({ data: { profile, requirements } }) as Promise<Record<string, any>>,
};
