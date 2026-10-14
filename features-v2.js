/**
 * AI CLIPPER AGENT - FEATURES V2 WRAPPER LAYER
 * 7 upgrade tanpa mengubah file lama.
 * 
 * v2.5 UPDATE:
 *  ✅ renderPage TIDAK mutate window.allClipsData
 *  ✅ __resolveRealIndex helper untuk mapping index tampilan → index asli
 *  ✅ Semua fitur lama TETAP UTUH (cancel, sort, filter, edit, watermark, dll)
 */

(function() {
  'use strict';
  if (window.__FEATURES_V2_LOADED) return;
  window.__FEATURES_V2_LOADED = true;

  window.__cancelAnalysis = false;
  window.__analysisStartTime = 0;
  window.__sortMode = 'default';
  window.__filterHighOnly = false;
  window.__watermarkEnabled = true;

  const _origInitApp      = window.initApp;
  const _origStart        = window.startRealSignalAnalysis;
  const _origRenderPage   = window.renderPage;
  const _origUpdateStatus = window.updateStatus;
  const _origFormatTime   = window.formatTime;

  // ═══════════════════════════════════════════════════════════
  // ═══ v2.5 HELPER: RESOLVE INDEX TAMPILAN → INDEX ASLI ═══
  // ═══════════════════════════════════════════════════════════
  window.__displayOrder = null;

  window.__resolveRealIndex = function(displayIdx) {
    if (window.__displayOrder && window.__displayOrder[displayIdx] !== undefined) {
      return window.__displayOrder[displayIdx];
    }
    return displayIdx;
  };

  // ═══════════════════════════════════════════════════════════
  // FEATURE 1: CANCEL
  // ═══════════════════════════════════════════════════════════
  function installCancel() {
    if (!window.VideoSignalEngine) return;
    if (VideoSignalEngine.__cancelInstalled) return;
    VideoSignalEngine.__cancelInstalled = true;
    const origSeek = VideoSignalEngine.seekVideoFast;
    VideoSignalEngine.seekVideoFast = function(video, time, timeoutMs) {
      if (window.__cancelAnalysis) return Promise.resolve(false);
      return origSeek.call(VideoSignalEngine, video, time, timeoutMs);
    };
  }

  // ═══════════════════════════════════════════════════════════
  // FEATURE 2: PROGRESS BAR + ETA
  // ═══════════════════════════════════════════════════════════
  function installProgressBar() {
    if (document.getElementById('progressBarWrap')) return;
    const section1 = document.querySelector('.card .section-header');
    if (!section1) return;

    const wrap = document.createElement('div');
    wrap.id = 'progressBarWrap';
    wrap.style.cssText = 'display:none; padding:12px; background:var(--input-bg); border:1px solid var(--input-border); border-radius:10px; margin-top:4px;';
    wrap.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.72rem; color:var(--text-sub); font-weight:600;">
        <span id="progressText">Memproses...</span>
        <span id="progressEta">--</span>
      </div>
      <div style="height:6px; background:var(--card-border); border-radius:3px; overflow:hidden; margin-bottom:10px;">
        <div id="progressFill" style="height:100%; width:0%; background:linear-gradient(90deg,#38bdf8,#10b981); transition:width 0.25s ease;"></div>
      </div>
      <button id="btnCancelAnalysis" type="button" style="width:100%; padding:9px; background:#dc2626; color:#fff; border:none; border-radius:6px; font-size:0.78rem; font-weight:700; cursor:pointer;">
        ❌ Batalkan Analisis
      </button>
    `;
    section1.parentNode.insertBefore(wrap, section1.nextSibling);

    document.getElementById('btnCancelAnalysis').addEventListener('click', () => {
      window.__cancelAnalysis = true;
      const btn = document.getElementById('btnCancelAnalysis');
      if (btn) { btn.innerText = '⏳ Membatalkan...'; btn.disabled = true; }
      window.updateStatus('Membatalkan analisis...');
    });
  }

  window.updateStatus = function(text) {
    _origUpdateStatus(text);
    const wrap = document.getElementById('progressBarWrap');
    const fill = document.getElementById('progressFill');
    const txt = document.getElementById('progressText');
    const etaEl = document.getElementById('progressEta');
    if (!wrap) return;

    const m = String(text).match(/(\d+)\s*\/\s*(\d+)/);
    if (m) {
      const cur = parseInt(m[1], 10);
      const tot = parseInt(m[2], 10);
      const pct = Math.min(100, Math.round((cur / tot) * 100));
      const elapsed = (Date.now() - (window.__analysisStartTime || Date.now())) / 1000;
      const rate = cur > 0 ? elapsed / cur : 0;
      const eta = Math.max(0, Math.round(rate * (tot - cur)));

      wrap.style.display = 'block';
      if (fill) fill.style.width = pct + '%';
      if (txt) txt.innerText = text;
      if (etaEl) etaEl.innerText = (eta > 0 && eta < 900) ? `⏱ Sisa ~${eta}s` : '⏱ Menghitung...';
    } else if (text && (text.indexOf('Selesai') !== -1 || text.indexOf('golden moment valid') !== -1)) {
      if (fill) fill.style.width = '100%';
      if (txt) txt.innerText = text;
      if (etaEl) etaEl.innerText = '✅ Selesai';
      setTimeout(() => { wrap.style.display = 'none'; }, 2000);
    }
  };

  window.startRealSignalAnalysis = async function() {
    window.__cancelAnalysis = false;
    window.__analysisStartTime = Date.now();

    const wrap = document.getElementById('progressBarWrap');
    const btn = document.getElementById('btnCancelAnalysis');
    const fill = document.getElementById('progressFill');
    if (wrap) wrap.style.display = 'block';
    if (btn) { btn.innerText = '❌ Batalkan Analisis'; btn.disabled = false; }
    if (fill) fill.style.width = '0%';

    installCancel();

    try {
      await _origStart();
    } catch (e) {
      console.warn('[V2] Analysis error:', e);
    } finally {
      if (window.__cancelAnalysis) {
        window.__cancelAnalysis = false;
        const cont = document.getElementById('clipResults');
        if (cont && window.allClipsData.length === 0) {
          cont.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px 0;">Analisis dibatalkan oleh user.<br>Klik <strong>⚡ AUTO-ANALYZE</strong> untuk memulai ulang.</p>';
        }
        window.updateStatus('Dibatalkan');
      }
      setTimeout(() => {
        const w = document.getElementById('progressBarWrap');
        if (w) w.style.display = 'none';
      }, 2500);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // FEATURE 3: VARIASI HOOK 5x
  // ═══════════════════════════════════════════════════════════
  function installHookVariations() {
    if (!window.HookEngine) return;
    if (HookEngine.__variationsInstalled) return;
    HookEngine.__variationsInstalled = true;

    const orig = HookEngine._buildConfigs.bind(HookEngine);

    HookEngine._buildConfigs = function() {
      const cfg = orig();
      const extras = {
        'id-ID': {
          attentions: ['OKE GILA...', 'AKU NGGAK NYANGKA...', 'INI YANG BIKIN...', 'TUNGGU DULU...', 'SERIUS?!', 'MOMEN INI...', 'NGGAK MASUK AKAL...'],
          hookBodiesGeneric: [
            'Bagian ini bener-bener nggak bisa diprediksi',
            'Ada sesuatu yang aneh di sini 👀',
            'Nggak ada yang notice sampai sekarang',
            'Ini yang bikin semua orang salah paham',
            'Diam-diam bagian ini paling penting',
            'Kalau kamu skip, kamu bakal nyesel',
            'Detail kecil, efeknya gede banget',
            'Bagian ini yang bikin gue nggak bisa move on',
            'Ada yang aneh... tapi kenapa jadi seru?',
            'Ini yang bikin nontonnya jadi susah berhenti'
          ]
        },
        'en-US': {
          attentions: ['OKAY WILD...', 'I DIDN\'T KNOW...', 'THIS IS WHY...', 'HOLD ON...', 'FOR REAL?!', 'THIS MOMENT...', 'CAN\'T BELIEVE...'],
          hookBodiesGeneric: [
            'This part is genuinely unpredictable',
            'Something feels off here 👀',
            'Nobody caught this until now',
            'The part that makes everyone confused',
            'Quietly the most important bit',
            'You\'ll regret skipping this',
            'Small detail, huge payoff',
            'The part I can\'t stop thinking about',
            'Something\'s off... but in a good way?',
            'The reason you can\'t stop watching'
          ]
        },
        'en-GB': {
          attentions: ['RIGHT THEN...', 'DIDN\'T KNOW...', 'THIS IS WHY...', 'HOLD ON...', 'FOR REAL?!', 'PROPER MOMENT...', 'CAN\'T BELIEVE IT...'],
          hookBodiesGeneric: [
            'This bit is genuinely unpredictable mate',
            'Something feels off here 👀',
            'Nobody spotted this until now',
            'The bit that confused everyone',
            'Quietly the most important bit',
            'You\'ll regret skipping this bit',
            'Small detail, massive payoff',
            'The bit I can\'t stop thinking about',
            'Something\'s off... but in a good way?',
            'The reason you can\'t stop watching'
          ]
        },
        'en-CA': {
          attentions: ['OKAY WILD...', 'DIDN\'T KNOW...', 'THIS IS WHY...', 'HOLD ON EH...', 'FOR REAL?!', 'THAT MOMENT...', 'NO WAY...'],
          hookBodiesGeneric: [
            'This part is genuinely unpredictable eh',
            'Something feels off here 👀',
            'Nobody caught this until now',
            'The part that confused everyone',
            'Quietly the most important bit',
            'You\'ll regret skipping this part',
            'Small detail, huge payoff',
            'The part I can\'t stop thinking about',
            'Something\'s off... but in a good way?',
            'The reason you can\'t stop watching'
          ]
        }
      };
      Object.keys(cfg).forEach(region => {
        const r = cfg[region];
        const ex = extras[region];
        if (!r || !ex) return;
        r.attentions = (r.attentions || []).concat(ex.attentions);
        if (r.hookBodies && r.hookBodies.generic) {
          r.hookBodies.generic = r.hookBodies.generic.concat(ex.hookBodiesGeneric);
        }
      });
      return cfg;
    };
  }

  // ═══════════════════════════════════════════════════════════
  // FEATURE 4: SORT & FILTER
  // ═══════════════════════════════════════════════════════════
  function installSortFilter() {
    if (document.getElementById('sortControls')) return;
    const headers = document.querySelectorAll('.card .section-header');
    const outputHeader = headers[1];
    if (!outputHeader) return;

    const wrap = document.createElement('div');
    wrap.id = 'sortControls';
    wrap.style.cssText = 'display:flex; gap:6px; flex-wrap:wrap; align-items:center; padding:8px; background:var(--input-bg); border:1px solid var(--input-border); border-radius:8px; margin-top:4px;';
    wrap.innerHTML = `
      <select id="sortSelect" class="input-field" style="flex:1; min-width:130px; font-size:0.72rem; padding:6px;">
        <option value="default">↕ Sesuai Video</option>
        <option value="score-desc">🔥 Skor Tertinggi</option>
        <option value="score-asc">❄️ Skor Terendah</option>
        <option value="duration-desc">📏 Klip Terpanjang</option>
        <option value="duration-asc">📐 Klip Terpendek</option>
      </select>
      <label style="display:flex; align-items:center; gap:4px; font-size:0.72rem; color:var(--text-sub); cursor:pointer; font-weight:600;">
        <input type="checkbox" id="filterHighOnly" style="cursor:pointer;">
        🔥 Hanya ≥70
      </label>
    `;
    outputHeader.parentNode.insertBefore(wrap, outputHeader.nextSibling);

    document.getElementById('sortSelect').addEventListener('change', (e) => {
      window.__sortMode = e.target.value;
      window.currentPage = 1;
      window.renderPage();
    });
    document.getElementById('filterHighOnly').addEventListener('change', (e) => {
      window.__filterHighOnly = e.target.checked;
      window.currentPage = 1;
      window.renderPage();
    });
  }

  // ═══════════════════════════════════════════════════════════
  // ═══ v2.5 FIX: renderPage TIDAK mutate window.allClipsData ═══
  // ═══════════════════════════════════════════════════════════
  window.renderPage = function() {
    const data = window.allClipsData || [];
    let filtered = data;
    if (window.__filterHighOnly) {
      filtered = data.filter(c => c.score >= 70);
    }
    const sorted = filtered.slice();
    if (window.__sortMode === 'score-desc') sorted.sort((a, b) => b.score - a.score);
    else if (window.__sortMode === 'score-asc') sorted.sort((a, b) => a.score - b.score);
    else if (window.__sortMode === 'duration-desc') sorted.sort((a, b) => b.duration - a.duration);
    else if (window.__sortMode === 'duration-asc') sorted.sort((a, b) => a.duration - b.duration);
    else sorted.sort((a, b) => a.rawStart - b.rawStart);

    // ═══ v2.5: Simpan mapping index tampilan → index asli ═══
    // Ini memungkinkan handler (toggleSkip, editField, dll) resolve index dengan benar
    window.__displayOrder = sorted.map(c => data.indexOf(c));

    // Simpan referensi asli, ganti sementara untuk render, lalu restore
    const originalData = window.allClipsData;
    try {
      window.allClipsData = sorted;
      _origRenderPage();
    } finally {
      // SELALU restore, bahkan jika _origRenderPage() throw error
      window.allClipsData = originalData;
      // JANGAN hapus __displayOrder — script.js masih butuh untuk resolve index
      // (akan di-overwrite saat renderPage berikutnya)
    }

    if (window.__filterHighOnly && sorted.length === 0 && data.length > 0) {
      const cont = document.getElementById('clipResults');
      if (cont) cont.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px 0;">Tidak ada klip dengan skor ≥70.<br>Uncheck filter untuk melihat semua klip.</p>';
    }
  };

  // ═══════════════════════════════════════════════════════════
  // FEATURE 5: EDIT TIMESTAMP INLINE
  // ═══════════════════════════════════════════════════════════
  function installTimestampEditor() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mut => {
        mut.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          if (node.classList && node.classList.contains('clip-card')) {
            attachEditorToCard(node);
          } else if (node.querySelectorAll) {
            node.querySelectorAll('.clip-card').forEach(attachEditorToCard);
          }
        });
      });
    });
    const target = document.getElementById('clipResults');
    if (target) {
      observer.observe(target, { childList: true, subtree: true });
      target.querySelectorAll('.clip-card').forEach(attachEditorToCard);
    }
  }

  function attachEditorToCard(card) {
    if (card.querySelector('.btnEditTs')) return;
    const idx = parseInt(card.getAttribute('data-clip-idx'), 10);
    if (isNaN(idx)) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btnEditTs';
    btn.innerText = '✏️ Edit Waktu';
    btn.style.cssText = 'padding:4px 10px; background:var(--input-bg); color:var(--text-sub); border:1px solid var(--input-border); border-radius:6px; cursor:pointer; font-size:0.7rem; font-weight:600;';

    // Fallback 3-level selector
    let target = card.querySelector('.score-header');
    if (!target) target = card.querySelector(':scope > div:first-child');
    if (!target) target = card;

    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex; gap:6px; align-items:center; flex-wrap:wrap; margin-top:6px;';
    wrap.appendChild(btn);
    target.appendChild(wrap);

    btn.addEventListener('click', () => openTimestampEditor(idx));
  }

  function openTimestampEditor(idx) {
    const clip = window.allClipsData[idx];
    if (!clip) return;
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:99999; padding:16px;';
    modal.innerHTML = `
      <div style="background:var(--card-bg); padding:20px; border-radius:12px; max-width:340px; width:100%; border:1px solid var(--card-border); color:var(--text-main);">
        <h3 style="margin-bottom:12px; font-size:1rem;">✏️ Edit Timestamp — Klip #${idx + 1}</h3>
        <label style="display:block; font-size:0.72rem; margin-bottom:4px; color:var(--text-sub); font-weight:600;">Start (detik)</label>
        <input type="number" id="editStart" value="${clip.rawStart.toFixed(2)}" step="0.5" min="0" class="input-field" style="margin-bottom:10px;">
        <label style="display:block; font-size:0.72rem; margin-bottom:4px; color:var(--text-sub); font-weight:600;">End (detik)</label>
        <input type="number" id="editEnd" value="${clip.rawEnd.toFixed(2)}" step="0.5" min="0" class="input-field" style="margin-bottom:12px;">
        <div style="display:flex; gap:8px;">
          <button type="button" id="cancelEdit" style="flex:1; padding:9px; background:var(--input-bg); color:var(--text-main); border:1px solid var(--input-border); border-radius:6px; cursor:pointer; font-weight:700;">Batal</button>
          <button type="button" id="saveEdit" style="flex:2; padding:9px; background:#10b981; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:700;">💾 Simpan</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    const closeModal = () => { if (modal.parentNode) modal.remove(); };
    modal.querySelector('#cancelEdit').onclick = closeModal;
    modal.querySelector('#saveEdit').onclick = () => {
      const s = parseFloat(modal.querySelector('#editStart').value);
      const e = parseFloat(modal.querySelector('#editEnd').value);
      if (isNaN(s) || isNaN(e) || e <= s || s < 0) {
        alert('❌ Timestamp tidak valid.');
        return;
      }
      clip.rawStart = s;
      clip.rawEnd = e;
      clip.duration = e - s;
      clip.start = _origFormatTime(s);
      clip.end = _origFormatTime(e);
      closeModal();
      window.renderPage();
      window.updateStatus(`✅ Klip #${idx + 1} diperbarui: ${clip.start} → ${clip.end}`);
      setTimeout(() => window.updateStatus('Ready'), 2000);
    };
  }

  // ═══════════════════════════════════════════════════════════
  // FEATURE 6: WATERMARK REMINDER
  // ═══════════════════════════════════════════════════════════
  function installWatermarkReminder() {
    if (!window.FFmpegManager) return;
    if (FFmpegManager.__wmInstalled) return;
    FFmpegManager.__wmInstalled = true;
    const origDownload = FFmpegManager.downloadBlob;
    FFmpegManager.downloadBlob = function(blob, filename) {
      origDownload.call(FFmpegManager, blob, filename);
      if (window.__watermarkEnabled) {
        window.updateStatus('💧 Reminder: Tambah "@sumber" di CapCut sebelum upload!');
        setTimeout(() => {
          const badge = document.getElementById('statusBadge');
          if (badge && badge.innerText.indexOf('Reminder') !== -1) window.updateStatus('Ready');
        }, 5000);
      }
    };
  }

  // ═══════════════════════════════════════════════════════════
  // FEATURE 7: ENHANCED METADATA TXT
  // ═══════════════════════════════════════════════════════════
  window.buildMetadataTxt = function(clip, idx) {
    const padIdx = String(idx + 1).padStart(2, '0');
    return `AI AGENT CLIP #${idx + 1}
Generated: ${new Date().toISOString()}

--- TIMESTAMP ---
Start   : ${clip.start}
End     : ${clip.end}
Durasi  : ${Math.round(clip.duration)}s

--- GOLDEN SCORE ---
${clip.score}/100 (${clip.confidence})

--- HOOK + HEADLINE ---
${clip.edited.hookHeadline}

--- CAPTION ---
${clip.edited.caption}

--- CTA ---
${clip.edited.cta}

--- HASHTAGS ---
${clip.hashtags.join(' ')}

═══════════════════════════════════════════════
WORKFLOW CAPCUT — IKUTI URUTAN INI
═══════════════════════════════════════════════

LANGKAH 1: IMPORT
  • Buka CapCut → New Project
  • Import file: CLIP_${padIdx}.mp4
  • Import subtitle: CLIP_${padIdx}.srt

LANGKAH 2: BACA DIALOG (yang AI TIDAK BISA)
  • Ketuk "Text" → "Auto captions"
  • Pilih "Generate from audio" / Auto-detect language
  • CapCut akan transkrip dialog video otomatis
  • Edit subtitle agar akurat

LANGKAH 3: PAHAM KONTEKS (yang AI TIDAK BISA)
  • Review video dari awal sampai akhir
  • Tanyakan: Apa yang terjadi? Siapa di video? Kenapa penting?
  • Update caption dengan konteks asli

LANGKAH 4: KENALI ORANG (yang AI TIDAK BISA)
  • Sebutkan nama yang ada di video di caption
  • Contoh: "Momen Messi vs Ronaldo di menit 89"

LANGKAH 5: CAPTION FINAL
  • Copy CAPTION di atas sebagai draft
  • Edit dengan konteks dari Langkah 3 & 4
  • Panjangkan jika perlu (50-100 kata)

LANGKAH 6: STYLING
  • Ganti font subtitle
  • Tambah transisi & efek
  • Tambah background music
  • Tambah watermark "@sumber"

LANGKAH 7: EXPORT
  • Ketuk Export → Upload ke TikTok/IG/YT

═══════════════════════════════════════════════
CATATAN
═══════════════════════════════════════════════
AI Agent memberi DRAFT cepat (timestamp + hook + caption).
CapCut melengkapi yang AI tidak bisa:
  • Baca dialog   → Auto-Captions CapCut
  • Paham konteks → Review manual
  • Kenali orang  → Sebut nama di caption
  • Deteksi bahasa → Auto-detect CapCut

100% gratis selamanya. Tanpa API, tanpa Whisper.
`;
  };

  // ═══════════════════════════════════════════════════════════
  // WRAP initApp
  // ═══════════════════════════════════════════════════════════
  window.initApp = function() {
    _origInitApp();
    installProgressBar();
    installSortFilter();
    installTimestampEditor();
    installWatermarkReminder();
    installHookVariations();
    installCancel();
    console.log('[Features V2] ✅ 7 fitur aktif (v2.5 — no-mutate render)');
  };

  console.log('[Features V2] 📦 Loaded v2.5');
})();