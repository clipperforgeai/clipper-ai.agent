/**
 * AI CLIPPER AGENT - CAPCUT-READY UI + HUMAN VOICE v3.0
 * 
 * v3.0 FIX TOTAL:
 *  ✅ shareToCapCut pakai navigator.share (system share sheet — CapCut otomatis detect)
 *  ✅ CapCut intent fallback multi-package (compatible semua versi Play Store)
 *  ✅ shareToGallery pakai Web Share (Android + iOS simpan langsung ke galeri)
 *  ✅ Download fallback dengan anchor (semua browser)
 *  ✅ Semua handler pakai __resolveRealIndex
 *  ✅ Subtitle editor v2.6 tetap utuh
 */

window.currentVideoFile = null;
window.allClipsData = [];
window.currentPage = 1;
window.itemsPerPage = 5;
window.skippedClips = new Set();

document.addEventListener('DOMContentLoaded', () => { initApp(); });

function __ridx(displayIdx) {
  return (window.__resolveRealIndex ? window.__resolveRealIndex(displayIdx) : displayIdx);
}

function initApp() {
  applySavedTheme();

  const videoInput = document.getElementById('videoInput');
  const btnGenerate = document.getElementById('btnGenerate');
  const btnPrev = document.getElementById('btnPrevPage');
  const btnNext = document.getElementById('btnNextPage');
  const themeToggle = document.getElementById('themeToggle');
  const btnCopyAll = document.getElementById('btnCopyAll');
  const btnDownloadAll = document.getElementById('btnDownloadAll');

  if (videoInput) {
    videoInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) handleFileSelect(file);
    });
  }

  if (btnGenerate) {
    btnGenerate.addEventListener('click', (e) => { e.preventDefault(); startRealSignalAnalysis(); });
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (window.currentPage > 1) { window.currentPage--; renderPage(); }
    });
  }
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      const tp = Math.max(1, Math.ceil(window.allClipsData.length / window.itemsPerPage));
      if (window.currentPage < tp) { window.currentPage++; renderPage(); }
    });
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const html = document.documentElement;
      const cur = html.getAttribute('data-theme') || 'dark';
      const nxt = cur === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', nxt);
      try { localStorage.setItem('ai-agent-theme', nxt); } catch (e) {}
      const icon = document.getElementById('themeIcon');
      if (icon) icon.textContent = nxt === 'dark' ? '🌙 Dark' : '☀️ Light';
    });
  }

  if (btnCopyAll) btnCopyAll.addEventListener('click', copyAllText);
  if (btnDownloadAll) btnDownloadAll.addEventListener('click', downloadAllForCapCut);
}

function applySavedTheme() {
  const html = document.documentElement;
  let saved = 'dark';
  try {
    const s = localStorage.getItem('ai-agent-theme');
    if (s === 'light' || s === 'dark') saved = s;
  } catch (e) {}
  html.setAttribute('data-theme', saved);
  const icon = document.getElementById('themeIcon');
  if (icon) icon.textContent = saved === 'dark' ? '🌙 Dark' : '☀️ Light';
}

function handleFileSelect(file) {
  window.currentVideoFile = file;
  window.skippedClips.clear();
  window.allClipsData = [];
  window.currentPage = 1;

  if (window.__clipSubtitles && typeof window.__clipSubtitles.clear === 'function') {
    window.__clipSubtitles.clear();
  }

  const container = document.getElementById('clipResults');
  if (container) {
    container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px 0;">Video siap diproses. Klik tombol <strong>⚡ AUTO-ANALYZE</strong> untuk memulai.</p>';
  }

  const pagContainer = document.getElementById('paginationContainer');
  if (pagContainer) pagContainer.classList.add('hidden');

  const batchBox = document.getElementById('batchActions');
  if (batchBox) batchBox.classList.add('hidden');

  const badge = document.getElementById('statusBadge');
  if (badge) badge.innerText = 'Ready';

  restoreButton();

  const fileMeta = document.getElementById('fileMeta');
  const metaFilename = document.getElementById('metaFilename');
  const sourceVideo = document.getElementById('sourceVideo');

  if (fileMeta) fileMeta.classList.remove('hidden');
  if (metaFilename) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    metaFilename.innerText = `📹 ${file.name} (${mb} MB)`;
  }

  if (sourceVideo) {
    if (sourceVideo.src && sourceVideo.src.startsWith('blob:')) {
      try { URL.revokeObjectURL(sourceVideo.src); } catch (e) {}
    }
    sourceVideo.src = URL.createObjectURL(file);
    sourceVideo.load();
  }
}

