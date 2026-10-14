/* ═══════════════════════════════════════════════════════════════════════════
 * AI WORKER v3.0 — MediaPipe Detection Worker
 * ───────────────────────────────────────────────────────────────────────────
 * Protocol dengan ai-bridge.js:
 *   IN:  { action: 'init', tier: 'lite'|'full' }
 *   OUT: { type: 'ready', tier, loaded: [...] }
 *   IN:  { action: 'detect', id, frame: ImageBitmap, timestamp }
 *   OUT: { type: 'result', id, result: {...} }
 *   IN:  { action: 'downgrade', tier }
 *   OUT: { type: 'error', message }
 *   OUT: { type: 'memory-pressure', reason }
 * ═══════════════════════════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════════════════════════════════
// SHIM: window / document / navigator (untuk MediaPipe compatibility)
// ═══════════════════════════════════════════════════════════════════════════
if (typeof self.window === 'undefined') self.window = self;

if (typeof self.document === 'undefined') {
  self.document = {
    readyState: 'complete',
    addEventListener: function () {},
    removeEventListener: function () {},
    createElement: function () {
      return {
        style: {},
        appendChild: function () {},
        remove: function () {},
        setAttribute: function () {}
      };
    },
    getElementById: function () { return null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    head: { appendChild: function () {} },
    body: {
      appendChild: function () {},
      removeChild: function () {},
      contains: function () { return false; }
    }
  };
}

if (typeof self.navigator === 'undefined') {
  self.navigator = {
    userAgent: 'worker',
    hardwareConcurrency: 2,
    deviceMemory: 4
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════
const _state = {
  ready: false,
  tier: 'lite',
  initPromise: null,
  models: {
    face: null,
    pose: null,
    gesture: null,
    object: null,
    classifier: null
  },
  canvas: null,
  ctx: null,
  detectCount: 0,
  errorCount: 0
};

const CDN = {
  modules: [
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14',
    'https://unpkg.com/@mediapipe/tasks-vision@0.10.14'
  ],
  wasm: [
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
    'https://unpkg.com/@mediapipe/tasks-vision@0.10.14/wasm'
  ],
  models: {
    face: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
    pose: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
    gesture: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
    object: 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite',
    classifier: 'https://storage.googleapis.com/mediapipe-models/image_classifier/efficientnet_lite0/float32/1/efficientnet_lite0.tflite'
  }
};

const EMPTY_RESULT = Object.freeze({
  faceCount: 0,
  faceConfidence: 0,
  poseCount: 0,
  gestures: [],
  objects: [],
  scene: null
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function postReady() {
  const loaded = Object.keys(_state.models).filter(function (k) { return !!_state.models[k]; });
  self.postMessage({
    type: 'ready',
    tier: _state.tier,
    loaded: loaded
  });
  console.log('[AI Worker] 📤 ready — tier:', _state.tier, '| loaded:', loaded.join(', ') || 'NONE');
}

function postError(message) {
  self.postMessage({ type: 'error', message: String(message || 'unknown') });
  console.error('[AI Worker] ❌', message);
}

function postMemoryPressure(reason) {
  self.postMessage({ type: 'memory-pressure', reason: String(reason || 'unknown') });
  console.warn('[AI Worker] ⚠️ Memory pressure:', reason);
}

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGE ROUTER
// ═══════════════════════════════════════════════════════════════════════════
self.onmessage = async function (e) {
  if (!e || !e.data) return;
  const data = e.data;

  try {
    switch (data.action) {
      case 'init':
        await handleInit(data.tier);
        break;

      case 'detect':
        await handleDetect(data.id, data.frame, data.timestamp);
        break;

      case 'downgrade':
        handleDowngrade(data.tier);
        break;

      case 'ping':
        self.postMessage({
          type: 'pong',
          ready: _state.ready,
          tier: _state.tier,
          detectCount: _state.detectCount,
          errorCount: _state.errorCount
        });
        break;

      default:
        console.warn('[AI Worker] ⚠️ Unknown action:', data.action);
        if (data.id != null) {
          self.postMessage({
            type: 'result',
            id: data.id,
            result: Object.assign({}, EMPTY_RESULT)
          });
        }
    }
  } catch (err) {
    console.error('[AI Worker] onmessage error:', err);
    if (data.id != null) {
      self.postMessage({
        type: 'result',
        id: data.id,
        result: Object.assign({}, EMPTY_RESULT)
      });
    } else {
      postError((err && err.message) || String(err));
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// INIT — Load MediaPipe models
// ═══════════════════════════════════════════════════════════════════════════
async function handleInit(requestedTier) {
  if (_state.ready) {
    console.log('[AI Worker] Already ready — re-sending ready');
    postReady();
    return;
  }
  if (_state.initPromise) {
    console.log('[AI Worker] Init in progress — waiting');
    await _state.initPromise;
    return;
  }

  _state.initPromise = (async function () {
    try {
      const tier = (requestedTier === 'full') ? 'full' : 'lite';
      _state.tier = tier;
      console.log('[AI Worker] 🚀 Init — tier:', tier);

      // ─── 1. Load MediaPipe module ──────────────────────────────────
      let mp = null;
      let lastErr = null;
      for (let i = 0; i < CDN.modules.length; i++) {
        const url = CDN.modules[i];
        try {
          console.log('[AI Worker] 📥 Import module:', url);
          mp = await import(url);
          if (mp && mp.FilesetResolver) {
            console.log('[AI Worker] ✅ Module loaded from:', url);
            break;
          }
        } catch (err) {
          lastErr = err;
          console.warn('[AI Worker] ⚠️ Module load failed:', url, '—', err.message);
        }
      }
      if (!mp || !mp.FilesetResolver) {
        throw new Error('MediaPipe module load failed: ' + ((lastErr && lastErr.message) || 'no CDN reachable'));
      }

      const FilesetResolver = mp.FilesetResolver;
      const FaceDetector = mp.FaceDetector;
      const PoseLandmarker = mp.PoseLandmarker;
      const GestureRecognizer = mp.GestureRecognizer;
      const ObjectDetector = mp.ObjectDetector;
      const ImageClassifier = mp.ImageClassifier;

      // ─── 2. Resolve WASM fileset ────────────────────────────────────
      let vision = null;
      let wasmErr = null;
      for (let i = 0; i < CDN.wasm.length; i++) {
        const url = CDN.wasm[i];
        try {
          console.log('[AI Worker] 📥 Resolve WASM:', url);
          vision = await FilesetResolver.forVisionTasks(url);
          if (vision) {
            console.log('[AI Worker] ✅ WASM resolved');
            break;
          }
        } catch (err) {
          wasmErr = err;
          console.warn('[AI Worker] ⚠️ WASM resolve failed:', err.message);
        }
      }
      if (!vision) {
        throw new Error('WASM resolver failed: ' + ((wasmErr && wasmErr.message) || 'all URLs failed'));
      }

      // ─── 3. Decide which models to load ─────────────────────────────
      const want = {
        face: true,
        pose: tier === 'full',
        gesture: tier === 'full',
        object: true,
        classifier: tier === 'full'
      };

      const primaryDelegate = tier === 'full' ? 'GPU' : 'CPU';
      const fallbackDelegate = 'CPU';

      const jobs = [];

      const tryLoad = function (name, ModelCls, optionsFn) {
        if (!want[name] || !ModelCls) {
          console.log('[AI Worker] ⊘ Skip model:', name);
          return;
        }

        const attempt = function (delegate) {
          const opts = optionsFn(delegate);
          return ModelCls.createFromOptions(vision, opts);
        };

        jobs.push(
          attempt(primaryDelegate)
            .then(function (d) {
              _state.models[name] = d;
              console.log('[AI Worker] ✅ ' + name + ' loaded (' + primaryDelegate + ')');
            })
            .catch(function (err1) {
              console.warn('[AI Worker] ⚠️ ' + name + ' failed on ' + primaryDelegate + ':', err1.message);
              if (primaryDelegate !== fallbackDelegate) {
                return attempt(fallbackDelegate)
                  .then(function (d) {
                    _state.models[name] = d;
                    console.log('[AI Worker] ✅ ' + name + ' loaded (' + fallbackDelegate + ' fallback)');
                  })
                  .catch(function (err2) {
                    console.warn('[AI Worker] ❌ ' + name + ' failed on ' + fallbackDelegate + ':', err2.message);
                    _state.errorCount++;
                  });
              } else {
                _state.errorCount++;
              }
            })
        );
      };

      tryLoad('face', FaceDetector, function (delegate) {
        return {
          baseOptions: { modelAssetPath: CDN.models.face, delegate: delegate },
          runningMode: 'IMAGE',
          minDetectionConfidence: 0.5
        };
      });

      tryLoad('pose', PoseLandmarker, function (delegate) {
        return {
          baseOptions: { modelAssetPath: CDN.models.pose, delegate: delegate },
          runningMode: 'IMAGE',
          numPoses: 2
        };
      });

      tryLoad('gesture', GestureRecognizer, function (delegate) {
        return {
          baseOptions: { modelAssetPath: CDN.models.gesture, delegate: delegate },
          runningMode: 'IMAGE',
          numHands: 2
        };
      });

      tryLoad('object', ObjectDetector, function (delegate) {
        return {
          baseOptions: { modelAssetPath: CDN.models.object, delegate: delegate },
          runningMode: 'IMAGE',
          scoreThreshold: 0.4,
          maxResults: 5
        };
      });

      tryLoad('classifier', ImageClassifier, function (delegate) {
        return {
          baseOptions: { modelAssetPath: CDN.models.classifier, delegate: delegate },
          runningMode: 'IMAGE',
          maxResults: 3
        };
      });

      await Promise.all(jobs);

      _state.ready = Object.keys(_state.models).some(function (k) { return !!_state.models[k]; });

      if (!_state.ready) {
        postError('No model loaded successfully');
        return;
      }

      postReady();

    } catch (err) {
      console.error('[AI Worker] ❌ Init failed:', err);
      postError((err && err.message) || String(err));
    }
  })();

  try {
    await _state.initPromise;
  } finally {
    _state.initPromise = null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DOWNGRADE
// ═══════════════════════════════════════════════════════════════════════════
function handleDowngrade(newTier) {
  _state.tier = newTier || 'lite';
  console.log('[AI Worker] ⬇️ Downgrade →', _state.tier);
  postReady();
}

// ═══════════════════════════════════════════════════════════════════════════
// DETECT — main work
// ═══════════════════════════════════════════════════════════════════════════
async function handleDetect(id, frame, timestamp) {
  const result = Object.assign({}, EMPTY_RESULT);

  try {
    if (!_state.ready || !frame) {
      self.postMessage({ type: 'result', id: id, result: result });
      return;
    }

    // ─── Prepare input: OffscreenCanvas for best compat ────────────────
    let input = frame;
    try {
      const w = frame.width || frame.videoWidth || 0;
      const h = frame.height || frame.videoHeight || 0;

      if (w > 0 && h > 0) {
        if (!_state.canvas || _state.canvas.width !== w || _state.canvas.height !== h) {
          _state.canvas = new OffscreenCanvas(w, h);
          _state.ctx = _state.canvas.getContext('2d', { willReadFrequently: false });
        }
        _state.ctx.drawImage(frame, 0, 0, w, h);
        input = _state.canvas;
      }
    } catch (err) {
      console.warn('[AI Worker] bitmap→canvas failed, using raw bitmap:', err.message);
    }

    // ─── FACE ────────────────────────────────────────────────────────
    if (_state.models.face) {
      try {
        const r = _state.models.face.detect(input);
        if (r && r.detections) {
          result.faceCount = r.detections.length;
          const det = r.detections[0];
          const cat = det && det.categories && det.categories[0];
          result.faceConfidence = (cat && cat.score) || 0;
        }
      } catch (err) {
        console.warn('[AI Worker] face detect err:', err.message);
      }
    }

    // ─── POSE ────────────────────────────────────────────────────────
    if (_state.models.pose) {
      try {
        const r = _state.models.pose.detect(input);
        if (r && r.landmarks) {
          result.poseCount = r.landmarks.length;
        }
      } catch (err) {
        console.warn('[AI Worker] pose detect err:', err.message);
      }
    }

    // ─── GESTURE ─────────────────────────────────────────────────────
    if (_state.models.gesture) {
      try {
        const r = _state.models.gesture.recognize(input);
        if (r && r.gestures) {
          const gs = [];
          for (let i = 0; i < r.gestures.length; i++) {
            const g = r.gestures[i] && r.gestures[i][0];
            if (g && g.score > 0.4) {
              gs.push({ name: g.categoryName, score: g.score });
            }
          }
          result.gestures = gs;
        }
      } catch (err) {
        console.warn('[AI Worker] gesture err:', err.message);
      }
    }

    // ─── OBJECT ──────────────────────────────────────────────────────
    if (_state.models.object) {
      try {
        const r = _state.models.object.detect(input);
        if (r && r.detections) {
          const objs = [];
          for (let i = 0; i < r.detections.length; i++) {
            const d = r.detections[i];
            const o = d && d.categories && d.categories[0];
            if (o && o.score > 0.4) {
              objs.push({ name: o.categoryName, score: o.score });
            }
          }
          result.objects = objs;
        }
      } catch (err) {
        console.warn('[AI Worker] object err:', err.message);
      }
    }

    // ─── CLASSIFIER ──────────────────────────────────────────────────
    if (_state.models.classifier) {
      try {
        const r = _state.models.classifier.classify(input);
        const cls = r && r.classifications && r.classifications[0];
        const cat = cls && cls.categories && cls.categories[0];
        if (cat) result.scene = cat.categoryName;
      } catch (err) {
        console.warn('[AI Worker] classifier err:', err.message);
      }
    }

    _state.detectCount++;

    // ─── Memory check every 50 detections ────────────────────────────
    if (_state.detectCount % 50 === 0) {
      try {
        if (self.performance && self.performance.memory) {
          const ratio = self.performance.memory.usedJSHeapSize / self.performance.memory.jsHeapSizeLimit;
          if (ratio > 0.85) {
            postMemoryPressure('heap ' + Math.round(ratio * 100) + '%');
          }
        }
      } catch (e) { /* noop */ }
    }

  } catch (err) {
    console.warn('[AI Worker] handleDetect err:', err);
    _state.errorCount++;
  } finally {
    try {
      if (frame && typeof frame.close === 'function') frame.close();
    } catch (e) { /* noop */ }

    self.postMessage({ type: 'result', id: id, result: result });
  }
}

console.log('[AI Worker v3.0] ✅ Detection worker loaded — protocol ready');