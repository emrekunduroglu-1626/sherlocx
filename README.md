# SherlocX — Günlük AI Sorgu Oyunu (MVP v0.1)

İki parça: `server/` (Node + Express + TS) ve `app/` (Expo / React Native, iOS + Android tek codebase).

## Hızlı başlangıç

### 1) Sunucu
```bash
cd server
npm install
cp .env.example .env          # anahtar YOKSA mock modda çalışır (maliyet sıfır)
npm run dev                   # http://localhost:4000
```
Mock mod: deterministik cevaplar, oyun uçtan uca oynanabilir. Gerçek model için
`.env` içine `ANTHROPIC_API_KEY` yaz — başka hiçbir şey değişmez.

### 2) Mobil uygulama
```bash
cd app
npm install
npx expo install --fix        # RN sürüm hizalaması
# src/api/client.ts -> BASE_URL'i bilgisayarının yerel IP'sine çevir (localhost cihazda çalışmaz)
npx expo start                # QR ile Expo Go'da aç (iOS/Android)
```

## Mimari kararlar (neden böyle)
- **Soru limiti sunucuda** — client'a güvenilmez; limit hem oyun mekaniği hem maliyet tavanı.
- **Gerçek, vaka dosyasında (cases/*.json)** — LLM sadece rol yapar; halüsinasyon oyunu bozamaz.
- **Baskı sayacı backend'de** — "kaç kez sıkıştırıldım" hafızası modele bırakılmaz.
- **Doğrulayıcı katman** — cevap ekrana gitmeden suçlu ifşası/rol kırılması denetimi (live modda).
- **Mock mod** — anahtar yoksa anahtar kelime eşleşmeli deterministik motor; geliştirme bedava.

## API
- `GET  /health`
- `GET  /api/case/today` (header: `x-device-id`)
- `POST /api/case/:id/ask { suspectId, question }`
- `POST /api/case/:id/accuse { suspectId }` — tek atış

## v0.2'de eklendi
- [x] Redis oturum + profil deposu (`REDIS_URL` set edilince otomatik; yoksa bellek içi)
- [x] Streak (sunucu tarafı, Wordle usulü) + Home/Result rozetleri
- [x] 3 vaka (zorluk 1/2/4) + kalibrasyon sözleşmesi (docs/zorluk-kalibrasyonu.md)
- [x] Vaka pipeline'ı: `case:generate` (live) -> `case:validate` -> `case:solve` (çözücü ajan)

## Bilinçli eksikler (sıradaki işler)
- [ ] Bildirimler
- [ ] RevenueCat (Plus aboneliği) + reklam SDK (rewarded: +3 soru)
- [ ] Paylaşım kartı görseli (şu an düz metin Share)
- [ ] Rate limiting + auth sertleştirme (TwinMatch JWT altyapısı buraya taşınacak)
- [ ] Prompt caching header'ları (live modda maliyet için kritik)
