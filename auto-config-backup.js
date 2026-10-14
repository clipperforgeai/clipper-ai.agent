/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AUTO CONFIG EXTRAS — Crash Notifier + Backup System
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Fitur:
 *  1. 🚨 Real-time crash notification banner (merah, animasi)
 *  2. 📤 Export settings + behavior ke JSON file
 *  3. 📥 Import dari JSON file
 *  4. 📋 Export/Import via code (base64, buat copy-paste)
 *  5. 🔒 Device compatibility check saat import
 * 
 * Cara pakai: Load SETELAH auto-config.js
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';
  if (window.__AUTO_CONFIG_EXTRAS_LOADED) return;
  window.__AUTO_CONFIG_EXTRAS_LOADED = true;

  const BACKUP_VERSION = 1;
  const KEYS = {
    mode: 'ai-agent-mode',
    llmEnabled: 'ai-agent-llm-enabled',
    llmModel: 'ai-agent-llm-model',
    quality: 'ai-agent-ai-quality',
    autoConfigured: 'ai-agent-auto-configured-v4',
    userOverridden: 'ai-agent-user-overridden',
    benchResult: 'ai-agent-bench-result-v3',
    benchMode: 'ai-agent-bench-mode',
    behavior: 'ai-agent-behavior-v1',
    alwaysShow: 'ai-agent-always-show-selector',
    analysisSession: 'ai-agent-analysis-session',
    downgraded: 'ai-agent-downgraded-v1'
  };

  // ═════════════════════════════════════════════════════════════════════════
  // [1] CRASH NOTIFICATION BANNER
  // ═════════════════════════════════════════════════════════════════════════
  function showCrashBanner(details) {
    // Cegah duplikat
    if (document.getElementById('crashBanner')) return;

    details = details || {};
    const reasons = details.reasons || [];
    const downgraded = reasons.length > 0;

    const banner = document.createElement('div');
    banner.id = 'crashBanner';
    banner.style.cssText = [
      'position:fixed',
      'top:0', 'left:0', 'right:0',
      'background:linear-gradient(135deg,#dc2626,#991b1b)',
      'color:#fff',
      'padding:14px 16px',
      'z-index:9999999',
      'box-shadow:0 4px 20px rgba(220,38,38,0.5)',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      'font-weight:600',
      'transform:translateY(-100%)',
      'transition:transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      'max-height:80vh',
      'overflow-y:auto'
    ].join(';');

    banner.innerHTML = `
      <div style="display:flex;gap:12px;align-items:flex-start;max-width:800px;margin:0 auto;">
        <span style="font-size:1.8rem;flex-shrink:0;animation:crashPulse 1.5s ease-in-out infinite;">⚠️</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:0.92rem;font-weight:800;margin-bottom:6px;letter-spacing:0.3px;">
            🚨 APLIKASI CRASH TERDETEKSI
          </div>
          <div style="font-size:0.78rem;opacity:0.95;line-height:1.5;font-weight:500;">
            Sesi analisis terakhir tidak selesai dengan baik. Sistem mendeteksi crash / tab reload paksa.
          </div>
          ${downgraded ? `
          <div style="margin-top:8px;padding:8px 10px;background:rgba(255,255,255,0.15);border-radius:8px;font-size:0.72rem;">
            <b>🧠 Auto-downgrade:</b> ${reasons.map(r => `• ${r}`).join('<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;')}
          </div>` : `
          <div style="margin-top:8px;font-size:0.72rem;opacity:0.85;">
            💡 Tips: Kalau sering crash, buka <b>⚙️ Device Settings</b> untuk turunkan mode.
          </div>`}
          <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
            <button id="crashDetailBtn" style="background:#fff;color:#dc2626;border:none;padding:8px 14px;border-radius:8px;font-weight:800;cursor:pointer;font-size:0.75rem;font-family:inherit;">
              📊 Lihat Detail
            </button>
            <button id="crashOpenSettings" style="background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.4);padding:8px 14px;border-radius:8px;font-weight:700;cursor:pointer;font-size:0.75rem;font-family:inherit;">
              ⚙️ Buka Settings
            </button>
            <button id="crashDismiss" style="background:transparent;color:#fff;border:none;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:0.75rem;font-weight:700;font-family:inherit;opacity:0.85;">
              OK, mengerti
            </button>
          </div>
        </div>
      </div>
      <style>
        @keyframes crashPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.85; }
        }
      </style>
    `;

    document.body.appendChild(banner);

    // Animate in
    requestAnimationFrame(() => {
      banner.style.transform = 'translateY(0)';
    });

    // Handlers
    const dismiss = () => {
      banner.style.transform = 'translateY(-100%)';
      setTimeout(() => banner.remove(), 400);
    };

    document.getElementById('crashDismiss').onclick = dismiss;

    document.getElementById('crashOpenSettings').onclick = () => {
      dismiss();
      setTimeout(() => {
        if (window.AutoConfig && window.AutoConfig.openSettings) {
          window.AutoConfig.openSettings();
        }
      }, 300);
    };

    document.getElementById('crashDetailBtn').onclick = () => {
      showCrashDetail();
    };

    // Auto-dismiss setelah 15 detik
    setTimeout(() => {
      if (document.getElementById('crashBanner')) dismiss();
    }, 15000);
  }

  function showCrashDetail() {
    if (!window.AutoConfig || !window.AutoConfig.behavior) return;
    const behavior = window.AutoConfig.behavior.getSummary();

    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:99999999;padding:16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

    const recentRuns = (window.AutoConfig.behavior.data.runs || [])
      .slice(-10)
      .reverse()
      .map(r => {
        const icon = {
          'success': '✅', 'crashed': '💥', 'cancelled': '⏸️', 'running': '⏳'
        }[r.status] || '❔';
        const time = new Date(r.ts).toLocaleString('id-ID', {
          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });
        const dur = r.duration ? ` · ${(r.duration / 1000).toFixed(1)}s` : '';
        return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #1e293b;">
          <span>${icon}</span>
          <span style="color:#94a3b8;font-size:0.7rem;min-width:110px;">${time}</span>
          <span style="color:#cbd5e1;font-size:0.7rem;">mode: <b>${r.mode}</b>${dur}</span>
        </div>`;
      }).join('');

    modal.innerHTML = `
      <div style="background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid #334155;border-radius:16px;padding:20px;max-width:480px;width:100%;color:#f8fafc;box-shadow:0 20px 60px rgba(0,0,0,0.6);max-height:85vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h2 style="font-size:1rem;margin:0;font-weight:700;">📊 Detail Crash & Behavior</h2>
          <button id="cdClose" style="background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:1.4rem;padding:0;line-height:1;">×</button>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
          <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:8px;padding:10px;">
            <div style="font-size:0.62rem;color:#10b981;font-weight:700;text-transform:uppercase;">✅ Success</div>
            <div style="font-size:1.4rem;font-weight:800;color:#10b981;">${behavior.success}</div>
          </div>
          <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:10px;">
            <div style="font-size:0.62rem;color:#ef4444;font-weight:700;text-transform:uppercase;">💥 Crashes</div>
            <div style="font-size:1.4rem;font-weight:800;color:#ef4444;">${behavior.crashes}</div>
          </div>
          <div style="background:rgba(148,163,184,0.1);border:1px solid rgba(148,163,184,0.3);border-radius:8px;padding:10px;">
            <div style="font-size:0.62rem;color:#94a3b8;font-weight:700;text-transform:uppercase;">⏸️ Cancel</div>
            <div style="font-size:1.4rem;font-weight:800;color:#94a3b8;">${behavior.cancels}</div>
          </div>
          <div style="background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.3);border-radius:8px;padding:10px;">
            <div style="font-size:0.62rem;color:#38bdf8;font-weight:700;text-transform:uppercase;">🔥 Streak</div>
            <div style="font-size:1.4rem;font-weight:800;color:#38bdf8;">${behavior.successStreak}</div>
          </div>
        </div>

        <div style="background:rgba(15,23,42,0.6);border:1px solid #334155;border-radius:10px;padding:12px;margin-bottom:12px;">
          <div style="font-size:0.68rem;color:#64748b;font-weight:700;margin-bottom:8px;text-transform:uppercase;">📈 Crash Rate (7 hari)</div>
          <div style="font-size:0.82rem;color:#cbd5e1;">
            <b style="color:${behavior.crashRate7d > 0.3 ? '#ef4444' : behavior.crashRate7d > 0.1 ? '#f59e0b' : '#10b981'};font-size:1.1rem;">
              ${(behavior.crashRate7d * 100).toFixed(0)}%
            </b>
            <span style="color:#64748b;font-size:0.72rem;margin-left:8px;">
              (${behavior.crashes} dari ${behavior.totalRuns} runs)
            </span>
          </div>
        </div>

        <div style="background:rgba(15,23,42,0.6);border:1px solid #334155;border-radius:10px;padding:12px;margin-bottom:12px;">
          <div style="font-size:0.68rem;color:#64748b;font-weight:700;margin-bottom:8px;text-transform:uppercase;">📋 10 Run Terakhir</div>
          <div style="max-height:200px;overflow-y:auto;">
            ${recentRuns || '<div style="font-size:0.72rem;color:#64748b;text-align:center;padding:10px;">Belum ada riwayat</div>'}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <button id="cdExport" style="padding:10px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:0.75rem;font-weight:700;font-family:inherit;">📤 Export Backup</button>
          <button id="cdClearBehavior" style="padding:10px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:0.75rem;font-weight:700;font-family:inherit;">🧹 Clear History</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('#cdClose').onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };

    modal.querySelector('#cdExport').onclick = () => {
      close();
      setTimeout(() => exportBackup(), 200);
    };

    modal.querySelector('#cdClearBehavior').onclick = () => {
      if (!confirm('Clear semua behavior history? (crash/success/cancel)')) return;
      if (window.AutoConfig.behavior) window.AutoConfig.behavior.clear();
      close();
      console.log('[Backup] ✅ Behavior cleared');
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // [2] EXPORT — download JSON file
  // ═════════════════════════════════════════════════════════════════════════
  function collectBackupData() {
    const data = {
      version: BACKUP_VERSION,
      exportedAt: Date.now(),
      exportedFrom: {
        ua: (navigator.userAgent || '').slice(0, 80),
        ram: navigator.deviceMemory || 2,
        cores: navigator.hardwareConcurrency || 2,
        isMobile: /Android|iPhone|iPad/i.test(navigator.userAgent),
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) ||
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      },
      settings: {},
      behavior: null,
      benchmark: null,
      flags: {}
    };

    try {
      data.settings = {
        mode: localStorage.getItem(KEYS.mode) || 'adaptive',
        quality: localStorage.getItem(KEYS.quality) || 'auto',
        llmEnabled: localStorage.getItem(KEYS.llmEnabled) === '1',
        llmModel: localStorage.getItem(KEYS.llmModel) || 'tiny',
        benchMode: localStorage.getItem(KEYS.benchMode) || 'quick',
        alwaysShow: localStorage.getItem(KEYS.alwaysShow) === '1'
      };

      data.flags = {
        userOverridden: localStorage.getItem(KEYS.userOverridden) === '1',
        autoConfigured: localStorage.getItem(KEYS.autoConfigured) === '1'
      };

      const behaviorRaw = localStorage.getItem(KEYS.behavior);
      if (behaviorRaw) data.behavior = JSON.parse(behaviorRaw);

      const benchRaw = localStorage.getItem(KEYS.benchResult);
      if (benchRaw) data.benchmark = JSON.parse(benchRaw);
    } catch (e) {
      console.warn('[Backup] Collect error:', e);
    }

    return data;
  }

  function exportBackup() {
    try {
      const data = collectBackupData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
      const filename = `ai-agent-backup-${ts}.json`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 2000);

      console.log(`[Backup] ✅ Exported: ${filename} (${(json.length / 1024).toFixed(1)} KB)`);
      showToast(`✅ Backup tersimpan: ${filename}`, 'success');
    } catch (e) {
      console.error('[Backup] Export failed:', e);
      showToast('❌ Gagal export backup', 'error');
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // [3] IMPORT — dari JSON file
  // ═════════════════════════════════════════════════════════════════════════
  function importBackupFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';

    input.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          handleImport(data);
        } catch (err) {
          console.error('[Backup] Parse failed:', err);
          showToast('❌ File bukan JSON yang valid', 'error');
        }
      };
      reader.onerror = () => showToast('❌ Gagal baca file', 'error');
      reader.readAsText(file);
    };

    document.body.appendChild(input);
    input.click();
    setTimeout(() => input.remove(), 1000);
  }

  function handleImport(data) {
    if (!data || typeof data !== 'object') {
      showToast('❌ Data tidak valid', 'error');
      return;
    }

    if (data.version !== BACKUP_VERSION) {
      if (!confirm(`⚠️ Version backup (${data.version}) beda dengan yang didukung (${BACKUP_VERSION}).\n\nLanjutkan tetap?`)) return;
    }

    if (!data.settings || !data.settings.mode) {
      showToast('❌ Backup tidak lengkap (settings hilang)', 'error');
      return;
    }

    // ─── Device compatibility check ───
    const curRAM = navigator.deviceMemory || 2;
    const curCores = navigator.hardwareConcurrency || 2;
    const srcRAM = (data.exportedFrom && data.exportedFrom.ram) || 0;
    const srcCores = (data.exportedFrom && data.exportedFrom.cores) || 0;

    let warnMsg = '';
    if (srcRAM > 0 && curRAM < srcRAM - 1) {
      warnMsg = `⚠️ Backup dari device RAM ${srcRAM}GB, HP Anda ${curRAM}GB.\nSetting mungkin terlalu berat.`;
    }
    if (srcCores > 0 && curCores < srcCores - 2) {
      warnMsg += `\n⚠️ Backup dari ${srcCores} core, HP Anda ${curCores} core.`;
    }

    if (warnMsg && !confirm(warnMsg + '\n\nLanjutkan import?')) return;

    // Preview
    const preview = [
      `Mode: ${data.settings.mode}`,
      `LLM: ${data.settings.llmEnabled ? `ON (${data.settings.llmModel})` : 'OFF'}`,
      `Bench mode: ${data.settings.benchMode}`,
      `Always show: ${data.settings.alwaysShow ? 'Yes' : 'No'}`,
      data.behavior ? `Behavior: ${(data.behavior.runs || []).length} runs` : 'Behavior: (kosong)',
      data.benchmark ? `Benchmark: score ${data.benchmark.score}/100` : 'Benchmark: (kosong)'
    ].join('\n');

    if (!confirm(`📥 Import backup:\n\n${preview}\n\nLanjutkan? Halaman akan di-refresh.`)) return;

    // Apply
    try {
      localStorage.setItem(KEYS.mode, data.settings.mode);
      localStorage.setItem(KEYS.quality, data.settings.quality || 'auto');
      localStorage.setItem(KEYS.llmEnabled, data.settings.llmEnabled ? '1' : '0');
      localStorage.setItem(KEYS.llmModel, data.settings.llmModel || 'tiny');
      localStorage.setItem(KEYS.benchMode, data.settings.benchMode || 'quick');
      localStorage.setItem(KEYS.alwaysShow, data.settings.alwaysShow ? '1' : '0');
      localStorage.setItem(KEYS.autoConfigured, '1');

      if (data.flags && data.flags.userOverridden) {
        localStorage.setItem(KEYS.userOverridden, '1');
      }

      if (data.behavior) {
        localStorage.setItem(KEYS.behavior, JSON.stringify(data.behavior));
      }

      if (data.benchmark) {
        localStorage.setItem(KEYS.benchResult, JSON.stringify(data.benchmark));
      }

      console.log('[Backup] ✅ Import berhasil');
      showToast('✅ Import berhasil — reload dalam 1 detik...', 'success');

      setTimeout(() => location.reload(), 1200);
    } catch (e) {
      console.error('[Backup] Import failed:', e);
      showToast('❌ Gagal apply backup: ' + e.message, 'error');
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // [4] EXPORT/IMPORT VIA CODE (base64)
  // ═════════════════════════════════════════════════════════════════════════
  function exportAsCode() {
    const data = collectBackupData();
    // Hapus behavior runs biar kode tidak kepanjangan (opsional)
    const json = JSON.stringify(data);
    // Base64 encode (btoa tidak support unicode langsung, pakai trick)
    const base64 = btoa(unescape(encodeURIComponent(json)));

    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:99999999;padding:16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

    modal.innerHTML = `
      <div style="background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid #334155;border-radius:16px;padding:20px;max-width:520px;width:100%;color:#f8fafc;">
        <h2 style="font-size:0.95rem;margin:0 0 12px;font-weight:700;">📋 Backup Code</h2>
        <p style="font-size:0.72rem;color:#94a3b8;margin:0 0 10px;line-height:1.5;">
          Copy kode di bawah. Bisa dipaste di device lain lewat <b>Import Code</b>.
        </p>
        <textarea id="bcCode" readonly style="width:100%;height:140px;padding:10px;background:#0f172a;color:#38bdf8;border:1px solid #334155;border-radius:8px;font-family:monospace;font-size:0.68rem;resize:none;word-break:break-all;">${base64}</textarea>
        <div style="display:flex;gap:8px;margin-top:10px;">
          <button id="bcCopy" style="flex:1;padding:10px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:0.75rem;font-weight:700;font-family:inherit;">📋 Copy Code</button>
          <button id="bcClose" style="padding:10px 16px;background:transparent;border:1px solid #334155;color:#94a3b8;border-radius:8px;cursor:pointer;font-size:0.75rem;font-weight:600;font-family:inherit;">Tutup</button>
        </div>
        <div style="font-size:0.65rem;color:#64748b;margin-top:8px;text-align:center;">
          ${(base64.length / 1024).toFixed(1)} KB · version ${BACKUP_VERSION}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('#bcClose').onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };

    modal.querySelector('#bcCopy').onclick = () => {
      const ta = modal.querySelector('#bcCode');
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      try {
        navigator.clipboard.writeText(ta.value).then(() => {
          showToast('✅ Code ter-copy ke clipboard', 'success');
        }).catch(() => {
          document.execCommand('copy');
          showToast('✅ Code ter-copy', 'success');
        });
      } catch (e) {
        document.execCommand('copy');
        showToast('✅ Code ter-copy', 'success');
      }
    };
  }

  function importFromCode() {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:99999999;padding:16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

    modal.innerHTML = `
      <div style="background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid #334155;border-radius:16px;padding:20px;max-width:520px;width:100%;color:#f8fafc;">
        <h2 style="font-size:0.95rem;margin:0 0 12px;font-weight:700;">📥 Import dari Code</h2>
        <p style="font-size:0.72rem;color:#94a3b8;margin:0 0 10px;line-height:1.5;">
          Paste backup code dari device lain di bawah.
        </p>
        <textarea id="icCode" placeholder="Paste code di sini..." style="width:100%;height:140px;padding:10px;background:#0f172a;color:#f8fafc;border:1px solid #334155;border-radius:8px;font-family:monospace;font-size:0.68rem;resize:none;word-break:break-all;"></textarea>
        <div style="display:flex;gap:8px;margin-top:10px;">
          <button id="icImport" style="flex:1;padding:10px;background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:0.75rem;font-weight:700;font-family:inherit;">📥 Import</button>
          <button id="icClose" style="padding:10px 16px;background:transparent;border:1px solid #334155;color:#94a3b8;border-radius:8px;cursor:pointer;font-size:0.75rem;font-weight:600;font-family:inherit;">Tutup</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('#icClose').onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };

    modal.querySelector('#icImport').onclick = () => {
      const code = modal.querySelector('#icCode').value.trim();
      if (!code) {
        showToast('⚠️ Code kosong', 'error');
        return;
      }
      try {
        const json = decodeURIComponent(escape(atob(code)));
        const data = JSON.parse(json);
        close();
        handleImport(data);
      } catch (e) {
        console.error('[Backup] Decode failed:', e);
        showToast('❌ Code tidak valid', 'error');
      }
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // [5] TOAST NOTIFICATION
  // ═════════════════════════════════════════════════════════════════════════
  function showToast(msg, type) {
    const existing = document.getElementById('acToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'acToast';
    toast.style.cssText = [
      'position:fixed',
      'bottom:24px', 'left:50%',
      'transform:translateX(-50%) translateY(20px)',
      'background:' + (type === 'error' ? 'linear-gradient(135deg,#dc2626,#b91c1c)' : 'linear-gradient(135deg,#10b981,#059669)'),
      'color:#fff',
      'padding:12px 20px',
      'border-radius:10px',
      'box-shadow:0 8px 28px rgba(0,0,0,0.4)',
      'z-index:99999999',
      'font-size:0.8rem',
      'font-weight:700',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      'opacity:0',
      'transition:opacity 0.3s ease, transform 0.3s ease',
      'max-width:calc(100vw - 32px)',
      'text-align:center'
    ].join(';');
    toast.textContent = msg;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // [6] TAMBAH TOMBOL EXPORT/IMPORT DI SETTINGS PANEL
  // ═════════════════════════════════════════════════════════════════════════
  function patchSettingsPanel() {
    // Observasi modal settings, lalu inject tombol
    const observer = new MutationObserver(() => {
      const modal = document.getElementById('autoConfigSettingsModal');
      if (!modal || modal.__backupPatched) return;
      modal.__backupPatched = true;

      // Cari container modal bagian dalam
      const content = modal.querySelector('div > div');
      if (!content) return;

      const backupSection = document.createElement('div');
      backupSection.style.cssText = 'margin-top:12px;padding-top:12px;border-top:1px dashed #334155;';
      backupSection.innerHTML = `
        <div style="font-size:0.68rem;color:#64748b;font-weight:700;margin-bottom:8px;text-transform:uppercase;">📦 Backup & Restore</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
          <button id="acExport" style="padding:10px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:0.72rem;font-weight:700;font-family:inherit;">📤 Export File</button>
          <button id="acImport" style="padding:10px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:0.72rem;font-weight:700;font-family:inherit;">📥 Import File</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <button id="acExportCode" style="padding:10px;background:transparent;border:1px solid #334155;color:#94a3b8;border-radius:8px;cursor:pointer;font-size:0.72rem;font-weight:600;font-family:inherit;">📋 Copy Code</button>
          <button id="acImportCode" style="padding:10px;background:transparent;border:1px solid #334155;color:#94a3b8;border-radius:8px;cursor:pointer;font-size:0.72rem;font-weight:600;font-family:inherit;">📋 Paste Code</button>
        </div>
      `;

      content.appendChild(backupSection);

      modal.querySelector('#acExport').onclick = () => exportBackup();
      modal.querySelector('#acImport').onclick = () => importBackupFromFile();
      modal.querySelector('#acExportCode').onclick = () => exportAsCode();
      modal.querySelector('#acImportCode').onclick = () => importFromCode();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // [7] PATCH CRASH DETECTION — trigger notification
  // ═════════════════════════════════════════════════════════════════════════
  function patchCrashDetection() {
    if (!window.AutoConfig || !window.AutoConfig.behavior) return false;
    const Behavior = window.AutoConfig.behavior;

    if (Behavior.__extrasPatched) return true;
    Behavior.__extrasPatched = true;

    // Patch detectCrashOnBoot untuk trigger notifikasi
    const origDetect = Behavior.detectCrashOnBoot;
    Behavior.detectCrashOnBoot = function () {
      const hadCrash = origDetect.apply(this, arguments);
      if (hadCrash) {
        // Delay biar UI siap
        setTimeout(() => {
          // Ambil info downgrade
          let reasons = [];
          try {
            const downgraded = localStorage.getItem(KEYS.downgraded) === '1';
            if (downgraded) {
              reasons.push('Auto-downgrade dijalankan (lihat log console)');
            }
          } catch (e) {}
          showCrashBanner({ reasons });
        }, 2500);
      }
      return hadCrash;
    };

    console.log('[Backup Extras] ✅ Crash detection patched');
    return true;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // [8] EXTEND AutoConfig API
  // ═════════════════════════════════════════════════════════════════════════
  function extendAPI() {
    if (!window.AutoConfig) return false;
    if (window.AutoConfig.__extrasExtended) return true;
    window.AutoConfig.__extrasExtended = true;

    window.AutoConfig.export = exportBackup;
    window.AutoConfig.importFromFile = importBackupFromFile;
    window.AutoConfig.exportCode = exportAsCode;
    window.AutoConfig.importCode = importFromCode;
    window.AutoConfig.showCrashDetail = showCrashDetail;
    window.AutoConfig.simulateCrashBanner = function () {
      showCrashBanner({ reasons: ['Simulasi manual'] });
    };

    console.log('[Backup Extras] ✅ AutoConfig API extended');
    return true;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // [9] BOOT
  // ═════════════════════════════════════════════════════════════════════════
  function boot() {
    patchSettingsPanel();

    let tries = 0;
    const t = setInterval(() => {
      const a = patchCrashDetection();
      const b = extendAPI();
      if (a && b) {
        clearInterval(t);
        console.log('[Backup Extras] ✅ Ready');
      } else if (++tries > 50) {
        clearInterval(t);
        console.warn('[Backup Extras] ⚠️ Timeout nunggu AutoConfig');
      }
    }, 200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 1500));
  } else {
    setTimeout(boot, 1500);
  }

  console.log('[Backup Extras] 📦 Loaded');
})();