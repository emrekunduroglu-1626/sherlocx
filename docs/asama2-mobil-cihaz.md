# Aşama 2 — Mobil Uygulamayı Cihazda Ayağa Kaldırma

Kod tip kontrolünden geçti (0 hata). Sıradaki iş: gerçek telefonda çalıştırmak.
Kurulumun "sunucu Codespaces'te + telefon dışarıda" olduğu için port yönlendirme kritik.

## Adım 1 — Sunucuyu Codespaces'te başlat ve portu Public yap
```bash
cd server
npm install       # ilk kez
npm run dev       # :4000, mock modda (anahtar yoksa)
```
- Alttaki **BAĞLANTI NOKTALARI (Ports)** sekmesine geç.
- 4000 portunu göreceksin. Üstüne sağ tık -> **Port Visibility -> Public**.
- "Forwarded Address" sütunundaki URL'yi kopyala:
  `https://special-acorn-XXXX-4000.app.github.dev`
- Tarayıcıda `<o-url>/health` aç: `{"ok":true,...}` görürsen port dışarı açık demektir.

## Adım 2 — Uygulamaya sunucu adresini gir
`app/src/api/client.ts` -> `BASE_URL` satırına yukarıdaki URL'yi yaz (sonda / OLMADAN):
```ts
export const BASE_URL = "https://special-acorn-XXXX-4000.app.github.dev";
```

## Adım 3 — Uygulamayı başlat
Telefonuna **Expo Go** uygulamasını kur (App Store / Play Store). Sonra:
```bash
cd app
npm install               # ilk kez
npx expo start            # QR kod çıkar
```
- iPhone: Kamera ile QR'ı okut.
- Android: Expo Go içinden "Scan QR code".
- Codespaces'te QR bağlanmazsa: `npx expo start --tunnel` (ngrok tüneli açar, en güvenilir yol).

## Beklenen ilk akış
1. Ana ekran: "VAKA #1 — Galeri Gecesi" + geri sayım.
2. "Vakayı Aç" -> brifing + 4 şüpheli.
3. "Sorguya Başla" -> şüpheli sekmeleri, soru yaz, cevap gelir, sayaç düşer.
4. "Suçlamaya Geç" -> Deniz'i seç -> sonuç + streak.

## Olası pürüzler
- **Ağ hatası / "Sunucuya ulaşılamadı":** BASE_URL yanlış ya da port Public değil.
  Önce tarayıcıda `<url>/health` çalışıyor mu bak.
- **QR bağlanmıyor:** `--tunnel` ile dene.
- **Metro bundler sürüm uyarısı:** `npx expo install --fix` çalıştır, tekrar başlat.
- **Beyaz ekran:** terminal loglarına bak; genelde BASE_URL veya bir import yolu.

## Bu aşamada ölçtüklerimiz (dürüst)
Bu tip kontrolü "kod derleniyor" der, "her ekran kusursuz" demez. İlk açılışta
küçük UI pürüzleri (klavye örtmesi, buton hizası) çıkabilir — normal. Akış
uçtan uca çalışıyorsa Aşama 2 başarılı; kozmetik cila bir sonraki turda.