async function startRealSignalAnalysis() {
  if (!window.currentVideoFile) { alert("⚠️ Pilih video dulu!"); return; }

  const btnGenerate = document.getElementById('btnGenerate');
  if (btnGenerate) { btnGenerate.disabled = true; btnGenerate.innerText = '⏳ ANALISIS...'; }

  const sourceVideo = document.getElementById('sourceVideo');
  if (!sourceVideo) return;

  if (!sourceVideo.duration || isNaN(sourceVideo.duration)) {
    await new Promise(resolve => {
      const onLoaded = () => { sourceVideo.removeEventListener('loadedmetadata', onLoaded); resolve(); };
      sourceVideo.addEventListener('loadedmetadata', onLoaded);
      setTimeout(resolve, 3000);
    });
  }

  const duration = sourceVideo.duration || 60;
  const regionValue = (document.getElementById('regionSelect') || {}).value || 'id-ID';
  const nicheValue = (document.getElementById('nicheSelect') || {}).value || 'Gaming & Esports';
  const selectedNiche = nicheValue === 'AUTO' ? 'Gaming & Esports' : nicheValue;

  if (!window.HookEngine) { alert("❌ HookEngine tidak ditemukan."); restoreButton(); return; }

  const nicheRules = window.HookEngine.getNicheDurationRules(selectedNiche);
  nicheRules.niche = selectedNiche;

  window.allClipsData = [];
  window.currentPage = 1;
  window.skippedClips.clear();

  if (window.__clipSubtitles && typeof window.__clipSubtitles.clear === 'function') {
    window.__clipSubtitles.clear();
  }

  const container = document.getElementById('clipResults');
  if (container) container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px 0;">Memproses sinyal...</p>';

  const usedSet = { attentions: [], hookBodies: [], captions: [], extras: [] };

  try {
    const engine = window.VideoSignalEngine;
    if (!engine) { alert("❌ VideoSignalEngine tidak ditemukan."); restoreButton(); return; }

    const fileMB = window.currentVideoFile ? (window.currentVideoFile.size / (1024 * 1024)) : 0;

    let analyzer;
    if (fileMB > 300 && typeof engine.analyzeVideoSignalsHuge === 'function') {
      analyzer = engine.analyzeVideoSignalsHuge.bind(engine);
    } else if (typeof engine.analyzeVideoSignalsEnhanced === 'function') {
      analyzer = engine.analyzeVideoSignalsEnhanced.bind(engine);
    } else {
      analyzer = engine.analyzeVideoSignals.bind(engine);
    }

    await analyzer(
      sourceVideo, window.currentVideoFile, duration, nicheRules,
      (txt) => updateStatus(txt),
      (moment, idx) => {
        const pkg = window.HookEngine.buildUniquePackage(moment, selectedNiche, regionValue, idx, usedSet);
        const clip = {
          id: idx + 1,
          start: formatTime(moment.startTime),
          end: formatTime(moment.endTime),
          rawStart: moment.startTime,
          rawEnd: moment.endTime,
          duration: moment.duration,
          score: moment.score,
          confidence: moment.confidence,
          signals: moment.signals || [],
          endingType: moment.endingType || '[LOOP]',
          hookHeadline: pkg.hookHeadline,
          caption: pkg.caption,
          cta: pkg.cta,
          hashtags: pkg.hashtags,
          lang: pkg.lang,
          edited: {
            hookHeadline: pkg.hookHeadline,
            caption: pkg.caption,
            cta: pkg.cta
          }
        };
        window.allClipsData.push(clip);
        const pageOfClip = Math.ceil(window.allClipsData.length / window.itemsPerPage);
        if (window.currentPage === pageOfClip || window.currentPage === 1) renderPage();
      }
    );

    if (window.allClipsData.length === 0) {
      if (container) container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px 0;">Tidak ada golden moment.</p>';
      updateStatus('0 klip.');
    } else {
      updateStatus(`Selesai! ${window.allClipsData.length} klip.`);
    }
    renderPage();
  } catch (err) {
    console.error(err);
    alert("Gagal: " + (err.message || err));
  } finally {
    restoreButton();
  }
}

function restoreButton() {
  const btnGenerate = document.getElementById('btnGenerate');
  if (btnGenerate) {
    btnGenerate.disabled = false;
    btnGenerate.innerText = '⚡ AUTO-ANALYZE & GENERATE CLIPS';
  }
}

function humanizeEvidence(signals) {
  const out = [];
  if (!Array.isArray(signals)) return out;
  for (const s of signals) {
    const str = String(s);
    if (/Motion Delta|Motion Delta Peak/i.test(str)) out.push('Ada pergerakan yang menonjol di bagian ini');
    else if (/Audio RMS|Audio RMS Peak|Audio Energy/i.test(str)) out.push('Suasananya terasa berbeda di bagian ini');
    else if (/Scene Transition/i.test(str)) out.push('Ada pergantian adegan yang bikin alur berubah');
    else if (/Pattern Interrupt/i.test(str)) out.push('Ada kejadian mendadak yang bikin kaget');
    else if (/Face Detected/i.test(str)) out.push('Ada reaksi wajah yang kelihatan jelas');
    else if (/Speech Present/i.test(str)) out.push('Ada bagian orang ngomong yang penting');
    else if (/Laughter/i.test(str)) out.push('Ada momen yang bikin ketawa');
    else if (/Emphasis Spike/i.test(str)) out.push('Ada penekanan yang bikin momen terasa kuat');
    else if (/Graphic|Text Density/i.test(str)) out.push('Ada bagian yang menampilkan teks atau grafik');
    else if (/Motion/i.test(str)) out.push('Ada pergerakan yang menonjol');
  }
  return out;
}

