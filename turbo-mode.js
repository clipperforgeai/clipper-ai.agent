/**
 * AI CLIPPER AGENT - TURBO MODE
 * 
 * Override VideoSignalEngine tanpa mengubah script.js.
 * Speed up analisis 5-10x lipat.
 * 
 * Cara kerja:
 * - Monkey-patch analyzeVideoSignalsEnhanced & analyzeVideoSignals
 * - Ganti dengan versi turbo (sample lebih sedikit, no audio, no face)
 * - script.js tetap panggil Enhanced → otomatis dapat versi turbo
 * 
 * Load SETELAH script.js di index.html
 */

(function() {
  'use strict';
  if (window.__TURBO_MODE_LOADED) return;
  window.__TURBO_MODE_LOADED = true;

  console.log('%c[Turbo Mode] 📦 Loading...', 'color:#38bdf8;font-weight:bold;');

  function boot() {
    if (!window.VideoSignalEngine) {
      setTimeout(boot, 100);
      return;
    }

    const Engine = window.VideoSignalEngine;

    // Jangan install dua kali
    if (Engine.__turboInstalled) return;
    Engine.__turboInstalled = true;

    // ═══════════════════════════════════════════════════════════
    // FUNGSI TURBO BARU
    // ═══════════════════════════════════════════════════════════
    Engine._turboAnalysis = async function(video, file, duration, rules, onProgress, onClipFound) {
      if (onProgress) onProgress('⚡ TURBO MODE aktif...');

      const fileMB = file ? (file.size / (1024 * 1024)) : 0;

      // ═══════════════════════════════════════════════════════════
      // ADAPTIVE SAMPLING — makin besar file, makin sedikit sample
      // ═══════════════════════════════════════════════════════════
      let MAX_SAMPLES = 12;
      if (fileMB > 100)  MAX_SAMPLES = 20;
      if (fileMB > 500)  MAX_SAMPLES = 15;
      if (fileMB > 2000) MAX_SAMPLES = 10;
      if (fileMB > 5000) MAX_SAMPLES = 8;

      console.log(`[Turbo] File ${fileMB.toFixed(1)}MB → ${MAX_SAMPLES} sample`);

      const W = 80, H = 45;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: false });

      const interval = duration / MAX_SAMPLES;
      const frames = [];
      const prevGray = new Uint8Array(W * H);
      let prevReady = false;
      const origTime = video.currentTime;
      const t0 = Date.now();

      // ═══════════════════════════════════════════════════════════
      // LOOP SAMPLING CEPAT — timeout seek pendek (700ms)
      // ═══════════════════════════════════════════════════════════
      for (let i = 0; i < MAX_SAMPLES; i++) {
        const t = i * interval;

        if (onProgress && i % 3 === 0) {
          onProgress(`⚡ Turbo scan ${i + 1}/${MAX_SAMPLES} (${Math.round((i / MAX_SAMPLES) * 100)}%)...`);
        }

        const ok = await Engine.seekVideoFast(video, t, 700);
        if (!ok) continue;

        try {
          ctx.drawImage(video, 0, 0, W, H);
          const imgData = ctx.getImageData(0, 0, W, H).data;
          const len = W * H;
          let brightSum = 0;
          let motion = 0;

          if (prevReady) {
            let diff = 0;
            for (let p = 0, idx = 0; p < imgData.length; p += 4, idx++) {
              const g = (imgData[p] * 77 + imgData[p + 1] * 150 + imgData[p + 2] * 29) >> 8;
              brightSum += g;
              const d = g - prevGray[idx];
              diff += d < 0 ? -d : d;
              prevGray[idx] = g;
            }
            motion = Math.min(100, (diff / (len * 255)) * 400);
          } else {
            for (let p = 0, idx = 0; p < imgData.length; p += 4, idx++) {
              const g = (imgData[p] * 77 + imgData[p + 1] * 150 + imgData[p + 2] * 29) >> 8;
              brightSum += g;
              prevGray[idx] = g;
            }
            prevReady = true;
          }

          let edgeDensity = 0;
          try { edgeDensity = Engine._edgeDensity(imgData, W, H); } catch (e) {}

          frames.push({
            time: t,
            motion: Math.round(motion),
            brightness: brightSum / len,
            edgeDensity,
            faceCount: 0,
            audio: 0,
            isSpeech: false,
            isMusic: false,
            isLaughter: false,
            isSilence: true,
            emphasis: 0
          });
        } catch (e) {
          console.warn('[Turbo] Frame skip:', e);
        }

        // Yield ke UI supaya tidak freeze
        await new Promise(r => setTimeout(r, 0));
      }

      // Restore video position
      try { video.currentTime = origTime; } catch (e) {}

      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      if (onProgress) onProgress(`✅ ${frames.length} frame dalam ${elapsed}s. Scoring...`);

      if (frames.length < 3) {
        if (onProgress) onProgress('⚠️ Frame terlalu sedikit.');
        return [];
      }

      // ═══════════════════════════════════════════════════════════
      // POST-PROCESS — pakai fungsi asli, tapi karena faceCount=0
      // dan audio=0, scoring otomatis fokus ke motion + edge
      // ═══════════════════════════════════════════════════════════
      return Engine._postProcessEnhanced.call(Engine, frames, duration, rules, onProgress, onClipFound);
    };

    // ═══════════════════════════════════════════════════════════
    // OVERRIDE FUNGSI LAMA → redirect ke turbo
    // ═══════════════════════════════════════════════════════════

    // ENHANCED → TURBO
    Engine.analyzeVideoSignalsEnhanced = function(video, file, duration, rules, onProgress, onClipFound) {
      return Engine._turboAnalysis.call(Engine, video, file, duration, rules, onProgress, onClipFound);
    };

    // BASIC → TURBO
    Engine.analyzeVideoSignals = function(video, file, duration, rules, onProgress, onClipFound) {
      return Engine._turboAnalysis.call(Engine, video, file, duration, rules, onProgress, onClipFound);
    };

    // HUGE → tetap pakai HUGE asli (sudah cepat)
    // Tidak di-override.

    console.log('%c[Turbo Mode] ✅ Aktif — analisis 5-10x lebih cepat', 'color:#10b981;font-weight:bold;');
    console.log('[Turbo Mode] - Sample: 8-20 frame (dari 40-140)');
    console.log('[Turbo Mode] - Seek timeout: 700ms (dari 1500ms)');
    console.log('[Turbo Mode] - Audio decode: SKIP');
    console.log('[Turbo Mode] - Face detect: SKIP');
  }

  boot();
})();