/**
* AI CLIPPER AGENT — VERSION REGISTRY v2.6.0
 * UNIFIED + LLM + AUTO CONFIG
 */

(function () {
  'use strict';
  if (window.__VERSION_REGISTRY_LOADED) return;
  window.__VERSION_REGISTRY_LOADED = true;

  const FALLBACK_VERSION = '2.6.0';

  const MODULES = [
    // ─── Core Layer ───
    { file: 'index.html',             runtime: null,                     role: 'UI Shell' },
    { file: 'style.css',              runtime: null,                     role: 'Theme System' },
    { file: 'script.js',              runtime: null,                     role: 'App Orchestrator' },
    { file: 'resource-manager.js',    runtime: 'SmartResourceManager',   role: 'Memory Guard' },
    { file: 'video-signal-engine.js', runtime: 'VideoSignalEngine',      role: 'Signal Analysis' },
    { file: 'hooks-db.js',            runtime: 'HookEngine',             role: 'Copywriting Engine' },

    // ─── Media Layer ───
    { file: 'mp4-trim.js',            runtime: 'MP4TrimEngine',          role: 'Lossless MP4 Trim' },
    { file: 'mp4box.all.min.js',      runtime: 'MP4Box',                 role: 'MP4 Box Library' },
    { file: 'ffmpeg.js',              runtime: 'FFmpegManager',          role: 'Trim Dispatcher' },

    // ─── UI Enhancement ───
    { file: 'features-v2.js',         runtime: null,                     role: 'UI Upgrade Wrapper' },
    { file: 'turbo-mode.js',          runtime: null,                     role: 'Speed Override' },
    { file: 'auto-save.js',           runtime: null,                     role: 'Auto Save localStorage' },

    // ─── AI Unified Layer ───
    { file: 'ai.js',                  runtime: 'AIEngine',               role: 'AI Unified Layer v3.1' },
    { file: 'ai.js',                  runtime: 'SmartEngine',            role: '↳ alias AIEngine' },
    { file: 'ai.js',                  runtime: 'RealAI',                 role: '↳ alias AIEngine' },
    { file: 'ai.js',                  runtime: 'CapCutEngine',           role: '↳ CapCut Export' },

    // ─── LLM Layer (kalau ada) ───
    { file: 'llm-engine.js',          runtime: 'LLMEngine',              role: 'Real AI Copywriter (Human Voice)' },
    { file: 'llm-cache.js',           runtime: 'LLMCache',               role: 'LLM Persistent Cache' },
    { file: 'llm-patch.js',           runtime: null,                     role: 'LLM Integration Patch' },

    // ─── Auto Config (kalau ada) ───
    { file: 'auto-config.js',         runtime: 'AutoConfig',             role: 'Adaptive Device Config' },
    { file: 'auto-config-backup.js',  runtime: null,                     role: 'Crash Notifier + Backup' },

    // ─── Update & Version ───
    { file: 'update-auto.js',         runtime: 'UpdateAuto',             role: 'Auto Update on Idle' },  // ← DIGANTI
    { file: 'version-registry.js',    runtime: 'AppVersion',             role: 'Version Registry' },

    // ─── PWA & Background ───
    { file: 'sw.js',                  runtime: null,                     role: 'Service Worker + AI Model Cache' },
    { file: 'worker.js',              runtime: null,                     role: 'Background Worker' },
    { file: 'manifest.json',          runtime: null,                     role: 'PWA Manifest' },
    { file: 'database.json',          runtime: null,                     role: 'Region + Niche Data' },
    { file: 'version.json',           runtime: null,                     role: 'Version Source of Truth' },

    // ─── Legacy ───
    { file: 'whisper-auto.js',        runtime: null,                     role: 'Disabled (legacy stub)' }
  ];

  const ALIAS_MAP = {
    'ai.js': ['AIEngine', 'SmartEngine', 'RealAI', 'CapCutEngine'],
    'llm-engine.js': ['LLMEngine'],
    'llm-cache.js': ['LLMCache'],
    'auto-config.js': ['AutoConfig']
  };

  window.AppVersion = {
    current: FALLBACK_VERSION,
    build: null,
    changelog: '',
    modules: MODULES,
    loaded: false,

    async load() {
      try {
        const res = await fetch('./version.json?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          const info = await res.json();
          this.current   = info.version   || FALLBACK_VERSION;
          this.build     = info.released  || null;
          this.changelog = info.changelog || '';
        }
      } catch (e) {
        console.warn('[VersionRegistry] version.json gagal, fallback:', FALLBACK_VERSION);
      }
      this._patchRuntimeMetadata();
      this._printTable();
      this.loaded = true;
      try {
        window.dispatchEvent(new CustomEvent('app-version-ready', { detail: { version: this.current } }));
      } catch (e) {}
      return this.current;
    },

    _patchRuntimeMetadata() {
      const v = this.current;
      const patched = new Set();

      MODULES.forEach(m => {
        if (!m.runtime) return;
        if (patched.has(m.runtime)) return;
        const target = window[m.runtime];
        if (!target) return;
        patched.add(m.runtime);
        try {
          if (!('__version' in target)) {
            Object.defineProperty(target, '__version', { value: v, writable: false, enumerable: false, configurable: true });
          }
          if (!('__moduleFile' in target)) {
            Object.defineProperty(target, '__moduleFile', { value: m.file, writable: false, enumerable: false, configurable: true });
          }
        } catch (e) {}
      });

      Object.entries(ALIAS_MAP).forEach(([file, aliases]) => {
        aliases.forEach(aliasName => {
          const target = window[aliasName];
          if (!target) return;
          try {
            if (!('__version' in target)) {
              Object.defineProperty(target, '__version', { value: v, writable: false, enumerable: false, configurable: true });
            }
            if (!('__moduleFile' in target)) {
              Object.defineProperty(target, '__moduleFile', { value: file, writable: false, enumerable: false, configurable: true });
            }
          } catch (e) {}
        });
      });

      console.log(`[VersionRegistry] ✅ Metadata ter-patch ke ${patched.size} runtime`);
    },

    _printTable() {
      const seen = new Set();
      const rows = [];
      MODULES.forEach(m => {
        const key = m.file + '::' + m.runtime;
        if (seen.has(key)) return;
        seen.add(key);
        rows.push({ File: m.file, Version: this.current, Runtime: m.runtime || '(no global)', Role: m.role });
      });

      console.log(`%c[AI AGENT] ✅ Version: ${this.current}`, 'color:#38bdf8;font-weight:bold;font-size:13px;padding:4px 0');
      try { console.table(rows); } catch (e) { console.log(rows); }
    },

    get(fileName) { return this.current; },
    isUnified() { return this.loaded && !!this.current; },

    _checkLoaded() {
      const report = { ok: [], missing: [] };
      const seen = new Set();
      MODULES.forEach(m => {
        if (!m.runtime) return;
        if (seen.has(m.runtime)) return;
        seen.add(m.runtime);
        if (window[m.runtime]) report.ok.push(m.runtime);
        else report.missing.push(`${m.runtime} (${m.file})`);
      });

      console.log('┌─ MODULE LOAD CHECK ────────────────────────────');
      console.log(`│ ✅ Loaded  : ${report.ok.length} runtime`);
      console.log(`│    ${report.ok.join(', ')}`);
      if (report.missing.length > 0) {
        console.log(`│ ⚠️  Belum dimuat (${report.missing.length}):`);
        report.missing.forEach(m => console.log(`│    • ${m}`));
      } else {
        console.log('│ ✅ Semua runtime OK');
      }
      console.log('└─────────────────────────────────────────────────');
      return report;
    }
  };

  // Listen version change dari update-auto.js / version-sync.js (kalau ada)
  window.addEventListener('app-version-changed', (e) => {
    const v = e.detail && e.detail.version;
    if (v && v !== window.AppVersion.current) {
      window.AppVersion.current = v;
      console.log(`[VersionRegistry] 🔄 Version updated: ${v}`);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.AppVersion.load());
  } else {
    window.AppVersion.load();
  }
})();