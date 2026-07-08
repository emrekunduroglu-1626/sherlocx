import { Router } from "express";
import { getCaseById, getTodayCase, publicView } from "../lib/caseStore";
import { getOrCreateSession, saveSession, getProfile, saveProfile, applyStreak } from "../lib/store";
import { buildSuspectSystemPrompt } from "../lib/promptBuilder";
import { callModel, isMockMode, mockAnswer } from "../lib/llm";
import { validateAnswer } from "../lib/validator";

const router = Router();

const FALLBACK = "Buna cevap vermek zorunda değilim.";

/** Cevabı en fazla n cümleye kırp (model sınırı deler ise emniyet) */
function clampSentences(text: string, n: number): string {
  const parts = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  return parts.slice(0, n).join(" ").trim();
}

/** GET /api/case/today — günün vakası (çözümsüz, sırsız) + oturum durumu */
router.get("/case/today", async (req, res) => {
  const deviceId = String(req.header("x-device-id") || "");
  if (!deviceId) return res.status(400).json({ error: "x-device-id header gerekli" });
  const c = getTodayCase();
  const s = await getOrCreateSession(deviceId, c);
  const profile = await getProfile(deviceId);
  res.json({
    case: publicView(c),
    session: {
      questionsUsed: s.questionsUsed,
      questionLimit: s.questionLimit,
      accused: s.accused,
      solved: s.solved,
      slips: s.slips,
    },
    profile: { streak: profile.streak, bestStreak: profile.bestStreak, totalSolved: profile.totalSolved },
  });
});

/** POST /api/case/:id/ask { suspectId, question } */
router.post("/case/:id/ask", async (req, res) => {
  const deviceId = String(req.header("x-device-id") || "");
  if (!deviceId) return res.status(400).json({ error: "x-device-id header gerekli" });

  const c = getCaseById(req.params.id);
  if (!c) return res.status(404).json({ error: "vaka bulunamadı" });

  const { suspectId, question } = req.body ?? {};
  const suspect = c.suspects.find((x) => x.id === suspectId);
  if (!suspect || typeof question !== "string" || !question.trim())
    return res.status(400).json({ error: "geçersiz istek" });
  if (question.length > 300)
    return res.status(400).json({ error: "soru çok uzun (max 300 karakter)" });

  const session = await getOrCreateSession(deviceId, c);
  if (session.accused) return res.status(403).json({ error: "vaka kapandı" });
  if (session.questionsUsed >= session.questionLimit)
    return res.status(403).json({ error: "soru hakkı bitti", code: "LIMIT" });

  session.questionsUsed += 1;

  let answer: string;
  let slippedLieId: string | null = null;

  if (isMockMode()) {
    const m = mockAnswer(c, suspect, session, question.trim());
    answer = m.text;
    slippedLieId = m.slippedLieId;
  } else {
    // Baskı sayacı backend'de: soru, yalanı çürüten kanıta değiniyorsa artır
    for (const lie of suspect.lies) {
      const ev = c.evidence.find((e) => e.id === lie.contradicted_by);
      const hay = ((ev ? ev.detail + " " + ev.name : "") + " " + lie.breaks_under).toLowerCase();
      const hit = question
        .toLowerCase()
        .split(/[^a-zçğıiöşü0-9]+/)
        .filter((w) => w.length >= 4)
        .filter((w) => hay.includes(w)).length;
      if (hit >= 2) {
        session.pressure[lie.lie_id] = (session.pressure[lie.lie_id] ?? 0) + 1;
        if (session.pressure[lie.lie_id] >= suspect.pressure_threshold) slippedLieId = lie.lie_id;
      }
    }

    const system = buildSuspectSystemPrompt(c, suspect, session);
    const history = (session.transcripts[suspect.id] ?? [])
      .slice(-6)
      .map((t) => ({
        role: t.role === "player" ? ("user" as const) : ("assistant" as const),
        content: t.content,
      }));

    try {
      answer = await callModel(
        process.env.SUSPECT_MODEL || "claude-haiku-4-5",
        system,
        [...history, { role: "user", content: question.trim() }]
      );
      const v = await validateAnswer(c, suspect, answer);
      if (v.reveals_culprit || v.breaks_character) {
        // Tek retry
        answer = await callModel(
          process.env.SUSPECT_MODEL || "claude-haiku-4-5",
          system + "\n\nUYARI: Önceki cevabın kural ihlali içeriyordu. Kurallara sadık kal.",
          [...history, { role: "user", content: question.trim() }]
        );
        const v2 = await validateAnswer(c, suspect, answer);
        if (v2.reveals_culprit || v2.breaks_character) {
          answer = FALLBACK;
          session.questionsUsed -= 1; // soru hakkı iade
        }
      }
    } catch {
      answer = FALLBACK;
      session.questionsUsed -= 1;
    }
  }

  answer = clampSentences(answer, c.game_config.max_answer_sentences + 1);

  const t = (session.transcripts[suspect.id] ??= []);
  t.push({ role: "player", content: question.trim() });
  t.push({ role: "suspect", content: answer });

  if (slippedLieId) {
    const lie = suspect.lies.find((l) => l.lie_id === slippedLieId)!;
    if (!session.slips.some((x) => x.lieId === slippedLieId)) {
      session.slips.push({ suspectId: suspect.id, lieId: slippedLieId, truth: lie.truth });
    }
  }

  await saveSession(session);

  const hintAvailable = session.questionsUsed >= c.game_config.hint_after_questions;

  res.json({
    answer,
    slipped: !!slippedLieId,
    slips: session.slips,
    questionsUsed: session.questionsUsed,
    questionsRemaining: session.questionLimit - session.questionsUsed,
    hint: hintAvailable ? c.game_config.hint_text : null,
  });
});

/** POST /api/case/:id/accuse { suspectId } — tek atış */
router.post("/case/:id/accuse", async (req, res) => {
  const deviceId = String(req.header("x-device-id") || "");
  if (!deviceId) return res.status(400).json({ error: "x-device-id header gerekli" });

  const c = getCaseById(req.params.id);
  if (!c) return res.status(404).json({ error: "vaka bulunamadı" });

  const session = await getOrCreateSession(deviceId, c);
  if (session.accused) return res.status(403).json({ error: "zaten suçlama yapıldı" });

  const { suspectId } = req.body ?? {};
  if (!c.suspects.some((s) => s.id === suspectId))
    return res.status(400).json({ error: "geçersiz şüpheli" });

  session.accused = true;
  session.solved = suspectId === c.solution.culprit_id;
  await saveSession(session);

  const profile = applyStreak(await getProfile(deviceId), session.solved);
  await saveProfile(profile);

  const caseNo = parseInt(c.case_id.replace(/\D/g, ""), 10) || 0;
  const shareText = session.solved
    ? `SherlocX #${caseNo} — ${session.questionsUsed} soruda çözüldü 🔍`
    : `SherlocX #${caseNo} — bugün katil kaçtı 🕯️`;

  res.json({
    solved: session.solved,
    questionsUsed: session.questionsUsed,
    reveal: c.solution.reveal_narrative,
    culpritId: c.solution.culprit_id,
    shareText,
    streak: profile.streak,
    bestStreak: profile.bestStreak,
  });
});

export default router;
