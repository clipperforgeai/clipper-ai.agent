/**
 * ═══════════════════════════════════════════════════════════════════════════
 * main.js — Entry Module v2.0 (SAFE REWRITE)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * REWRITE PENUH tanpa menyentuh DOM.
 * Tidak mengubah script.js, features-v2.js, atau AI layer manapun.
 * 
 * Tugas:
 *   1. Expose window.trimVideoFinal() → orkestrator hybrid trim
 *   2. Expose window.quickSaveToGallery() → save + share helper
 *   3. Log status modul untuk debugging
 *   4. TIDAK query DOM (biar tidak crash kalau elemen tidak ada)
 * 
 * Boot order di Index.html:
 *   script.js → AI layer → features-v2 → main.js → hybrid layer
 * 
 * main.js TIDAK perlu load hybrid layer manual — sudah di-load oleh
 * <script type="module" src="./webcodecs-trimmer.js"> dll di Index.html.
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // ─── Guard: jangan double-run ───
  if (window.__MAIN_V2_LOADED) return;
  window.__MAIN_V2_LOADED = true;

  console.log(
    '%c[Main v2] 🚀 Entry module loaded — safe mode, tidak menyentuh DOM',
    'color:#38bdf8;font-weight:bold;'
  );

  // ═══════════════════════════════════════════════════════════════════════
  // 1. UNIFIED TRIM HELPER — panggil engine terbaik yang tersedia
  // ═══════════════════════════════════════════════════════════════════════
  /**
   * Orkestrator hybrid trim. Coba engine dalam urutan prioritas:
   *   1. TrimRouter (paling cerdas — pilih metode otomatis)
   *   2. SmartTrimmer (WebCodecs + FFmpeg mux)
   *   3. MP4TrimEngine (lossless legacy atau yang sudah dipatch)
   *   4. FFmpegManager (MediaRecorder fallback)
   * 
   * @param {File}   file      — file video
   * @param {number} startSec  — awal trim (detik)
   * @param {number} endSec    — akhir trim (detik)
   * @param {Function} onProgress — callback({ stage, pct, message })
   * @returns {Promise<Blob>}
   */
  window.trimVideoFinal = async function (file, startSec, endSec, onProgress) {
    if (!file) throw new Error('trimVideoFinal: file tidak boleh null');

    const has = (name) => typeof window[name] !== 'undefined';

    // ─── Prioritas 1: TrimRouter ───
    if (has('TrimRouter') && window.TrimRouter && typeof window.TrimRouter.execute === 'function') {
      console.log('[Main] 🎯 Pakai TrimRouter (auto-route)');
      return window.TrimRouter.execute(file, startSec, endSec, {
        onProgress: onProgress || null,
      });
    }

    // ─── Prioritas 2: SmartTrimmer ───
    if (has('SmartTrimmer') && window.SmartTrimmer && typeof window.SmartTrimmer.trimVideoFinal === 'function') {
      console.log('[Main] 🔄 Pakai SmartTrimmer (hybrid direct)');
      return window.SmartTrimmer.trimVideoFinal(file, startSec, endSec, onProgress);
    }

    // ─── Prioritas 3: MP4TrimEngine ───
    if (has('MP4TrimEngine') && typeof window.MP4TrimEngine.trimToBlob === 'function') {
      console.log('[Main] 🔄 Pakai MP4TrimEngine (lossless legacy/patch)');
      return window.MP4TrimEngine.trimToBlob(file, startSec, endSec);
    }

    // ─── Prioritas 4: FFmpegManager (MediaRecorder) ───
    if (has('FFmpegManager') && typeof window.FFmpegManager.processRealCanvasTrimToBlob === 'function') {
      console.log('[Main] 🔄 Pakai FFmpegManager (MediaRecorder fallback)');
      return window.FFmpegManager.processRealCanvasTrimToBlob(file, startSec, endSec, {
        fps: 30,
        videoBitrateMbps: 4.0,
      });
    }

    throw new Error(
      'Tidak ada trim engine yang tersedia.\n' +
      'Cek console untuk error saat load modul (mp4-trim.js, webcodecs-trimmer.js, dll).'
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // 2. QUICK SAVE TO GALLERY — trim + share/download
  // ═══════════════════════════════════════════════════════════════════════
  /**
   * Trim lalu simpan ke galeri via Web Share API.
   * Fallback ke download anchor kalau share tidak didukung.
   * 
   * @param {File}   file
   * @param {number} startSec
   * @param {number} endSec
   * @param {string} filename  — optional
   * @returns {Promise<Blob>}
   */
  window.quickSaveToGallery = async function (file, startSec, endSec, filename) {
    const blob = await window.trimVideoFinal(file, startSec, endSec, (info) => {
      if (info && info.message) {
        console.log('[Main] ' + info.stage + ': ' + info.message);
      }
    });

    if (!blob || blob.size === 0) throw new Error('Blob kosong');

    const name = filename || ('clip_' + Date.now() + '.mp4');
    const fileObj = new File([blob], name, { type: blob.type || 'video/mp4' });

    // ─── Coba Web Share API ───
    try {
      if (navigator.canShare && navigator.canShare({ files: [fileObj] })) {
        await navigator.share({
          files: [fileObj],
          title: 'Simpan ke Galeri',
          text: 'Pilih "Simpan" / "Save to Photos"',
        });
        console.log('[Main] ✅ Terkirim via Web Share');
        return blob;
      }
    } catch (err) {
      if (err && err.name === 'AbortError') {
        console.log('[Main] User cancel share');
        return blob;
      }
      console.warn('[Main] Web Share gagal, fallback download:', err.message);
    }

    // ─── Fallback: download ───
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);

    console.log('[Main] ✅ Ter-download: ' + name);
    return blob;
  };

  // ═══════════════════════════════════════════════════════════════════════
  // 3. DEBUG HELPER — status modul
  // ═══════════════════════════════════════════════════════════════════════
  function logModuleStatus() {
    const check = (name) => (typeof window[name] !== 'undefined' ? '✅' : '❌');

    console.log(
      '%c[Main v2] 📊 Status Modul:',
      'color:#10b981;font-weight:bold;font-size:13px;'
    );
    console.table({
      'Orchestrator (script.js)': check('renderPage'),
      'MP4TrimEngine': check('MP4TrimEngine'),
      'WebCodecsTrimmer': check('WebCodecsTrimmer'),
      'FFmpegMuxer': check('FFmpegMuxer'),
      'SmartTrimmer': check('SmartTrimmer'),
      'TrimRouter': check('TrimRouter'),
      'AIEngine': check('AIEngine'),
      'HookEngine': check('HookEngine'),
      'FFmpegManager': check('FFmpegManager'),
      'AIWorkerBridge': check('AIWorkerBridge'),
      'AutoConfig': check('AutoConfig'),
      'CapCutEngine': check('CapCutEngine'),
    });

    // ─── Warning kalau engine penting hilang ───
    const critical = ['MP4TrimEngine', 'FFmpegManager'];
    const missing = critical.filter((name) => typeof window[name] === 'undefined');

    if (missing.length > 0) {
      console.warn(
        '%c[Main v2] ⚠️ Modul kritis tidak terdeteksi: ' + missing.join(', '),
        'color:#f59e0b;font-weight:bold;'
      );
      console.warn('[Main v2] Trim mungkin akan gagal. Cek Network tab untuk 404.');
    } else {
      console.log(
        '%c[Main v2] ✅ Semua modul kritis OK',
        'color:#10b981;font-weight:bold;'
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 4. EXPOSE CONSOLE COMMANDS — untuk debugging manual
  // ═══════════════════════════════════════════════════════════════════════
  window.__main = {
    version: '2.0.0',
    status: logModuleStatus,
    trim: window.trimVideoFinal,
    save: window.quickSaveToGallery,
    engines: function () {
      return {
        MP4TrimEngine: !!window.MP4TrimEngine,
        WebCodecsTrimmer: !!window.WebCodecsTrimmer,
        FFmpegMuxer: !!window.FFmpegMuxer,
        SmartTrimmer: !!window.SmartTrimmer,
        TrimRouter: !!window.TrimRouter,
        FFmpegManager: !!window.FFmpegManager,
      };
    },
  };

  console.log(
    '%c[Main v2] 💡 Debug: window.__main.status()',
    'color:#8b5cf6;font-weight:bold;'
  );

  // ═══════════════════════════════════════════════════════════════════════
  // 5. BOOT — delay log biar modul lain selesai load
  // ═══════════════════════════════════════════════════════════════════════
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(logModuleStatus, 3000);
    });
  } else {
    setTimeout(logModuleStatus, 3000);
  }

  console.log(
    '%c[Main v2] ✅ READY — script.js tetap jadi orkestrator UI utama',
    'color:#10b981;font-weight:bold;font-size:13px;padding:4px 0;'
  );
})();