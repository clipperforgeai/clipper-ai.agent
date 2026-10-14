/**
 * ═══════════════════════════════════════════════════════════════════════
 * SMART TRIMMER — Patch Layer untuk MP4TrimEngine (Zero Breaking Change)
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Tugas:
 *   1. Patch MP4TrimEngine.trimToBlob → otomatis pakai Hybrid
 *   2. Fallback ke MP4TrimEngine LAMA kalau hybrid gagal
 *   3. Expose SmartTrimmer.trimVideoFinal untuk penggunaan manual
 * 
 * Kode lama TIDAK DIUBAH — hanya di-wrap.
 * ═══════════════════════════════════════════════════════════════════════
 */

import './webcodecs-trimmer.js';
import './ffmpeg-muxer.js';

const SmartTrimmer = {
  _patched: false,

  // ═══════════════════════════════════════════════════════════════════
  // 1. TUNGGU MODUL SIAP
  // ═══════════════════════════════════════════════════════════════════
  _waitForGlobals(timeoutMs = 10000) {
    return new Promise((resolve) => {
      const start = Date.now();
      const t = setInterval(() => {
        const ready =
          typeof window.WebCodecsTrimmer !== 'undefined' &&
          typeof window.FFmpegMuxer !== 'undefined' &&
          typeof window.MP4TrimEngine !== 'undefined';
        if (ready || Date.now() - start > timeoutMs) {
          clearInterval(t);
          resolve(ready);
        }
      }, 100);
    });
  },

  // ═══════════════════════════════════════════════════════════════════
  // 2. CEK APAKAH HYBRID BISA DIPAKAI
  // ═══════════════════════════════════════════════════════════════════
  canUseHybrid(file) {
    if (!window.WebCodecsTrimmer || !window.FFmpegMuxer) return false;
    if (!window.WebCodecsTrimmer.isSupported()) return false;
    if (!file) return false;

    // Batas aman: 800 MB untuk hybrid (bukan 3 GB seperti kode lama)
    const fileMB = file.size / 1024 / 1024;
    if (fileMB > 800) return false;

    // Cek ekstensi
    const name = (file.name || '').toLowerCase();
    const isMp4Family =
      name.endsWith('.mp4') ||
      name.endsWith('.m4v') ||
      name.endsWith('.mov');

    return isMp4Family;
  },

  // ═══════════════════════════════════════════════════════════════════
  // 3. PIPELINE HYBRID LENGKAP
  // ═══════════════════════════════════════════════════════════════════
  async trimVideoFinal(file, startSec, endSec, onProgress) {
    const { WebCodecsTrimmer, FFmpegMuxer } = window;

    // ─── STEP 1: Video-only via WebCodecs ───
    onProgress?.({ stage: 'video', pct: 0 });
    const videoOnly = await WebCodecsTrimmer.trimVideo(
      file, startSec, endSec,
      {
        quality: 'high',
        onProgress: (p) => onProgress?.({ stage: 'video', pct: p })
      }
    );

    // ─── STEP 2: Ekstrak audio asli (ffmpeg -c copy) ───
    onProgress?.({ stage: 'audio', pct: 0 });
    const audioOnly = await FFmpegMuxer.extractAudio(file, {
      onProgress: (p) => onProgress?.({ stage: 'audio', pct: p })
    });

    // ─── STEP 3: Mux video baru + audio asli ───
    onProgress?.({ stage: 'mux', pct: 0 });
    const finalBlob = await FFmpegMuxer.mux(
      videoOnly,
      audioOnly,
      {
        audioOffsetSec: startSec,
        durationSec: endSec - startSec,
        onProgress: (p) => onProgress?.({ stage: 'mux', pct: p })
      }
    );

    onProgress?.({ stage: 'done', pct: 1 });
    return finalBlob;
  },

  // ═══════════════════════════════════════════════════════════════════
  // 4. PATCH MP4TrimEngine — INI INTI NYA (Zero Breaking Change)
  // ═══════════════════════════════════════════════════════════════════
  patchMP4TrimEngine() {
    if (this._patched) return true;
    if (!window.MP4TrimEngine) return false;
    if (window.MP4TrimEngine.__hybridPatched) {
      this._patched = true;
      return true;
    }

    const self = this;
    const oldTrimToBlob = window.MP4TrimEngine.trimToBlob.bind(window.MP4TrimEngine);

    // ─── Simpan referensi lama sebagai fallback ───
    window.MP4TrimEngine._legacyTrimToBlob = oldTrimToBlob;

    // ─── Override dengan versi hybrid ───
    window.MP4TrimEngine.trimToBlob = async function (file, start, end) {
  const fileMB = file.size / 1024 / 1024;
  console.log(`[SmartTrimmer] 📊 File ${fileMB.toFixed(1)} MB`);

  // ═══ Pakai TrimRouter kalau tersedia ═══
  if (window.TrimRouter && typeof window.TrimRouter.execute === 'function') {
    try {
      return await window.TrimRouter.execute(file, start, end, {
        onProgress: (info) => {
          // Kirim ke UI kalau ada listener
          if (window.MP4TrimEngine._onProgress) {
            window.MP4TrimEngine._onProgress(info);
          }
          if (info.message) {
            console.log(
              `[SmartTrimmer] ${info.stage}: ${info.message}`
            );
          }
        },
        userPrefs: window.MP4TrimEngine._userPrefs || {},
      });
    } catch (e) {
      console.warn('[SmartTrimmer] TrimRouter gagal, fallback legacy:', e.message);
      // Lanjut ke fallback di bawah
    }
  }

  // ═══ Fallback lama ═══
  console.log('[SmartTrimmer] 🔄 Pakai MP4TrimEngine legacy...');
  return oldTrimToBlob(file, start, end);
};

      // ═══ Coba hybrid dulu ═══
      if (self.canUseHybrid(file)) {
        try {
          console.log('[SmartTrimmer] 🎬 Coba Hybrid WebCodecs + FFmpeg Mux...');
          const blob = await self.trimVideoFinal(file, start, end, (info) => {
            console.log(
              `[SmartTrimmer] ${info.stage}: ${Math.round(info.pct * 100)}%`
            );
          });
          console.log('[SmartTrimmer] ✅ Hybrid sukses!');
          return blob;
        } catch (e) {
          console.warn(
            '[SmartTrimmer] ⚠️ Hybrid gagal, fallback ke legacy. Reason:',
            e.message
          );
          // Lanjut ke fallback
        }
      }

      // ═══ Fallback ke kode lama ═══
      console.log('[SmartTrimmer] 🔄 Pakai MP4TrimEngine legacy...');
      return oldTrimToBlob(file, start, end);
    };

    window.MP4TrimEngine.__hybridPatched = true;
    window.MP4TrimEngine.trim = async function (file, start, end, filename) {
      const blob = await window.MP4TrimEngine.trimToBlob(file, start, end);
      window.MP4TrimEngine._downloadBlob(blob, filename);
    };

    this._patched = true;
    console.log('[SmartTrimmer] ✅ MP4TrimEngine berhasil dipatch (hybrid-ready)');
    return true;
  },

  // ═══════════════════════════════════════════════════════════════════
  // 5. BOOT — auto-init saat DOM ready
  // ═══════════════════════════════════════════════════════════════════
  async boot() {
    console.log('[SmartTrimmer] 🚀 Boot...');

    const ready = await this._waitForGlobals(15000);
    if (!ready) {
      console.warn('[SmartTrimmer] ⚠️ Modul tidak lengkap, patch dibatalkan');
      return;
    }

    // Patch MP4TrimEngine
    let tries = 0;
    const t = setInterval(() => {
      if (this.patchMP4TrimEngine() || ++tries > 30) {
        clearInterval(t);
        if (this.patched) {
          console.log(
            '%c[SmartTrimmer] ✅ FULL STACK READY — Hybrid aktif',
            'color:#10b981;font-weight:bold;'
          );
        }
      }
    }, 200);
  }
};

// ═══════════════════════════════════════════════════════════════════════
// EXPOSE GLOBAL
// ═══════════════════════════════════════════════════════════════════════
if (typeof window !== 'undefined') {
  window.SmartTrimmer = SmartTrimmer;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SmartTrimmer.boot());
  } else {
    SmartTrimmer.boot();
  }
}

export default SmartTrimmer;