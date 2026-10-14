// ai-bridge.js — Main thread, jembatan ke ai-worker.js
// ═══════════════════════════════════════════════════════════════════════════
// v2.7.3 FIX:
//  ✅ Timeout init 25s (dari 10s — CDN bisa lambat)
//  ✅ Handle 'WORKER_ERROR' + 'error' dari worker lama
//  ✅ Verbose log untuk debug
//  ✅ detect() tidak reject — selalu resolve (anti-crash AI.js)
// ═══════════════════════════════════════════════════════════════════════════

const AIWorkerBridge = {
  worker: null,
  ready: false,
  tier: 'full',
  pending: new Map(),
  seq: 0,
  _canvas: null,
  _ctx: null,
  _initPromise: null,
  _disposed: false,
  _lastInitError: null,

  async init(tier) {
    if (this._disposed) {
      console.warn('[Bridge] ⚠️ Instance sudah disposed');
      return false;
    }
    if (this.worker && this.ready) return true;
    if (this._initPromise) return this._initPromise;

    const requestedTier = tier || this.tier || 'full';
    this._lastInitError = null;

    this._initPromise = (async () => {
      try {
        console.log('[Bridge] 🚀 Spawn ai-worker.js (tier=' + requestedTier + ')');

        this.worker = new Worker(
          new URL('./ai-worker.js', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = (e) => this._onMessage(e);
        this.worker.onerror = (e) => {
          console.error('[Bridge] ❌ Worker error:', e.message || e);
          this._lastInitError = 'Worker error: ' + (e.message || 'unknown');
          this._rejectAllPending(new Error(this._lastInitError));
          this.ready = false;
        };

        return new Promise((resolve) => {
          let settled = false;
          const settle = (val) => {
            if (settled) return;
            settled = true;
            resolve(val);
          };

          const handler = (e) => {
            const msg = e.data || {};
            const type = msg.type;
            const readyTier = msg.tier;
            const loaded = msg.loaded;
            const message = msg.message;

            if (type === 'ready') {
              this.worker.removeEventListener('message', handler);
              this.ready = true;
              this.tier = readyTier || requestedTier;
              console.log('[Bridge] ✅ Ready — tier="' + this.tier + '" models=' + (loaded || []).length + ' [' + (loaded || []).join(', ') + ']');
              settle(true);
              return;
            }

            if (type === 'error' || type === 'WORKER_ERROR') {
              this.worker.removeEventListener('message', handler);
              const errMsg = message || (msg.payload && msg.payload.message) || 'unknown';
              console.error('[Bridge] ❌ Init error:', errMsg);
              this._lastInitError = errMsg;
              settle(false);
              return;
            }

            if (type === 'memory-pressure') {
              console.warn('[Bridge] ⬇️ Memory pressure:', msg.reason);
              if (this.tier !== 'lite') {
                this.tier = 'lite';
                try {
                  this.worker.postMessage({ action: 'downgrade', tier: 'lite' });
                } catch (err) { /* noop */ }
              }
              return;
            }

            console.log('[Bridge] ℹ️ Init-phase message:', type);
          };

          this.worker.addEventListener('message', handler);

          setTimeout(() => {
            if (!this.ready) {
              console.warn('[Bridge] ⏱️ Init timeout (25s) — fallback ke main thread');
              this._lastInitError = 'Init timeout';
              settle(false);
            }
          }, 25000);

          try {
            this.worker.postMessage({ action: 'init', tier: requestedTier });
          } catch (err) {
            console.error('[Bridge] postMessage init gagal:', err);
            this._lastInitError = err.message;
            settle(false);
          }
        });
      } catch (err) {
        console.error('[Bridge] Spawn worker gagal:', err);
        this._lastInitError = err.message;
        return false;
      } finally {
        this._initPromise = null;
      }
    })();

    return this._initPromise;
  },

  _onMessage(e) {
    const msg = e.data || {};
    const type = msg.type;
    const id = msg.id;
    const result = msg.result;

    if (type === 'result') {
      const pending = this.pending.get(id);
      if (pending) {
        this.pending.delete(id);
        pending.resolve(result || {
          faceCount: 0,
          faceConfidence: 0,
          poseCount: 0,
          gestures: [],
          objects: []
        });
      } else {
        console.warn('[Bridge] Orphan response id=', id);
      }
      return;
    }

    if (type === 'error' || type === 'WORKER_ERROR') {
      const errMsg = msg.message || (msg.payload && msg.payload.message) || 'unknown';
      console.warn('[Bridge] ⚠️ Worker message:', errMsg);
      return;
    }
  },

  _rejectAllPending(err) {
    for (const entry of this.pending.values()) {
      try {
        if (entry.timeoutId) clearTimeout(entry.timeoutId);
        if (entry.reject) entry.reject(err);
      } catch (e) { /* noop */ }
    }
    this.pending.clear();
  },

  detect(videoEl) {
    if (!this.worker || !this.ready) {
      return Promise.resolve({
        faceCount: 0,
        faceConfidence: 0,
        poseCount: 0,
        gestures: [],
        objects: []
      });
    }

    const w = videoEl.videoWidth || 640;
    const h = videoEl.videoHeight || 480;

    if (!this._canvas || this._canvas.width !== w || this._canvas.height !== h) {
      this._canvas = new OffscreenCanvas(w, h);
      this._ctx = this._canvas.getContext('2d', { willReadFrequently: true });
    }

    let bitmap;
    try {
      this._ctx.drawImage(videoEl, 0, 0, w, h);
      bitmap = this._canvas.transferToImageBitmap();
    } catch (err) {
      console.warn('[Bridge] drawImage/transfer gagal:', err.message);
      return Promise.resolve({
        faceCount: 0,
        faceConfidence: 0,
        poseCount: 0,
        gestures: [],
        objects: []
      });
    }

    const id = ++this.seq;
    const timestamp = performance.now();

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          try { bitmap.close(); } catch (e) { /* noop */ }
          resolve({
            faceCount: 0,
            faceConfidence: 0,
            poseCount: 0,
            gestures: [],
            objects: []
          });
        }
      }, 8000);

      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(timeoutId);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timeoutId);
          resolve({
            faceCount: 0,
            faceConfidence: 0,
            poseCount: 0,
            gestures: [],
            objects: []
          });
        },
        timeoutId: timeoutId
      });

      try {
        this.worker.postMessage(
          { action: 'detect', id: id, frame: bitmap, timestamp: timestamp },
          [bitmap]
        );
      } catch (err) {
        clearTimeout(timeoutId);
        this.pending.delete(id);
        try { bitmap.close(); } catch (e) { /* noop */ }
        resolve({
          faceCount: 0,
          faceConfidence: 0,
          poseCount: 0,
          gestures: [],
          objects: []
        });
      }
    });
  },

  dispose() {
    if (this._disposed) return;
    this._disposed = true;

    if (this.worker) {
      this._rejectAllPending(new Error('Worker terminated'));
      try { this.worker.terminate(); } catch (e) { /* noop */ }
      this.worker = null;
    }
    this.ready = false;
    this._initPromise = null;
    this._canvas = null;
    this._ctx = null;
    console.log('[Bridge] 🗑️ Worker dimatikan');
  },

  reset() {
    this._disposed = false;
    console.log('[Bridge] ♻️ Reset');
  },

  getStatus() {
    return {
      spawned: !!this.worker,
      ready: this.ready,
      tier: this.tier,
      pending: this.pending.size,
      lastInitError: this._lastInitError
    };
  }
};

window.AIWorkerBridge = AIWorkerBridge;