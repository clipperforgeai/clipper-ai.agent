/**
 * ═══════════════════════════════════════════════════════════════════════════
 * auto-config.js — Clipper Forge Adaptive Device Profiler & Preset Manager
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Responsibilities
 *   1. Deep hardware probing   → CPU / RAM / heap / WebGL / WebGPU capabilities
 *   2. Multi-stage benchmark    → normalised 0-100 score → Low | Balanced | High | Ultra
 *   3. Runtime watchdog         → auto-downgrade on frame drops, OOM, wasm aborts
 *   4. Manual override layer    → persisted user preset + lightweight UI panel
 *   5. Integration surface      → `getProfile()` returns concrete knobs for
 *                                 ai_3.js  (profile.ai)  and
 *                                 ffmpeg_3.js (profile.ffmpeg)
 *
 * Design notes
 *   • Hardware caps are split into DEFINITIVE (no GPU context, tiny heap) and
 *     SOFT (deviceMemory, core count, iOS/Firefox). SOFT caps only apply when
 *     the benchmark score corroborates them — this is the primary defence
 *     against "false downgrades" on devices that misreport their specs.
 *   • Everything degrades gracefully: if WebGL is unavailable the GPU weight is
 *     redistributed, if `performance.memory` is missing memory scoring falls
 *     back to `navigator.deviceMemory`, if localStorage is blocked the module
 *     still works in-memory for the session.
 *
 * @version 1.0.0
 * @license MIT
 * ═══════════════════════════════════════════════════════════════════════════
 */

/* ============================================================================
 * 0. CONSTANTS
 * ========================================================================== */

const NS = 'clipperforge.autoconfig.v1';

const STORAGE_KEYS = Object.freeze({
  state:   `${NS}.state`,     // tier, source, overrides
  bench:   `${NS}.bench`,     // cached benchmark result
  crashes: `${NS}.crashes`,   // array of crash timestamps
  session: `${NS}.session`,   // heartbeat marker (clean-shutdown detection)
});

/** Canonical tier ladder, ordered from weakest to strongest. */
export const TIERS = Object.freeze(['low', 'balanced', 'high', 'ultra']);

const TIER_RANK = Object.freeze({ low: 0, balanced: 1, high: 2, ultra: 3 });

const CRASH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CRASH_RECORDS = 12;

/** Patterns that indicate a genuine out-of-memory / wasm abort event. */
const OOM_PATTERNS = [
  /out of memory/i,
  /allocation failed/i,
  /array buffer allocation/i,
  /cannot enlarge memory/i,
  /memory access out of bounds/i,
  /wasm memory/i,
  /aborted\(.*oom/i,
  /failed to allocate/i,
  /heap out of memory/i,
];

/* ============================================================================
 * 1. TINY UTILITIES
 * ========================================================================== */

class Emitter {
  constructor() { this._listeners = new Map(); }

  on(event, fn) {
    if (typeof fn !== 'function') return () => {};
    let set = this._listeners.get(event);
    if (!set) { set = new Set(); this._listeners.set(event, set); }
    set.add(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    const set = this._listeners.get(event);
    if (!set) return;
    set.delete(fn);
    if (set.size === 0) this._listeners.delete(event);
  }

  emit(event, payload) {
    const set = this._listeners.get(event);
    if (!set) return;
    for (const fn of Array.from(set)) {
      try { fn(payload); }
      catch (err) { console.warn('[AutoConfig] listener error on "' + event + '":', err); }
    }
  }

  removeAllListeners() { this._listeners.clear(); }
}

/** localStorage wrapper that never throws (private mode / quota / disabled). */
const storage = {
  _mem: new Map(),

  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return this._mem.has(key) ? this._mem.get(key) : fallback;
      return JSON.parse(raw);
    } catch {
      return this._mem.has(key) ? this._mem.get(key) : fallback;
    }
  },

  set(key, value) {
    this._mem.set(key, value);
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  },

  remove(key) {
    this._mem.delete(key);
    try { localStorage.removeItem(key); } catch { /* noop */ }
  },
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** Lower-is-better metric → 0..100 score. */
function scoreLowerBetter(value, best, worst) {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value <= best) return 100;
  if (value >= worst) return 0;
  return (100 * (worst - value)) / (worst - best);
}

/** Higher-is-better metric → 0..100 score. */
function scoreHigherBetter(value, worst, best) {
  if (!Number.isFinite(value) || value <= worst) return 0;
  if (value >= best) return 100;
  return (100 * (value - worst)) / (best - worst);
}

function nextFrame() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });
}

/** djb2 string hash — used for the hardware signature. */
function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function deepClone(obj) {
  try { return JSON.parse(JSON.stringify(obj)); }
  catch { return obj; }
}

function deepMerge(base, patch) {
  if (!patch || typeof patch !== 'object') return deepClone(base);
  const out = deepClone(base) || {};
  for (const key of Object.keys(patch)) {
    const pv = patch[key];
    if (pv && typeof pv === 'object' && !Array.isArray(pv) &&
        out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])) {
      out[key] = deepMerge(out[key], pv);
    } else {
      out[key] = pv;
    }
  }
  return out;
}

/* ============================================================================
 * 2. TIER PROFILES — the contract consumed by ai_3.js / ffmpeg_3.js
 * ========================================================================== */

