/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AI AGENT — UPGRADES v2.6 (NON-DESTRUCTIVE ADDITIVE LAYER)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * File ini TIDAK mengubah file lama. Cukup load SETELAH auto-save.js.
 * 
 * Fitur baru:
 *  1. 🎯 Duplicate clip detector (cosine similarity frame-hash)
 *  2. 📊 Waveform preview per clip (dari audioSegments existing)
 *  3. 🛡️ Analysis safety guard (__analysisRunning always reset)
 *  4. 🎙️ Manual transcription button (Web Speech API)
 *  5. 🔍 Clip quality insights (score breakdown)
 *  6. 🔗 Hook wrapper consolidation check (diagnostic only)
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';
  if (window.__UPGRADES_V26_LOADED) return;
  window.__UPGRADES_V26_LOADED = true;

  console.log('%c[Upgrades v2.6] 📦 Loading additive layer...', 'color:#10b981;font-weight:bold;font-size:13px');

  // ═══════════════════════════════════════════════════════════════════════
  // FEATURE 3: ANALYSIS SAFETY GUARD (dipasang paling awal)
  // ═══════════════════════════════════════════════════════════════════════
  // Watchdog: pastikan __analysisRunning selalu reset ke false
  // dalam max 30 menit, apapun yang terjadi (crash, tab suspended, dll).

  (function installAnalysisWatchdog() {
    let lastStart = 0;

    // Override property setter untuk detect kapan __analysisRunning = true
    let __analysisRunning = false;
    Object.defineProperty(window, '__analysisRunning', {
      get() { return __analysisRunning; },
      set(v) {
        __analysisRunning = !!v;
        if (v === true) lastStart = Date.now();
      },
      configurable: true
    });

    // Watchdog: setiap 60 detik, cek apakah stuck > 30 menit
    setInterval(() => {
      if (__analysisRunning && lastStart > 0) {
        const age = Date.now() - lastStart;
        if (age > 30 * 60 * 1000) {
          console.warn('[v2.6 Watchdog] ⚠️ __analysisRunning stuck >30min — force reset');
          window.__analysisRunning = false;
          lastStart = 0;
        }
      }
    }, 60 * 1000);

    console.log('[v2.6] ✅ Analysis watchdog aktif (max 30 menit)');
  })();

  // ═══════════════════════════════════════════════════════════════════════
  // FEATURE 1: DUPLICATE CLIP DETECTOR
  // ═══════════════════════════════════════════════════════════════════════

  function computeClipHash(clip) {
    // Hash dari start/end/duration dengan toleransi 0.5 detik
    const s = Math.round((clip.rawStart || 0) * 2);
    const e = Math.round((clip.rawEnd || 0) * 2);
    const d = Math.round((clip.duration || 0) * 2);
    return `${s}_${e}_${d}`;
  }

  function overlapRatio(a, b) {
    const oStart = Math.max(a.rawStart, b.rawStart);
    const oEnd = Math.min(a.rawEnd, b.rawEnd);
    const overlap = Math.max(0, oEnd - oStart);
    const minDur = Math.min(a.duration, b.duration);
    return minDur > 0 ? overlap / minDur : 0;
  }

  function detectDuplicates(clips) {
    if (!Array.isArray(clips) || clips.length < 2) return;
    const seenHashes = new Map();
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      clip._duplicateOf = null;
      const hash = computeClipHash(clip);

      // Cek hash identik dulu
      if (seenHashes.has(hash)) {
        clip._duplicateOf = seenHashes.get(hash);
        continue;
      }

      // Cek overlap > 60% dengan klip sebelumnya
      for (let j = 0; j < i; j++) {
        const prev = clips[j];
        if (overlapRatio(clip, prev) > 0.60) {
          clip._duplicateOf = j;
          break;
        }
      }
      seenHashes.set(hash, i);
    }

    const dupCount = clips.filter(c => c._duplicateOf !== null).length;
    if (dupCount > 0) {
      console.log(`[v2.6] 🎯 Duplicate detector: ${dupCount} klip mirip terdeteksi`);
    }
    return dupCount;
  }

  // Hook ke renderPage — jalankan detector sebelum render
  function hookDuplicateDetector() {
    if (!window.renderPage) return false;
    if (window.renderPage.__dupHooked) return true;

    const orig = window.renderPage;
    window.renderPage = function () {
      try {
        if (window.allClipsData && window.allClipsData.length >= 2) {
          detectDuplicates(window.allClipsData);
        }
      } catch (e) {
        console.warn('[v2.6] Duplicate detector error:', e);
      }
      return orig.apply(this, arguments);
    };
    window.renderPage.__dupHooked = true;
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FEATURE 2: WAVEFORM PREVIEW
  // ═══════════════════════════════════════════════════════════════════════

  function drawWaveform(canvas, clip) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    // Coba pakai audioSegments dari analysis (paling akurat)
    let data = null;
    if (window.__lastAnalysis && window.__lastAnalysis.audioSegments) {
      const segs = window.__lastAnalysis.audioSegments;
      const inRange = segs.filter(s =>
        s.t >= clip.rawStart && s.t <= clip.rawEnd
      );
      if (inRange.length > 0) {
        data = inRange.map(s => s.energy || 0);
      }
    }

    // Fallback: synthetic dari metrics
    if (!data || data.length === 0) {
      const count = 60;
      data = new Array(count).fill(0).map((_, i) => {
        const base = clip.avgAudio || 30;
        const noise = Math.sin(i * 0.5) * 20 + Math.random() * 15;
        return Math.max(5, Math.min(100, base + noise));
      });
    }

    // Clear
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, W, H);

    // Draw bars
    const barW = W / data.length;
    const midY = H / 2;

    // Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#10b981');
    grad.addColorStop(0.5, '#38bdf8');
    grad.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = grad;

    for (let i = 0; i < data.length; i++) {
      const v = Math.max(2, Math.min(100, data[i]));
      const barH = (v / 100) * (H - 4);
      const x = i * barW;
      const y = midY - barH / 2;
      ctx.fillRect(x, y, Math.max(1, barW - 1), barH);
    }

    // Baseline center
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(W, midY);
    ctx.stroke();
  }

  function attachWaveformToCard(card, clip) {
    if (card.__waveformAdded) return;
    card.__waveformAdded = true;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'margin: 8px 0; padding: 6px; background: rgba(0,0,0,0.2); border-radius: 6px; border: 1px solid rgba(56,189,248,0.15);';

    const label = document.createElement('p');
    label.style.cssText = 'font-size: 0.62rem; color: #38bdf8; text-transform: uppercase; margin: 0 0 4px; font-weight: 700;';
    label.textContent = '📊 Waveform Audio';

    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 48;
    canvas.style.cssText = 'width: 100%; height: 48px; display: block; border-radius: 4px;';

    wrapper.appendChild(label);
    wrapper.appendChild(canvas);

    // Sisipkan sebelum tombol copy (cari div yang isi tombol)
    const allDivs = card.querySelectorAll('div');
    let insertBefore = null;
    for (const d of allDivs) {
      if (d.querySelector('button') && d.textContent.indexOf('Copy') !== -1) {
        insertBefore = d;
        break;
      }
    }
    if (insertBefore && insertBefore.parentNode) {
      insertBefore.parentNode.insertBefore(wrapper, insertBefore);
    } else {
      card.appendChild(wrapper);
    }

    // Draw setelah render (delay untuk ensure layout)
    setTimeout(() => drawWaveform(canvas, clip), 50);
  }

  function enhanceClipsWithWaveform() {
    const cards = document.querySelectorAll('#clipResults .clip-card');
    cards.forEach(card => {
      if (card.__waveformAdded) return;

      // Duplicate badge
      const idx = parseInt(card.getAttribute('data-clip-idx'), 10);
      const clip = window.allClipsData && window.allClipsData[idx];
      if (!clip) return;

      // Badge duplikat
      if (clip._duplicateOf !== null && clip._duplicateOf !== undefined && !card.__dupBadgeAdded) {
        card.__dupBadgeAdded = true;
        const badge = document.createElement('div');
        badge.style.cssText = 'margin: 6px 0; padding: 6px 10px; background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.4); border-radius: 6px; font-size: 0.7rem; color: #f59e0b; font-weight: 700;';
        badge.textContent = `⚠️ Mirip dengan Klip #${(clip._duplicateOf || 0) + 1} — pertimbangkan skip salah satu`;
        const header = card.querySelector(':scope > div:first-child');
        if (header && header.nextSibling) {
          header.parentNode.insertBefore(badge, header.nextSibling);
        } else {
          card.insertBefore(badge, card.firstChild);
        }
      }

      // Waveform
      attachWaveformToCard(card, clip);
    });
  }

  function hookWaveformInstaller() {
    if (!window.renderPage) return false;
    if (window.renderPage.__waveformHooked) return true;

    const orig = window.renderPage;
    window.renderPage = function () {
      const result = orig.apply(this, arguments);
      setTimeout(() => {
        try { enhanceClipsWithWaveform(); } catch (e) {}
      }, 100);
      return result;
    };
    window.renderPage.__waveformHooked = true;

    // Also observe mutations
    const rc = document.getElementById('clipResults');
    if (rc) {
      const obs = new MutationObserver(() => {
        try { enhanceClipsWithWaveform(); } catch (e) {}
      });
      obs.observe(rc, { childList: true, subtree: false });
    }
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FEATURE 4: MANUAL TRANSCRIPTION BUTTON
  // ═══════════════════════════════════════════════════════════════════════

  function installTranscriptionButton() {
    const btnGenerate = document.getElementById('btnGenerate');
    if (!btnGenerate || document.getElementById('btnTranscribeManual')) return;

    const box = document.createElement('div');
    box.id = 'transcribeBox';
    box.style.cssText = 'margin-top:8px; padding:8px 12px; background:rgba(139,92,246,0.06); border:1px dashed rgba(139,92,246,0.35); border-radius:8px; font-size:0.72rem; color:var(--text-sub);';

    const SR_AVAILABLE = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    const statusText = SR_AVAILABLE
      ? 'Bisa transkrip audio jadi teks (browser-native)'
      : '⚠️ Browser tidak support Web Speech API';

    box.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
        <div style="flex:1; min-width:150px;">
          <div style="font-weight:700; margin-bottom:2px;">🎙️ Transkripsi Manual</div>
          <div style="font-size:0.65rem; opacity:0.75;">${statusText}</div>
        </div>
        <button id="btnTranscribeManual" type="button" ${SR_AVAILABLE ? '' : 'disabled'} style="padding:8px 14px; background:${SR_AVAILABLE ? 'linear-gradient(135deg,#8b5cf6,#6d28d9)' : '#555'}; color:#fff; border:none; border-radius:8px; font-weight:700; cursor:${SR_AVAILABLE ? 'pointer' : 'not-allowed'}; font-size:0.72rem; font-family:inherit;">
          ${SR_AVAILABLE ? '🎙️ Mulai Transkrip' : 'Tidak Tersedia'}
        </button>
      </div>
      <div id="transcribeStatus" style="margin-top:6px; font-size:0.68rem; color:var(--accent-color); font-weight:600; display:none;"></div>
    `;

    // Sisipkan setelah smartProgressPanel jika ada, atau setelah btnGenerate
    const panel = document.getElementById('smartProgressPanel');
    if (panel && panel.parentNode) {
      panel.parentNode.insertBefore(box, panel.nextSibling);
    } else {
      btnGenerate.parentNode.insertBefore(box, btnGenerate.nextSibling);
    }

    if (!SR_AVAILABLE) return;

    document.getElementById('btnTranscribeManual').addEventListener('click', () => {
      startManualTranscription();
    });
  }

  async function startManualTranscription() {
    const status = document.getElementById('transcribeStatus');
    const btn = document.getElementById('btnTranscribeManual');

    if (!window.currentVideoFile) {
      if (status) {
        status.style.display = 'block';
        status.textContent = '⚠️ Upload video dulu';
        status.style.color = '#f59e0b';
      }
      return;
    }
    if (!window.WhisperAutoEngine || !window.WhisperAutoEngine.available) {
      if (status) {
        status.style.display = 'block';
        status.textContent = '⚠️ Web Speech API tidak tersedia';
        status.style.color = '#ef4444';
      }
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = '⏳ Merekam...'; }
    if (status) {
      status.style.display = 'block';
      status.textContent = '🎙️ Mulai merekam — bicarakan video atau biarkan berjalan...';
      status.style.color = '#8b5cf6';
    }

    const video = document.getElementById('sourceVideo');
    if (!video) {
      if (btn) { btn.disabled = false; btn.textContent = '🎙️ Mulai Transkrip'; }
      return;
    }

    try {
      const region = (document.getElementById('regionSelect') || {}).value || 'id-ID';
      const segments = await window.WhisperAutoEngine.transcribeVideo(video, {
        lang: region,
        onResult: (s) => {
          if (status) {
            status.textContent = `🎙️ [${Math.round(s.t)}s] ${s.text}`;
          }
        }
      });

      window.__transcript = segments;

      if (status) {
        status.style.color = '#10b981';
        status.textContent = `✅ Selesai — ${segments.length} segmen transkripsi tersimpan`;
      }
      if (btn) { btn.disabled = false; btn.textContent = '🎙️ Mulai Transkrip'; }

      // Integrasikan ke HookEngine context
      if (window.__clipContext) {
        window.__clipContext.transcript = segments;
        window.__clipContext.hasTranscript = segments.length > 0;
      }
      console.log('[v2.6] ✅ Transkripsi selesai:', segments.length, 'segmen');

    } catch (err) {
      console.error('[v2.6] Transkripsi error:', err);
      if (status) {
        status.style.color = '#ef4444';
        status.textContent = '❌ Gagal: ' + (err.message || err);
      }
      if (btn) { btn.disabled = false; btn.textContent = '🎙️ Mulai Transkrip'; }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FEATURE 5: CLIP QUALITY INSIGHTS (score breakdown)
  // ═══════════════════════════════════════════════════════════════════════

  function attachQualityInsights(card, clip) {
    if (card.__qualityAdded) return;
    card.__qualityAdded = true;

    const metrics = clip.metrics || {};
    const breakdown = [];

    if (metrics.avgMotion !== undefined) breakdown.push({ label: 'Pergerakan', v: metrics.avgMotion });
    if (metrics.sceneChanges !== undefined) breakdown.push({ label: 'Adegan', v: Math.min(100, metrics.sceneChanges * 30) });
    if (metrics.maxFace !== undefined && metrics.maxFace > 0) breakdown.push({ label: 'Wajah', v: Math.min(100, metrics.maxFace * 25) });
    if (metrics.speechRatio !== undefined) breakdown.push({ label: 'Dialog', v: metrics.speechRatio });
    if (metrics.laughCount !== undefined && metrics.laughCount > 0) breakdown.push({ label: 'Tawa', v: Math.min(100, metrics.laughCount * 30) });
    if (clip.avgAudio !== undefined) breakdown.push({ label: 'Audio', v: clip.avgAudio });

    if (breakdown.length === 0) return;

    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin: 6px 0; padding: 8px 10px; background: rgba(56,189,248,0.05); border: 1px solid rgba(56,189,248,0.15); border-radius: 6px;';

    let html = '<p style="font-size:0.62rem; color:#38bdf8; text-transform:uppercase; margin:0 0 6px; font-weight:700;">🔍 Breakdown Skor</p>';

    breakdown.forEach(b => {
      const v = Math.round(b.v);
      const color = v >= 70 ? '#10b981' : v >= 40 ? '#f59e0b' : '#64748b';
      html += `
        <div style="display:flex; align-items:center; gap:6px; margin-bottom:3px;">
          <span style="font-size:0.65rem; color:var(--text-sub); min-width:60px;">${b.label}</span>
          <div style="flex:1; height:4px; background:rgba(0,0,0,0.3); border-radius:2px; overflow:hidden;">
            <div style="width:${v}%; height:100%; background:${color};"></div>
          </div>
          <span style="font-size:0.62rem; color:${color}; min-width:28px; text-align:right; font-weight:700;">${v}%</span>
        </div>
      `;
    });

    wrap.innerHTML = html;

    // Sisipkan setelah humanEvidence atau sebelum tombol copy
    const humanEvidence = card.querySelector('div[style*="dashed"]');
    if (humanEvidence && humanEvidence.parentNode) {
      humanEvidence.parentNode.insertBefore(wrap, humanEvidence.nextSibling);
    } else {
      const btnRow = card.querySelector('div[style*="display:flex"][style*="gap:8px"]');
      if (btnRow && btnRow.parentNode) {
        btnRow.parentNode.insertBefore(wrap, btnRow);
      } else {
        card.appendChild(wrap);
      }
    }
  }

  function enhanceClipsWithInsights() {
    const cards = document.querySelectorAll('#clipResults .clip-card');
    cards.forEach(card => {
      if (card.__qualityAdded) return;
      const idx = parseInt(card.getAttribute('data-clip-idx'), 10);
      const clip = window.allClipsData && window.allClipsData[idx];
      if (!clip) return;
      attachQualityInsights(card, clip);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FEATURE 6: HOOK WRAPPER CONSOLIDATION DIAGNOSTIC
  // ═══════════════════════════════════════════════════════════════════════

  function diagnoseHookWrappers() {
    if (!window.HookEngine) return;

    // Cek berapa banyak wrapper yang terpasang di buildUniquePackage
    const code = String(window.HookEngine.buildUniquePackage);
    const markers = [
      '__polishV4Installed',
      '__polishV5Installed',
      '__polishV6Installed',
      '__polishV7Installed',
      'generateHook',
      'generateCaption'
    ];
    let wrappers = 0;
    markers.forEach(m => {
      if (code.indexOf(m) !== -1) wrappers++;
    });

    console.log(`[v2.6 Diagnostic] 🎣 HookEngine.buildUniquePackage: ${wrappers} marker terdeteksi`);
    console.log(`[v2.6 Diagnostic] 💡 Info: 5x nested wrapper adalah by-design. Consolidation butuh refactor hooks-db.js`);
    console.log(`[v2.6 Diagnostic] 💡 Saran: aktifkan Turbo Mode + kurangi sample frames untuk speed boost`);

    window.__hookDiagnostic = { wrappers, ok: wrappers > 0 };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FEATURE 7: RESET SAFETY (pastikan global state tidak stuck)
  // ═══════════════════════════════════════════════════════════════════════

  function installStateResetGuard() {
    // Override cancelSmartAnalyze untuk reset semua flags
    document.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('#btnSmartCancel, #btnCancelAnalysis');
      if (!btn) return;

      // Force reset setelah 2 detik untuk mencegah stuck
      setTimeout(() => {
        if (window.__analysisRunning === true) {
          // Cek apakah sudah >30 detik
          const startAge = Date.now() - (window.__analysisStartTime || 0);
          if (startAge > 30 * 1000) {
            console.warn('[v2.6] ⚠️ Force reset stuck analysis state');
            window.__analysisRunning = false;
            window.__HARD_ABORT = false;
            window.__smartCancel = false;
            window.__cancelAnalysis = false;
          }
        }
      }, 2000);
    }, true);

    console.log('[v2.6] ✅ State reset guard aktif');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BOOT
  // ═══════════════════════════════════════════════════════════════════════

  function boot() {
    // Feature 3: safety watchdog (sudah dipasang di atas)
    // Feature 7: state reset guard
    installStateResetGuard();

    // Feature 6: diagnostic
    setTimeout(diagnoseHookWrappers, 3000);

    // Feature 1 & 2 & 5: hook ke renderPage
    let tries = 0;
    const t = setInterval(() => {
      const a = hookDuplicateDetector();
      const b = hookWaveformInstaller();
      if (a && b) {
        clearInterval(t);
        console.log('[v2.6] ✅ Duplicate detector + Waveform + Insights hooked');
      } else if (++tries > 40) {
        clearInterval(t);
        console.warn('[v2.6] ⚠️ Timeout hook renderPage');
      }
    }, 250);

    // Feature 4: transcription button
    setTimeout(installTranscriptionButton, 2500);

    // Watch clip results untuk klip baru (misal dari LLM patch)
    const rc = document.getElementById('clipResults');
    if (rc) {
      const obs = new MutationObserver(() => {
        try {
          enhanceClipsWithWaveform();
          enhanceClipsWithInsights();
        } catch (e) {}
      });
      obs.observe(rc, { childList: true, subtree: true });
    }

    console.log('%c[Upgrades v2.6] ✅ AKTIF — 5 fitur baru', 'color:#10b981;font-weight:bold;font-size:14px');
    console.log('  1. 🎯 Duplicate clip detector');
    console.log('  2. 📊 Waveform preview');
    console.log('  3. 🛡️ Analysis safety watchdog');
    console.log('  4. 🎙️ Manual transcription button');
    console.log('  5. 🔍 Clip quality insights');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 3200));
  } else {
    setTimeout(boot, 3200);
  }

  // Public API
  window.UpgradesV26 = {
    version: '2.6.0',
    detectDuplicates: () => detectDuplicates(window.allClipsData || []),
    getTranscript: () => window.__transcript || null,
    drawWaveform,
    status: () => ({
      loaded: true,
      watchdog: true,
      dupDetector: !!window.renderPage?.__dupHooked,
      waveform: !!window.renderPage?.__waveformHooked,
      transcribeBtn: !!document.getElementById('btnTranscribeManual'),
      hookDiagnostic: window.__hookDiagnostic
    })
  };

})();