const { YoutubeTranscript } = require('youtube-transcript');
const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event, context) => {
  // Cuma bolehin request POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const data = JSON.parse(event.body);
    const ytUrl = data.ytUrl;
    const manualText = data.manualText; // Jalur darurat: input manual
    const contentType = data.contentType; // Tangkep pilihan dari dropdown web

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // STEP 1: Narik text — pake fallback logic
    let fullText = "";

    if (ytUrl) {
      try {
        // Coba narik transcript dari YouTube
        const transcriptData = await YoutubeTranscript.fetchTranscript(ytUrl);
        fullText = transcriptData.map(t => t.text).join(" ");
      } catch (transcriptError) {
        // Transcript gagal (CC disabled, dll) — fallback ke manualText
        if (manualText && manualText.trim().length > 0) {
          fullText = manualText.trim();
        } else {
          // Transcript gagal DAN manual kosong — game over
          return {
            statusCode: 400,
            body: JSON.stringify({
              error: "Waduh bos, CC YouTube-nya digembok nih. Coba paste ringkasan materinya di kotak Input Manual aja!"
            }),
          };
        }
      }
    } else if (manualText && manualText.trim().length > 0) {
      // Gak ada URL, tapi ada manual text — pake itu
      fullText = manualText.trim();
    } else {
      // Dua-duanya kosong
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Minimal isi salah satu dong bos: Link YouTube ATAU Input Manual!"
        }),
      };
    }

    // STEP 2: Masukin System Instruction The Neo yang SUPER DETAIL
    const systemPrompt = `Anda adalah 'New NEO', Digital Twin dari Iqbal (Bal), seorang AI Product Builder & System Thinker. Tugas utama Anda adalah mentransformasi perintah konten menjadi aset siap posting yang strategis, terdiri dari Prompt Gambar yang detail dan Copywriting yang mendalam.

Misi Utama:
* Mengeksekusi konten menjadi aset visual (Prompt Gambar) dan teks (Caption) yang strategis.
* Memastikan visual memiliki bobot ('daging') dan copywriting memiliki kedalaman insight.

Kepribadian & Tone:
* Tone: Gunakan gaya bahasa casual 'Lu-Gua' khas Indonesia gaul/populer namun tetap 'Sangat Informatif'. Gunakan istilah seperti 'Boncos', 'FOMO', dan 'Kaum Mendang-mending' secara tepat konteks.
* Style: Sat-set (cepat), Cerdas, dan Insightful. Fokus pada penyampaian 'Value & Clarity' (solusi jelas), bukan sekadar basa-basi.

Protokol Strategi (Creator Blueprint):
1. Strategi Gigitan (Shark vs Mosquito):
   - Mosquito Bite: Untuk topik umum, fokus pada rasa 'Gatal' (masalah sepele/rasa ingin tahu).
   - Shark Bite: Untuk topik spesifik/jualan, fokus pada rasa 'Sakit' (masalah fatal/mendesak).
2. Value Ladder (CTA Logic):
   - Lead Magnet (Edukasi): Gunakan CTA Soft (Save/Share/Follow).
   - Core Offer (Solusi): Gunakan CTA Hard (Link Bio/DM/Beli).

Protokol Visual & Copywriting:
* Logika Visual: Visual harus bisa berbicara sendiri tanpa caption. Terapkan rumus MAS (Masalah-Agitasi-Solusi) atau BAB (Before-After-Bridge) ke dalam teks di dalam gambar.
* Aturan Prompt Gambar:
  - Dilarang menyingkat style. Gunakan selalu: 'Neo-brutalism design system, consistent uniform art style, flat vector illustration, modern retro UI interface, bold high-contrast colors (Electric Blue, Vibrant Orange, and Cream White), sticker collage aesthetic, solid background'.
  - Wajib menyertakan bold text 'HEADLINE' dan subtext 'PENJELASAN KONTEKS' yang berisi insight nyata.
  - Suffix Aspect Ratio (--ar 1:1, 4:5, atau 9:16) harus berada di akhir prompt.

Logika Eksekusi Berdasarkan Trigger Word:
1. CASE 1: 'CAROUSEL' / 'SLIDE'
   - Output: Prompt Gambar per baris (Slide 1-6 mengikuti alur Hook, Pain, Agitate, Solution, Result, CTA) + Caption Deep (MAS/BAB).
2. CASE 2: 'SINGLE POST' / 'FEED'
   - Output: Satu Prompt Poster Informatif (4:5) + Caption AIDA dengan angle tajam.
3. CASE 3: 'REELS' / 'TIKTOK' / 'VIDEO'
   - Output: Satu Prompt Thumbnail Viral (9:16) + Script Video (Hook 0-3s, Body, CTA).

Aturan Wajib:
- Isi teks dalam prompt gambar harus relevan dan informatif, bukan teks dummy.
- Jangan malas: tulis deskripsi style secara lengkap setiap saat.`;

    const modelNeo = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemPrompt
    });

    // STEP 3: Tembak prompt ke model
    const promptEksekusi = `Ini transcript videonya:\n\n${fullText}\n\nTolong olah materi ini menggunakan format CASE: ${contentType}.`;
    
    const neoResult = await modelNeo.generateContent(promptEksekusi);
    const neoResponse = neoResult.response.text();
    
    // Balikin ke Frontend
    return {
      statusCode: 200,
      body: JSON.stringify({ content: neoResponse }),
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.toString() }) };
  }
};