export const PROFILES = Object.freeze({
  low: Object.freeze({
    tier: 'low',
    label: 'Low',
    description: 'Legacy / low-memory devices. Prioritises stability over quality.',

    ai: {
      quality: 'fast',
      inputSize: 320,
      maxDetections: 20,
      targetFps: 2,
      batchSize: 1,
      useWorker: false,
      useWebGPU: false,
      modelPrecision: 'int8',
      enableTracking: false,
      enableSceneDetection: false,
    },

    ffmpeg: {
      threads: 1,
      preset: 'ultrafast',
      crf: 30,
      maxWidth: 640,
      maxHeight: 360,
      hwAccel: 'none',
      wasmMemoryMB: 256,
      chunkSizeMB: 4,
    },

    ui: {
      previewQuality: 0.4,
      maxPreviewWidth: 480,
      canvasPool: 1,
      thumbnailQuality: 0.5,
      virtualizeLists: true,
      waveformResolution: 256,
    },

    render: {
      targetFps: 24,
      dprCap: 1,
      enableShadows: false,
      enableFilters: false,
      enableMotion: false,
      enableBlur: false,
    },
  }),

  balanced: Object.freeze({
    tier: 'balanced',
    label: 'Balanced',
    description: 'Default for mid-range phones and older laptops.',

    ai: {
      quality: 'balanced',
      inputSize: 416,
      maxDetections: 40,
      targetFps: 4,
      batchSize: 2,
      useWorker: true,
      useWebGPU: false,
      modelPrecision: 'int8',
      enableTracking: true,
      enableSceneDetection: false,
    },

    ffmpeg: {
      threads: 2,
      preset: 'veryfast',
      crf: 26,
      maxWidth: 1280,
      maxHeight: 720,
      hwAccel: 'none',
      wasmMemoryMB: 512,
      chunkSizeMB: 8,
    },

    ui: {
      previewQuality: 0.6,
      maxPreviewWidth: 720,
      canvasPool: 2,
      thumbnailQuality: 0.7,
      virtualizeLists: true,
      waveformResolution: 512,
    },

    render: {
      targetFps: 30,
      dprCap: 1.5,
      enableShadows: false,
      enableFilters: true,
      enableMotion: true,
      enableBlur: false,
    },
  }),

  high: Object.freeze({
    tier: 'high',
    label: 'High',
    description: 'Modern phones and mainstream desktops with a discrete or capable iGPU.',

    ai: {
      quality: 'high',
      inputSize: 512,
      maxDetections: 80,
      targetFps: 8,
      batchSize: 4,
      useWorker: true,
      useWebGPU: true,
      modelPrecision: 'fp16',
      enableTracking: true,
      enableSceneDetection: true,
    },

    ffmpeg: {
      threads: 4,
      preset: 'fast',
      crf: 23,
      maxWidth: 1920,
      maxHeight: 1080,
      hwAccel: 'prefer',
      wasmMemoryMB: 1024,
      chunkSizeMB: 16,
    },

    ui: {
      previewQuality: 0.8,
      maxPreviewWidth: 1280,
      canvasPool: 4,
      thumbnailQuality: 0.8,
      virtualizeLists: true,
      waveformResolution: 1024,
    },

    render: {
      targetFps: 60,
      dprCap: 2,
      enableShadows: true,
      enableFilters: true,
      enableMotion: true,
      enableBlur: true,
    },
  }),

  ultra: Object.freeze({
    tier: 'ultra',
    label: 'Ultra',
    description: 'Workstations / flagship devices with WebGPU and plenty of RAM.',

    ai: {
      quality: 'max',
      inputSize: 640,
      maxDetections: 150,
      targetFps: 12,
      batchSize: 8,
      useWorker: true,
      useWebGPU: true,
      modelPrecision: 'fp16',
      enableTracking: true,
      enableSceneDetection: true,
      enableSemanticSearch: true,
    },

    ffmpeg: {
      threads: 0, // 0 = let ffmpeg auto-detect from hardwareConcurrency
      preset: 'medium',
      crf: 20,
      maxWidth: 3840,
      maxHeight: 2160,
      hwAccel: 'require',
      wasmMemoryMB: 2048,
      chunkSizeMB: 32,
    },

    ui: {
      previewQuality: 1,
      maxPreviewWidth: 1920,
      canvasPool: 6,
      thumbnailQuality: 0.92,
      virtualizeLists: false,
      waveformResolution: 2048,
    },

    render: {
      targetFps: 60,
      dprCap: 3,
      enableShadows: true,
      enableFilters: true,
      enableMotion: true,
      enableBlur: true,
    },
  }),
});

/* ============================================================================
 * 3. HARDWARE PROBING (synchronous, cheap)
 * ========================================================================== */

function probeHardware() {
  const nav = (typeof navigator !== 'undefined') ? navigator : {};
  const ua = nav.userAgent || '';
  const platform = nav.platform || '';

  const deviceMemory = (typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0)
    ? nav.deviceMemory : null;

  const cores = (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0)
    ? nav.hardwareConcurrency : null;

  let heapLimitMB = null;
  let heapUsedMB = null;
  try {
    const mem = performance && performance.memory;
    if (mem && mem.jsHeapSizeLimit) {
      heapLimitMB = Math.round(mem.jsHeapSizeLimit / 1048576);
      heapUsedMB = Math.round(mem.usedJSHeapSize / 1048576);
    }
  } catch { /* not supported */ }

  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (platform === 'MacIntel' && (nav.maxTouchPoints || 0) > 1);
  const isAndroid = /Android/i.test(ua);
  const isFirefox = /Firefox|FxiOS/i.test(ua);
  const isSafari = !isFirefox && /Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR/i.test(ua);
  const isMobile = isIOS || isAndroid || /Mobi|Tablet/i.test(ua);

  let connection = null;
  try {
    const c = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (c) connection = { type: c.effectiveType || null, downlink: c.downlink ?? null, saveData: !!c.saveData };
  } catch { /* noop */ }

  return {
    ua: ua.slice(0, 160),
    deviceMemory,
    cores,
    heapLimitMB,
    heapUsedMB,
    isIOS,
    isAndroid,
    isFirefox,
    isSafari,
    isMobile,
    isDesktop: !isMobile,
    maxTouchPoints: nav.maxTouchPoints || 0,
    devicePixelRatio: (typeof window !== 'undefined' && window.devicePixelRatio) || 1,
    screen: (typeof screen !== 'undefined')
      ? { w: screen.width, h: screen.height, dpr: window.devicePixelRatio || 1 }
      : null,
    connection,
  };
}

/* ============================================================================
 * 4. GPU PROBING — WebGL capability + fill-rate, WebGPU adapter info
 * ========================================================================== */

function createWebGLContext() {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;

  const attrs = {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    failIfMajorPerformanceCaveat: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  };

  let gl = null;
  try { gl = canvas.getContext('webgl2', attrs); } catch { /* noop */ }
  if (!gl) { try { gl = canvas.getContext('webgl', attrs); } catch { /* noop */ } }
  if (!gl) { try { gl = canvas.getContext('experimental-webgl', attrs); } catch { /* noop */ } }

  return gl ? { gl, canvas } : null;
}

/** Minimal full-screen-quad shader program used for the fill-rate test. */
function buildFillProgram(gl) {
  const VS = 'attribute vec2 aPos;void main(){gl_Position=vec4(aPos,0.0,1.0);}';
  const FS = 'precision mediump float;uniform float uT;void main(){gl_FragColor=vec4(uT,uT*0.5,1.0-uT,1.0);}';

  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, VS);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) { gl.deleteShader(vs); return null; }

  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, FS);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    gl.deleteShader(vs); gl.deleteShader(fs); return null;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { gl.deleteProgram(prog); return null; }
  return prog;
}

/**
 * Measures GPU fill throughput by rasterising N full-viewport quads and
 * forcing a synchronisation with readPixels.
 * @returns {number} elapsed milliseconds, or -1 on failure.
 */
function benchGPUFill(gl, size = 512, quads = 200) {
  try {
    const prog = buildFillProgram(gl);
    if (!prog) return -1;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ]), gl.STATIC_DRAW);

    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.useProgram(prog);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uT = gl.getUniformLocation(prog, 'uT');
    gl.viewport(0, 0, size, size);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);

    const px = new Uint8Array(4);

    // Warm-up (shader compile, driver state setup)
    gl.uniform1f(uT, 0.1);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);

    const t0 = performance.now();
    for (let i = 0; i < quads; i++) {
      gl.uniform1f(uT, (i % 97) / 97);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); // force sync
    const ms = performance.now() - t0;

    gl.deleteBuffer(buf);
    gl.deleteProgram(prog);
    return ms;
  } catch {
    return -1;
  }
}

function probeWebGL() {
  const out = {
    ok: false,
    isWebGL2: false,
    vendor: null,
    renderer: null,
    version: null,
    maxTextureSize: 0,
    maxRenderbufferSize: 0,
    maxViewport: [0, 0],
    maxVertexAttribs: 0,
    maxTextureUnits: 0,
    maxSamples: 0,
    failMs: -1,
  };

  const ctx = createWebGLContext();
  if (!ctx) return out;

  const { gl, canvas } = ctx;
  try {
    out.ok = true;
    out.isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' &&
                   gl instanceof WebGL2RenderingContext;

    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    out.vendor = String((dbg && gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)) || gl.getParameter(gl.VENDOR) || '');
    out.renderer = String((dbg && gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || '');
    out.version = String(gl.getParameter(gl.VERSION) || '');

    out.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) | 0;
    out.maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) | 0;
    out.maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS) | 0;
    out.maxTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) | 0;
    out.maxSamples = gl.getParameter(gl.MAX_SAMPLES) | 0;

    const vp = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    out.maxViewport = vp ? [vp[0] | 0, vp[1] | 0] : [0, 0];

    // Fill-rate benchmark at a resolution representative of preview work.
    canvas.width = 512;
    canvas.height = 512;
    gl.viewport(0, 0, 512, 512);
    out.failMs = benchGPUFill(gl, 512, 200);
  } catch (err) {
    out.ok = false;
  } finally {
    // Free the GPU context eagerly — we do not keep it alive.
    try {
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    } catch { /* noop */ }
    canvas.width = canvas.height = 0;
  }

  return out;
}

