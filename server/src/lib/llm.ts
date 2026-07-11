import { CaseFile, GameSession, Suspect } from "../types";

const API_URL = "https://api.anthropic.com/v1/messages";

export function isMockMode(): boolean {
  return !process.env.ANTHROPIC_API_KEY;
}

/** Son çağrının cache telemetrisi — maliyet takibi için */
export interface Usage {
  inputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
}
export let lastUsage: Usage | null = null;

/**
 * Gerçek model çağrısı.
 * cacheSystem=true: sistem promptu cache_control ile işaretlenir.
 * Sabit kurallar + karakter dosyası bloğu cache'ten okunur (yaklaşık 10x ucuz),
 * yalnızca değişen oturum verisi (soru + kısa geçmiş) taze işlenir.
 */
export async function callModel(
  model: string,
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
  maxTokens = 220,
  cacheSystem = false
): Promise<string> {
  const systemField = cacheSystem
    ? [{ type: "text", text: system, cache_control: { type: "ephemeral" } }]
    : system;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, system: systemField, max_tokens: maxTokens, messages }),
  });
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}: ${await res.text()}`);
  const data: any = await res.json();

  const u = data.usage ?? {};
  lastUsage = {
    inputTokens: u.input_tokens ?? 0,
    cacheReadTokens: u.cache_read_input_tokens ?? 0,
    cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
    outputTokens: u.output_tokens ?? 0,
  };

  return (data.content ?? [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n")
    .trim();
}

/** ---- Mock mod: API anahtarı olmadan deterministik, oynanabilir cevaplar ---- */

/** Türkçe aksan katlaması: kullanıcı "erişim" yerine "erisim" yazsa da eşleşir */
const foldTr = (s: string): string =>
  s
    .toLowerCase()
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ç/g, "c")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u");

const trTokenize = (s: string): string[] =>
  foldTr(s)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4);

/** Önek eşleşmesi: "paneline" ~ "panele", "karti" ~ "kartinin" (kaba Türkçe ek toleransı) */
const tokenMatch = (a: string, b: string): boolean => {
  const p = a.length <= b.length ? a : b;
  const q = a.length <= b.length ? b : a;
  return p.length >= 4 && q.startsWith(p.slice(0, Math.max(4, p.length - 2)));
};

const overlap = (a: string[], b: string[]): number =>
  a.filter((w) => b.some((x) => tokenMatch(w, x))).length;

/** knows listesindeki kanıt ID'lerini (ev_XX) kanıt metnine açar */
export function expandKnows(c: CaseFile, s: Suspect): string[] {
  return s.knows.map((k) => {
    const ev = c.evidence.find((e) => e.id === k);
    return ev ? ev.detail : k;
  });
}

const EVASIVES = [
  "Bunu neden bana soruyorsunuz dedektif?",
  "Hatırladığım kadarıyla söyleyebileceğim bir şey yok.",
  "Bu sorunun benimle ne ilgisi var?",
  "Uzun bir geceydi, her detayı hatırlamıyorum.",
];

export interface MockResult {
  text: string;
  slippedLieId: string | null;
}

/**
 * Basit anahtar kelime eşleşmesi:
 * 1) Soru bir yalanı çürüten kanıta değiniyorsa baskı sayacını artır;
 *    eşik aşıldıysa gerçeği "sızdır".
 * 2) Soru şüphelinin bildiği bir şeyle örtüşüyorsa onu söyle.
 * 3) Aksi halde kaçamak cevap.
 */
export function mockAnswer(
  c: CaseFile,
  s: Suspect,
  session: GameSession,
  question: string
): MockResult {
  const qt = trTokenize(question);

  for (const lie of s.lies) {
    const ev = c.evidence.find((e) => e.id === lie.contradicted_by);
    const evTokens = trTokenize((ev ? ev.detail + " " + ev.name : "") + " " + lie.breaks_under);
    const claimTokens = trTokenize(lie.claim);
    if (overlap(qt, evTokens) >= 2 || overlap(qt, claimTokens) >= 2) {
      const confronted = overlap(qt, evTokens) >= 2;
      if (confronted) {
        session.pressure[lie.lie_id] = (session.pressure[lie.lie_id] ?? 0) + 1;
      }
      if ((session.pressure[lie.lie_id] ?? 0) >= s.pressure_threshold) {
        return {
          text: `Ben... yani... ${lie.truth}`,
          slippedLieId: lie.lie_id,
        };
      }
      return { text: lie.claim, slippedLieId: null };
    }
  }

  let best: { item: string; score: number } | null = null;
  for (const k of expandKnows(c, s)) {
    const score = overlap(qt, trTokenize(k));
    if (score >= 2 && (!best || score > best.score)) best = { item: k, score };
  }
  if (best) {
    // İç ID'ler kullanıcıya sızmasın: sus_XX -> isim
    let text = best.item;
    for (const other of c.suspects) {
      text = text.split(other.id).join(other.name);
    }
    return { text, slippedLieId: null };
  }

  const idx = (session.questionsUsed + s.id.length) % EVASIVES.length;
  return { text: EVASIVES[idx], slippedLieId: null };
}
