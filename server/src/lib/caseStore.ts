import fs from "fs";
import path from "path";
import { CaseFile } from "../types";

const CASES_DIR = path.join(__dirname, "..", "..", "cases");

let cache: CaseFile[] | null = null;

export function loadCases(): CaseFile[] {
  if (cache) return cache;
  const files = fs.readdirSync(CASES_DIR).filter((f) => f.endsWith(".json"));
  cache = files.map((f) => {
    const raw = JSON.parse(fs.readFileSync(path.join(CASES_DIR, f), "utf-8"));
    return raw as CaseFile;
  });
  cache.sort((a, b) => a.release_date.localeCompare(b.release_date));
  return cache;
}

/** Bugünün vakası: release_date <= bugün olan en yeni vaka */
export function getTodayCase(): CaseFile {
  const today = new Date().toISOString().slice(0, 10);
  const cases = loadCases();
  const eligible = cases.filter((c) => c.release_date <= today);
  return eligible.length > 0 ? eligible[eligible.length - 1] : cases[0];
}

export function getCaseById(id: string): CaseFile | undefined {
  return loadCases().find((c) => c.case_id === id);
}

/** İstemciye giden görünüm — çözüm ve şüpheli sırları ASLA client'a gitmez */
export function publicView(c: CaseFile) {
  return {
    case_id: c.case_id,
    release_date: c.release_date,
    difficulty: c.difficulty,
    briefing: c.briefing,
    suspects: c.suspects.map((s) => ({ id: s.id, name: s.name, role: s.role })),
    game_config: {
      free_question_limit: c.game_config.free_question_limit,
      max_answer_sentences: c.game_config.max_answer_sentences,
    },
  };
}
