/**
 * AI CLIPPER AGENT - AUTO SAVE LAYER
 * 
 * Simpan otomatis semua hasil kerja user ke localStorage.
 * User tutup browser → buka lagi → semua edit tetap ada.
 * 
 * TIDAK mengubah script.js atau file lain.
 */

(function () {
  'use strict';
  if (window.__AUTO_SAVE_LOADED) return;
  window.__AUTO_SAVE_LOADED = true;

  const STORAGE_KEY = 'ai-agent-workspace-v1';
  const SAVE_DEBOUNCE_MS = 800;
  const AUTO_SAVE_INTERVAL_MS = 15000;
  let saveTimer = null;
  let dirty = false;

  function collectState() {
    try {
      const clips = Array.isArray(window.allClipsData) ? window.allClipsData : [];
      const skipped = window.skippedClips instanceof Set ? Array.from(window.skippedClips) : [];

      const regionEl = document.getElementById('regionSelect');
      const nicheEl = document.getElementById('nicheSelect');

      return {
        version: 1,
        savedAt: Date.now(),
        clips: clips.map(c => ({
          id: c.id,
          start: c.start,
          end: c.end,
          rawStart: c.rawStart,
          rawEnd: c.rawEnd,
          duration: c.duration,
          score: c.score,
          confidence: c.confidence,
          signals: c.signals || [],
          endingType: c.endingType || '[LOOP]',
          hashtags: c.hashtags || [],
          lang: c.lang || 'id',
          edited: {
            hookHeadline: (c.edited && c.edited.hookHeadline) || '',
            caption: (c.edited && c.edited.caption) || '',
            cta: (c.edited && c.edited.cta) || ''
          }
        })),
        skipped: skipped,
        currentPage: window.currentPage || 1,
        region: regionEl ? regionEl.value : 'id-ID',
        niche: nicheEl ? nicheEl.value : 'AUTO',
        videoName: window.currentVideoFile ? window.currentVideoFile.name : null,
        videoSize: window.currentVideoFile ? window.currentVideoFile.size : null
      };
    } catch (e) {
      console.warn('[AutoSave] Gagal collect state:', e);
      return null;
    }
  }

  function saveNow(reason) {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    const state = collectState();
    if (!state) return;
    if (!state.clips || state.clips.length === 0) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      dirty = false;
      console.log('[AutoSave] 💾 Tersimpan (' + (reason || 'auto') + ') — ' +
                  state.clips.length + ' klip, ' + state.skipped.length + ' skip');
    } catch (e) {
      console.warn('[AutoSave] Gagal simpan:', e);
    }
  }

  function scheduleSave(reason) {
    dirty = true;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveNow(reason || 'debounce'), SAVE_DEBOUNCE_MS);
  }

  function restoreState() {
    let raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) { return null; }
    if (!raw) return null;

    try {
      const state = JSON.parse(raw);
      if (!state || !Array.isArray(state.clips) || state.clips.length === 0) return null;

      const isValid = state.clips.every(c =>
        typeof c.rawStart === 'number' &&
        typeof c.rawEnd === 'number' &&
        c.edited && typeof c.edited.hookHeadline === 'string'
      );
      if (!isValid) return null;

      return state;
    } catch (e) {
      console.warn('[AutoSave] Gagal parse state:', e);
      return null;
    }
  }

  function applyRestoredState(state) {
    window.allClipsData = state.clips.map(c => ({
      id: c.id,
      start: c.start,
      end: c.end,
      rawStart: c.rawStart,
      rawEnd: c.rawEnd,
      duration: c.duration,
      score: c.score,
      confidence: c.confidence,
      signals: c.signals,
      endingType: c.endingType,
      hashtags: c.hashtags,
      lang: c.lang,
      edited: c.edited
    }));

    window.skippedClips = new Set(state.skipped || []);
    window.currentPage = state.currentPage || 1;

    if (state.region) {
      const r = document.getElementById('regionSelect');
      if (r) r.value = state.region;
    }
    if (state.niche) {
      const n = document.getElementById('nicheSelect');
      if (n) n.value = state.niche;
    }

    console.log('[AutoSave] ♻️ Restore — ' +
                state.clips.length + ' klip, ' + (state.skipped || []).length + ' skip');
  }

  function attachEditListeners() {
    const target = document.getElementById('clipResults');
    if (!target) return;

    target.addEventListener('input', (e) => {
      const t = e.target;
      if (!t) return;
      if (t.closest && t.closest('.clip-card')) {
        scheduleSave('user-edit');
      }
    }, true);

    target.addEventListener('change', (e) => {
      const t = e.target;
      if (t && t.type === 'checkbox' && t.closest && t.closest('.clip-card')) {
        scheduleSave('skip-toggle');
      }
    }, true);

    const observer = new MutationObserver(() => {
      if (window.allClipsData && window.allClipsData.length > 0) {
        scheduleSave('render-detect');
      }
    });
    observer.observe(target, { childList: true, subtree: false });
  }

  function attachPaginationListeners() {
    ['btnPrevPage', 'btnNextPage'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', () => {
          setTimeout(() => scheduleSave('pagination'), 100);
        });
      }
    });
  }

  function hookAnalysisDone() {
    if (!window.startRealSignalAnalysis) return;
    if (window.startRealSignalAnalysis.__autoSaveHooked) return;
    window.startRealSignalAnalysis.__autoSaveHooked = true;

    const orig = window.startRealSignalAnalysis;
    window.startRealSignalAnalysis = async function () {
      const result = await orig.apply(this, arguments);
      setTimeout(() => saveNow('analysis-done'), 1500);
      return result;
    };
    console.log('[AutoSave] ✅ Hook analysis done');
  }

  function installUnloadHandler() {
    window.addEventListener('beforeunload', () => {
      if (dirty || (window.allClipsData && window.allClipsData.length > 0)) {
        saveNow('before-unload');
      }
    });

    window.addEventListener('pagehide', () => {
      if (dirty || (window.allClipsData && window.allClipsData.length > 0)) {
        saveNow('pagehide');
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && dirty) {
        saveNow('tab-hidden');
      }
    });
  }

  function installPeriodicSave() {
    setInterval(() => {
      if (dirty && window.allClipsData && window.allClipsData.length > 0) {
        saveNow('periodic');
      }
    }, AUTO_SAVE_INTERVAL_MS);
  }

  function showRestoreBanner(state) {
    if (document.getElementById('restoreBanner')) return;

    const d = new Date(state.savedAt || Date.now());
    const dateStr = d.toLocaleString('id-ID', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });

    const banner = document.createElement('div');
    banner.id = 'restoreBanner';
    banner.style.cssText = [
      'position:fixed',
      'top:80px',
      'left:50%',
      'transform:translateX(-50%)',
      'background:linear-gradient(135deg,#0284c7,#0369a1)',
      'color:#fff',
      'padding:12px 16px',
      'border-radius:12px',
      'box-shadow:0 6px 24px rgba(0,0,0,0.35)',
      'z-index:999998',
      'display:flex',
      'gap:10px',
      'align-items:center',
      'font-size:0.82rem',
      'max-width:calc(100vw - 32px)',
      'flex-wrap:wrap',
      'font-weight:600'
    ].join(';');

    banner.innerHTML = `
      <span style="flex:1;min-width:180px;">
        💾 Ada <b>${state.clips.length} klip</b> dari sesi sebelumnya (${dateStr}).
        ${state.videoName ? '<br><span style="font-size:0.72rem;opacity:0.85;">📹 ' + state.videoName + '</span>' : ''}
      </span>
      <button id="btnRestoreSession" style="background:#fff;color:#0284c7;border:none;padding:8px 14px;border-radius:8px;font-weight:700;cursor:pointer;font-size:0.8rem;">Pulihkan</button>
      <button id="btnDismissRestore" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.5);padding:8px 12px;border-radius:8px;cursor:pointer;font-size:0.8rem;">Mulai Baru</button>
    `;
    document.body.appendChild(banner);

    document.getElementById('btnRestoreSession').onclick = () => {
      applyRestoredState(state);
      banner.remove();
      if (typeof window.renderPage === 'function') {
        try { window.renderPage(); } catch (e) {}
      }
      console.log('[AutoSave] ✅ State dipulihkan');
    };

    document.getElementById('btnDismissRestore').onclick = () => {
      banner.remove();
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      console.log('[AutoSave] State lama dibuang');
    };
  }

  function init() {
    const state = restoreState();
    if (state) {
      if (window.currentVideoFile) {
        applyRestoredState(state);
        console.log('[AutoSave] Auto-restore (video sudah dimuat)');
      } else {
        showRestoreBanner(state);
      }
    }

    attachEditListeners();
    attachPaginationListeners();
    installUnloadHandler();
    installPeriodicSave();

    let tries = 0;
    const hookTimer = setInterval(() => {
      if (window.startRealSignalAnalysis) {
        hookAnalysisDone();
        clearInterval(hookTimer);
      } else if (++tries > 50) {
        clearInterval(hookTimer);
      }
    }, 100);

    console.log('[AutoSave] ✅ Aktif — semua edit user disimpan otomatis');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
  } else {
    setTimeout(init, 500);
  }
})();