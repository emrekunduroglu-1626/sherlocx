import { CaseFile, GameSession } from "../types";

/**
 * MVP: bellek içi oturum deposu.
 * TODO(prod): Redis'e taşı — çoklu instance + kalıcılık için şart.
 */
const sessions = new Map<string, GameSession>();

const key = (deviceId: string, caseId: string) => `${deviceId}::${caseId}`;

export function getOrCreateSession(deviceId: string, c: CaseFile): GameSession {
  const k = key(deviceId, c.case_id);
  let s = sessions.get(k);
  if (!s) {
    s = {
      deviceId,
      caseId: c.case_id,
      questionsUsed: 0,
      questionLimit: c.game_config.free_question_limit,
      pressure: {},
      slips: [],
      transcripts: {},
      accused: false,
      solved: null,
    };
    sessions.set(k, s);
  }
  return s;
}
