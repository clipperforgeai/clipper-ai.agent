/**
 * AI CLIPPER AGENT - COPYWRITING WORKER
 * 
 * Tugas  : Offload generasi hook/caption/CTA/hashtag dari main thread.
 * Input  : array moments (sudah di-score oleh VideoSignalEngine)
 * Output : array clips siap render oleh script.js
 * 
 * 100% lokal. Tidak butuh jaringan, tidak butuh API key.
 * Bisa dipakai atau diabaikan tanpa merusak UI (opt-in).
 */

importScripts('hooks-db.js');

// ═══════════════════════════════════════════════════════════
// GUARD: pastikan HookEngine tersedia
// ═══════════════════════════════════════════════════════════
const __ENGINE_OK__ = (typeof HookEngine !== 'undefined');

if (!__ENGINE_OK__) {
  self.postMessage({
    type: 'WORKER_ERROR',
    payload: { message: 'HookEngine gagal dimuat dari hooks-db.js' }
  });
}

// ═══════════════════════════════════════════════════════════
// MESSAGE ROUTER
// ═══════════════════════════════════════════════════════════
self.onmessage = function (e) {
  if (!e || !e.data) return;
  const { type, payload } = e.data || {};

  switch (type) {
    case 'PING':
      self.postMessage({ type: 'PONG', payload: { ok: true, ts: Date.now(), engineOk: __ENGINE_OK__ } });
      break;

    case 'GENERATE_COPY_PACKAGES':
      if (!__ENGINE_OK__) {
        self.postMessage({
          type: 'WORKER_ERROR',
          payload: { message: 'HookEngine tidak tersedia, tidak bisa generate copy.' }
        });
        return;
      }
      try {
        const result = generateCopyPackages(payload || {});
        self.postMessage({ type: 'COPY_PACKAGES_READY', payload: result });
      } catch (err) {
        self.postMessage({
          type: 'WORKER_ERROR',
          payload: { message: (err && err.message) ? err.message : String(err) }
        });
      }
      break;

    default:
      self.postMessage({
        type: 'WORKER_ERROR',
        payload: { message: 'Tipe pesan tidak dikenal: ' + type }
      });
  }
};

// ═══════════════════════════════════════════════════════════
// CORE: GENERATE COPY PACKAGES
// ═══════════════════════════════════════════════════════════
function generateCopyPackages(payload) {
  const moments = Array.isArray(payload.moments) ? payload.moments : [];
  const niche = payload.niche || 'Gaming & Esports';
  const region = payload.region || 'id-ID';
  const startIndex = Number.isFinite(payload.startIndex) ? payload.startIndex : 0;

  if (moments.length === 0) {
    return { clips: [], generated: 0, skipped: 0 };
  }

  // usedSet konsisten lintas semua moments → cegah duplikat hook/caption
  const usedSet = { attentions: [], hookBodies: [], captions: [], extras: [] };
  const clips = [];
  let skipped = 0;

  for (let i = 0; i < moments.length; i++) {
    const moment = moments[i];
    const clipIndex = startIndex + i;

    let pkg;
    try {
      pkg = HookEngine.buildUniquePackage(moment, niche, region, clipIndex, usedSet);
    } catch (err) {
      // Fallback minimal — jangan sampai worker mati total
      skipped++;
      pkg = {
        hookHeadline: 'Momen ini wajib ditonton sampai habis.',
        caption: 'Bagian ini bikin suasana berubah dalam hitungan detik.',
        cta: 'Menurut kamu, bakal lanjut ke mana ceritanya?',
        hashtags: ['#fyp', '#viral', '#foryoupage'],
        endingType: moment.endingType || '[LOOP]',
        lang: region.split('-')[0] || 'id'
      };
    }

    clips.push({
      id: clipIndex + 1,
      start: formatTime(moment.startTime),
      end: formatTime(moment.endTime),
      rawStart: moment.startTime,
      rawEnd: moment.endTime,
      duration: moment.duration,
      score: moment.score,
      confidence: moment.confidence || (moment.score >= 70 ? 'HIGH' : moment.score >= 50 ? 'MEDIUM' : 'LOW'),
      signals: moment.signals || [],
      endingType: moment.endingType || '[LOOP]',
      lang: pkg.lang,
      edited: {
        hookHeadline: pkg.hookHeadline,
        caption: pkg.caption,
        cta: pkg.cta
      },
      hashtags: pkg.hashtags
    });
  }

  return { clips, generated: clips.length, skipped };
}

// ═══════════════════════════════════════════════════════════
// UTIL
// ═══════════════════════════════════════════════════════════
function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
}