import Redis from "ioredis";
import { CaseFile, GameSession } from "../types";

/**
 * Anahtar-değer soyutlaması: REDIS_URL varsa Redis, yoksa bellek içi.
 * Tek env değişkeniyle prod'a geçiş — kod değişikliği yok.
 */
interface KV {
  get(k: string): Promise<string | null>;
  set(k: string, v: string, ttlSec?: number): Promise<void>;
}

class MemoryKV implements KV {
  private m = new Map<string, { v: string; exp: number | null }>();
  async get(k: string) {
    const e = this.m.get(k);
    if (!e) return null;
    if (e.exp && Date.now() > e.exp) {
      this.m.delete(k);
      return null;
    }
    return e.v;
  }
  async set(k: string, v: string, ttlSec?: number) {
    this.m.set(k, { v, exp: ttlSec ? Date.now() + ttlSec * 1000 : null });
  }
}

class RedisKV implements KV {
  private r: Redis;
  constructor(url: string) {
    this.r = new Redis(url, { maxRetriesPerRequest: 2 });
  }
  async get(k: string) {
    return this.r.get(k);
  }
  async set(k: string, v: string, ttlSec?: number) {
    if (ttlSec) await this.r.set(k, v, "EX", ttlSec);
    else await this.r.set(k, v);
  }
}

const kv: KV = process.env.REDIS_URL ? new RedisKV(process.env.REDIS_URL) : new MemoryKV();
export const storeMode = () => (process.env.REDIS_URL ? "redis" : "memory");

/** ---- Oyun oturumu (48 saat TTL — vaka günlük, ertesi gün çöp) ---- */
const SESSION_TTL = 48 * 3600;

export async function getOrCreateSession(deviceId: string, c: CaseFile): Promise<GameSession> {
  const k = `sx:sess:${deviceId}:${c.case_id}`;
  const raw = await kv.get(k);
  if (raw) return JSON.parse(raw) as GameSession;
  const s: GameSession = {
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
  await kv.set(k, JSON.stringify(s), SESSION_TTL);
  return s;
}

export async function saveSession(s: GameSession): Promise<void> {
  await kv.set(`sx:sess:${s.deviceId}:${s.caseId}`, JSON.stringify(s), SESSION_TTL);
}

/** ---- Oyuncu profili: streak (TTL yok, kalıcı) ---- */
export interface Profile {
  deviceId: string;
  streak: number;
  bestStreak: number;
  totalSolved: number;
  totalPlayed: number;
  lastResultDate: string | null; // YYYY-MM-DD (UTC)
  lastResultSolved: boolean | null;
}

export async function getProfile(deviceId: string): Promise<Profile> {
  const raw = await kv.get(`sx:prof:${deviceId}`);
  if (raw) return JSON.parse(raw) as Profile;
  return {
    deviceId,
    streak: 0,
    bestStreak: 0,
    totalSolved: 0,
    totalPlayed: 0,
    lastResultDate: null,
    lastResultSolved: null,
  };
}

export async function saveProfile(p: Profile): Promise<void> {
  await kv.set(`sx:prof:${p.deviceId}`, JSON.stringify(p));
}

const dayStr = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Streak kuralı (Wordle usulü):
 * - Çözüm + dün de çözmüştü -> streak+1
 * - Çözüm + dün oynamadı/çözemedi -> streak=1
 * - Başarısız -> streak=0
 */
export function applyStreak(p: Profile, solved: boolean, now = new Date()): Profile {
  const today = dayStr(now);
  const yesterday = dayStr(new Date(now.getTime() - 86400000));
  if (p.lastResultDate === today) return p; // aynı gün ikinci sonuç olmaz (tek vaka)
  if (solved) {
    p.streak = p.lastResultDate === yesterday && p.lastResultSolved ? p.streak + 1 : 1;
    p.bestStreak = Math.max(p.bestStreak, p.streak);
    p.totalSolved += 1;
  } else {
    p.streak = 0;
  }
  p.totalPlayed += 1;
  p.lastResultDate = today;
  p.lastResultSolved = solved;
  return p;
}
