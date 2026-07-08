/**
 * Çözücü test ajanı: vakayı mock motor üzerinden GERÇEKTEN oynar.
 * Strateji (deterministik "yetkin oyuncu" simülasyonu):
 *   1. Bilgi toplama — her kanıt için, onu bilen masum şüpheliye kanıt metninden türetilmiş soru sorar.
 *   2. Yüzleştirme — suçlunun her yalanı için, çürütücü kanıtla eşik kadar sıkıştırır; sızdırma bekler.
 * Ölçtükleri: toplam soru, sızdırma sayısı, soru limiti aşımı, zorluk hedef bandı.
 * Kullanım: npx tsx scripts/solverTest.ts [cases/SX-0001.json | hepsi]
 */
import fs from "fs";
import path from "path";
import { CaseFile, GameSession } from "../src/types";
import { expandKnows, mockAnswer } from "../src/lib/llm";

/** Zorluk -> hedef çözüm sorusu bandı (kalibrasyon sözleşmesi) */
const TARGET: Record<number, [number, number]> = {
  1: [3, 7],
  2: [5, 9],
  3: [7, 12],
  4: [9, 14],
  5: [11, 15],
};

function freshSession(c: CaseFile): GameSession {
  return {
    deviceId: "solver",
    caseId: c.case_id,
    questionsUsed: 0,
    questionLimit: c.game_config.free_question_limit,
    pressure: {},
    slips: [],
    transcripts: {},
    accused: false,
    solved: null,
  };
}

function solve(c: CaseFile) {
  const session = freshSession(c);
  const log: string[] = [];
  const discovered = new Set<string>();

  // 1) Bilgi toplama: kanıtları masum sahiplerinden çek
  for (const ev of c.evidence) {
    const holder = c.suspects.find((s) => !s.is_culprit && s.knows.includes(ev.id));
    if (!holder) continue;
    session.questionsUsed++;
    const r = mockAnswer(c, holder, session, ev.detail); // kanıt metninden türetilmiş soru
    const ok = r.text.length > 10 && !r.text.startsWith("Bunu neden") && !r.text.startsWith("Uzun bir");
    if (ok) discovered.add(ev.id);
    log.push(`S${session.questionsUsed} [bilgi] ${holder.name} <- "${ev.name}" : ${ok ? "BULUNDU" : "KAÇTI"}`);
  }

  // 2) Yüzleştirme: suçlunun yalanlarını kanıtla kır
  const culprit = c.suspects.find((s) => s.is_culprit)!;
  for (const lie of culprit.lies) {
    const ev = c.evidence.find((e) => e.id === lie.contradicted_by);
    if (!ev) continue;
    let slipped = false;
    for (let i = 0; i < culprit.pressure_threshold + 1 && !slipped; i++) {
      session.questionsUsed++;
      const r = mockAnswer(c, culprit, session, ev.detail + " buna ne diyorsun?");
      if (r.slippedLieId === lie.lie_id) slipped = true;
      log.push(`S${session.questionsUsed} [baskı] ${culprit.name} <- "${ev.name}" : ${slipped ? "AÇIK VERDİ" : "direniyor"}`);
    }
    if (!slipped) log.push(`!! ${lie.lie_id} eşik+1 denemede kırılamadı`);
  }

  const slips = Object.values(session.pressure).filter((v, i) => v >= culprit.pressure_threshold).length;
  return { session, log, discovered, culpritSlips: culprit.lies.filter(l => (session.pressure[l.lie_id] ?? 0) >= culprit.pressure_threshold).length };
}

const arg = process.argv[2];
const dir = path.join(__dirname, "..", "cases");
const files = arg ? [arg] : fs.readdirSync(dir).map((f) => path.join(dir, f)).filter((f) => f.endsWith(".json"));

let failed = false;
for (const f of files) {
  const c = JSON.parse(fs.readFileSync(f, "utf-8")) as CaseFile;
  const { session, log, discovered, culpritSlips } = solve(c);
  const [lo, hi] = TARGET[c.difficulty] ?? [3, 15];
  const used = session.questionsUsed;

  const problems: string[] = [];
  if (used > session.questionLimit) problems.push(`soru limiti aşıldı (${used}/${session.questionLimit})`);
  if (!discovered.has(c.solution.key_evidence_id)) problems.push("kilit kanıta ulaşılamadı");
  const culprit = c.suspects.find((s) => s.is_culprit)!;
  if (culpritSlips < culprit.lies.length) problems.push(`suçlunun ${culprit.lies.length - culpritSlips} yalanı kırılamadı`);
  if (used < lo) problems.push(`çok kolay: ${used} soru < hedef bant [${lo}-${hi}] (zorluk ${c.difficulty})`);
  if (used > hi) problems.push(`çok zor: ${used} soru > hedef bant [${lo}-${hi}] (zorluk ${c.difficulty})`);

  console.log(`\n=== ${c.case_id} "${c.briefing.title}" (zorluk ${c.difficulty}, hedef ${lo}-${hi} soru) ===`);
  log.forEach((l) => console.log("  " + l));
  console.log(`  Toplam: ${used} soru | kanıt: ${discovered.size}/${c.evidence.length} | suçlu sızdırma: ${culpritSlips}/${culprit.lies.length}`);
  if (problems.length) {
    failed = true;
    problems.forEach((p) => console.log(`  ✗ ${p}`));
  } else {
    console.log(`  ✓ ÇÖZÜLEBİLİR ve kalibrasyon bandında`);
  }
}
process.exit(failed ? 1 : 0);
