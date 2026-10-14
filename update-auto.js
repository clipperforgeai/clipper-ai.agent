/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UPDATE AUTO v2.6.0 — Smart Idle Auto-Update System
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * FIX v2.6.0:
 *  - Safety check pakai window.__analysisRunning (bukan __analysisStartTime)
 *  - Tidak stuck lagi setelah user pernah analyze
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';
  if (window.__UPDATE_AUTO_LOADED) return;
  window.__UPDATE_AUTO_LOADED = true;

  // ═══════════════════════════════════════════════════════════════════════
  // CONFIG
  // ═══════════════════════════════════════════════════════════════════════
  const CONFIG = {
    POLL_INTERVAL: 30 * 1000,      // cek version.json tiap 30 detik
    INITIAL_DELAY: 5 * 1000,       // cek pertama setelah 5 detik
    IDLE_TIMEOUT: 20 * 1000,       // user harus idle ≥20 detik
    COUNTDOWN_START: 10,           // hitungan mundur 10 detik
    MIN_SESSION_TIME: 60 * 1000,   // minimal 1 menit setelah load sebelum boleh update
    MAX_WAIT: 10 * 60 * 1000,      // kalau >10 menit tidak idle, update paksa
    CRITICAL_FORCE: false,         // set true via version.json kalau perlu
    RELOAD_DELAY: 300
  };

  const STORAGE_KEY = 'ai-agent-version-cached';
  const SESSION_START = Date.now();

  // ═══════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════
  const State = {
    pendingUpdate: null,
    idleTimer: null,
    countdownTimer: null,
    countdownRemaining: 0,
    lastActivity: Date.now(),
    reloading: false,
    updateShownAt: 0,
    isCountingDown: false
  };

  // ═══════════════════════════════════════════════════════════════════════
  // SAFETY CHECK — apakah aman untuk update?
  // ═══════════════════════════════════════════════════════════════════════
  function isSafeToUpdate() {
    // 1. Session minimal — jangan update 5 detik setelah user buka
    if (Date.now() - SESSION_START < CONFIG.MIN_SESSION_TIME) {
      return { safe: false, reason: 'session-too-new' };
    }

    // 2. Tidak sedang analyze — FIX: pakai flag __analysisRunning
    if (window.__analysisRunning === true) {
      return { safe: false, reason: 'analyzing' };
    }
    if (window.AIEngine && window.AIEngine.running === true) {
      return { safe: false, reason: 'ai-running' };
    }

    // 3. Tidak ada video yang di-upload / di-preview
    const sourceVideo = document.getElementById('sourceVideo');
    if (sourceVideo && !sourceVideo.paused && !sourceVideo.ended && sourceVideo.readyState >= 2) {
      return { safe: false, reason: 'video-playing' };
    }

    // 4. Tidak sedang export CapCut
    if (window.__lastCapCutExport) {
      const t = Date.now() - (window.__lastCapCutExport.ts || 0);
      if (t < 30 * 1000) {
        return { safe: false, reason: 'recent-export' };
      }
    }

    // 5. Tidak ada modal aktif
    const modals = document.querySelectorAll(
      '[id*="Modal"], [id*="modal"], [class*="modal"]'
    );
    for (const m of modals) {
      if (m.offsetParent !== null) {
        return { safe: false, reason: 'modal-open' };
      }
    }

    // 6. Idle cukup lama
    const idleMs = Date.now() - State.lastActivity;
    if (idleMs < CONFIG.IDLE_TIMEOUT) {
      return { safe: false, reason: 'not-idle' };
    }

    // 7. Tidak ada proses save/load yang penting
    if (window.__AUTO_CONFIG_APPLYING__) {
      return { safe: false, reason: 'config-applying' };
    }

    return { safe: true };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VERSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════
  function getLocalVersion() {
    if (window.APP_VERSION) return window.APP_VERSION;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const info = JSON.parse(raw);
        if (info && info.version) return info.version;
      }
    } catch (e) {}
    return null;
  }

  function saveVersionInfo(info) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
    } catch (e) {}
  }

  // ═══════════════════════════════════════════════════════════════════════
  // POLL UPDATE
  // ═══════════════════════════════════════════════════════════════════════
  let pollInFlight = false;

  async function checkForUpdate() {
    if (State.reloading) return;
    if (pollInFlight) return;
    if (!navigator.onLine) return;

    pollInFlight = true;
    try {
      const res = await fetch('./version.json?t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return;
      const remoteInfo = await res.json();
      if (!remoteInfo || !remoteInfo.version) return;

      const localVersion = getLocalVersion();
      const remoteVersion = remoteInfo.version;

      // Belum ada versi lokal → set tanpa banner
      if (!localVersion) {
        saveVersionInfo(remoteInfo);
        window.APP_VERSION = remoteVersion;
        return;
      }

      // Versi sama → tidak ada update
      if (localVersion === remoteVersion) return;

      // ✨ Ada versi baru!
      console.log(`%c[UpdateAuto] 🚀 Update: ${localVersion} → ${remoteVersion}`,
        'color:#10b981;font-weight:bold;');

      State.pendingUpdate = {
        from: localVersion,
        to: remoteVersion,
        info: remoteInfo
      };
      State.updateShownAt = Date.now();

      // Cek apakah critical (force update)
      const isCritical = remoteInfo.critical === true || CONFIG.CRITICAL_FORCE;

      if (isCritical) {
        console.log('[UpdateAuto] ⚡ Critical update — force reload');
        await forceUpdate('critical');
        return;
      }

      // Coba mulai countdown kalau aman
      tryStartCountdown();

    } catch (e) {
      // Silent fail
    } finally {
      pollInFlight = false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TRY START COUNTDOWN
  // ═══════════════════════════════════════════════════════════════════════
  function tryStartCountdown() {
    if (!State.pendingUpdate) return;
    if (State.isCountingDown) return;
    if (State.reloading) return;

    const check = isSafeToUpdate();

    const waitTime = Date.now() - State.updateShownAt;
    if (waitTime > CONFIG.MAX_WAIT) {
      console.log('[UpdateAuto] ⏰ Max wait exceeded — force update');
      forceUpdate('max-wait');
      return;
    }

    if (!check.safe) return;

    startCountdown();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // COUNTDOWN UI
  // ═══════════════════════════════════════════════════════════════════════
  function startCountdown() {
    if (State.isCountingDown) return;
    State.isCountingDown = true;
    State.countdownRemaining = CONFIG.COUNTDOWN_START;

    console.log(`[UpdateAuto] ✅ Safe — countdown ${CONFIG.COUNTDOWN_START}s`);
    showCountdownBanner();

    State.countdownTimer = setInterval(() => {
      State.countdownRemaining--;

      const check = isSafeToUpdate();
      if (!check.safe) {
        console.log(`[UpdateAuto] ⏸ Cancel — ${check.reason}`);
        cancelCountdown();
        return;
      }

      updateCountdownDisplay();

      if (State.countdownRemaining <= 0) {
        clearInterval(State.countdownTimer);
        State.countdownTimer = null;
        forceUpdate('countdown-complete');
      }
    }, 1000);
  }

  function cancelCountdown() {
    if (State.countdownTimer) {
      clearInterval(State.countdownTimer);
      State.countdownTimer = null;
    }
    State.isCountingDown = false;
    State.countdownRemaining = 0;
    hideCountdownBanner();
  }

  function showCountdownBanner() {
    if (document.getElementById('autoUpdateCountdown')) return;

    const banner = document.createElement('div');
    banner.id = 'autoUpdateCountdown';
    banner.style.cssText = [
      'position:fixed',
      'bottom:20px',
      'left:50%',
      'transform:translateX(-50%) translateY(150%)',
      'background:linear-gradient(135deg,#3b82f6,#2563eb)',
      'color:#fff',
      'padding:14px 18px',
      'border-radius:14px',
      'box-shadow:0 12px 40px rgba(59,130,246,0.5), 0 4px 12px rgba(0,0,0,0.3)',
      'z-index:9999999',
      'max-width:calc(100vw - 32px)',
      'width:380px',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      'font-weight:600',
      'transition:transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
      'opacity:0',
      'border:1px solid rgba(255,255,255,0.2)'
    ].join(';');

    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="position:relative;width:40px;height:40px;flex-shrink:0;">
          <svg style="transform:rotate(-90deg);width:100%;height:100%;" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="3"/>
            <circle id="autoUpdateRing" cx="20" cy="20" r="17" fill="none" stroke="#fff" stroke-width="3"
              stroke-dasharray="106.8" stroke-dashoffset="0" stroke-linecap="round"
              style="transition:stroke-dashoffset 1s linear;"/>
          </svg>
          <div id="autoUpdateNum" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:0.95rem;font-weight:800;">${CONFIG.COUNTDOWN_START}</div>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:0.82rem;font-weight:800;margin-bottom:3px;">
            🚀 Auto-update ke v${State.pendingUpdate.to}
          </div>
          <div style="font-size:0.7rem;opacity:0.9;line-height:1.4;" id="autoUpdateSubMsg">
            Update otomatis dalam <b>${CONFIG.COUNTDOWN_START} detik</b>...
          </div>
        </div>
      </div>
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.15);display:flex;gap:6px;">
        <button id="autoUpdateDelay" style="flex:1;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);color:#fff;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:0.72rem;font-weight:700;font-family:inherit;">⏸ Nanti saja</button>
        <button id="autoUpdateNow" style="flex:1;background:#fff;color:#2563eb;border:none;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:0.72rem;font-weight:800;font-family:inherit;">⚡ Update sekarang</button>
      </div>
    `;

    document.body.appendChild(banner);

    requestAnimationFrame(() => {
      banner.style.transform = 'translateX(-50%) translateY(0)';
      banner.style.opacity = '1';
    });

    const circumference = 2 * Math.PI * 17;
    const ring = banner.querySelector('#autoUpdateRing');
    const num = banner.querySelector('#autoUpdateNum');
    const subMsg = banner.querySelector('#autoUpdateSubMsg');

    banner.__updateDisplay = () => {
      if (ring) {
        const ratio = State.countdownRemaining / CONFIG.COUNTDOWN_START;
        const offset = circumference * (1 - ratio);
        ring.style.strokeDashoffset = offset;
      }
      if (num) num.textContent = State.countdownRemaining;
      if (subMsg) subMsg.innerHTML = `Update otomatis dalam <b>${State.countdownRemaining} detik</b>...`;
    };

    banner.querySelector('#autoUpdateDelay').onclick = (e) => {
      e.stopPropagation();
      console.log('[UpdateAuto] ⏸ User delay — postphone 5 menit');
      cancelCountdown();
      setTimeout(() => {
        if (State.pendingUpdate) tryStartCountdown();
      }, 5 * 60 * 1000);
    };

    banner.querySelector('#autoUpdateNow').onclick = (e) => {
      e.stopPropagation();
      clearInterval(State.countdownTimer);
      forceUpdate('user-request');
    };

    banner.style.cursor = 'pointer';
  }

  function updateCountdownDisplay() {
    const banner = document.getElementById('autoUpdateCountdown');
    if (banner && typeof banner.__updateDisplay === 'function') {
      banner.__updateDisplay();
    }
  }

  function hideCountdownBanner() {
    const b = document.getElementById('autoUpdateCountdown');
    if (!b) return;
    b.style.transform = 'translateX(-50%) translateY(150%)';
    b.style.opacity = '0';
    setTimeout(() => { if (b.parentNode) b.remove(); }, 400);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FORCE UPDATE
  // ═══════════════════════════════════════════════════════════════════════
  async function forceUpdate(reason) {
    if (State.reloading) return;
    State.reloading = true;
    cancelCountdown();

    console.log(`[UpdateAuto] 🔄 Applying update (${reason})...`);
    showReloadingOverlay();

    if (State.pendingUpdate && State.pendingUpdate.info) {
      saveVersionInfo(State.pendingUpdate.info);
    }

    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
        console.log('[UpdateAuto] 🗑 Cache cleared:', keys.length);
      }
    } catch (e) {}

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          await reg.update();
        }
      }
    } catch (e) {}

    setTimeout(() => {
      try { window.location.reload(true); }
      catch (e) { window.location.reload(); }
    }, CONFIG.RELOAD_DELAY);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RELOADING OVERLAY
  // ═══════════════════════════════════════════════════════════════════════
  function showReloadingOverlay() {
    if (document.getElementById('autoUpdateOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'autoUpdateOverlay';
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'background:rgba(11,15,25,0.92)',
      'backdrop-filter:blur(8px)',
      '-webkit-backdrop-filter:blur(8px)',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'flex-direction:column',
      'gap:16px',
      'z-index:99999999',
      'color:#fff',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'
    ].join(';');

    overlay.innerHTML = `
      <div style="width:56px;height:56px;border:4px solid rgba(56,189,248,0.25);border-top-color:#38bdf8;border-radius:50%;animation:autoUpdateSpin 0.9s linear infinite;"></div>
      <div style="text-align:center;">
        <div style="font-size:1rem;font-weight:800;margin-bottom:6px;">
          🚀 Mengupdate ke v${State.pendingUpdate ? State.pendingUpdate.to : '?'}
        </div>
        <div style="font-size:0.78rem;opacity:0.75;">Membersihkan cache & reload...</div>
      </div>
      <style>
        @keyframes autoUpdateSpin { to { transform: rotate(360deg); } }
      </style>
    `;

    document.body.appendChild(overlay);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ACTIVITY TRACKING
  // ═══════════════════════════════════════════════════════════════════════
  function updateLastActivity() {
    State.lastActivity = Date.now();

    if (State.isCountingDown) {
      clearTimeout(State._cancelDebounce);
      State._cancelDebounce = setTimeout(() => {
        if (Date.now() - State.lastActivity < 800) return;
        const check = isSafeToUpdate();
        if (!check.safe) cancelCountdown();
      }, 900);
    }
  }

  function installActivityTracking() {
    const events = [
      'mousedown', 'mousemove', 'keydown', 'touchstart',
      'touchmove', 'scroll', 'click', 'input', 'change'
    ];
    events.forEach(evt => {
      document.addEventListener(evt, updateLastActivity, { passive: true, capture: true });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // IDLE CHECK LOOP
  // ═══════════════════════════════════════════════════════════════════════
  function startIdleLoop() {
    setInterval(() => {
      if (State.pendingUpdate && !State.isCountingDown && !State.reloading) {
        tryStartCountdown();
      }
    }, 5000);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BOOT
  // ═══════════════════════════════════════════════════════════════════════
  function boot() {
    console.log('%c[UpdateAuto v2.6.0] 📦 Loaded — auto-update on idle', 'color:#3b82f6;font-weight:bold;');
    console.log(`[UpdateAuto] Konfigurasi:`);
    console.log(`  · Poll interval: ${CONFIG.POLL_INTERVAL / 1000}s`);
    console.log(`  · Idle timeout: ${CONFIG.IDLE_TIMEOUT / 1000}s`);
    console.log(`  · Countdown: ${CONFIG.COUNTDOWN_START}s`);
    console.log(`  · Min session: ${CONFIG.MIN_SESSION_TIME / 1000}s`);

    installActivityTracking();
    State.lastActivity = Date.now();

    setTimeout(checkForUpdate, CONFIG.INITIAL_DELAY);
    setInterval(checkForUpdate, CONFIG.POLL_INTERVAL);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    });

    window.addEventListener('online', checkForUpdate);

    startIdleLoop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════
  window.UpdateAuto = {
    check: checkForUpdate,
    force: () => forceUpdate('manual'),
    cancel: cancelCountdown,
    status: () => ({
      pending: State.pendingUpdate,
      countingDown: State.isCountingDown,
      remaining: State.countdownRemaining,
      lastActivity: new Date(State.lastActivity).toISOString(),
      idleMs: Date.now() - State.lastActivity,
      safe: isSafeToUpdate()
    }),
    config: CONFIG,
    _test: {
      showCountdown: () => {
        State.pendingUpdate = {
          from: '2.6.0',
          to: '2.6.1',
          info: { changelog: 'Test countdown' }
        };
        State.updateShownAt = Date.now() - CONFIG.MAX_WAIT;
        startCountdown();
      },
      setActivity: (ago) => {
        State.lastActivity = Date.now() - (ago || 0);
      }
    }
  };
})();