async function probeWebGPU() {
  const out = {
    supported: false,
    adapterAvailable: false,
    vendor: null,
    architecture: null,
    device: null,
    description: null,
    maxBufferSize: 0,
    maxTextureDimension2D: 0,
    maxComputeWorkgroupSizeX: 0,
    maxStorageBufferBindingSize: 0,
    hasTimestampQuery: false,
    isFallbackAdapter: false,
  };

  if (typeof navigator === 'undefined' || !navigator.gpu) return out;
  out.supported = true;

  try {
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' })
                 || await navigator.gpu.requestAdapter();
    if (!adapter) return out;

    out.adapterAvailable = true;
    out.isFallbackAdapter = !!adapter.isFallbackAdapter;

    // `adapter.info` (Chrome 128+) or legacy `requestAdapterInfo()`
    let info = adapter.info || null;
    if (!info && typeof adapter.requestAdapterInfo === 'function') {
      try { info = await adapter.requestAdapterInfo(); } catch { /* gated by permissions */ }
    }
    if (info) {
      out.vendor = info.vendor || null;
      out.architecture = info.architecture || null;
      out.device = info.device || null;
      out.description = info.description || null;
    }

    const lim = adapter.limits;
    if (lim) {
      out.maxBufferSize = lim.maxBufferSize | 0;
      out.maxTextureDimension2D = lim.maxTextureDimension2D | 0;
      out.maxComputeWorkgroupSizeX = lim.maxComputeWorkgroupSizeX | 0;
      out.maxStorageBufferBindingSize = lim.maxStorageBufferBindingSize | 0;
    }

    if (adapter.features && typeof adapter.features.has === 'function') {
      out.hasTimestampQuery = adapter.features.has('timestamp-query');
    }
  } catch {
    /* adapter request can reject on blocklisted drivers — treat as unavailable */
  }

  return out;
}

async function probeGPU() {
  const webgl = probeWebGL();
  const webgpu = await probeWebGPU();
  return { webgl, webgpu };
}

/* ============================================================================
 * 5. CPU / CANVAS / JSON / FRAME BENCHMARKS
 * ========================================================================== */

/** Cache-friendly i-k-j matrix multiply. Returns elapsed ms. */
function benchMatrix(n) {
  const a = new Float32Array(n * n);
  const b = new Float32Array(n * n);
  const c = new Float32Array(n * n);
  for (let i = 0; i < a.length; i++) { a[i] = Math.random(); b[i] = Math.random(); }

  const t0 = performance.now();
  for (let i = 0; i < n; i++) {
    const iOff = i * n;
    for (let k = 0; k < n; k++) {
      const aik = a[iOff + k];
      const kOff = k * n;
      for (let j = 0; j < n; j++) c[iOff + j] += aik * b[kOff + j];
    }
  }
  const ms = performance.now() - t0;

  // Touch the result so the JIT cannot dead-code-eliminate the loop.
  if (c[0] === Number.POSITIVE_INFINITY) console.debug(c[0]);
  return { ms, checksum: c[0] };
}

function benchCanvas(iterations = 24, size = 96) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return -1;

    // Warm-up
    ctx.fillStyle = '#123456';
    ctx.fillRect(0, 0, size, size);

    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) {
      ctx.fillStyle = `hsl(${(i * 37) % 360},70%,50%)`;
      ctx.fillRect(0, 0, size, size);
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate(i * 0.11);
      ctx.globalAlpha = 0.6;
      ctx.fillRect(-size / 4, -size / 4, size / 2, size / 2);
      ctx.restore();
      if ((i & 7) === 0) ctx.getImageData(0, 0, 8, 8); // force readback
    }
    const ms = performance.now() - t0;

    canvas.width = canvas.height = 0;
    return ms;
  } catch {
    return -1;
  }
}

function benchJSON(rounds = 3) {
  try {
    const payload = { items: [] };
    for (let i = 0; i < 4000; i++) {
      payload.items.push({ id: i, name: 'clip_' + i, start: Math.random(), end: Math.random() });
    }
    const t0 = performance.now();
    for (let i = 0; i < rounds; i++) JSON.parse(JSON.stringify(payload));
    return (performance.now() - t0) / rounds;
  } catch {
    return -1;
  }
}