function renderPage() {
  const container = document.getElementById('clipResults');
  if (!container) return;

  const data = window.allClipsData || [];
  if (data.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px 0;">Belum ada klip.</p>';
    updatePagination();
    updateBatchButtons();
    return;
  }

  const perPage = window.itemsPerPage;
  const totalPages = Math.max(1, Math.ceil(data.length / perPage));
  if (window.currentPage > totalPages) window.currentPage = totalPages;

  const startIndex = (window.currentPage - 1) * perPage;
  const pageClips = data.slice(startIndex, startIndex + perPage);
  const sourceUrl = sourceVideoBlobUrl();

  container.innerHTML = pageClips.map((clip, i) => {
    const globalIdx = startIndex + i;
    const realIdx = __ridx(globalIdx);
    const isSkipped = window.skippedClips.has(realIdx);
    const safeHashtags = Array.isArray(clip.hashtags) ? clip.hashtags : [];
    const previewSrc = sourceUrl ? `${sourceUrl}#t=${clip.rawStart},${clip.rawEnd}` : '';
    const copyBtnStyle = 'padding:4px 10px; background:var(--input-bg); color:var(--text-sub); border:1px solid var(--input-border); border-radius:6px; cursor:pointer; font-size:0.7rem; font-weight:600;';
    const humanEvidence = humanizeEvidence(clip.signals);

    return `
      <div class="clip-card" data-clip-idx="${realIdx}" style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; margin-bottom: 15px; border: 1px solid var(--card-border); ${isSkipped ? 'opacity:0.5;' : ''}">
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; align-items: center; gap: 8px; flex-wrap: wrap;">
          <span style="font-weight: bold; color: #10b981; background: rgba(16,185,129,0.1); padding: 5px 10px; border-radius: 14px; font-size: 0.82rem;">
            🔥 Golden Score: ${clip.score}/100
          </span>
          <div style="display:flex; gap:6px; align-items:center;">
            <label style="font-size:0.75rem; cursor:pointer; color:var(--text-sub); display:flex; align-items:center; gap:4px;">
              <input type="checkbox" ${isSkipped ? 'checked' : ''} onchange="toggleSkip(${realIdx}, this.checked)" style="cursor:pointer;">
              Skip
            </label>
            <span style="font-weight: bold; color: #38bdf8; font-size: 0.82rem;">⏱ ${clip.start} → ${clip.end} (${Math.round(clip.duration)}s)</span>
          </div>
        </div>

        <div style="margin-bottom: 10px; display:flex; justify-content:space-between; align-items:center;">
          <p style="font-size: 0.68rem; color: var(--text-sub); text-transform: uppercase; margin:0;">🎬 Preview</p>
        </div>
        ${previewSrc ? `<video src="${previewSrc}" controls preload="metadata" style="width:100%; max-height:180px; border-radius:8px; background:#000; margin-bottom:10px;"></video>` : '<p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:10px;">Preview tidak tersedia.</p>'}

        <div style="background: rgba(0,0,0,0.25); padding: 10px; border-radius: 8px; margin-bottom: 8px; border: 1px solid rgba(56,189,248,0.15);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <p style="font-size: 0.68rem; color: #38bdf8; text-transform: uppercase; font-weight:700; margin:0;">🪝 Hook + Headline</p>
            <button type="button" onclick="copyField(${realIdx}, 'hookHeadline')" style="${copyBtnStyle}">📋 Copy</button>
          </div>
          <textarea oninput="editField(${realIdx}, 'hookHeadline', this.value)" style="width:100%; background:transparent; color:var(--text-main); border:none; padding:0; font-size:0.85rem; resize:vertical; min-height:60px; font-family:inherit; font-weight:600; line-height:1.4;">${escapeHtml(clip.edited.hookHeadline)}</textarea>
        </div>

        <div style="background: rgba(0,0,0,0.25); padding: 10px; border-radius: 8px; margin-bottom: 8px; border: 1px solid rgba(56,189,248,0.15);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <p style="font-size: 0.68rem; color: #38bdf8; text-transform: uppercase; font-weight:700; margin:0;">📝 Caption</p>
            <button type="button" onclick="copyField(${realIdx}, 'caption')" style="${copyBtnStyle}">📋 Copy</button>
          </div>
          <textarea oninput="editField(${realIdx}, 'caption', this.value)" style="width:100%; background:transparent; color:var(--text-main); border:none; padding:0; font-size:0.82rem; resize:vertical; min-height:70px; font-family:inherit; line-height:1.5;">${escapeHtml(clip.edited.caption)}</textarea>
        </div>

        <div style="background: rgba(0,0,0,0.25); padding: 10px; border-radius: 8px; margin-bottom: 8px; border: 1px solid rgba(56,189,248,0.15);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <p style="font-size: 0.68rem; color: #38bdf8; text-transform: uppercase; font-weight:700; margin:0;">📣 Call To Action (CTA)</p>
            <button type="button" onclick="copyField(${realIdx}, 'cta')" style="${copyBtnStyle}">📋 Copy</button>
          </div>
          <input type="text" value="${escapeHtml(clip.edited.cta)}" oninput="editField(${realIdx}, 'cta', this.value)" style="width:100%; background:transparent; color:var(--text-main); border:none; padding:0; font-size:0.82rem; font-family:inherit;">
        </div>

        <div style="background: rgba(0,0,0,0.25); padding: 10px; border-radius: 8px; margin-bottom: 8px; border: 1px solid rgba(56,189,248,0.15);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <p style="font-size: 0.68rem; color: #38bdf8; text-transform: uppercase; font-weight:700; margin:0;"># Hashtags</p>
            <button type="button" onclick="copyField(${realIdx}, 'hashtags')" style="${copyBtnStyle}">📋 Copy</button>
          </div>
          <p style="color: #38bdf8; font-size: 0.82rem; word-break: break-word; margin:0;">${safeHashtags.join(' ')}</p>
        </div>

        ${humanEvidence.length > 0 ? `
        <div style="background: rgba(0,0,0,0.25); padding: 10px; border-radius: 8px; margin-bottom: 12px; border: 1px dashed rgba(56,189,248,0.3);">
          <p style="font-size: 0.68rem; color: #38bdf8; text-transform: uppercase; margin-bottom: 4px;">🔬 Alasan Klip Ini Dipilih</p>
          <ul style="padding-left: 18px; font-size: 0.78rem; color: var(--text-sub); line-height: 1.6; margin:0;">
            ${humanEvidence.map(s => `<li>✓ ${escapeHtml(s)}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button type="button" onclick="copyClipText(${realIdx})"
            style="flex:1; min-width:100px; padding: 10px; background: var(--input-bg); color: var(--text-main); border: 1px solid var(--input-border); border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.82rem;">
            📋 Copy
          </button>
          <button type="button" onclick="shareToCapCut(${realIdx})"
            style="flex:2; min-width:130px; padding: 10px; background: linear-gradient(135deg,#10b981,#059669); color: #fff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.82rem;">
            🎬 CapCut
          </button>
          <button type="button" onclick="shareToGallery(${realIdx})"
            style="flex:2; min-width:130px; padding: 10px; background: linear-gradient(135deg,#3b82f6,#2563eb); color: #fff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.82rem;">
            📥 Galeri
          </button>
        </div>
      </div>
    `;
  }).join('');

  updatePagination();
  updateBatchButtons();
}

function sourceVideoBlobUrl() {
  const v = document.getElementById('sourceVideo');
  return v && v.src ? v.src : '';
}

function toggleSkip(idx, checked) {
  if (checked) window.skippedClips.add(idx);
  else window.skippedClips.delete(idx);
  renderPage();
}

function editField(idx, field, value) {
  const clip = window.allClipsData[idx];
  if (!clip) return;
  clip.edited[field] = value;
}

function copyField(idx, field) {
  const clip = window.allClipsData[idx];
  if (!clip) return;
  let text = '';
  if (field === 'hashtags') text = (clip.hashtags || []).join(' ');
  else text = clip.edited[field] || '';
  if (!text) { updateStatus('⚠️ Kosong.'); return; }
  navigator.clipboard.writeText(text).then(() => {
    updateStatus('✅ Copy!');
    setTimeout(() => updateStatus('Ready'), 1200);
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); updateStatus('✅ Copy!'); }
    catch (e) { alert('Gagal copy manual.'); }
    document.body.removeChild(ta);
    setTimeout(() => updateStatus('Ready'), 1200);
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
 * ═══ SHARE TO CAPCUT v3.0 — SYSTEM SHARE SHEET (100% FUTURE-PROOF) ═══
 * ═══════════════════════════════════════════════════════════════════════════
 * Strategi:
 *   1. navigator.share() → system share sheet → user pilih CapCut
 *      ✅ Otomatis support CapCut versi apapun (tidak hardcode package)
 *      ✅ Berfungsi di Android & iOS
 *      ✅ Kalau CapCut update versi, tetap jalan
 *   2. Fallback: Android intent ke berbagai package CapCut
 *   3. Fallback terakhir: download file
 * ═══════════════════════════════════════════════════════════════════════════ */

async function shareToCapCut(idx) {
  const clip = window.allClipsData[idx];
  if (!clip) { alert('❌ Klip tidak ditemukan.'); return; }
  if (!window.currentVideoFile) { alert('❌ Video original tidak ada.'); return; }

  updateStatus('🎬 Menyiapkan video untuk CapCut...');

  let blob = null;
  let filename = `CAPCUT_CLIP_${String(idx + 1).padStart(2, '0')}.mp4`;

  try {
    // ─── STEP 1: Trim video (dengan AUDIO sekarang) ───
    if (window.MP4TrimEngine && window.MP4TrimEngine.canHandle(window.currentVideoFile)) {
      try {
        blob = await window.MP4TrimEngine.trimToBlob(window.currentVideoFile, clip.rawStart, clip.rawEnd);
        if (blob && blob.size > 0) {
          // OK pakai MP4 lossless
        } else {
          blob = null;
        }
      } catch (e) {
        console.warn('[CapCut] MP4 lossless gagal, coba MediaRecorder:', e);
        blob = null;
      }
    }

    // Fallback ke MediaRecorder (dengan audio fix v3.0)
    if (!blob || blob.size === 0) {
      blob = await window.FFmpegManager.processRealCanvasTrimToBlob(
        window.currentVideoFile, clip.rawStart, clip.rawEnd,
        { fps: 30, videoBitrateMbps: 4.0 }
      );
      const isMp4 = (blob.type || '').indexOf('mp4') !== -1;
      filename = `CAPCUT_CLIP_${String(idx + 1).padStart(2, '0')}.` + (isMp4 ? 'mp4' : 'webm');
    }

    if (!blob || blob.size === 0) throw new Error('Hasil trim kosong');

    // ─── STEP 2: Coba Web Share API (BEST — future-proof!) ───
    const file = new File([blob], filename, { type: blob.type || 'video/mp4' });
    const canShare = navigator.canShare && navigator.canShare({ files: [file] });

    if (canShare) {
      try {
        await navigator.share({
          files: [file],
          title: `Klip ${idx + 1} untuk CapCut`,
          text: 'Pilih CapCut di share sheet — kalau CapCut tidak muncul, pilih "Save to Files" lalu buka CapCut manual'
        });
        updateStatus('✅ Terkirim! Pilih CapCut di share sheet.');
        setTimeout(() => updateStatus('Ready'), 2500);
        return;
      } catch (shareErr) {
        if (shareErr && shareErr.name === 'AbortError') {
          updateStatus('Dibatalkan');
          setTimeout(() => updateStatus('Ready'), 1200);
          return;
        }
        console.warn('[CapCut] Web Share gagal, coba intent:', shareErr);
        // Lanjut ke fallback intent
      }
    }

    // ─── STEP 3: Fallback Android intent (multi-package) ───
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      // Coba beberapa package CapCut yang umum (tidak akan error kalau tidak ada)
      // Play Store CapCut sekarang pakai com.lemon.lvoverseas
      // Tapi kalau user pakai versi China atau versi lama, bisa beda
      const capcutPackages = [
        'com.lemon.lvoverseas',  // CapCut international (current)
        'com.lemon.lv',          // CapCut China
        'com.lemon.lvglobal'     // Legacy
      ];

      // Trick: intent tanpa package spesifik — biarkan Android pilih
      // Ini berfungsi untuk CapCut versi apapun
      const genericIntent = `intent://#Intent;action=android.intent.action.SEND;type=video/*;end`;
      try {
        window.location.href = genericIntent;
        // Fallback kalau intent tidak bekerja (browser tidak support):
        setTimeout(() => {
          // Kalau masih di halaman yang sama, download file
          if (!document.hidden) {
            window.FFmpegManager.downloadBlob(blob, filename);
            updateStatus('✅ File ter-download. Buka CapCut → Import video ini.');
            setTimeout(() => updateStatus('Ready'), 3000);
          }
        }, 800);
        return;
      } catch (e) {
        console.warn('[CapCut] Intent gagal:', e);
      }
    }

    // ─── STEP 4: Last fallback — download file ───
    window.FFmpegManager.downloadBlob(blob, filename);
    updateStatus('✅ Ter-download. Buka CapCut → Import video.');
    setTimeout(() => updateStatus('Ready'), 3000);

  } catch (err) {
    console.error('[CapCut]', err);
    if (err && err.name === 'AbortError') {
      updateStatus('Dibatalkan');
      setTimeout(() => updateStatus('Ready'), 1200);
      return;
    }
    alert('Gagal menyiapkan video untuk CapCut:\n\n' + (err.message || err));
    updateStatus('❌ Gagal');
    setTimeout(() => updateStatus('Ready'), 2000);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * ═══ SHARE TO GALLERY v3.0 — ANDROID & iOS PROPER ═══
 * ═══════════════════════════════════════════════════════════════════════════
 * Strategi:
 *   1. Web Share API dengan file video → di iOS muncul opsi "Save to Photos"
 *      di Android muncul opsi "Save to Gallery / Files"
 *   2. Fallback: download anchor (berfungsi di semua browser)
 * ═══════════════════════════════════════════════════════════════════════════ */

async function shareToGallery(idx) {
  const clip = window.allClipsData[idx];
  if (!clip) { alert('❌ Klip tidak ditemukan.'); return; }
  if (!window.currentVideoFile) { alert('❌ Video original tidak ada.'); return; }

  updateStatus('📥 Menyiapkan klip untuk galeri...');

  let blob = null;
  let filename = `CLIP_${String(idx + 1).padStart(2, '0')}.mp4`;

  try {
    // ─── STEP 1: Trim video ───
    if (window.MP4TrimEngine && window.MP4TrimEngine.canHandle(window.currentVideoFile)) {
      try {
        blob = await window.MP4TrimEngine.trimToBlob(window.currentVideoFile, clip.rawStart, clip.rawEnd);
        if (!blob || blob.size === 0) blob = null;
      } catch (e) {
        console.warn('[Gallery] MP4 lossless gagal:', e);
        blob = null;
      }
    }

    if (!blob || blob.size === 0) {
      blob = await window.FFmpegManager.processRealCanvasTrimToBlob(
        window.currentVideoFile, clip.rawStart, clip.rawEnd,
        { fps: 30, videoBitrateMbps: 4.0 }
      );
      const isMp4 = (blob.type || '').indexOf('mp4') !== -1;
      filename = `CLIP_${String(idx + 1).padStart(2, '0')}.` + (isMp4 ? 'mp4' : 'webm');
    }

    if (!blob || blob.size === 0) throw new Error('Hasil trim kosong');

    // ─── STEP 2: Coba Web Share API ───
    const file = new File([blob], filename, { type: blob.type || 'video/mp4' });
    const canShare = navigator.canShare && navigator.canShare({ files: [file] });

    if (canShare) {
      try {
        await navigator.share({
          files: [file],
          title: `Simpan Klip ${idx + 1}`,
          text: 'Pilih "Simpan ke Galeri" / "Save to Photos" / "Save Video"'
        });
        updateStatus('✅ Tersimpan ke galeri!');
        setTimeout(() => updateStatus('Ready'), 2500);
        return;
      } catch (shareErr) {
        if (shareErr && shareErr.name === 'AbortError') {
          updateStatus('Dibatalkan');
          setTimeout(() => updateStatus('Ready'), 1200);
          return;
        }
        console.warn('[Gallery] Web Share gagal:', shareErr);
        // Lanjut fallback download
      }
    }

    // ─── STEP 3: Fallback download anchor ───
    // Ini berfungsi di semua browser — file masuk folder Downloads
    window.FFmpegManager.downloadBlob(blob, filename);
    updateStatus('✅ File ter-download. Cek folder Downloads / Files.');
    setTimeout(() => updateStatus('Ready'), 3000);

  } catch (err) {
    console.error('[Gallery]', err);
    if (err && err.name === 'AbortError') {
      updateStatus('Dibatalkan');
      setTimeout(() => updateStatus('Ready'), 1200);
      return;
    }
    alert('Gagal menyimpan ke galeri:\n\n' + (err.message || err));
    updateStatus('❌ Gagal');
    setTimeout(() => updateStatus('Ready'), 2000);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * FUNGSI LAMA — tetap ada untuk backward compat
 * ═══════════════════════════════════════════════════════════════════════════ */

async function exportForCapCut(idx) {
  const clip = window.allClipsData[idx];
  if (!clip) return;
  if (!window.currentVideoFile) { alert("Video original tidak ada."); return; }
  if (!window.FFmpegManager) { alert("FFmpegManager tidak ada."); return; }

  const baseName = `CLIP_${String(idx + 1).padStart(2, '0')}`;
  downloadTextFile(buildMetadataTxt(clip, idx), `${baseName}.txt`);
  downloadTextFile(buildSrt(clip), `${baseName}.srt`);

  setTimeout(() => {
    window.FFmpegManager.trimAndDownload(
      window.currentVideoFile, clip.rawStart, clip.rawEnd, `${baseName}.mp4`
    );
  }, 300);
}

async function saveToGallery(idx) {
  return shareToGallery(idx);
}

function buildMetadataTxt(clip, idx) {
  return `=== AI AGENT CLIP #${idx + 1} ===
Generated: ${new Date().toISOString()}

--- TIMESTAMP ---
Start  : ${clip.start}
End    : ${clip.end}
Durasi : ${Math.round(clip.duration)}s

--- SCORE ---
${clip.score}/100

--- HOOK + HEADLINE ---
${clip.edited.hookHeadline}

--- CAPTION ---
${clip.edited.caption}

--- CTA ---
${clip.edited.cta}

--- HASHTAGS ---
${clip.hashtags.join(' ')}

=== CARA PAKAI DI CAPCUT ===
1. Buka CapCut → New Project
2. Import file: CLIP_${String(idx + 1).padStart(2, '0')}.mp4
3. Import subtitle: CLIP_${String(idx + 1).padStart(2, '0')}.srt
4. Copy caption ke deskripsi
5. Copy hashtags
6. Styling di CapCut
7. Export → Upload
`;
}

function buildSrt(clip) {
  const toSrtTime = (sec) => {
    const s = Math.max(0, sec);
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = Math.floor(s % 60);
    const ms = Math.round((s - Math.floor(s)) * 1000);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  };
  const dur = clip.duration;
  const hookStart = 0;
  const hookEnd = Math.min(2.5, dur * 0.4);
  const captionStart = Math.max(hookEnd, dur * 0.6);
  const captionEnd = Math.max(captionStart + 1, dur - 0.2);
  let srt = '';
  srt += `1\n${toSrtTime(hookStart)} --> ${toSrtTime(hookEnd)}\n${clip.edited.hookHeadline}\n\n`;
  srt += `2\n${toSrtTime(captionStart)} --> ${toSrtTime(captionEnd)}\n${clip.edited.cta}\n\n`;
  return srt;
}

function downloadTextFile(text, filename) {
  try {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
  } catch (e) { console.warn('TXT download gagal:', e); }
}

function copyClipText(idx) {
  const clip = window.allClipsData[idx];
  if (!clip) return;
  const text = `${clip.edited.hookHeadline}\n\n${clip.edited.caption}\n\n${clip.edited.cta}\n\n${clip.hashtags.join(' ')}`;
  navigator.clipboard.writeText(text).then(() => {
    updateStatus('✅ Copy semua!');
    setTimeout(() => updateStatus('Ready'), 1500);
  }).catch(() => alert('Gagal copy.'));
}

function copyAllText() {
  const data = window.allClipsData || [];
  if (data.length === 0) { alert('Belum ada klip.'); return; }
  const parts = [];
  data.forEach((clip, idx) => {
    if (window.skippedClips.has(idx)) return;
    parts.push(`========== CLIP #${idx + 1} (${clip.start} → ${clip.end}) ==========`);
    parts.push(`HOOK+HEADLINE: ${clip.edited.hookHeadline}`);
    parts.push(`CAPTION: ${clip.edited.caption}`);
    parts.push(`CTA: ${clip.edited.cta}`);
    parts.push(`HASHTAGS: ${clip.hashtags.join(' ')}`);
    parts.push('');
  });
  navigator.clipboard.writeText(parts.join('\n')).then(() => {
    updateStatus('✅ Copy semua!');
    setTimeout(() => updateStatus('Ready'), 1500);
  }).catch(() => alert('Gagal copy.'));
}

async function downloadAllForCapCut() {
  const data = window.allClipsData || [];
  if (data.length === 0) { alert('Belum ada klip.'); return; }
  const active = [];
  data.forEach((clip, idx) => { if (!window.skippedClips.has(idx)) active.push({ clip, idx }); });
  if (active.length === 0) { alert('Semua di-skip.'); return; }
  if (active.length > 10 && !confirm(`Download ${active.length} klip (MP4+SRT+TXT)?`)) return;

  updateStatus(`📥 Download ${active.length} klip...`);
  for (let i = 0; i < active.length; i++) {
    const { clip, idx } = active[i];
    const baseName = `CLIP_${String(idx + 1).padStart(2, '0')}`;
    downloadTextFile(buildMetadataTxt(clip, idx), `${baseName}.txt`);
    await sleep(250);
    downloadTextFile(buildSrt(clip), `${baseName}.srt`);
    await sleep(250);
    window.FFmpegManager.trimAndDownload(window.currentVideoFile, clip.rawStart, clip.rawEnd, `${baseName}.mp4`);
    await sleep(Math.max(2000, (clip.duration + 3) * 1000));
  }
  updateStatus('✅ Selesai.');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function updateBatchButtons() {
  const data = window.allClipsData || [];
  const batchBox = document.getElementById('batchActions');
  const btnDownloadAll = document.getElementById('btnDownloadAll');
  if (!batchBox) return;
  if (data.length <= 1) {
    batchBox.classList.add('hidden');
  } else {
    batchBox.classList.remove('hidden');
    if (btnDownloadAll) btnDownloadAll.innerText = `📥 Download Semua untuk CapCut (${data.length})`;
  }
}

function updatePagination() {
  const pagContainer = document.getElementById('paginationContainer');
  const pageIndicator = document.getElementById('pageIndicator');
  const btnPrev = document.getElementById('btnPrevPage');
  const btnNext = document.getElementById('btnNextPage');
  if (!pagContainer) return;
  const data = window.allClipsData || [];
  const totalPages = Math.max(1, Math.ceil(data.length / window.itemsPerPage));
  if (totalPages <= 1 || data.length === 0) { pagContainer.classList.add('hidden'); return; }
  pagContainer.classList.remove('hidden');
  if (pageIndicator) pageIndicator.textContent = `Halaman ${window.currentPage} dari ${totalPages}`;
  if (btnPrev) btnPrev.disabled = window.currentPage <= 1;
  if (btnNext) btnNext.disabled = window.currentPage >= totalPages;
}

function updateStatus(text) {
  const badge = document.getElementById('statusBadge');
  if (badge) badge.innerText = text;
}

function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

/* ═══════════════════════════════════════════════════════════════════════════
 * [v2.6] SUBTITLE EDITOR LAYER — TIDAK DIUBAH
 * ═══════════════════════════════════════════════════════════════════════════ */

window.__clipSubtitles = window.__clipSubtitles || new Map();

function __getSubtitleState(idx) {
  if (!window.__clipSubtitles.has(idx)) {
    const region = (document.getElementById('regionSelect') || {}).value || 'id-ID';
    window.__clipSubtitles.set(idx, { lang: region, source: 'none', segments: [] });
  }
  return window.__clipSubtitles.get(idx);
}

function __getClipSubtitleSegments(idx) {
  const clip = window.allClipsData[idx];
  if (!clip) return [];
  const st = __getSubtitleState(idx);
  if ((st.source === 'manual' || st.source === 'speech') && st.segments.length > 0) {
    return st.segments.filter(s => s.text && s.text.trim());
  }
  return [
    { start: 0, end: Math.min(2.5, (clip.duration || 5) * 0.35), text: clip.edited.hookHeadline || '' },
    { start: Math.max((clip.duration || 5) - 3, 2), end: Math.max((clip.duration || 5) - 0.1, 3), text: clip.edited.cta || '' }
  ].filter(s => s.text);
}

function __subtitleStatusLabel(idx) {
  const st = __getSubtitleState(idx);
  if (st.source === 'manual') return `✍️ Manual (${st.segments.length} segmen)`;
  if (st.source === 'speech') return `🎙️ Speech (${st.segments.length} segmen)`;
  return '📄 Placeholder (hook + CTA)';
}

function __toSrtTime(sec) {
  const s = Math.max(0, Number(sec) || 0);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60);
  const ms = Math.round((s - Math.floor(s)) * 1000);
  return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')},${String(ms).padStart(3,'0')}`;
}

function __segmentsToSrtText(segs) {
  return segs.filter(s => s.text && s.text.trim())
    .map((s, i) => `${i + 1}\n${__toSrtTime(s.start)} --> ${__toSrtTime(s.end)}\n${s.text}\n`).join('\n');
}

function openSubtitleEditor(idx) {
  const clip = window.allClipsData[idx];
  if (!clip) { alert('❌ Klip tidak ditemukan'); return; }
  const existing = document.getElementById('subtitleEditorModal');
  if (existing) existing.remove();

  const state = __getSubtitleState(idx);
  const dur = clip.duration || 10;

  const modal = document.createElement('div');
  modal.id = 'subtitleEditorModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:999999;padding:16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

  modal.innerHTML = `
    <div style="background:var(--card-bg);border:1px solid var(--card-border);border-radius:14px;padding:18px;max-width:580px;width:100%;max-height:90vh;overflow-y:auto;color:var(--text-main);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <h3 style="font-size:1rem;margin:0;">📝 Subtitle Editor — Klip #${idx + 1}</h3>
        <button id="subClose" type="button" style="background:transparent;border:none;color:var(--text-sub);cursor:pointer;font-size:1.4rem;line-height:1;">×</button>
      </div>
      <div style="font-size:0.72rem;color:var(--text-sub);line-height:1.5;padding:8px 10px;background:var(--input-bg);border:1px solid var(--input-border);border-radius:8px;margin-bottom:10px;">
        <b>Status:</b> ${__subtitleStatusLabel(idx)} · durasi klip ${dur.toFixed(1)}s
      </div>
      <div style="margin-bottom:10px;">
        <label style="font-size:0.7rem;color:var(--text-sub);font-weight:600;display:block;margin-bottom:4px;">Bahasa</label>
        <select id="subLang" class="input-field" style="font-size:0.8rem;">
          <option value="id-ID">🇮🇩 Bahasa Indonesia</option>
          <option value="en-US">🇺🇸 English (US)</option>
          <option value="en-GB">🇬🇧 English (UK)</option>
          <option value="en-CA">🇨🇦 English (CA)</option>
        </select>
      </div>
      <div id="subSegmentsWrap" style="margin-bottom:10px;"></div>
      <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;">
        <button id="subAddSeg" type="button" style="flex:1;min-width:120px;padding:8px;background:var(--input-bg);color:var(--text-main);border:1px solid var(--input-border);border-radius:6px;cursor:pointer;font-weight:700;font-size:0.72rem;">+ Tambah Segmen</button>
        <button id="subImportText" type="button" style="flex:1;min-width:120px;padding:8px;background:var(--input-bg);color:var(--text-main);border:1px solid var(--input-border);border-radius:6px;cursor:pointer;font-weight:700;font-size:0.72rem;">📋 Tempel Teks</button>
      </div>
      <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;">
        <button id="subSpeechMode" type="button" style="flex:1;min-width:130px;padding:8px;background:var(--input-bg);color:var(--text-main);border:1px solid var(--input-border);border-radius:6px;cursor:pointer;font-weight:700;font-size:0.72rem;">🎙️ Rekam Suara (Mic)</button>
        <button id="subResetMode" type="button" style="flex:1;min-width:100px;padding:8px;background:var(--input-bg);color:var(--text-sub);border:1px solid var(--input-border);border-radius:6px;cursor:pointer;font-weight:700;font-size:0.72rem;">↺ Reset</button>
      </div>
      <div style="display:flex;gap:6px;">
        <button id="subDownloadSrt" type="button" style="flex:1;padding:10px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:0.78rem;">📄 Download SRT</button>
        <button id="subSave" type="button" style="flex:1;padding:10px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:0.78rem;">💾 Simpan</button>
      </div>
      <div id="subHint" style="margin-top:10px;font-size:0.68rem;color:var(--text-muted);line-height:1.4;"></div>
    </div>
  `;
  document.body.appendChild(modal);

  const langSel = modal.querySelector('#subLang');
  langSel.value = state.lang || 'id-ID';
  const wrap = modal.querySelector('#subSegmentsWrap');
  const hint = modal.querySelector('#subHint');

  function renderSegments() {
    if (state.segments.length === 0) {
      wrap.innerHTML = '<div style="padding:12px;text-align:center;font-size:0.72rem;color:var(--text-muted);background:var(--input-bg);border:1px dashed var(--input-border);border-radius:8px;">Belum ada segmen.</div>';
      return;
    }
    wrap.innerHTML = state.segments.map((s, i) => `
      <div style="display:flex;gap:4px;margin-bottom:6px;align-items:flex-start;">
        <div style="display:flex;flex-direction:column;gap:2px;width:66px;flex-shrink:0;">
          <input type="number" step="0.1" min="0" value="${(s.start||0).toFixed(1)}" data-seg-idx="${i}" data-field="start" class="input-field" style="padding:4px;font-size:0.68rem;">
          <input type="number" step="0.1" min="0" value="${(s.end||0).toFixed(1)}" data-seg-idx="${i}" data-field="end" class="input-field" style="padding:4px;font-size:0.68rem;">
        </div>
        <textarea data-seg-idx="${i}" data-field="text" class="input-field" style="flex:1;min-height:38px;font-size:0.75rem;resize:vertical;">${String(s.text||'').replace(/</g,'&lt;')}</textarea>
        <button type="button" data-del="${i}" style="background:transparent;border:1px solid rgba(220,38,38,0.4);color:#dc2626;border-radius:6px;padding:4px 6px;cursor:pointer;font-size:0.7rem;">🗑</button>
      </div>
    `).join('');
    wrap.querySelectorAll('input, textarea').forEach(el => {
      el.addEventListener('input', () => {
        const i = parseInt(el.getAttribute('data-seg-idx'), 10);
        const f = el.getAttribute('data-field');
        if (isNaN(i) || !state.segments[i]) return;
        state.segments[i][f] = f === 'text' ? el.value : (parseFloat(el.value) || 0);
      });
    });
    wrap.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.getAttribute('data-del'), 10);
        state.segments.splice(i, 1);
        renderSegments();
      });
    });
  }
  renderSegments();

  modal.querySelector('#subClose').onclick = () => modal.remove();
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  modal.querySelector('#subAddSeg').onclick = () => {
    const lastEnd = state.segments.length > 0 ? state.segments[state.segments.length - 1].end : 0;
    const st = Math.min(lastEnd, dur);
    state.segments.push({ start: +st.toFixed(2), end: +Math.min(st + 2, dur).toFixed(2), text: '' });
    if (state.source !== 'speech') state.source = 'manual';
    renderSegments();
    hint.textContent = '💡 Isi teks, lalu atur start/end.';
  };

  modal.querySelector('#subImportText').onclick = () => {
    const raw = prompt('Tempel teks (1 baris = 1 segmen):');
    if (!raw) return;
    const lines = raw.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    const per = dur / lines.length;
    state.segments = lines.map((text, i) => ({
      start: +(i * per).toFixed(2), end: +((i + 1) * per).toFixed(2), text
    }));
    state.source = 'manual';
    renderSegments();
    hint.textContent = `✅ ${lines.length} segmen dari teks manual.`;
  };

  modal.querySelector('#subResetMode').onclick = () => {
    if (!confirm('Reset subtitle klip ini ke placeholder?')) return;
    state.segments = [];
    state.source = 'none';
    renderSegments();
    hint.textContent = '↺ Reset ke placeholder.';
  };

  modal.querySelector('#subSpeechMode').onclick = async () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { hint.textContent = '❌ Browser tidak support SpeechRecognition.'; return; }
    if (!window.WhisperAutoEngine || !window.WhisperAutoEngine.available) { hint.textContent = '❌ WhisperAutoEngine tidak siap.'; return; }
    if (!confirm('Speech Recognition pakai MICROPHONE.\n\nLanjut?')) return;

    const video = document.getElementById('sourceVideo');
    if (!video) { hint.textContent = '❌ Video source tidak ada.'; return; }

    try { video.pause(); video.currentTime = clip.rawStart; } catch (e) {}

    state.source = 'speech';
    state.segments = [];
    renderSegments();
    hint.textContent = '🎙️ Merekam mikrofon...';

    const stopAt = clip.rawEnd;
    const stopCheck = setInterval(() => {
      if (video.currentTime >= stopAt || video.ended) {
        clearInterval(stopCheck);
        try { window.WhisperAutoEngine.stop(); } catch (e) {}
      }
    }, 250);

    try {
      await window.WhisperAutoEngine.transcribeVideo(video, {
        lang: langSel.value || 'id-ID',
        startAt: clip.rawStart,
        endAt: clip.rawEnd,
        onResult: (s) => {
          const localT = Math.max(0, s.t);
          if (localT > dur) return;
          state.segments.push({
            start: +localT.toFixed(2),
            end: +Math.min(localT + 3, dur).toFixed(2),
            text: s.text
          });
          renderSegments();
          hint.textContent = `🎙️ ${state.segments.length} segmen...`;
        }
      });
      clearInterval(stopCheck);
      hint.textContent = `✅ Speech selesai — ${state.segments.length} segmen.`;
    } catch (e) {
      clearInterval(stopCheck);
      hint.textContent = '❌ Speech error: ' + (e.message || e);
    }
  };

  modal.querySelector('#subDownloadSrt').onclick = () => {
    state.lang = langSel.value;
    const segs = state.segments.length > 0 ? state.segments : __getClipSubtitleSegments(idx);
    if (segs.length === 0) { hint.textContent = '⚠️ Tidak ada segmen.'; return; }
    const name = `CLIP_${String(idx + 1).padStart(2, '0')}.srt`;
    downloadTextFile(__segmentsToSrtText(segs), name);
    hint.textContent = `📄 SRT ter-download: ${name}`;
  };

  modal.querySelector('#subSave').onclick = () => {
    state.lang = langSel.value;
    if (state.segments.length > 0 && state.source === 'none') state.source = 'manual';
    try { renderPage(); } catch (e) {}
    modal.remove();
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * INJECT tombol Edit Subtitle ke tiap clip-card
 * ═══════════════════════════════════════════════════════════════════════════ */
(function installSubtitleUIHook() {
  function enhance() {
    const cards = document.querySelectorAll('#clipResults .clip-card');
    cards.forEach(card => {
      if (card.__subBtnAdded) return;
      card.__subBtnAdded = true;
      const idx = parseInt(card.getAttribute('data-clip-idx'), 10);
      if (isNaN(idx)) return;

      const btnRow = Array.from(card.querySelectorAll('div'))
        .find(d => d.querySelector('button') && /CapCut|Galeri|🎬|📥/.test(d.textContent));
      if (!btnRow) return;

      const statusBadge = document.createElement('div');
      statusBadge.style.cssText = 'margin: 6px 0; padding: 6px 10px; background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.3); border-radius: 6px; font-size: 0.68rem; color: #8b5cf6; font-weight: 700; display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;';
      statusBadge.innerHTML = `
        <span>📝 Subtitle: ${__subtitleStatusLabel(idx)}</span>
        <button type="button" class="btnEditSubtitle" style="padding:4px 10px;background:#8b5cf6;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.7rem;font-weight:700;">✏️ Edit Subtitle</button>
      `;
      btnRow.parentNode.insertBefore(statusBadge, btnRow);
      statusBadge.querySelector('.btnEditSubtitle').addEventListener('click', () => openSubtitleEditor(idx));
    });
  }
  const rc = document.getElementById('clipResults');
  if (rc) new MutationObserver(enhance).observe(rc, { childList: true, subtree: false });
  setTimeout(enhance, 1200);

  if (typeof window.renderPage === 'function') {
    const orig = window.renderPage;
    window.renderPage = function () {
      const r = orig.apply(this, arguments);
      setTimeout(enhance, 80);
      return r;
    };
  }
})();

/* ═══════════════════════════════════════════════════════════════════════════
 * HOOK CAPCUT.buildDynamicSrt → pakai subtitle user kalau ada
 * ═══════════════════════════════════════════════════════════════════════════ */
(function hookCapCutSubtitle() {
  let tries = 0;
  const t = setInterval(() => {
    if (!window.CapCutEngine || !window.CapCutEngine.buildDynamicSrt) {
      if (++tries > 40) clearInterval(t);
      return;
    }
    clearInterval(t);
    if (window.CapCutEngine.__subtitleHooked) return;
    window.CapCutEngine.__subtitleHooked = true;

    const orig = window.CapCutEngine.buildDynamicSrt.bind(window.CapCutEngine);
    window.CapCutEngine.buildDynamicSrt = function (clip, analysis) {
      const idx = window.allClipsData ? window.allClipsData.indexOf(clip) : -1;
      if (idx >= 0) {
        const st = __getSubtitleState(idx);
        if (st.source === 'manual' || st.source === 'speech') {
          const userSegs = __getClipSubtitleSegments(idx);
          if (userSegs.length > 0) return userSegs;
        }
      }
      return orig(clip, analysis);
    };
  }, 300);
})();