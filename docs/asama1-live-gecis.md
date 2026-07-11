# Aşama 1 — Gerçek LLM'e Geçiş Kılavuzu

Kodun live tarafı hazır: prompt caching, usage telemetrisi, jailbreak test paketi.
Aşağıdaki adımlar SENİN ortamında, KENDİ API anahtarınla çalıştırılır.
Anahtarı asla repoya, koda veya sohbete yazma — sadece yerel `.env` dosyasına.

## 1. Anahtarı ayarla
```bash
cd server
# .env dosyası oluştur (yoksa)
cp .env.example .env
# .env içine SADECE bu satırı doldur:
#   ANTHROPIC_API_KEY=sk-ant-...
# Modeller (opsiyonel, varsayılanlar yeterli):
#   SUSPECT_MODEL=claude-haiku-4-5
#   VALIDATOR_MODEL=claude-haiku-4-5
#   GENERATOR_MODEL=claude-sonnet-4-6
```
`.env` zaten `.gitignore`'da — commit'e girmez.

## 2. Jailbreak testini GERÇEK modelde çalıştır (kritik)
```bash
npm run case:jailbreak
```
Beklenen: "10/10 güvenli". Live modda bu, gerçek modeli 10 injection saldırısıyla
vurur ve doğrulayıcı katmanın tuttuğunu kanıtlar. Bir tek ihlal bile çıkarsa
(çıkması beklenmiyor ama), o vaka store'a çıkmadan doğrulayıcı sertleştirilir.

## 3. Oyunu gerçek modelle oyna ve maliyeti gözle
```bash
npm run dev
```
Başka bir terminalde birkaç soru sor. Sunucu logunda her soruda şunu göreceksin:
```
[usage] cache HIT | read=1847 write=0 in=112 out=94
```
- **İlk soru:** `cache MISS` + `write=~1800` (sistem promptu cache'e yazıldı, bir kez).
- **Sonraki sorular:** `cache HIT` + `read=~1800` — bu tokenlar ~10x ucuz.
- `out` (çıktı) ~90-130 arası olmalı (3 cümle sınırı çalışıyor demektir).

Cache HIT görmüyorsan: aynı şüpheliyle arka arkaya konuş (cache ~5 dk yaşar) ve
sistem promptunun turdan tura değişmediğini teyit et (değişen tek şey oturum verisi).

## 4. Kalite kontrol listesi (elle, oynarken)
- [ ] Şüpheliler karakterlerine sadık mı? (Deniz esprili/kaçamak, Murat asker disiplini)
- [ ] Suçlu itiraf ETMİYOR ama eşik aşılınca açık veriyor mu?
- [ ] Cevaplar 3 cümleyi aşıyor mu? (aşıyorsa clampSentences kesiyor ama promptu da sıkılaştır)
- [ ] Doğrulayıcı yanlış tetikleniyor mu? (masum cevabı "ifşa" sayıp fallback'e düşürüyorsa gevşet)
- [ ] Türkçe akıcı mı, çeviri kokuyor mu?

## 5. Maliyet doğrulama
Birkaç tam oyun sonrası, deck'teki ~$0,0015/soru hedefini gerçek `usage`
değerleriyle karşılaştır. Formül (Haiku fiyatlarıyla):
```
soru maliyeti ≈ (cacheRead × 0.1 + cacheWrite × 1.25 + in × 1 + out × 5) × birim_fiyat
```
cache HIT oranı yükseldikçe soru maliyeti düşer. Hedef: oturum ortalaması ≤ $0,002.

## Sonraki durak (Aşama 2)
Gerçek model tatmin ediciyse mobil uygulamayı cihazda ayağa kaldır:
`cd app && npx expo install --fix && npx expo start`
