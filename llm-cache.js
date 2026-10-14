/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LLM CACHE — Persistent Cache untuk Hasil LLM Copywriter
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Fitur:
 *  - Cache key dari hash konten clip (start/end/duration/topic/region/niche/model)
 *  - 2-layer: Memory (cepat) + localStorage (persistent)
 *  - Auto-cleanup: max 500 entry, LRU eviction
 *  - Auto-expire: 30 hari
 *  - UI: badge stats + tombol clear
 *  - Reuse antar sesi: upload video sama → copy dari cache, bukan regenerate
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';
  if (window.__LLM_CACHE_LOADED) return;
  window.__LLM_CACHE_LOADED = true;

  const STORAGE_KEY = 'ai-agent-llm-cache-v1';
  const MAX_ENTRIES = 500;
  const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari
  const VERSION = 1;

  const Cache = {
    memory: new Map(),
    dirty: false,
    stats: {
      hits: 0,
      misses: 0,
      saved: 0
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // HASH — key dari konten clip
  // ═══════════════════════════════════════════════════════════════════════
  Cache.buildKey = function (clip, niche, region, context) {
    const parts = [
      'v' + VERSION,
      'st' + Math.round((clip.rawStart || 0) * 10),
      'en' + Math.round((clip.rawEnd || 0) * 10),
      'du' + Math.round((clip.duration || 0) * 10),
      'ni' + String(niche || '').slice(0, 40),
      'rg' + String(region || ''),
      'tp' + String((context && context.topic) || '').slice(0, 60),
      'pp' + String((context && context.people) || '').slice(0, 40),
      'ex' + String((context && context.extra) || '').slice(0, 60),
      'md' + String((window.LLMEngine && window.LLMEngine.modelKey) || 'small')
    ];
    return parts.join('|');
  };

  // ═══════════════════════════════════════════════════════════════════════
  // LOAD dari localStorage (sekali, saat init)
  // ═══════════════════════════════════════════════════════════════════════
  Cache._loadFromDisk = function () {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.entries)) return;

      const now = Date.now();
      let loaded = 0;
      let expired = 0;

      for (const entry of parsed.entries) {
        if (!entry || !entry.key || !entry.value) continue;

        // Cek expiry
        if (now - (entry.ts || 0) > TTL_MS) {
          expired++;
          continue;
        }

        Cache.memory.set(entry.key, {
          value: entry.value,
          ts: entry.ts,
          hits: entry.hits || 0
        });
        loaded++;
      }

      console.log(`[LLM Cache] 📂 Loaded ${loaded} entries (${expired} expired)`);
    } catch (e) {
      console.warn('[LLM Cache] Load error:', e.message);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // SAVE ke localStorage (debounced)
  // ═══════════════════════════════════════════════════════════════════════
  let saveTimer = null;

  Cache._saveToDisk = function (immediate) {
    Cache.dirty = true;
    if (saveTimer) clearTimeout(saveTimer);

    const doSave = () => {
      saveTimer = null;
      if (!Cache.dirty) return;

      try {
        // Convert Map → array, LRU eviction kalau lebih dari MAX_ENTRIES
        let entries = Array.from(Cache.memory.entries()).map(([key, data]) => ({
          key,
          value: data.value,
          ts: data.ts,
          hits: data.hits
        }));

        // Sort by ts desc (terbaru dulu)
        entries.sort((a, b) => (b.ts || 0) - (a.ts || 0));

        // Trim
        if (entries.length > MAX_ENTRIES) {
          const removed = entries.length - MAX_ENTRIES;
          entries = entries.slice(0, MAX_ENTRIES);
          console.log(`[LLM Cache] 🗑 Evicted ${removed} old entries`);

          // Update memory juga
          Cache.memory.clear();
          for (const e of entries) {
            Cache.memory.set(e.key, { value: e.value, ts: e.ts, hits: e.hits });
          }
        }

        const payload = {
          v: VERSION,
          savedAt: Date.now(),
          entries
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        Cache.dirty = false;

        console.log(`[LLM Cache] 💾 Saved ${entries.length} entries (${(JSON.stringify(payload).length / 1024).toFixed(1)} KB)`);
      } catch (e) {
        console.warn('[LLM Cache] Save error:', e.message);
        // Kalau quota exceeded, evict 50% oldest
        if (e.name === 'QuotaExceededError') {
          Cache._emergencyTrim();
        }
      }
    };

    if (immediate) doSave();
    else saveTimer = setTimeout(doSave, 2000);
  };

  Cache._emergencyTrim = function () {
    console.warn('[LLM Cache] ⚠️ Quota exceeded — trimming 50% oldest');
    const entries = Array.from(Cache.memory.entries())
      .sort((a, b) => (b[1].ts || 0) - (a[1].ts || 0))
      .slice(0, Math.floor(MAX_ENTRIES / 2));

    Cache.memory.clear();
    for (const [k, v] of entries) Cache.memory.set(k, v);

    try {
      const payload = {
        v: VERSION,
        savedAt: Date.now(),
        entries: entries.map(([key, data]) => ({ key, value: data.value, ts: data.ts, hits: data.hits }))
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      console.log(`[LLM Cache] ✅ Trimmed to ${entries.length} entries`);
    } catch (e) {
      // Masih gagal → clear total
      try { localStorage.removeItem(STORAGE_KEY); } catch (e2) {}
      Cache.memory.clear();
      console.warn('[LLM Cache] 💥 Cache cleared completely');
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════
  Cache.get = function (clip, niche, region, context) {
    const key = Cache.buildKey(clip, niche, region, context);
    const entry = Cache.memory.get(key);

    if (!entry) {
      Cache.stats.misses++;
      return null;
    }

    // Cek expiry
    if (Date.now() - (entry.ts || 0) > TTL_MS) {
      Cache.memory.delete(key);
      Cache._saveToDisk();
      Cache.stats.misses++;
      return null;
    }

    // Hit — update hits & ts (LRU)
    entry.hits = (entry.hits || 0) + 1;
    entry.ts = Date.now();
    Cache.dirty = true;
    Cache.stats.hits++;
    return entry.value;
  };

  Cache.set = function (clip, niche, region, context, value) {
    if (!value) return;
    const key = Cache.buildKey(clip, niche, region, context);

    Cache.memory.set(key, {
      value: JSON.parse(JSON.stringify(value)), // deep clone
      ts: Date.now(),
      hits: 0
    });

    Cache.stats.saved++;
    Cache._saveToDisk();
  };

  Cache.has = function (clip, niche, region, context) {
    return Cache.get(clip, niche, region, context) !== null;
  };

  Cache.clear = function () {
    Cache.memory.clear();
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    Cache.dirty = false;
    console.log('[LLM Cache] 🗑 Cache cleared');
  };

  Cache.size = function () {
    return Cache.memory.size;
  };

  Cache.getStats = function () {
    const total = Cache.stats.hits + Cache.stats.misses;
    const hitRate = total > 0 ? (Cache.stats.hits / total * 100).toFixed(1) : '0.0';
    return {
      entries: Cache.memory.size,
      hits: Cache.stats.hits,
      misses: Cache.stats.misses,
      saved: Cache.stats.saved,
      hitRate: hitRate + '%'
    };
  };

  // ═══════════════════════════════════════════════════════════════════════
  // UI BADGE
  // ═══════════════════════════════════════════════════════════════════════
  function installCacheUI() {
    const btnGenerate = document.getElementById('btnGenerate');
    if (!btnGenerate || document.getElementById('llmCacheBox')) return;

    const box = document.createElement('div');
    box.id = 'llmCacheBox';
    box.style.cssText = [
      'margin-top:8px',
      'padding:8px 12px',
      'background:rgba(56,189,248,0.06)',
      'border:1px dashed rgba(56,189,248,0.3)',
      'border-radius:8px',
      'font-size:0.7rem',
      'color:var(--text-muted)',
      'display:flex',
      'align-items:center',
      'justify-content:space-between',
      'gap:8px',
      'flex-wrap:wrap'
    ].join(';');

    box.innerHTML = `
      <span id="llmCacheStats">💾 Cache: <b>0</b> entry · Hit rate <b>0%</b></span>
      <div style="display:flex;gap:4px;">
        <button id="llmCacheRefresh" type="button" style="background:transparent;border:1px solid var(--input-border);color:var(--text-sub);padding:3px 8px;border-radius:5px;cursor:pointer;font-size:0.65rem;font-weight:600;">🔄 Refresh</button>
        <button id="llmCacheClear" type="button" style="background:transparent;border:1px solid rgba(220,38,38,0.4);color:#dc2626;padding:3px 8px;border-radius:5px;cursor:pointer;font-size:0.65rem;font-weight:600;">🗑 Clear</button>
      </div>
    `;

    // Cari lokasi yang tepat — setelah llmControlBox atau setelah btnGenerate
    const llmBox = document.getElementById('llmControlBox');
    if (llmBox) {
      llmBox.parentNode.insertBefore(box, llmBox.nextSibling);
    } else {
      btnGenerate.parentNode.insertBefore(box, btnGenerate.nextSibling);
    }

    document.getElementById('llmCacheRefresh').onclick = () => updateCacheUI();

    document.getElementById('llmCacheClear').onclick = () => {
      if (confirm('Hapus semua cache copy AI?\n\nIni tidak menghapus klip, hanya cache generate AI.')) {
        Cache.clear();
        updateCacheUI();
      }
    };

    updateCacheUI();
  }

  function updateCacheUI() {
    const el = document.getElementById('llmCacheStats');
    if (!el) return;
    const s = Cache.getStats();
    el.innerHTML = `💾 Cache: <b>${s.entries}</b> entry · Hit rate <b>${s.hitRate}</b> · Saved <b>${s.saved}</b>`;

    // Update warna kalau hit rate tinggi
    if (s.entries > 0) {
      el.style.color = 'var(--accent-color)';
    } else {
      el.style.color = 'var(--text-muted)';
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BOOT
  // ═══════════════════════════════════════════════════════════════════════
  function boot() {
    // Load dari disk
    Cache._loadFromDisk();

    // Install UI saat LLM UI siap
    let tries = 0;
    const t = setInterval(() => {
      if (document.getElementById('llmControlBox')) {
        installCacheUI();
        clearInterval(t);
        console.log('[LLM Cache] ✅ UI installed');
      } else if (++tries > 40) {
        clearInterval(t);
        // Fallback: install setelah btnGenerate ada
        if (document.getElementById('btnGenerate')) {
          installCacheUI();
        }
      }
    }, 500);

    // Periodic stats update
    setInterval(updateCacheUI, 5000);

    // Save saat unload
    window.addEventListener('beforeunload', () => {
      if (Cache.dirty) Cache._saveToDisk(true);
    });
    window.addEventListener('pagehide', () => {
      if (Cache.dirty) Cache._saveToDisk(true);
    });

    console.log('[LLM Cache] ✅ Loaded — ' + Cache.memory.size + ' entries dari sesi lalu');
  }

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 2000));
  } else {
    setTimeout(boot, 2000);
  }

  window.LLMCache = Cache;
})();