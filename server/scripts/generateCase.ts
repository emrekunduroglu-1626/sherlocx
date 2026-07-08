/**
 * Vaka üretim pipeline'ı (LIVE — ANTHROPIC_API_KEY gerekir).
 * Akış: güçlü modelle üret -> şema doğrula -> çözücü ajanla oyna -> geçerse cases/'e yaz.
 * Kullanım: npx tsx scripts/generateCase.ts "tema" <zorluk 1-5> <SX-00NN> <YYYY-MM-DD>
 * Örnek:    npx tsx scripts/generateCase.ts "yat limanında sabotaj" 3 SX-0004 2026-07-16
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { callModel } from "../src/lib/llm";

const [theme, diffStr, caseId, releaseDate] = process.argv.slice(2);
if (!theme || !diffStr || !caseId || !releaseDate) {
  console.error('Kullanım: npx tsx scripts/generateCase.ts "tema" <1-5> <SX-00NN> <YYYY-MM-DD>');
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY gerekli — üretim pipeline'ı yalnızca live modda çalışır.");
  process.exit(1);
}

const example = fs.readFileSync(path.join(__dirname, "..", "cases", "SX-0001.json"), "utf-8");

const SYSTEM = `Sen SherlocX oyunu için vaka tasarımcısısın. Görev: verilen tema ve zorlukta,
örnek şemaya BİREBİR uyan, Türkçe, çözülebilir bir dedektiflik vakası üretmek.

Değişmez kurallar:
- Tam 1 suçlu (is_culprit=true) olacak ve solution.culprit_id ile eşleşecek.
- Suçlunun HER yalanında contradicted_by alanı geçerli bir kanıt id'si olacak.
- solution.key_evidence_id, EN AZ BİR masum şüphelinin knows listesinde olacak.
- knows listesinde kanıt id'leri (ev_XX) veya serbest metin olabilir.
- Yalanların "truth" alanı BİRİNCİ ŞAHIS itiraf/sızdırma cümlesi olacak (iç notasyon yok).
- Zorluk arttıkça: şüpheli sayısı (3->5), suçlu pressure_threshold (2->3), kanıt zinciri derinliği artar; zorluk >=3 ise bir masum şüpheliye red_herring ver.
- SADECE geçerli JSON döndür. Markdown bloğu, açıklama, yorum YOK.`;

(async () => {
  console.log(`Üretiliyor: "${theme}" (zorluk ${diffStr})...`);
  const raw = await callModel(
    process.env.GENERATOR_MODEL || "claude-sonnet-4-6",
    SYSTEM,
    [{
      role: "user",
      content: `Örnek şema:\n${example}\n\nTema: ${theme}\nZorluk: ${diffStr}\ncase_id: ${caseId}\nrelease_date: ${releaseDate}\nlanguage: tr\n\nVakayı üret.`,
    }],
    8000
  );

  const clean = raw.replace(/```json|```/g, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(clean);
  } catch (e) {
    console.error("✗ Model geçerli JSON döndürmedi. Ham çıktı /tmp/gen-fail.txt'e yazıldı.");
    fs.writeFileSync("/tmp/gen-fail.txt", raw);
    process.exit(1);
  }

  const outPath = path.join(__dirname, "..", "cases", `${caseId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(parsed, null, 2));
  console.log(`Yazıldı: ${outPath} — doğrulama başlıyor...`);

  try {
    execSync(`npx tsx ${path.join(__dirname, "validateCase.ts")} ${outPath}`, { stdio: "inherit" });
    execSync(`npx tsx ${path.join(__dirname, "solverTest.ts")} ${outPath}`, { stdio: "inherit" });
    console.log(`\n✓ ${caseId} pipeline'ı geçti. Son adım: 30 dk insan okuması — anlatı kalitesi otomatikle ölçülmez.`);
  } catch {
    fs.renameSync(outPath, outPath + ".rejected");
    console.error(`\n✗ ${caseId} doğrulamadan geçemedi -> ${caseId}.json.rejected olarak saklandı. Temayı değiştirip tekrar dene.`);
    process.exit(1);
  }
})();
