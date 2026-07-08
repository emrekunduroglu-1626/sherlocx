export interface Lie {
  lie_id: string;
  claim: string;
  truth: string;
  breaks_under: string;
  /** Bu yalanı çürüten kanıtın id'si (baskı sayacı bununla tetiklenir) */
  contradicted_by?: string | null;
}

export interface Suspect {
  id: string;
  name: string;
  role: string;
  personality: string;
  is_culprit: boolean;
  knows: string[];
  hides: string[];
  lies: Lie[];
  pressure_threshold: number;
  red_herring?: string | null;
}

export interface Evidence {
  id: string;
  name: string;
  detail: string;
  discoverable_via: string;
}

export interface TimelineEntry {
  time: string;
  event: string;
  witnessed_by: string[];
}

export interface GameConfig {
  free_question_limit: number;
  premium_question_limit: number;
  max_answer_sentences: number;
  accusation_requires_evidence: boolean;
  hint_after_questions: number;
  hint_text: string;
}

export interface CaseFile {
  case_id: string;
  release_date: string;
  difficulty: number;
  language: string;
  briefing: {
    title: string;
    setting: string;
    crime: string;
    known_facts: string[];
  };
  solution: {
    culprit_id: string;
    motive: string;
    method: string;
    key_evidence_id: string;
    reveal_narrative: string;
  };
  timeline: TimelineEntry[];
  evidence: Evidence[];
  suspects: Suspect[];
  game_config: GameConfig;
}

export interface ChatTurn {
  role: "player" | "suspect";
  content: string;
}

export interface GameSession {
  deviceId: string;
  caseId: string;
  questionsUsed: number;
  questionLimit: number;
  /** lie_id -> kanıtla sıkıştırılma sayısı */
  pressure: Record<string, number>;
  /** Sızdırılan gerçekler (kanıt panosu) */
  slips: { suspectId: string; lieId: string; truth: string }[];
  transcripts: Record<string, ChatTurn[]>;
  accused: boolean;
  solved: boolean | null;
}
