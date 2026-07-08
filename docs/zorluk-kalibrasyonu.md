# SherlocX — Zorluk Kalibrasyonu (v1)

Zorluk, tek bir sayı değil dört düğmenin bileşkesidir. Çözücü test ajanı
(`npm run case:solve`) her vakayı oynar ve hedef banda göre GEÇTİ/KALDI verir.

| Düğme | Z1 (kolay) | Z2 | Z3 | Z4 | Z5 (Pazar) |
|---|---|---|---|---|---|
| Şüpheli sayısı | 3 | 4 | 4 | 4-5 | 5 |
| Suçlu pressure_threshold | 1 | 2 | 2 | 3 | 3 |
| Suçlu yalan sayısı | 2 | 2 | 2 | 2-3 | 3 |
| Red herring (yalancı masum) | yok | var | var | var | 2 adet |
| Kanıt sayısı | 4 | 4 | 5 | 6 | 6-7 |
| Hedef çözüm bandı (soru) | 3-7 | 5-9 | 7-12 | 9-14 | 11-15 |
| hint_after_questions | 8 | 10 | 11 | 12 | 13 |

## Kurallar (validateCase.ts zorunlu kılar)
1. Suçlunun HER yalanının `contradicted_by` kanıtı olmalı — yoksa vaka çözülemez.
2. Kilit kanıt en az bir MASUM şüphelinin `knows` listesinde olmalı.
3. `truth` alanları birinci şahıs itiraf cümlesi olmalı (ekrana aynen gider).

## Süreç
```
npm run case:generate "tema" 3 SX-0004 2026-07-16   # üret (live)
npm run case:validate                                # şema + bütünlük
npm run case:solve                                   # çözücü ajan + bant kontrolü
# + 30 dk insan okuması: anlatı kalitesi, klişe kontrolü, kültürel ton
```

## Bilinen sınır (dürüst not)
Çözücü ajan mock motorla oynar — "yetkin oyuncu" alt sınırını ölçer. Gerçek
LLM'li üretimde cevap çeşitliliği artar; soft launch'ta gerçek oyuncu medyanı
bandın %20 üstüne çıkarsa eşikleri düşür. Bant, tavan değil pusula.
