# 🇬🇧 LingoBerk — Proje Kılavuzu

## 1. Ne İşe Yarar?

Kişisel İngilizce öğrenme ve özellikle **YDS sınavına hazırlık** odaklı bir **PWA**
(Progressive Web App). Kelime ezberini bilimsel aralıklı tekrar algoritmasıyla yönetir,
dil bilgisi ve okuma modüllerini AI ile zenginleştirir.

**Tek cümlede:** YDS odaklı, AI destekli kişisel İngilizce çalışma uygulaması.

## 2. Modüller / Özellikler

- **Flashcards:** **SM-2 algoritması** ile aralıklı tekrar (spaced repetition) — kelimeyi
  ne zaman tekrar göstereceğine performansına göre karar verir.
- **Grammar:** AI destekli dil bilgisi açıklamaları.
- **Reading:** Okuma anlama modülleri.
- **PWA:** Telefona kurulur, çevrimdışı çalışabilir.
- **Çoklu LLM:** Anthropic (Claude), OpenAI ve Gemini ile entegre.

## 3. Teknoloji

| Katman | Seçim |
|--------|-------|
| Framework | Next.js 14 (App Router) |
| State | Zustand (`store/`) |
| Animasyon | Framer Motion |
| Grafik | Recharts (ilerleme) |
| PWA | next-pwa |
| İçerik | `data/` (kelime/okuma setleri) |
| LLM | Claude / OpenAI / Gemini |

## 4. Nasıl Çalıştırılır?

```bash
npm install
npm run dev          # http://localhost:3000
```

**Env:** kullanılan LLM sağlayıcılarının API anahtarları (`.env.local`). Detay: `LingoBerk-PRD.md`.

## 5. Nasıl Geliştirilebilir? (Fikirler)

- **Bulut senkron:** İlerleme şu an cihazda; Supabase ile hesap + cihazlar arası senkron.
- **YDS deneme sınavı:** Süreli, gerçek formatta tam deneme + sonuç analizi.
- **Zayıf nokta analizi:** Yanlışlardan otomatik tekrar listesi ve konu önerisi.
- **Dinleme/telaffuz:** TTS ile kelime telaffuzu, STT ile konuşma pratiği.
- **AI üretimli içerik:** Seviyene göre özgün okuma parçası + soru üretimi.
- **Gamification:** Seri (streak), günlük hedef, rozet — düzenli çalışmayı teşvik.
- **Model güncellemesi:** En güncel Claude modeline geçiş; maliyet için yanıt önbelleği.

## 6. Dikkat

- LLM çağrıları ücretli — önbellek + günlük limit ekle.
- next-pwa Next.js 14 ile uyumlu; service worker önbelleğini sürüm yükseltmede test et.
- Klasördeki `LingoBerk.zip` / `LingoBerk 2.zip` yedeklerdir; aktif kod kök dizindedir.
