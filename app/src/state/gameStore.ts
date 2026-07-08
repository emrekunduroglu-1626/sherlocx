import { create } from "zustand";

export interface SuspectPublic { id: string; name: string; role: string; }
export interface ChatMsg { role: "player" | "suspect"; content: string; slipped?: boolean; }
export interface Slip { suspectId: string; lieId: string; truth: string; }

interface GameState {
  caseId: string | null;
  caseNo: number;
  briefing: any | null;
  suspects: SuspectPublic[];
  questionsUsed: number;
  questionLimit: number;
  transcripts: Record<string, ChatMsg[]>;
  slips: Slip[];
  hint: string | null;
  accused: boolean;
  solved: boolean | null;
  reveal: string | null;
  shareText: string | null;

  loadCase: (payload: any) => void;
  addTurn: (suspectId: string, q: string, a: string, slipped: boolean) => void;
  setProgress: (used: number, remaining: number, slips: Slip[], hint: string | null) => void;
  setResult: (r: { solved: boolean; reveal: string; shareText: string; questionsUsed: number }) => void;
}

export const useGame = create<GameState>((set) => ({
  caseId: null,
  caseNo: 0,
  briefing: null,
  suspects: [],
  questionsUsed: 0,
  questionLimit: 15,
  transcripts: {},
  slips: [],
  hint: null,
  accused: false,
  solved: null,
  reveal: null,
  shareText: null,

  loadCase: (p) =>
    set({
      caseId: p.case.case_id,
      caseNo: parseInt(String(p.case.case_id).replace(/\D/g, ""), 10) || 0,
      briefing: p.case.briefing,
      suspects: p.case.suspects,
      questionsUsed: p.session.questionsUsed,
      questionLimit: p.session.questionLimit,
      slips: p.session.slips ?? [],
      accused: p.session.accused,
      solved: p.session.solved,
      transcripts: {},
      hint: null,
      reveal: null,
      shareText: null,
    }),

  addTurn: (suspectId, q, a, slipped) =>
    set((s) => ({
      transcripts: {
        ...s.transcripts,
        [suspectId]: [
          ...(s.transcripts[suspectId] ?? []),
          { role: "player", content: q },
          { role: "suspect", content: a, slipped },
        ],
      },
    })),

  setProgress: (used, _remaining, slips, hint) =>
    set({ questionsUsed: used, slips, hint }),

  setResult: (r) =>
    set({ accused: true, solved: r.solved, reveal: r.reveal, shareText: r.shareText, questionsUsed: r.questionsUsed }),
}));
