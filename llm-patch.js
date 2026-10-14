/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LLM PATCH v2.5 — HUMAN VOICE EDITION + CACHE INTEGRATION
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * v2.5 UPDATE:
 *  ✅ regenerateAllClips pakai LLMCache (skip generate kalau sudah ada di cache)
 *  ✅ Simpan hasil generate ke cache untuk sesi berikutnya
 *  ✅ Label jujur kalau model lokal gagal dimuat (fallback template)
 *  ✅ Semua fungsi lama TETAP UTUH
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';
  if (window.__LLM_PATCH_LOADED) return;
  window.__LLM_PATCH_LOADED = true;

  // ═══════════════════════════════════════════════════════════════════════
  // ═══ v2.5: regenerateAllClips dengan CACHE INTEGRATION ═══
  // ═══════════════════════════════════════════════════════════════════════
  async function regenerateAllClips() {
    const clips = window.allClipsData || [];
    if (clips.length === 0) return;

    const niche = (document.getElementById('nicheSelect') || {}).value || 'General Content';
    const region = (document.getElementById('regionSelect') || {}).value || 'id-ID';
    const context = window.__clipContext || {};

    let success = 0, failed = 0, cached = 0;

    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      if (clip._llmGenerated) { success++; continue; }

      // ═══ v2.5 FIX: cek cache DULU sebelum generate ═══
      if (window.LLMCache) {
        const cachedCopy = window.LLMCache.get(clip, niche, region, context);
        if (cachedCopy) {
          clip.edited.hookHeadline = cachedCopy.hook || clip.edited.hookHeadline;
          clip.edited.caption = cachedCopy.caption || clip.edited.caption;
          clip.edited.cta = cachedCopy.cta || clip.edited.cta;
          if (cachedCopy.hashtags && cachedCopy.hashtags.length > 0) clip.hashtags = cachedCopy.hashtags;
          clip._llmGenerated = true;
          clip._llmFromCache = true;
          success++;
          cached++;
          continue;
        }
      }

      if (typeof window.updateStatus === 'function') {
        window.updateStatus(`🤖 AI nulis copy ${i + 1}/${clips.length}...`);
      }

      try {
        const copy = await window.LLMEngine.generateCopy(clip, niche, region, context);
        if (copy) {
          clip.edited.hookHeadline = copy.hook || clip.edited.hookHeadline;
          clip.edited.caption = copy.caption || clip.edited.caption;
          clip.edited.cta = copy.cta || clip.edited.cta;
          if (copy.hashtags && copy.hashtags.length > 0) clip.hashtags = copy.hashtags;
          clip._llmGenerated = true;
          success++;

          // ═══ v2.5 FIX: simpan ke cache untuk sesi berikutnya ═══
          if (window.LLMCache) {
            try { window.LLMCache.set(clip, niche, region, context, copy); } catch (e) {}
          }
        } else {
          failed++;
        }
      } catch (e) {
        console.warn('[LLM Patch] Clip', i, 'gagal:', e.message);
        failed++;
      }

      if (i % 2 === 0 && typeof window.renderPage === 'function') {
        try { window.renderPage(); } catch (e) {}
      }
    }

    if (typeof window.renderPage === 'function') {
      try { window.renderPage(); } catch (e) {}
    }

    if (typeof window.updateStatus === 'function') {
      const cacheMsg = cached > 0 ? ` (${cached} dari cache)` : '';
      window.updateStatus(`✅ AI nulis ${success} klip${cacheMsg}, ${failed} fallback`);
      setTimeout(() => window.updateStatus('Ready'), 3000);
    }
  }

  function hookAIEngine() {
    if (!window.AIEngine || !window.AIEngine.run) return false;
    if (window.AIEngine.__llmHooked) return true;
    window.AIEngine.__llmHooked = true;

    const origRun = window.AIEngine.run;
    window.AIEngine.run = async function () {
      const result = await origRun.apply(this, arguments);

      if (window.LLMEngine && window.LLMEngine.enabled) {
        try {
          if (!window.LLMEngine.ready) {
            if (typeof window.updateStatus === 'function') {
              window.updateStatus('🧠 Memuat model AI lokal (pertama kali ~250 MB)...');
            }
            const ok = await window.LLMEngine.load(null, (msg) => {
              if (typeof window.updateStatus === 'function') window.updateStatus(msg);
            });
            if (!ok) {
              // ═══ v2.5: label jujur — bukan AI generatif, tapi template draft ═══
              if (typeof window.updateStatus === 'function') {
                window.updateStatus('📝 Model lokal gagal dimuat — pakai template draft (bukan AI generatif)');
              }
              // TIDAK return — biarkan HookEngine template tetap digunakan
              return result;
            }
          }
          await regenerateAllClips();
        } catch (e) {
          console.warn('[LLM Patch] Post-run error:', e);
        }
      }
      return result;
    };

    console.log('[LLM Patch v2.5] ✅ AIEngine.run hooked (Human Voice + Cache)');
    return true;
  }

  function installLLMUI() {
    const btnGenerate = document.getElementById('btnGenerate');
    if (!btnGenerate || document.getElementById('llmControlBox')) return;

    const box = document.createElement('div');
    box.id = 'llmControlBox';
    box.style.cssText = 'margin-top:8px;padding:10px 12px;background:linear-gradient(135deg,rgba(139,92,246,0.08),rgba(56,189,248,0.08));border:1px solid rgba(139,92,246,0.3);border-radius:10px;font-size:0.75rem;color:var(--text-sub);';

    const cap = window.LLMEngine.detectCapability();

    box.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:700;">
          <input type="checkbox" id="llmToggle" ${window.LLMEngine.enabled ? 'checked' : ''} style="cursor:pointer;transform:scale(1.2);">
          <span>🗣️ AI Nulis Gaya Manusia <span style="color:var(--accent-color);">(LLM)</span></span>
        </label>
        <select id="llmModelSelect" class="input-field" style="width:auto;font-size:0.72rem;padding:4px 8px;">
          ${Object.entries(window.LLMEngine.MODELS).map(([key, m]) =>
            `<option value="${key}" ${key === window.LLMEngine.modelKey ? 'selected' : ''}>${m.label}</option>`
          ).join('')}
        </select>
      </div>
      <div style="margin-top:6px;font-size:0.68rem;color:var(--text-muted);line-height:1.4;">
        ${cap.isMobile ? '📱' : '💻'} ${cap.ram}GB RAM · Model rekomendasi: <b>${cap.recommended}</b><br>
        <span style="opacity:0.75;">Contoh output: <b style="color:var(--accent-color);">"GILA! ORANG ITU BELI SAHAM"</b></span>
      </div>
      <div id="llmStatus" style="margin-top:6px;font-size:0.68rem;color:var(--accent-color);font-weight:600;display:none;"></div>
    `;

    btnGenerate.parentNode.insertBefore(box, btnGenerate.nextSibling);

    document.getElementById('llmToggle').addEventListener('change', (e) => {
      window.LLMEngine.setEnabled(e.target.checked);
      const status = document.getElementById('llmStatus');
      if (status) {
        status.style.display = 'block';
        status.textContent = e.target.checked
          ? '✅ Aktif — jalankan SMART ANALYZE, AI akan tulis copy gaya manusia'
          : '⏸ Nonaktif — pakai template';
      }
    });

    document.getElementById('llmModelSelect').addEventListener('change', async (e) => {
      const key = e.target.value;
      window.LLMEngine.modelKey = key;
      try { localStorage.setItem('ai-agent-llm-model', key); } catch (err) {}

      const status = document.getElementById('llmStatus');
      if (status) status.style.display = 'block';

      const ok = await window.LLMEngine.load(key, (msg) => {
        if (status) status.textContent = msg;
      });

      if (status) status.textContent = ok ? '✅ Model siap' : '❌ Gagal memuat';
    });
  }

  function boot() {
    let tries = 0;
    const t = setInterval(() => {
      if (hookAIEngine() && window.LLMEngine) {
        installLLMUI();
        clearInterval(t);
        console.log('[LLM Patch v2.5] ✅ Installed — Human Voice + Cache ready');
      } else if (++tries > 30) {
        clearInterval(t);
        console.warn('[LLM Patch] ⚠️ Timeout');
      }
    }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 2000));
  } else {
    setTimeout(boot, 2000);
  }
})();