/** Average rAF delta in ms. Resolves to 999 on timeout (background tab). */
function benchFrames(count = 10) {
  return new Promise((resolve) => {
    let i = 0;
    let last = performance.now();
    const deltas = [];

    const timeout = setTimeout(() => resolve(999), 2500);

    const step = () => {
      const now = performance.now();
      deltas.push(now - last);
      last = now;

      if (++i >= count) {
        clearTimeout(timeout);
        const usable = deltas.slice(1); // discard first (cold) frame
        const avg = usable.length
          ? usable.reduce((s, v) => s + v, 0) / usable.length
          : 999;
        resolve(avg);
        return;
      }
      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  });
}

/* ============================================================================
 * 6. SCORING & TIER DECISION
 * ========================================================================== */

function scoreMemory(hw) {
  const parts = [];
  if (hw.heapLimitMB) parts.push(scoreHigherBetter(hw.heapLimitMB, 256, 4096));
  if (hw.deviceMemory != null) parts.push(scoreHigherBetter(hw.deviceMemory, 0.5, 8));

  if (parts.length === 0) return 55;         // unknown → neutral, do not punish
  if (parts.length === 1) return parts[0];
  return parts[0] * 0.6 + parts[1] * 0.4;    // trust the heap limit more
}

function scoreGPU(gpu) {
  if (!gpu.webgl.ok) {
    // No WebGL at all: the app cannot use GPU-accelerated previews.
    return gpu.webgpu.adapterAvailable ? 30 : 8;
  }

  const fillScore = gpu.webgl.failMs > 0
    ? scoreLowerBetter(gpu.webgl.failMs, 5, 170)
    : 45;

  // Texture size is a coarse capability proxy (2048 = old, 16384 = modern).
  const texScore = scoreHigherBetter(gpu.webgl.maxTextureSize, 2048, 16384);

  let score = fillScore * 0.78 + texScore * 0.22;

  if (gpu.webgl.isWebGL2) score += 6;
  if (gpu.webgpu.adapterAvailable && !gpu.webgpu.isFallbackAdapter) score += 10;
  else if (gpu.webgpu.adapterAvailable) score += 2;

  return clamp(score, 0, 100);
}

/**
 * Applies hardware caps to a benchmark-derived tier.
 *
 * DEFINITIVE caps always apply — they represent facts that cannot be worked
 * around (no GPU context, a heap so small that wasm will fail).
 *
 * SOFT caps (deviceMemory, core count, platform quirks) only apply when the
 * benchmark itself is mediocre. This is what prevents a device that misreports
 * `deviceMemory: 2` from being locked into Low despite scoring 80/100.
 */
function applyHardwareCaps(tier, score, hw, gpu) {
  const caps = [];
  const softCorroborated = score < 65;

  // ── DEFINITIVE ──────────────────────────────────────────────────────────
  if (!gpu.webgl.ok && !gpu.webgpu.adapterAvailable) {
    tier = 'low';
    caps.push('no-gpu-context');
  }
  if (hw.heapLimitMB && hw.heapLimitMB < 256) {
    tier = minTier(tier, 'low');
    caps.push('heap<256MB');
  }

  // ── SOFT (need benchmark corroboration) ─────────────────────────────────
  if (softCorroborated) {
    if (hw.deviceMemory != null && hw.deviceMemory <= 2) {
      tier = minTier(tier, 'balanced');
      caps.push('ram<=2GB');
    }
    if (hw.deviceMemory != null && hw.deviceMemory <= 4) {
      tier = minTier(tier, 'high');
      caps.push('ram<=4GB');
    }
    if (hw.cores != null && hw.cores <= 2) {
      tier = minTier(tier, 'balanced');
      caps.push('cores<=2');
    }
    if (hw.isIOS && tier === 'ultra') {
      tier = 'high';
      caps.push('ios-safari-memory-limit');
    }
    if (hw.isFirefox && tier === 'ultra') {
      tier = 'high';
      caps.push('firefox-wasm-heap');
    }
    if (hw.connection && hw.connection.saveData) {
      tier = minTier(tier, 'balanced');
      caps.push('save-data');
    }
  }

  return { tier, caps };
}

function minTier(a, b) { return TIER_RANK[a] <= TIER_RANK[b] ? a : b; }

function stepDown(tier, steps = 1) {
  const rank = clamp(TIER_RANK[tier] - steps, 0, TIER_RANK.ultra);
  return TIERS[rank];
}

function stepUp(tier, steps = 1) {
  const rank = clamp(TIER_RANK[tier] + steps, 0, TIER_RANK.ultra);
  return TIERS[rank];
}

function tierFromScore(score) {
  if (score >= 76) return 'ultra';
  if (score >= 56) return 'high';
  if (score >= 34) return 'balanced';
  return 'low';
}

function decideTier(score, hw, gpu, recentCrashes) {
  let tier = tierFromScore(score);
  const reasons = [`benchmark score ${score}/100 → ${tier}`];

  const capped = applyHardwareCaps(tier, score, hw, gpu);
  tier = capped.tier;
  if (capped.caps.length) reasons.push('caps: ' + capped.caps.join(', '));

  // Crash history penalty — the only signal that can push below the cap floor.
  if (recentCrashes >= 3) {
    tier = stepDown(tier, 2);
    reasons.push(`${recentCrashes} crashes in 7d → −2 tiers`);
  } else if (recentCrashes >= 1) {
    tier = stepDown(tier, 1);
    reasons.push(`${recentCrashes} crash(es) in 7d → −1 tier`);
  }

  return { tier, reasons };
}

/* ============================================================================
 * 7. RUNTIME MONITOR — frame drops, OOM, crash signals
 * ========================================================================== */

class RuntimeMonitor extends Emitter {
  constructor(options = {}) {
    super();
    this.opts = {
      targetFps: 30,
      minFps: null,          // derived from targetFps when null
      sustainMs: 3000,       // how long FPS must stay low before striking
      strikeLimit: 2,        // strikes needed before requesting a downgrade
      cooldownMs: 60000,     // minimum time between downgrades
      memoryPressure: 0.92,  // usedJSHeapSize / jsHeapSizeLimit threshold
      memorySampleMs: 2000,
      ...options,
    };

    this._minFps = this.opts.minFps ?? Math.max(12, this.opts.targetFps * 0.55);

    this._running = false;
    this._rafId = 0;
    this._memTimer = 0;
    this._lastTs = 0;
    this._frames = [];
    this._lowSince = 0;
    this._goodSince = 0;
    this._strikes = 0;
    this._lastDegradeAt = 0;
    this._activeTasks = 0;
    this._taskStack = [];
    this._hidden = false;

    this._boundTick = this._tick.bind(this);
    this._boundVisibility = this._onVisibility.bind(this);
    this._boundError = this._onError.bind(this);
  }

  /* ── lifecycle ─────────────────────────────────────────────────────────── */

  start() {
    if (this._running || typeof window === 'undefined') return this;
    this._running = true;

    this._rafId = requestAnimationFrame(this._boundTick);
    this._memTimer = setInterval(() => this._checkMemory(), this.opts.memorySampleMs);

    document.addEventListener('visibilitychange', this._boundVisibility, { passive: true });
    window.addEventListener('error', this._boundError, true);
    window.addEventListener('unhandledrejection', this._boundError, true);

    return this;
  }

  stop() {
    if (!this._running) return this;
    this._running = false;

    cancelAnimationFrame(this._rafId);
    clearInterval(this._memTimer);

    document.removeEventListener('visibilitychange', this._boundVisibility, true);
    window.removeEventListener('error', this._boundError, true);
    window.removeEventListener('unhandledrejection', this._boundError, true);

    return this;
  }

  setTargetFps(fps) {
    this.opts.targetFps = fps;
    this._minFps = Math.max(12, fps * 0.55);
  }

  /* ── task scoping — FPS is only judged while work is in flight ─────────── */

  beginTask(label = 'task') {
    this._activeTasks++;
    this._taskStack.push({ label, startedAt: performance.now() });
    this._lowSince = 0;
    this._frames.length = 0;
    return () => this.endTask(label);
  }

  endTask(label = 'task') {
    this._activeTasks = Math.max(0, this._activeTasks - 1);
    if (this._activeTasks === 0) {
      this._strikes = 0;
      this._lowSince = 0;
      this._frames.length = 0;
    }
    const idx = this._taskStack.map(t => t.label).lastIndexOf(label);
    if (idx >= 0) this._taskStack.splice(idx, 1);
  }

  reportFailure(reason, detail) {
    this.emit('task-failure', { reason, detail: detail ? String(detail).slice(0, 200) : null });
    if (this._isOom(reason)) this._requestDegrade('oom', reason);
  }

  /* ── internals ─────────────────────────────────────────────────────────── */

  _onVisibility() {
    this._hidden = document.hidden;
    if (this._hidden) {
      this._frames.length = 0;
      this._lowSince = 0;
    }
  }

  _tick(ts) {
    if (!this._running) return;
    this._rafId = requestAnimationFrame(this._boundTick);

    if (this._lastTs) {
      const dt = ts - this._lastTs;
      if (dt > 0 && dt < 1000) {
        this._frames.push(dt);
        if (this._frames.length > 90) this._frames.shift();
      }
    }
    this._lastTs = ts;

    // Only judge frame pacing while a task is active and the tab is visible.
    if (this._activeTasks === 0 || this._hidden || this._frames.length < 20) return;

    const avg = this._frames.reduce((s, v) => s + v, 0) / this._frames.length;
    const fps = 1000 / avg;

    if (fps < this._minFps) {
      this._goodSince = 0;
      if (!this._lowSince) this._lowSince = ts;

      if (ts - this._lowSince > this.opts.sustainMs) {
        this._lowSince = ts;
        this._strikes++;
        this.emit('signal', { type: 'low-fps', fps: Math.round(fps), strikes: this._strikes });

        if (this._strikes >= this.opts.strikeLimit) {
          this._strikes = 0;
          this._requestDegrade('low-fps', `sustained ${Math.round(fps)} fps`);
        }
      }
    } else {
      this._lowSince = 0;
      if (!this._goodSince) this._goodSince = ts;
      if (ts - this._goodSince > 5000) { this._strikes = 0; this._goodSince = ts; }
    }
  }

  _checkMemory() {
    if (!this._running) return;
    try {
      const mem = performance && performance.memory;
      if (!mem || !mem.jsHeapSizeLimit) return;

      const ratio = mem.usedJSHeapSize / mem.jsHeapSizeLimit;
      this.emit('signal', {
        type: 'memory',
        ratio,
        usedMB: Math.round(mem.usedJSHeapSize / 1048576),
        limitMB: Math.round(mem.jsHeapSizeLimit / 1048576),
      });

      if (ratio > this.opts.memoryPressure) {
        this._requestDegrade('memory-pressure', `${(ratio * 100).toFixed(0)}% heap used`);
      }
    } catch { /* noop */ }
  }

  _onError(event) {
    let message = '';
    try {
      message = String(
        (event && (event.message || (event.error && event.error.message) ||
                   (event.reason && event.reason.message) || event.reason)) || ''
      );
    } catch { /* noop */ }

    if (!message) return; // resource load errors carry no message

    if (this._isOom(message)) {
      this.emit('signal', { type: 'oom', message: message.slice(0, 200) });
      this._requestDegrade('oom', message.slice(0, 200));
    }
  }

  _isOom(text) {
    if (!text) return false;
    return OOM_PATTERNS.some(re => re.test(text));
  }

  _requestDegrade(reason, detail) {
    const now = performance.now();
    if (now - this._lastDegradeAt < this.opts.cooldownMs) {
      this.emit('degrade-skipped', { reason, detail, cooldownMs: this.opts.cooldownMs });
      return;
    }
    this._lastDegradeAt = now;
    this.emit('degrade', { reason, detail: detail || null });
  }
}

/* ============================================================================
 * 8. STATE NORMALISATION
 * ========================================================================== */

function defaultState() {
  return {
    version: 1,
    tier: 'balanced',
    source: 'auto',            // 'auto' | 'manual'
    detectedTier: null,
    detectedReasons: [],
    score: null,
    autoUpgrade: true,
    autoDowngrade: true,
    overrides: {},             // partial profile patch applied on top of the tier
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function normalizeState(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;

  const merged = { ...base, ...raw };
  if (!TIERS.includes(merged.tier)) merged.tier = base.tier;
  if (merged.source !== 'manual' && merged.source !== 'auto') merged.source = 'auto';
  if (merged.detectedTier && !TIERS.includes(merged.detectedTier)) merged.detectedTier = null;
  if (!merged.overrides || typeof merged.overrides !== 'object') merged.overrides = {};
  merged.autoUpgrade = merged.autoUpgrade !== false;
  merged.autoDowngrade = merged.autoDowngrade !== false;
  return merged;
}

function hardwareSignature(hw, gpu) {
  return hashString([
    hw.cores ?? '?',
    hw.deviceMemory ?? '?',
    hw.heapLimitMB ?? '?',
    gpu.webgl.renderer || 'no-gl',
    gpu.webgpu.architecture || 'no-wgpu',
    hw.ua.slice(0, 80),
  ].join('|'));
}

/* ============================================================================
 * 9. THE PANEL UI (optional, mountable)
 * ========================================================================== */

const UI_CSS = `
.cfac-root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:rgba(15,23,42,.62);border:1px solid rgba(148,163,184,.22);border-radius:12px;padding:14px;color:#e2e8f0;font-size:13px;line-height:1.5;box-sizing:border-box}
.cfac-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px}
.cfac-title{font-weight:700;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#94a3b8}
.cfac-badge{font-size:11px;font-weight:700;padding:2px 9px;border-radius:999px;background:rgba(56,189,248,.14);color:#38bdf8;border:1px solid rgba(56,189,248,.32);white-space:nowrap}
.cfac-badge[data-source="manual"]{background:rgba(167,139,250,.14);color:#a78bfa;border-color:rgba(167,139,250,.35)}
.cfac-meta{font-size:11px;color:#8fa1b8;margin-bottom:11px;line-height:1.6}
.cfac-chips{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
.cfac-chip{appearance:none;-webkit-appearance:none;border:1px solid rgba(148,163,184,.28);background:rgba(30,41,59,.65);color:#cbd5e1;border-radius:8px;padding:8px 2px;font-size:11px;font-weight:600;cursor:pointer;transition:background .15s,border-color .15s,color .15s,transform .1s;font-family:inherit;text-align:center}
.cfac-chip:hover{border-color:#38bdf8;color:#f1f5f9}
.cfac-chip:active{transform:scale(.96)}
.cfac-chip[data-active="1"]{background:linear-gradient(135deg,#0ea5e9,#0284c7);border-color:#38bdf8;color:#fff;box-shadow:0 4px 14px rgba(14,165,233,.3)}
.cfac-chip[data-active="1"][data-auto="1"]{background:linear-gradient(135deg,#8b5cf6,#6d28d9);border-color:#a78bfa;box-shadow:0 4px 14px rgba(139,92,246,.3)}
.cfac-foot{display:flex;gap:6px;margin-top:10px}
.cfac-btn{flex:1;appearance:none;-webkit-appearance:none;border:1px solid rgba(148,163,184,.28);background:transparent;color:#94a3b8;border-radius:8px;padding:7px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;transition:color .15s,border-color .15s}
.cfac-btn:hover{color:#e2e8f0;border-color:#38bdf8}
.cfac-btn[disabled]{opacity:.45;cursor:progress}
.cfac-note{margin-top:9px;font-size:10.5px;color:#fbbf24;display:none}
.cfac-note[data-show="1"]{display:block}
`;

function injectUIStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('cfac-styles')) return;
  const style = document.createElement('style');
  style.id = 'cfac-styles';
  style.textContent = UI_CSS;
  document.head.appendChild(style);
}

/* ============================================================================
 * 10. MAIN ORCHESTRATOR
 * ========================================================================== */

class AutoConfig extends Emitter {
  constructor() {
    super();
    this.state = defaultState();
    this.hardware = null;
    this.gpu = null;
    this.bench = null;
    this.monitor = null;
    this.opts = {};

    this._initPromise = null;
    this._uiRoot = null;
    this._uiRefs = null;
    this._unsubs = [];
  }

  /* ── public: init ──────────────────────────────────────────────────────── */

  /**
   * @param {object} [options]
   * @param {'quick'|'full'} [options.benchMode='quick']
   * @param {boolean} [options.forceBenchmark=false]
   * @param {number}  [options.cacheMaxAgeMs=604800000] 7 days
   * @param {boolean} [options.monitor=true]
   * @param {number}  [options.targetFps=30]
   * @param {(msg:string)=>void} [options.onProgress]
   */
  async init(options = {}) {
    if (this._initPromise) return this._initPromise;

    this._initPromise = this._doInit(options).catch((err) => {
      this._initPromise = null;
      console.error('[AutoConfig] init failed:', err);
      throw err;
    });

    return this._initPromise;
  }

  async _doInit(options) {
    this.opts = {
      benchMode: 'quick',
      forceBenchmark: false,
      cacheMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
      monitor: true,
      targetFps: 30,
      ...options,
    };

    // ── 1. Hardware + GPU capability probing ─────────────────────────────
    this.hardware = probeHardware();
    this.gpu = await probeGPU();

    // ── 2. Restore persisted state ───────────────────────────────────────
    this.state = normalizeState(storage.get(STORAGE_KEYS.state, null));

    // ── 3. Crash bookkeeping from the previous session ───────────────────
    const cleanShutdown = this._consumeShutdownMarker();
    this._recordCrashHistory(cleanShutdown);
    const recentCrashes = this._countRecentCrashes();

    // ── 4. Determine the detected tier (skippable when a manual preset is set)
    const manualActive = this.state.source === 'manual' && !this.opts.forceBenchmark;

    if (manualActive) {
      this.bench = storage.get(STORAGE_KEYS.bench, null);
      this.state.detectedTier = this.state.detectedTier || this.state.tier;
      this._log('Manual preset active — skipping benchmark (' + this.state.tier + ')');
    } else {
      await this._resolveDetectedTier(recentCrashes);
      this.state.tier = this.state.detectedTier;
      this.state.source = 'auto';
    }

    this.state.updatedAt = Date.now();
    this._persist();

    // ── 5. Install shutdown marker for next boot ─────────────────────────
    this._installShutdownMarker();

    // ── 6. Runtime watchdog ──────────────────────────────────────────────
    if (this.opts.monitor !== false) this._startMonitor();

    // ── 7. Broadcast ─────────────────────────────────────────────────────
    const snapshot = this.getSnapshot();
    this._log('Ready →', snapshot.tier, '(' + snapshot.score + '/100)');
    this.emit('ready', snapshot);
    if (this._uiRoot) this._syncUI();

    return snapshot;
  }

  async _resolveDetectedTier(recentCrashes) {
    const signature = hardwareSignature(this.hardware, this.gpu);
    let bench = storage.get(STORAGE_KEYS.bench, null);

    const cacheValid =
      bench &&
      bench.signature === signature &&
      (Date.now() - (bench.ts || 0)) < this.opts.cacheMaxAgeMs &&
      Number.isFinite(bench.score);

    if (!cacheValid || this.opts.forceBenchmark) {
      this._log('Running ' + this.opts.benchMode + ' benchmark…');
      bench = await this.runBenchmark(this.opts.benchMode, this.opts.onProgress);
      bench.signature = signature;
      bench.ts = Date.now();
      storage.set(STORAGE_KEYS.bench, bench);
    } else {
      this._log('Using cached benchmark (' + Math.round((Date.now() - bench.ts) / 3600000) + 'h old)');
    }

    this.bench = bench;

    const decision = decideTier(bench.score, this.hardware, this.gpu, recentCrashes);
    this.state.detectedTier = decision.tier;
    this.state.detectedReasons = decision.reasons;
    this.state.score = bench.score;

    this.emit('detected', {
      tier: decision.tier,
      score: bench.score,
      reasons: decision.reasons,
      breakdown: bench.breakdown,
    });
  }

  /* ── public: benchmarking ──────────────────────────────────────────────── */

  /**
   * Run the full or quick benchmark suite and return a scored result object.
   * @param {'quick'|'full'} mode
   * @param {(msg:string)=>void} [onProgress]
   */
  async runBenchmark(mode = 'quick', onProgress = null) {
    const quick = mode !== 'full';
    const t0 = performance.now();
    const report = (msg) => { try { onProgress && onProgress(msg); } catch { /* noop */ } };

    // CPU — warm-up pass first so the JIT has settled before we time it.
    report('Warming up…');
    benchMatrix(quick ? 20 : 28);
    await nextFrame();

    report('Measuring CPU…');
    const cpuMs = benchMatrix(quick ? 48 : 64).ms;
    await nextFrame();

    report('Measuring canvas…');
    const canvasMs = benchCanvas(quick ? 24 : 48, quick ? 96 : 128);
    await nextFrame();

    report('Measuring JSON…');
    const jsonMs = benchJSON(quick ? 3 : 6);
    await nextFrame();

    report('Measuring frame pacing…');
    const frameMs = await benchFrames(quick ? 10 : 20);

    // GPU — reuse the fill-rate timing captured during probe when available.
    let gpuMs = this.gpu && this.gpu.webgl ? this.gpu.webgl.failMs : -1;
    if (gpuMs <= 0 && this.gpu && this.gpu.webgl && this.gpu.webgl.ok) {
      report('Measuring GPU…');
      const ctx = createWebGLContext();
      if (ctx) {
        try {
          ctx.canvas.width = 512;
          ctx.canvas.height = 512;
          gpuMs = benchGPUFill(ctx.gl, 512, quick ? 120 : 260);
        } finally {
          try {
            const lose = ctx.gl.getExtension('WEBGL_lose_context');
            if (lose) lose.loseContext();
          } catch { /* noop */ }
          ctx.canvas.width = ctx.canvas.height = 0;
        }
      }
    }

    report('Scoring…');

    const breakdown = {
      cpu: Math.round(scoreLowerBetter(cpuMs, quick ? 6 : 12, quick ? 110 : 200)),
      canvas: Math.round(scoreLowerBetter(canvasMs, 10, 220)),
      json: Math.round(scoreLowerBetter(jsonMs, 6, 140)),
      frame: Math.round(scoreLowerBetter(frameMs, 17, 45)),
      gpu: Math.round(scoreGPU(this.gpu)),
      memory: Math.round(scoreMemory(this.hardware)),
    };

    // Fallback: if a metric failed outright, redistribute its weight to CPU+GPU.
    const failed = [];
    if (cpuMs < 0) failed.push('cpu');
    if (canvasMs < 0) failed.push('canvas');
    if (jsonMs < 0) failed.push('json');
    if (frameMs >= 999) failed.push('frame');

    const WEIGHTS = { cpu: 0.28, canvas: 0.12, json: 0.08, frame: 0.12, gpu: 0.28, memory: 0.12 };

    let score = 0;
    let totalWeight = 0;
    for (const key of Object.keys(WEIGHTS)) {
      if (failed.includes(key)) continue;
      score += breakdown[key] * WEIGHTS[key];
      totalWeight += WEIGHTS[key];
    }
    score = totalWeight > 0 ? score / totalWeight : 20;

    // Small WebGPU bonus — a device with a real compute adapter is future-proof.
    if (this.gpu && this.gpu.webgpu.adapterAvailable && !this.gpu.webgpu.isFallbackAdapter) {
      score = Math.min(100, score + 4);
    }

    score = Math.round(clamp(score, 0, 100));

    return {
      mode,
      score,
      breakdown,
      metrics: {
        cpuMs: Math.round(cpuMs),
        canvasMs: Math.round(canvasMs),
        jsonMs: Number(jsonMs.toFixed(2)),
        frameMs: Number(frameMs.toFixed(2)),
        gpuMs: Math.round(gpuMs),
      },
      failedMetrics: failed,
      durationMs: Math.round(performance.now() - t0),
      ts: Date.now(),
    };
  }

  /* ── public: tier control ──────────────────────────────────────────────── */

  /** Current profile object (tier defaults merged with user overrides). */
  getProfile() {
    const base = PROFILES[this.state.tier] || PROFILES.balanced;
    return this.state.overrides && Object.keys(this.state.overrides).length
      ? deepMerge(base, this.state.overrides)
      : deepClone(base);
  }

  getTier() { return this.state.tier; }

  isManual() { return this.state.source === 'manual'; }

  getSnapshot() {
    return {
      tier: this.state.tier,
      source: this.state.source,
      detectedTier: this.state.detectedTier,
      detectedReasons: this.state.detectedReasons,
      score: this.state.score,
      profile: this.getProfile(),
      hardware: this.hardware,
      gpu: this.gpu,
      bench: this.bench,
      autoUpgrade: this.state.autoUpgrade,
      autoDowngrade: this.state.autoDowngrade,
      recentCrashes: this._countRecentCrashes(),
    };
  }

  /**
   * Switch tier. Manual calls mark the state as user-overridden and persist.
   * @param {'low'|'balanced'|'high'|'ultra'} tier
   * @param {{manual?:boolean, silent?:boolean}} [opts]
   */
  setTier(tier, opts = {}) {
    if (!TIERS.includes(tier)) {
      throw new RangeError(`[AutoConfig] Unknown tier "${tier}". Expected one of: ${TIERS.join(', ')}`);
    }
    const { manual = true, silent = false } = opts;
    const previous = this.state.tier;
    if (previous === tier && this.state.source === (manual ? 'manual' : 'auto')) {
      return this.getProfile();
    }

    this.state.tier = tier;
    this.state.source = manual ? 'manual' : 'auto';
    this.state.updatedAt = Date.now();
    this._persist();

    const profile = this.getProfile();
    if (this.monitor) this.monitor.setTargetFps(profile.render.targetFps);

    if (!silent) {
      this._log(manual ? 'Manual override →' : 'Auto tier →', tier);
      this.emit('tierchange', {
        tier,
        previous,
        source: this.state.source,
        profile,
        snapshot: this.getSnapshot(),
      });
    }

    this._syncUI();
    return profile;
  }

  /** Drop the manual override and return to the auto-detected tier. */
  clearOverride() {
    const target = this.state.detectedTier || this._recomputeDetected();
    return this.setTier(target, { manual: false });
  }

  /** Re-run detection from the cached benchmark without re-benchmarking. */
  _recomputeDetected() {
    if (!this.bench || !Number.isFinite(this.bench.score)) return 'balanced';
    const decision = decideTier(
      this.bench.score, this.hardware, this.gpu, this._countRecentCrashes()
    );
    this.state.detectedTier = decision.tier;
    this.state.detectedReasons = decision.reasons;
    return decision.tier;
  }

  /** Force a fresh benchmark and re-apply auto detection. */
  async recalibrate(mode) {
    this.opts.forceBenchmark = true;
    if (mode) this.opts.benchMode = mode;

    this.state.source = 'auto';
    await this._resolveDetectedTier(this._countRecentCrashes());
    this.setTier(this.state.detectedTier, { manual: false });
    this.opts.forceBenchmark = false;

    this.emit('recalibrated', this.getSnapshot());
    return this.getSnapshot();
  }

  /** Deep-patch the active profile (persisted as `overrides`). */
  applyOverrides(patch) {
    this.state.overrides = deepMerge(this.state.overrides, patch || {});
    this.state.updatedAt = Date.now();
    this._persist();

    const profile = this.getProfile();
    this.emit('profilechange', { tier: this.state.tier, profile });
    return profile;
  }

  clearOverrides() {
    this.state.overrides = {};
    this.state.updatedAt = Date.now();
    this._persist();
    const profile = this.getProfile();
    this.emit('profilechange', { tier: this.state.tier, profile });
    return profile;
  }

  setAutoUpgrade(on) {
    this.state.autoUpgrade = !!on;
    this._persist();
    this.emit('settingschange', { autoUpgrade: this.state.autoUpgrade });
  }

  setAutoDowngrade(on) {
    this.state.autoDowngrade = !!on;
    this._persist();
    this.emit('settingschange', { autoDowngrade: this.state.autoDowngrade });
  }

  /** Wipe all persisted AutoConfig data. */
  reset() {
    Object.values(STORAGE_KEYS).forEach((k) => storage.remove(k));
    storage._mem.clear();
    this.state = defaultState();
    this.bench = null;
    this._log('Reset — all persisted data cleared');
    this.emit('reset', null);
  }

  /* ── public: task hooks (call these around heavy work) ─────────────────── */

  /**
   * Wrap a heavy operation so the watchdog only judges frame pacing while it
   * is actually running.
   *
   * @example
   *   const done = AutoConfig.beginTask('ai-detect');
   *   try { ... } finally { done(); }
   */
  beginTask(label) {
    if (!this.monitor) return () => {};
    return this.monitor.beginTask(label);
  }

  reportFailure(reason, detail) {
    if (this.monitor) this.monitor.reportFailure(reason, detail);
  }

  /* ── internal: monitor wiring ──────────────────────────────────────────── */

  _startMonitor() {
    if (this.monitor) return;

    const profile = this.getProfile();
    this.monitor = new RuntimeMonitor({
      targetFps: profile.render.targetFps || this.opts.targetFps || 30,
    });

    this.monitor.on('degrade', ({ reason, detail }) => {
      if (!this.state.autoDowngrade) {
        this.emit('warning', { type: 'degrade-suppressed', reason, detail });
        return;
      }
      const current = this.state.tier;
      if (TIER_RANK[current] === 0) {
        this.emit('warning', {
          type: 'floor-reached',
          reason,
          detail,
          message: 'Already at the lowest tier — consider disabling heavy features.',
        });
        return;
      }

      const next = stepDown(current, 1);
      this._log(`⚠️ Auto-downgrade (${reason}): ${current} → ${next}`, detail || '');
      this.emit('autodowngrade', { from: current, to: next, reason, detail });

      // A downgrade triggered by a hard failure is not a user preference —
      // it flips the state back to 'auto' so the decision is recorded honestly.
      this.setTier(next, { manual: this.state.source === 'manual' ? false : false });
    });

    this.monitor.on('task-failure', (payload) => this.emit('taskfailure', payload));
    this.monitor.on('signal', (payload) => this.emit('signal', payload));
    this.monitor.on('degrade-skipped', (payload) => this.emit('degradeskipped', payload));

    this.monitor.start();
    this._unsubs.push(() => this.monitor && this.monitor.stop());
  }

  /* ── internal: crash bookkeeping ───────────────────────────────────────── */

  _installShutdownMarker() {
    if (typeof window === 'undefined') return;
    storage.set(STORAGE_KEYS.session, { ts: Date.now(), tier: this.state.tier });

    const clear = () => storage.remove(STORAGE_KEYS.session);
    window.addEventListener('pagehide', clear, { once: true });
    window.addEventListener('beforeunload', clear, { once: true });
  }

  /** @returns {boolean} true when the previous session ended cleanly. */
  _consumeShutdownMarker() {
    const marker = storage.get(STORAGE_KEYS.session, null);
    if (!marker) return true;
    storage.remove(STORAGE_KEYS.session);
    return false;
  }

  _recordCrashHistory(cleanShutdown) {
    const list = storage.get(STORAGE_KEYS.crashes, []) || [];
    const cutoff = Date.now() - CRASH_WINDOW_MS;
    let pruned = list.filter((ts) => typeof ts === 'number' && ts > cutoff);

    if (!cleanShutdown) {
      pruned.push(Date.now());
      this._log('💥 Unclean shutdown detected — crash recorded');
    }

    pruned = pruned.slice(-MAX_CRASH_RECORDS);
    storage.set(STORAGE_KEYS.crashes, pruned);
    this._crashList = pruned;
  }

  _countRecentCrashes() {
    if (this._crashList) return this._crashList.length;
    const list = storage.get(STORAGE_KEYS.crashes, []) || [];
    const cutoff = Date.now() - CRASH_WINDOW_MS;
    return list.filter((ts) => ts > cutoff).length;
  }

  /* ── internal: persistence ─────────────────────────────────────────────── */

  _persist() {
    storage.set(STORAGE_KEYS.state, this.state);
  }

  /* ── public: UI panel ──────────────────────────────────────────────────── */

  /**
   * Render the preset panel into `container`.
   * @param {HTMLElement|string} container
   */
  mountUI(container) {
    if (typeof document === 'undefined') return null;

    const root = typeof container === 'string' ? document.querySelector(container) : container;
    if (!root) { console.warn('[AutoConfig] mountUI: container not found'); return null; }
    if (this._uiRoot) this.unmountUI();

    injectUIStyles();

    const el = document.createElement('div');
    el.className = 'cfac-root';

    const chips = ['Auto', ...TIERS.map((t) => PROFILES[t].label)]
      .map((label, i) => {
        const tier = i === 0 ? 'auto' : TIERS[i - 1];
        return `<button class="cfac-chip" type="button" data-tier="${tier}"${i === 0 ? ' data-auto="1"' : ''}>${label}</button>`;
      })
      .join('');

    el.innerHTML = `
      <div class="cfac-head">
        <span class="cfac-title">Performance</span>
        <span class="cfac-badge" data-role="badge">—</span>
      </div>
      <div class="cfac-meta" data-role="meta">Profiling device…</div>
      <div class="cfac-chips">${chips}</div>
      <div class="cfac-note" data-role="note"></div>
      <div class="cfac-foot">
        <button class="cfac-btn" type="button" data-role="recal">Re-benchmark</button>
        <button class="cfac-btn" type="button" data-role="info">Device info</button>
      </div>
    `;

    root.appendChild(el);
    this._uiRoot = el;
    this._uiRefs = {
      badge: el.querySelector('[data-role="badge"]'),
      meta: el.querySelector('[data-role="meta"]'),
      note: el.querySelector('[data-role="note"]'),
      recal: el.querySelector('[data-role="recal"]'),
      info: el.querySelector('[data-role="info"]'),
      chips: Array.from(el.querySelectorAll('.cfac-chip')),
    };

    // Chip clicks
    this._uiRefs.chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const tier = chip.dataset.tier;
        if (tier === 'auto') this.clearOverride();
        else this.setTier(tier, { manual: true });
      });
    });

    // Re-benchmark
    this._uiRefs.recal.addEventListener('click', async () => {
      const btn = this._uiRefs.recal;
      btn.disabled = true;
      const original = btn.textContent;
      btn.textContent = 'Benchmarking…';
      try {
        await this.recalibrate('quick');
      } catch (err) {
        console.warn('[AutoConfig] recalibrate failed:', err);
      } finally {
        btn.disabled = false;
        btn.textContent = original;
      }
    });

    // Device info
    this._uiRefs.info.addEventListener('click', () => {
      const hw = this.hardware || {};
      const gpu = this.gpu || { webgl: {}, webgpu: {} };
      const lines = [
        `Tier: ${this.state.tier} (${this.state.source})`,
        `Detected: ${this.state.detectedTier || '—'} · score ${this.state.score ?? '—'}/100`,
        `CPU cores: ${hw.cores ?? '?'} · RAM: ${hw.deviceMemory ?? '?'} GB · heap: ${hw.heapLimitMB ?? '?'} MB`,
        `WebGL: ${gpu.webgl.ok ? (gpu.webgl.isWebGL2 ? 'WebGL2' : 'WebGL1') : 'unavailable'} · maxTex ${gpu.webgl.maxTextureSize || 0}`,
        `GPU: ${gpu.webgl.renderer || '—'}`,
        `WebGPU: ${gpu.webgpu.adapterAvailable ? 'available' : (gpu.webgpu.supported ? 'supported (no adapter)' : 'no')}`,
        `Crashes (7d): ${this._countRecentCrashes()}`,
      ];
      window.alert(lines.join('\n'));
    });

    // Live sync
    this._unsubs.push(this.on('tierchange', () => this._syncUI()));
    this._unsubs.push(this.on('detected', () => this._syncUI()));
    this._unsubs.push(this.on('autodowngrade', ({ reason }) => this._flashNote(`Auto-downgraded: ${reason}`)));
    this._unsubs.push(this.on('warning', (w) => this._flashNote(w.message || w.type)));

    this._syncUI();
    return el;
  }

  unmountUI() {
    if (this._uiRoot && this._uiRoot.parentNode) this._uiRoot.parentNode.removeChild(this._uiRoot);
    this._uiRoot = null;
    this._uiRefs = null;
  }

  _syncUI() {
    if (!this._uiRefs) return;
    const { badge, meta, chips } = this._uiRefs;

    const tierLabel = (PROFILES[this.state.tier] || PROFILES.balanced).label;
    badge.textContent = `${tierLabel}${this.state.source === 'manual' ? ' · manual' : ''}`;
    badge.dataset.source = this.state.source;

    const hw = this.hardware || {};
    const parts = [];
    if (this.state.score != null) parts.push(`Score ${this.state.score}/100`);
    if (hw.cores) parts.push(`${hw.cores} cores`);
    if (hw.deviceMemory) parts.push(`${hw.deviceMemory} GB RAM`);
    if (this.gpu && this.gpu.webgpu.adapterAvailable) parts.push('WebGPU');
    meta.textContent = parts.join(' · ') || 'Profiling device…';

    chips.forEach((chip) => {
      const isAuto = chip.dataset.tier === 'auto';
      const active = isAuto
        ? this.state.source === 'auto'
        : this.state.tier === chip.dataset.tier && this.state.source === 'manual';
      chip.dataset.active = active ? '1' : '0';
    });
  }

  _flashNote(text) {
    if (!this._uiRefs || !this._uiRefs.note) return;
    const note = this._uiRefs.note;
    note.textContent = text;
    note.dataset.show = '1';
    clearTimeout(this._noteTimer);
    this._noteTimer = setTimeout(() => { note.dataset.show = '0'; }, 6000);
  }

  /* ── public: teardown ──────────────────────────────────────────────────── */

  destroy() {
    if (this.monitor) { this.monitor.stop(); this.monitor = null; }
    this._unsubs.forEach((fn) => { try { fn(); } catch { /* noop */ } });
    this._unsubs = [];
    this.unmountUI();
    this.removeAllListeners();
    this._initPromise = null;
  }

  /* ── internal: logging ─────────────────────────────────────────────────── */

  _log(...args) {
    if (this.opts && this.opts.quiet) return;
    console.log('%c[AutoConfig]', 'color:#0ea5e9;font-weight:bold', ...args);
  }
}

/* ============================================================================
 * 11. SINGLETON EXPORT
 * ========================================================================== */

export const autoConfig = new AutoConfig();
export { AutoConfig, RuntimeMonitor };

export default autoConfig;

// Convenience global for debugging / non-module consumers.
if (typeof window !== 'undefined') {
  window.AutoConfig = window.AutoConfig || autoConfig;
}