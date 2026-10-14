/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LLM ENGINE v2.0 — HUMAN VOICE EDITION
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Tujuan: Real LLM (transformers.js) tapi output = bahasa manusia
     
 *         bukan: "Saya menemukan momen ini sangat menarik"
 * 
 * Strategi:
 *  1. Few-shot examples (4-6 contoh per region) di dalam prompt
 *  2. Negative rules: dilarang kata formal & AI-voice
 *  3. Temperature tinggi (1.05) → lebih spontan
 *  4. Post-processing: strip frasa AI kalau masih lolos
 *  5. Output 1 baris hook + 1-2 baris caption + 1 CTA
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';
  if (window.__LLM_ENGINE_LOADED) return;
  window.__LLM_ENGINE_LOADED = true;

  const LLM = {
    ready: false,
    loading: false,
    enabled: (() => {
      try { return localStorage.getItem('ai-agent-llm-enabled') === '1'; }
      catch (e) { return false; }
    })(),
    generator: null,
    modelKey: (() => {
      try { return localStorage.getItem('ai-agent-llm-model') || 'small'; }
      catch (e) { return 'small'; }
    })(),
    capability: null
  };

  // ═══════════════════════════════════════════════════════════════════════
  // MODELS
  // ═══════════════════════════════════════════════════════════════════════
  LLM.MODELS = {
    'tiny':   { id: 'Xenova/LaMini-Flan-T5-77M',  task: 'text2text-generation', sizeMB: 80,  label: '⚡ Tiny (80 MB) — Cepat',           backend: 'wasm' },
    'small':  { id: 'Xenova/LaMini-Flan-T5-248M', task: 'text2text-generation', sizeMB: 250, label: '⚖️ Small (250 MB) — Rekomendasi',   backend: 'wasm' },
    'medium': { id: 'Xenova/LaMini-Flan-T5-783M', task: 'text2text-generation', sizeMB: 780, label: '🎯 Medium (780 MB) — Paling natural', backend: 'wasm' }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // CAPABILITY
  // ═══════════════════════════════════════════════════════════════════════
  LLM.detectCapability = function () {
    const ram = navigator.deviceMemory || 2;
    const hasWebGPU = !!navigator.gpu;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    let recommended = 'tiny';
    if (ram >= 8 && !isMobile) recommended = 'medium';
    else if (ram >= 4) recommended = 'small';

    return { ram, hasWebGPU, isMobile, recommended };
  };

  // ═══════════════════════════════════════════════════════════════════════
  // FEW-SHOT EXAMPLES PER REGION — the SECRET SAUCE
  // ═══════════════════════════════════════════════════════════════════════
  const HUMAN_EXAMPLES = {
    'id-ID': [
      {
        topic: 'trading saham',
        out: 'Hook: GILA! ORANG ITU BELI SAHAM\nCaption: Detik-detik dia nekat beli di harga merah. Nggak ada yang berani, cuma dia. Yang ngeh, komen.\nCTA: Komen pendapatmu'
      },
      {
        topic: 'gaming mobile legends',
        out: 'Hook: NJIR! 1 HP CLUTCH\nCaption: Semua udah nyerah, dia malah comeback. Kayak nggak ada rasa takut.\nCTA: Rate 1-10'
      },
      {
        topic: 'podcast motivasi',
        out: 'Hook: BENER BANGET SIH\nCaption: Yang dia bilang ini bikin mikir ulang. Simpel, tapi nyentuh.\nCTA: Save dulu'
      },
      {
        topic: 'makanan pedas',
        out: 'Hook: MUKA DIA MERAH PARAH\nCaption: Baru suapan pertama udah nyerah. Temennya malah ketawa.\nCTA: Yang berani coba, komen'
      },
      {
        topic: 'reaksi lucu',
        out: 'Hook: WKWKWK TIMING-NYA PAS\nCaption: Nggak ada yang expect dia bakal gitu. Bahkan kameramen ketawa.\nCTA: Yang ngakak, komen'
      }
    ],
    'en-US': [
      {
        topic: 'stock trading',
        out: 'Hook: BRO WHAT?! HE BOUGHT THE DIP\nCaption: Everyone was panic selling. He went all in. Crazy or genius?\nCTA: Drop your thoughts'
      },
      {
        topic: 'gaming clutch',
        out: 'Hook: 1 HP CLUTCH!!\nCaption: Team already gave up. He said watch this. Insane.\nCTA: Rate it 1-10'
      },
      {
        topic: 'podcast wisdom',
        out: 'Hook: THIS HIT DIFFERENT\nCaption: Simple words but it changed how I think. Watch till the end.\nCTA: Save this'
      },
      {
        topic: 'funny reaction',
        out: 'Hook: NAH TIMING IS INSANE\nCaption: Nobody saw it coming. Even the camera guy lost it.\nCTA: If you laughed, comment'
      }
    ],
    'en-GB': [
      {
        topic: 'football goal',
        out: 'Hook: PROPER MADNESS MATE!\nCaption: Last minute, impossible angle. Stadium went mental.\nCTA: Rate it 1-10'
      },
      {
        topic: 'podcast',
        out: 'Hook: SPOT ON MATE\nCaption: He said what everyone was thinking. Simple but brutal.\nCTA: Save this bit'
      }
    ],
    'en-CA': [
      {
        topic: 'hockey goal',
        out: 'Hook: NO WAY EH!!\nCaption: Last second. Impossible angle. The whole rink lost it.\nCTA: Rate it 1-10'
      }
    ]
  };

  // ═══════════════════════════════════════════════════════════════════════
  // ANTI-AI-VOICE RULES (dilarang pakai ini)
  // ═══════════════════════════════════════════════════════════════════════
  const BANNED_PHRASES_ID = [
    'saya menemukan', 'klip ini menunjukkan', 'momen ini adalah',
    'dapat dilihat', 'merupakan', 'terlihat bahwa', 'dalam video ini',
    'pada momen tersebut', 'hal ini menunjukkan', 'sangat menarik',
    'luar biasa sekali', 'momen yang mengesankan', 'konten ini',
    'video ini menampilkan', 'akhirnya', 'oleh karena itu',
    'dengan demikian', 'berdasarkan analisis', 'hasil dari',
    'algoritma ini', 'sistem kami', 'ai mendeteksi'
  ];

  const BANNED_PHRASES_EN = [
    'i found', 'this clip shows', 'this moment is', 'can be seen',
    'represents', 'it appears that', 'in this video', 'at that moment',
    'this indicates', 'very interesting', 'amazing moment', 'this content',
    'this video displays', 'therefore', 'consequently', 'based on analysis',
    'the algorithm', 'our system', 'ai detected', 'in conclusion'
  ];

  // ═══════════════════════════════════════════════════════════════════════
  // LOAD MODEL
  // ═══════════════════════════════════════════════════════════════════════
  LLM.load = async function (modelKey, onProgress) {
    if (LLM.ready && LLM.modelKey === modelKey) return true;
    if (LLM.loading) {
      return new Promise(r => {
        const t = setInterval(() => {
          if (LLM.ready || !LLM.loading) { clearInterval(t); r(LLM.ready); }
        }, 200);
      });
    }

    const model = LLM.MODELS[modelKey || LLM.modelKey];
    if (!model) return false;

    LLM.loading = true;
    LLM.capability = LLM.detectCapability();

    try {
      if (onProgress) onProgress(`🧠 Memuat transformers.js...`);

      const { pipeline, env } = await import(
        'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2'
      );

      env.allowLocalModels = false;
      env.useBrowserCache = true;
      env.backends.onnx.wasm.numThreads = Math.min(4, navigator.hardwareConcurrency || 2);

      if (onProgress) onProgress(`📥 Download ${model.label}...`);

      let lastPct = 0;
      LLM.generator = await pipeline(model.task, model.id, {
        progress_callback: (data) => {
          if (data.status === 'progress' && onProgress) {
            const pct = Math.round(data.progress || 0);
            if (pct > lastPct + 5) {
              lastPct = pct;
              onProgress(`📥 Download model: ${pct}%`);
            }
          }
        }
      });

      LLM.ready = true;
      LLM.modelKey = modelKey || LLM.modelKey;
      LLM.loading = false;
      try { localStorage.setItem('ai-agent-llm-model', LLM.modelKey); } catch (e) {}

      console.log(`[LLM] ✅ Ready: ${model.id}`);
      return true;

    } catch (e) {
      console.warn('[LLM] Load gagal:', e.message);
      LLM.loading = false;
      LLM.ready = false;
      return false;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // PROMPT BUILDER — the CRITICAL part
  // ═══════════════════════════════════════════════════════════════════════
  LLM.buildPrompt = function (clip, niche, region, context) {
    const isID = (region || 'id-ID').startsWith('id');
    const examples = HUMAN_EXAMPLES[region] || HUMAN_EXAMPLES['id-ID'];

    const topic = (context && context.topic) || niche || (isID ? 'video seru' : 'interesting clip');
    const people = (context && context.people) || '';
    const extra = (context && context.extra) || '';

    // Pick 3 random examples untuk few-shot
    const picks = [];
    const pool = examples.slice();
    for (let i = 0; i < 3 && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      picks.push(pool.splice(idx, 1)[0]);
    }

    const exampleText = picks.map(ex => {
      const ctx = ex.topic ? `Contoh untuk topik: ${ex.topic}` : '';
      return `${ctx}\n${ex.out}`;
    }).join('\n\n');

    let ctxLine = `Topik: ${topic}`;
    if (people) ctxLine += ` | Orang: ${people}`;
    if (extra) ctxLine += ` | Info: ${extra}`;

    if (isID) {
      return `Tulis copy TikTok bahasa Indonesia GAYA MANUSIA (bukan gaya AI formal).

${ctxLine}

ATURAN WAJIB:
- Gaya kayak lagi ngomong ke temen, bukan laporan
- Boleh pakai: GILA, NJIR, ANJIR, WKWK, PARAH, GOKIL, BUSET, YA AMPUN, LAH, BEJIR
- HURUF KAPITAL buat penekanan kata kunci
- Pendek. Hook max 7 kata. Caption max 2 kalimat. CTA max 5 kata.
- DILARANG: "saya", "ini adalah", "momen ini menunjukkan", "sangat", "luar biasa", "konten ini", "video ini menampilkan", "dapat dilihat", "merupakan"
- Jangan pakai tanda kutip
- Output TEPAT 3 baris: Hook, Caption, CTA

CONTOH:
${exampleText}

Sekarang tulis untuk: ${topic}
Hook:`;
    } else {
      return `Write TikTok copy in natural human English (NOT formal AI voice).

${ctxLine}

MANDATORY RULES:
- Sound like talking to a friend, not a report
- Allowed: BRO, NAH, WHAT, WILD, INSANE, NO WAY, FR, DEADASS, YO
- ALL CAPS for emphasis on key words
- Short. Hook max 7 words. Caption max 2 sentences. CTA max 5 words.
- FORBIDDEN: "I found", "this clip shows", "this moment is", "very", "amazing", "content", "represents", "can be seen", "therefore"
- No quotation marks
- Output EXACTLY 3 lines: Hook, Caption, CTA

EXAMPLES:
${exampleText}

Now write for: ${topic}
Hook:`;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // POST-PROCESSING — strip AI-voice jika masih lolos
  // ═══════════════════════════════════════════════════════════════════════
  LLM.humanize = function (text, region) {
    if (!text) return '';
    let t = String(text).trim();

    // Buang tanda kutip
    t = t.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim();

    // Buang prefix template yang sering muncul
    t = t.replace(/^(Hook|Caption|CTA|Hashtag[s]?)\s*[:：]\s*/i, '').trim();

    // Buang frasa AI-voice
    const banned = (region || '').startsWith('id') ? BANNED_PHRASES_ID : BANNED_PHRASES_EN;
    for (const phrase of banned) {
      const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      t = t.replace(re, '');
    }

    // Rapikan double space
    t = t.replace(/\s+/g, ' ').trim();

    // Kalau berakhir tanpa tanda baca, biarkan (biasanya memang sengaja)
    // Kalau mulai dengan huruf kecil aneh, kapitalkan
    if (t && /^[a-z]/.test(t)) t = t.charAt(0).toUpperCase() + t.slice(1);

    return t;
  };

  // ═══════════════════════════════════════════════════════════════════════
  // GENERATE COPY — 1 clip
  // ═══════════════════════════════════════════════════════════════════════
  LLM.generateCopy = async function (clip, niche, region, context) {
    if (!LLM.ready || !LLM.generator) return null;

    const prompt = LLM.buildPrompt(clip, niche, region, context);

    try {
      const result = await LLM.generator(prompt, {
        max_new_tokens: 120,
        temperature: 1.05,     // tinggi → spontan, tidak kaku
        do_sample: true,
        top_p: 0.92,
        top_k: 50,
        repetition_penalty: 1.25,
        no_repeat_ngram_size: 3
      });

      const raw = Array.isArray(result)
        ? (result[0].generated_text || '')
        : (result.generated_text || '');

      // Parse 3-baris output
      const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

      let hook = '', caption = '', cta = '';

      // Cari dengan label dulu
      for (const line of lines) {
        const m = line.match(/^(hook|caption|cta)\s*[:：]\s*(.+)$/i);
        if (m) {
          const key = m[1].toLowerCase();
          const val = m[2].trim();
          if (key === 'hook') hook = val;
          else if (key === 'caption') caption = val;
          else if (key === 'cta') cta = val;
        }
      }

      // Fallback: ambil baris berurutan kalau label hilang
      if (!hook && lines[0]) hook = lines[0];
      if (!caption && lines[1]) caption = lines[1];
      if (!cta && lines[2]) cta = lines[2];

      // Humanize
      hook = LLM.humanize(hook, region);
      caption = LLM.humanize(caption, region);
      cta = LLM.humanize(cta, region);

      // Sanity check — kalau hook < 3 karakter, anggap gagal
      if (hook.length < 3) return null;

      // Fallback CTA
      if (!cta) cta = (region || '').startsWith('id') ? 'Komen di bawah 👇' : 'Drop a comment below 👇';

      // Hashtag dari topik + niche
      const hashtags = LLM._buildHashtags(niche, region, context);

      return { hook, caption, cta, hashtags };

    } catch (e) {
      console.warn('[LLM] Generate gagal:', e.message);
      return null;
    }
  };

  LLM._buildHashtags = function (niche, region, context) {
    const isID = (region || '').startsWith('id');
    const base = isID
      ? ['#fyp', '#viral', '#foryoupage', '#trending', '#shortsviral']
      : ['#fyp', '#viral', '#foryoupage', '#trending', '#shorts'];

    const tags = [];
    if (context && context.topic) {
      context.topic
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length >= 3)
        .slice(0, 2)
        .forEach(w => tags.push('#' + w));
    }

    const nicheTag = '#' + String(niche || 'content').replace(/[^a-z0-9]/gi, '').toLowerCase();
    if (nicheTag.length > 2) tags.push(nicheTag);

    for (const t of base) {
      if (tags.length >= 5) break;
      if (!tags.includes(t)) tags.push(t);
    }

    return tags.slice(0, 5);
  };

  // ═══════════════════════════════════════════════════════════════════════
  // TOGGLE
  // ═══════════════════════════════════════════════════════════════════════
  LLM.setEnabled = function (on) {
    LLM.enabled = !!on;
    try { localStorage.setItem('ai-agent-llm-enabled', on ? '1' : '0'); } catch (e) {}
  };

  LLM.unload = function () {
    LLM.generator = null;
    LLM.ready = false;
  };

  window.LLMEngine = LLM;
  console.log('[LLM v2.0 Human Voice] ✅ Loaded');
})();