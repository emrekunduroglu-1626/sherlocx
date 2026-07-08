import { CaseFile, Suspect } from "../types";
import { buildValidatorPrompt } from "./promptBuilder";
import { callModel, isMockMode } from "./llm";

export interface ValidationResult {
  reveals_culprit: boolean;
  breaks_character: boolean;
}

/**
 * Cevap ekrana gitmeden denetim. Mock modda her zaman geçer
 * (mock cevaplar dosyadan türediği için güvenli).
 */
export async function validateAnswer(
  c: CaseFile,
  s: Suspect,
  answer: string
): Promise<ValidationResult> {
  if (isMockMode()) return { reveals_culprit: false, breaks_character: false };
  try {
    const raw = await callModel(
      process.env.VALIDATOR_MODEL || "claude-haiku-4-5",
      "Sen bir içerik denetleyicisisin. Sadece geçerli JSON döndürürsün.",
      [{ role: "user", content: buildValidatorPrompt(c, s, answer) }],
      60
    );
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return {
      reveals_culprit: !!parsed.reveals_culprit,
      breaks_character: !!parsed.breaks_character,
    };
  } catch {
    // Denetleyici düşerse güvenli tarafta kal: cevabı engelle
    return { reveals_culprit: true, breaks_character: false };
  }
}
