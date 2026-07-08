/**
 * Vaka şema + bütünlük doğrulayıcı.
 * Kullanım: npx tsx scripts/validateCase.ts [cases/SX-0001.json | hepsi]
 * Çıkış kodu: 0 = geçti, 1 = hata var (CI'da kullanılabilir).
 */
import fs from "fs";
import path from "path";
import { CaseFile } from "../src/types";

function validate(c: CaseFile, file: string): string[] {
  const errs: string[] = [];
  const susIds = new Set(c.suspects.map((s) => s.id));
  const evIds = new Set(c.evidence.map((e) => e.id));

  // Suçlu bütünlüğü
  const culprits = c.suspects.filter((s) => s.is_culprit);
  if (culprits.length !== 1) errs.push(`tam 1 suçlu olmalı, ${culprits.length} var`);
  if (!susIds.has(c.solution.culprit_id)) errs.push(`solution.culprit_id (${c.solution.culprit_id}) şüpheliler arasında yok`);
  if (culprits[0] && culprits[0].id !== c.solution.culprit_id)
    errs.push(`is_culprit=true olan (${culprits[0].id}) ile solution.culprit_id uyuşmuyor`);

  // Kanıt bütünlüğü
  if (!evIds.has(c.solution.key_evidence_id)) errs.push(`key_evidence_id (${c.solution.key_evidence_id}) kanıtlar arasında yok`);

  for (const s of c.suspects) {
    if (s.pressure_threshold < 1) errs.push(`${s.id}: pressure_threshold >= 1 olmalı`);
    for (const l of s.lies) {
      if (l.contradicted_by && !evIds.has(l.contradicted_by))
        errs.push(`${s.id}/${l.lie_id}: contradicted_by (${l.contradicted_by}) kanıtlar arasında yok`);
      // KRİTİK KURAL: suçlunun her yalanının çürütücü kanıtı olmalı — yoksa vaka çözülemez
      if (s.is_culprit && !l.contradicted_by)
        errs.push(`${s.id}/${l.lie_id}: SUÇLUNUN yalanının contradicted_by kanıtı YOK — vaka çözülemez olur`);
    }
    if (s.is_culprit && s.lies.length === 0) errs.push(`${s.id}: suçlunun en az 1 yalanı olmalı`);
    for (const k of s.knows) {
      if (k.startsWith("ev_") && !evIds.has(k)) errs.push(`${s.id}: knows içindeki ${k} kanıtlar arasında yok`);
    }
  }

  // Kilit kanıta en az bir masum şüpheli üzerinden ulaşılabilmeli
  const keyHolders = c.suspects.filter((s) => !s.is_culprit && s.knows.includes(c.solution.key_evidence_id));
  if (keyHolders.length === 0)
    errs.push(`kilit kanıt (${c.solution.key_evidence_id}) hiçbir masum şüphelinin knows listesinde değil — ulaşılamaz`);

  // Zaman çizelgesi tanıkları
  for (const t of c.timeline)
    for (const w of t.witnessed_by)
      if (!susIds.has(w)) errs.push(`timeline "${t.time}": tanık ${w} şüpheliler arasında yok`);

  // Config
  const g = c.game_config;
  if (g.free_question_limit < 5 || g.free_question_limit > 30) errs.push("free_question_limit 5-30 arası olmalı");
  if (g.hint_after_questions >= g.free_question_limit) errs.push("hint, soru limiti dolmadan gelmeli");
  if (![1, 2, 3, 4, 5].includes(c.difficulty)) errs.push("difficulty 1-5 arası olmalı");

  return errs;
}

const arg = process.argv[2];
const dir = path.join(__dirname, "..", "cases");
const files = arg ? [arg] : fs.readdirSync(dir).map((f) => path.join(dir, f)).filter((f) => f.endsWith(".json"));

let failed = false;
for (const f of files) {
  const c = JSON.parse(fs.readFileSync(f, "utf-8")) as CaseFile;
  const errs = validate(c, f);
  if (errs.length) {
    failed = true;
    console.log(`✗ ${c.case_id} (${path.basename(f)})`);
    errs.forEach((e) => console.log(`   - ${e}`));
  } else {
    console.log(`✓ ${c.case_id} — şema ve bütünlük tamam`);
  }
}
process.exit(failed ? 1 : 0);
