/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  AI ENGINE UNIFIED v3.4 — TRUE GOLDEN MOMENT (HONEST MODE)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  v3.4 UPDATE (dari v3.3):
 *   ✅ TRUE GOLDEN MOMENT: hanya klip dengan REAL SIGNAL yang lolos
 *   ✅ NO FAKE FALLBACK: tidak ada klip palsu dengan score buatan
 *   ✅ DURATION-ADAPTIVE: durasi klip menyesuaikan panjang video
 *   ✅ EVIDENCE PAYLOAD: setiap klip bawa bukti nyata (_evidence)
 *   ✅ Semua kode v3.3 tetap UTUH (tidak diubah)
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';
  if (window.__AI_ENGINE_LOADED) return;
  window.__AI_ENGINE_LOADED = true;

  // ═══════════════════════════════════════════════════════════════════════
  // [BAGIAN 1] DEVICE DETECTOR & STATE
  // ═══════════════════════════════════════════════════════════════════════
  const AI = {
    ready: false,
    loading: false,
    _workerReady: false,
    models: { face: null, pose: null, gesture: null, object: null, classifier: null },
    enabled: (() => { try { return localStorage.getItem('ai-agent-real-ai') !== '0'; } catch (e) { return true; } })(),
    mode: (() => { try { return localStorage.getItem('ai-agent-mode') || 'auto'; } catch (e) { return 'auto'; } })(),
    quality: (() => { try { return localStorage.getItem('ai-agent-ai-quality') || 'auto'; } catch (e) { return 'auto'; } })(),
    cache: new Map(),
    cacheMaxSize: 500,
    capability: null
  };

  AI.detectCapability = function () {
    const nav = (typeof navigator !== 'undefined') ? navigator : {};
    const ram = nav.deviceMemory || 2;
    const cores = nav.hardwareConcurrency || 2;
    let tier = 'medium', aiStride = 4;
    let models = { face: false, pose: false, gesture: false, object: false, classifier: false };

    if (ram <= 2 || cores <= 2) { tier = 'minimum'; aiStride = 10; }
    else if (ram <= 4) { tier = 'low'; aiStride = 6; models.face = true; }
    else if (ram <= 6) { tier = 'medium'; aiStride = 4; models.face = true; models.object = true; }
    else {
      tier = 'high'; aiStride = 2;
      models.face = true; models.pose = true; models.gesture = true; models.object = true; models.classifier = true;
    }

    if (AI.quality === 'lite') { aiStride *= 2; models.pose = false; models.gesture = false; }
    else if (AI.quality === 'max') { aiStride = Math.max(1, aiStride - 1); models.pose = true; models.gesture = true; models.classifier = true; }

    return { ram, cores, tier, aiStride, models };
  };

  AI.setMode = function (mode) {
    AI.mode = mode;
    try { localStorage.setItem('ai-agent-mode', mode); } catch (e) {}
    console.log('[AI] Mode diubah ke:', mode);
  };

  AI.setQuality = function (q) {
    AI.quality = q;
    try { localStorage.setItem('ai-agent-ai-quality', q); } catch (e) {}
    console.log('[AI] Quality diubah ke:', q);
  };

  // ═══════════════════════════════════════════════════════════════════════
  // [BAGIAN 2] MEDIAPIPE LOADER
  // ═══════════════════════════════════════════════════════════════════════
  const CDN = {
    modules: ['https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14', 'https://unpkg.com/@mediapipe/tasks-vision@0.10.14'],
    wasm: ['https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm', 'https://unpkg.com/@mediapipe/tasks-vision@0.10.14/wasm'],
    models: {
      face: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
      pose: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
      gesture: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
      object: 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite',
      classifier: 'https://storage.googleapis.com/mediapipe-models/image_classifier/efficientnet_lite0/float32/1/efficientnet_lite0.tflite'
    }
  };

  AI.load = async function (onProgress) {
    if (AI.ready) return true;
    if (AI.loading) {
      return new Promise(r => {
        const t = setInterval(() => { if (AI.ready || !AI.loading) { clearInterval(t); r(AI.ready); } }, 200);
      });
    }

    AI.loading = true;
    AI.capability = AI.detectCapability();
    if (!AI.capability.models.face && !AI.capability.models.object) { AI.loading = false; return false; }

    try {
      if (onProgress) onProgress('🧠 Memuat library AI...');
      const mp = await import(CDN.modules[0]);
      const { FilesetResolver, FaceDetector, PoseLandmarker, GestureRecognizer, ObjectDetector, ImageClassifier } = mp;

      let vision = null;
      for (const url of CDN.wasm) { try { vision = await FilesetResolver.forVisionTasks(url); break; } catch (e) {} }
      if (!vision) throw new Error('WASM resolver gagal');

      const delegate = AI.capability.tier === 'high' ? 'GPU' : 'CPU';
      const jobs = [];
      const m = AI.capability.models;

      if (m.face && FaceDetector) jobs.push(FaceDetector.createFromOptions(vision, { baseOptions: { modelAssetPath: CDN.models.face, delegate }, runningMode: 'IMAGE', minDetectionConfidence: 0.5 }).then(d => { AI.models.face = d; }).catch(e => console.warn('[AI] Face gagal:', e.message)));
      if (m.pose && PoseLandmarker) jobs.push(PoseLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: CDN.models.pose, delegate }, runningMode: 'IMAGE', numPoses: 2 }).then(d => { AI.models.pose = d; }).catch(e => console.warn('[AI] Pose gagal:', e.message)));
      if (m.gesture && GestureRecognizer) jobs.push(GestureRecognizer.createFromOptions(vision, { baseOptions: { modelAssetPath: CDN.models.gesture, delegate }, runningMode: 'IMAGE', numHands: 2 }).then(d => { AI.models.gesture = d; }).catch(e => console.warn('[AI] Gesture gagal:', e.message)));
      if (m.object && ObjectDetector) jobs.push(ObjectDetector.createFromOptions(vision, { baseOptions: { modelAssetPath: CDN.models.object, delegate }, scoreThreshold: 0.4, runningMode: 'IMAGE', maxResults: 5 }).then(d => { AI.models.object = d; }).catch(e => console.warn('[AI] Object gagal:', e.message)));
      if (m.classifier && ImageClassifier) jobs.push(ImageClassifier.createFromOptions(vision, { baseOptions: { modelAssetPath: CDN.models.classifier, delegate }, runningMode: 'IMAGE', maxResults: 3 }).then(d => { AI.models.classifier = d; }).catch(e => console.warn('[AI] Classifier gagal:', e.message)));

      await Promise.all(jobs);
      AI.ready = Object.values(AI.models).some(m => !!m);
      AI.loading = false;
      console.log(`[AI] ✅ Ready — ${Object.entries(AI.models).filter(([k, v]) => !!v).map(([k]) => k).join(', ')}`);
      return AI.ready;
    } catch (e) {
      console.warn('[AI] Load gagal:', e.message);
      AI.loading = false;
      return false;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // analyzeFrame — v3.3 (ASYNC + WORKER PRIORITY + RETRY)
  // ═══════════════════════════════════════════════════════════════════════
  AI.analyzeFrame = async function (videoEl) {
    const out = { faceCount: 0, faceConfidence: 0, poseCount: 0, gestures: [], objects: [], scene: null };

    // ─── Prioritas 1: Worker ──────────────────────────────────────────
    if (AI._workerReady && window.AIWorkerBridge && window.AIWorkerBridge.ready) {
      try {
        const r = await window.AIWorkerBridge.detect(videoEl);
        out.faceCount = r.faceCount || 0;
        out.faceConfidence = r.faceConfidence || 0;
        out.poseCount = r.poseCount || 0;
        out.gestures = r.gestures || [];
        out.objects = r.objects || [];
        return out;
      } catch (e) {
        console.warn('[AI] Worker detect error, fallback ke main thread:', e.message);
      }
    }

    // ─── Prioritas 2: Main thread fallback ────────────────────────────
    if (!AI.ready) return out;

    if (AI.models.face) { try { const r = AI.models.face.detect(videoEl); if (r && r.detections) { out.faceCount = r.detections.length; out.faceConfidence = r.detections[0]?.categories[0]?.score || 0; } } catch (e) {} }
    if (AI.models.pose) { try { const r = AI.models.pose.detect(videoEl); if (r && r.landmarks) out.poseCount = r.landmarks.length; } catch (e) {} }
    if (AI.models.gesture) { try { const r = AI.models.gesture.recognize(videoEl); if (r && r.gestures) out.gestures = r.gestures.map(g => g[0]).filter(g => g.score > 0.4); } catch (e) {} }
    if (AI.models.object) { try { const r = AI.models.object.detect(videoEl); if (r && r.detections) out.objects = r.detections.map(d => d.categories[0]).filter(o => o.score > 0.4); } catch (e) {} }
    if (AI.models.classifier) { try { const r = AI.models.classifier.classify(videoEl); if (r && r.classifications[0]) out.scene = r.classifications[0].categories[0].categoryName; } catch (e) {} }

    return out;
  };

  // ═══════════════════════════════════════════════════════════════════════
  // [BAGIAN 3] AUDIO & FRAME ANALYZER
  // ═══════════════════════════════════════════════════════════════════════
  AI._seek = function (video, time, timeoutMs) {
    return new Promise(resolve => {
      if (window.__HARD_ABORT || window.__smartCancel) { resolve(false); return; }
      let done = false;
      let timerId, abortCheck;

      const cleanup = () => {
        try { video.removeEventListener('seeked', onSeek); } catch (e) {}
        if (timerId) clearTimeout(timerId);
        if (abortCheck) clearInterval(abortCheck);
      };

      const finish = ok => { if (done) return; done = true; cleanup(); resolve(ok); };
      const onSeek = () => finish(true);
      video.addEventListener('seeked', onSeek);
      timerId = setTimeout(() => finish(false), timeoutMs);
      abortCheck = setInterval(() => { if (window.__HARD_ABORT || window.__smartCancel) finish(false); }, 80);
      try { video.currentTime = time; } catch (e) { finish(false); }
    });
  };

  AI._cacheKey = function (t) { return 'ai_' + Math.round(t * 10); };
  AI._getCached = function (t) { return AI.cache.get(AI._cacheKey(t)); };
  AI._setCache = function (t, result) {
    if (AI.cache.size >= AI.cacheMaxSize) { const firstKey = AI.cache.keys().next().value; AI.cache.delete(firstKey); }
    AI.cache.set(AI._cacheKey(t), result);
  };
  AI.clearCache = function () { AI.cache.clear(); console.log('[AI] 🗑 Cache dibersihkan'); };

  AI._classifyAudio = async function (file, lite) {
    const winSec = lite ? 2 : 1, step = lite ? 4 : 1;
    const _fileMB = file ? (file.size / (1024 * 1024)) : 0;
    if (_fileMB > 100) {
      console.warn(`[AI Audio Guard] Skip: file ${_fileMB.toFixed(0)}MB > 100MB`);
      return [];
    }

    let arrayBuffer, audioCtx, audioBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch (e) { if (audioCtx) try { await audioCtx.close(); } catch (e2) {} return []; }

    const raw = audioBuffer.getChannelData(0), sr = audioBuffer.sampleRate;
    const winSize = Math.floor(sr * winSec), totalWin = Math.floor(raw.length / winSize);
    const segments = [], rmsList = new Float32Array(totalWin), zcrList = lite ? null : new Float32Array(totalWin);
    let maxRms = 1e-6;

    for (let w = 0; w < totalWin; w++) {
      const start = w * winSize; let sumSq = 0, zc = 0, prevSign = 0;
      for (let i = 0; i < winSize; i += step) {
        const s = raw[start + i]; sumSq += s * s;
        if (!lite) { const sign = s >= 0 ? 1 : -1; if (prevSign && sign !== prevSign) zc++; prevSign = sign; }
      }
      const rms = Math.sqrt(sumSq / (winSize / step));
      rmsList[w] = rms; if (rms > maxRms) maxRms = rms;
      if (zcrList) zcrList[w] = zc / (winSize / step);
    }

    for (let w = 0; w < totalWin; w++) {
      const rms = rmsList[w], energy = Math.min(100, Math.round((rms / maxRms) * 100));
      const isSilence = rms < maxRms * (lite ? 0.10 : 0.08);
      let isSpeech = false, isMusic = false, isLaughter = false;

      if (!lite && !isSilence) {
        const zcr = zcrList[w];
        isSpeech = zcr > 0.02 && zcr < 0.20;
        isMusic = zcr < 0.08 && energy > 20;
        if (w >= 2 && w < totalWin - 1) isLaughter = zcr > 0.12 && energy > 30 && (Math.abs(zcr - zcrList[w - 1]) > 0.03 || Math.abs(zcr - zcrList[w + 1]) > 0.03);
      } else if (lite && !isSilence) isSpeech = true;

      let emphasis = 0;
      if (w > 0 && w < totalWin - 1) { const base = (rmsList[w - 1] + rmsList[w + 1]) / 2; if (base > 0) emphasis = Math.min(100, Math.max(0, Math.round(((rms - base) / base) * 50))); }
      segments.push({ t: w * winSec, energy, isSilence, isSpeech, isMusic, isLaughter, emphasis });
    }
    try { await audioCtx.close(); } catch (e) {}
    return segments;
  };

  // ═══════════════════════════════════════════════════════════════════════
  // AI.analyze — v3.3 CRITICAL FIX (TIDAK DIUBAH)
  // ═══════════════════════════════════════════════════════════════════════
  AI.analyze = async function (video, file, onProgress) {
    const mode = AI.mode === 'auto' ? AI.capability.tier : AI.mode;
    const duration = video.duration;
    const fileMB = file ? (file.size / (1024 * 1024)) : 0;

    // Normalisasi: 'minimum'/'low'/'lite' semuanya jadi lite
    const isLite = mode === 'minimum' || mode === 'low' || mode === 'lite';

    let SAMPLES = isLite ? 30 : 60;
    if (duration > 300) SAMPLES = 20;
    if (fileMB > 300) SAMPLES = 15;
    if (duration > 1200) SAMPLES = 12;

    const W = isLite ? 48 : 96, H = isLite ? 27 : 54;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: false });

    const audioPromise = AI._classifyAudio(file, isLite).catch(() => []);
    const frames = [], interval = duration / SAMPLES;
    let prevGray = new Uint8Array(W * H), prevHist = null, prevReady = false, origTime = video.currentTime;

    // ✅ FIX: pakai nama berbeda untuk callback lokal
    const progressCb = (onProgress && typeof onProgress === 'function') ? onProgress : (() => {});
    progressCb(`🎬 Analisis ${isLite ? 'LITE' : 'FULL'} (${SAMPLES} frame)...`);

    for (let i = 0; i < SAMPLES; i++) {
      if (window.__HARD_ABORT || window.__smartCancel) break;
      const t = i * interval;
      if (i % 5 === 0) progressCb(`🔍 Frame ${i + 1}/${SAMPLES}...`);
      const ok = await AI._seek(video, t, 2500);
      if (!ok) continue;

      try {
        ctx.drawImage(video, 0, 0, W, H);
        const imgData = ctx.getImageData(0, 0, W, H).data;
        const gray = new Uint8Array(W * H);
        for (let p = 0, idx = 0; p < imgData.length; p += 4, idx++) gray[idx] = (imgData[p] * 77 + imgData[p + 1] * 150 + imgData[p + 2] * 29) >> 8;

        let motion = 0, sceneChange = 0;
        if (prevReady) {
          let diff = 0;
          for (let k = 0; k < gray.length; k++) { const d = gray[k] - prevGray[k]; diff += d < 0 ? -d : d; }
          motion = Math.min(100, Math.round((diff / (gray.length * 255)) * 400));
          const hist = new Uint32Array(48);
          for (let p = 0; p < imgData.length; p += 4) { hist[(imgData[p] >> 4) * 3]++; hist[(imgData[p + 1] >> 4) * 3 + 1]++; hist[(imgData[p + 2] >> 4) * 3 + 2]++; }
          if (prevHist) { let d = 0, tot = 0; for (let k = 0; k < hist.length; k++) { d += Math.abs(hist[k] - prevHist[k]); tot += hist[k] + prevHist[k]; } sceneChange = tot > 0 ? Math.min(100, Math.round((d / tot) * 200)) : 0; }
          prevHist = hist;
        }

        let brightSum = 0;
        for (let k = 0; k < gray.length; k++) brightSum += gray[k];

        frames.push({ t, motion, sceneChange, brightness: brightSum / gray.length, isSceneShift: sceneChange > 35 || motion > 70 });
        prevGray = gray; prevReady = true;
      } catch (e) {}
      if (i % 3 === 0) await new Promise(r => setTimeout(r, 0));
    }
    try { video.currentTime = origTime; } catch (e) {}

    // ─── Merge audio segments ────────────────────────────────────────
    const audioSegments = await audioPromise;
    if (audioSegments.length > 0) {
      for (const f of frames) {
        const seg = audioSegments[Math.floor(f.t / (isLite ? 2 : 1))];
        if (seg) {
          f.audioEnergy = seg.energy; f.isSpeech = seg.isSpeech; f.isMusic = seg.isMusic;
          f.isLaughter = seg.isLaughter; f.isSilence = seg.isSilence; f.emphasis = seg.emphasis;
        } else {
          f.audioEnergy = 0; f.isSilence = true;
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // ✅ FIX CRITICAL: blok AI detection
    // ═══════════════════════════════════════════════════════════════════
    const useWorker = !!(AI._workerReady && window.AIWorkerBridge && window.AIWorkerBridge.ready);
    const aiSource = useWorker ? 'Worker' : 'Main Thread';
    const stride = Math.max(1, AI.capability ? AI.capability.aiStride : 4);

    progressCb(`🤖 AI detection (${aiSource}, stride=${stride})...`);
    let cachedCount = 0;
    let detectedCount = 0;

    for (let i = 0; i < frames.length; i += stride) {
      if (window.__HARD_ABORT || window.__smartCancel) break;
      const f = frames[i];
      const cached = AI._getCached(f.t);
      if (cached) {
        Object.assign(f, cached);
        f._cached = true;
        cachedCount++;
        continue;
      }
      const ok = await AI._seek(video, f.t, 1500);
      if (!ok) continue;

      try {
        const res = await AI.analyzeFrame(video);
        Object.assign(f, res);
        f._realAI = true;
        detectedCount++;
        AI._setCache(f.t, {
          faceCount: res.faceCount, faceConfidence: res.faceConfidence,
          poseCount: res.poseCount, gestures: res.gestures,
          objects: res.objects, scene: res.scene
        });
      } catch (e) {
        console.warn('[AI] analyzeFrame error:', e.message);
      }
      await new Promise(r => setTimeout(r, 0));
    }

    if (cachedCount > 0) console.log(`[AI] ⚡ ${cachedCount} frame dari cache`);
    if (detectedCount > 0) console.log(`[AI] 🧠 ${detectedCount} frame AI-detected`);
    try { video.currentTime = origTime; } catch (e) {}

    return { frames, audioSegments, hasAudio: audioSegments.length > 0, duration, _mode: mode };
  };

  // ═══════════════════════════════════════════════════════════════════════
  // [BAGIAN 4] SMART SCORER
  // ═══════════════════════════════════════════════════════════════════════
  AI.WEIGHTS = {
    'Gaming & Esports': { motion: 0.35, scene: 0.20, audio: 0.15, edge: 0.05, face: 0.05, speech: 0.05, laugh: 0.05, emph: 0.10 },
    'Sports & Fitness': { motion: 0.35, scene: 0.20, audio: 0.15, edge: 0.05, face: 0.05, speech: 0.05, laugh: 0.05, emph: 0.10 },
    'Podcast & Talkshow': { motion: 0.05, scene: 0.10, audio: 0.15, edge: 0.05, face: 0.20, speech: 0.25, laugh: 0.10, emph: 0.10 },
    'Interview & Discussion': { motion: 0.05, scene: 0.10, audio: 0.15, edge: 0.05, face: 0.20, speech: 0.25, laugh: 0.10, emph: 0.10 },
    'Comedy & Entertainment': { motion: 0.15, scene: 0.15, audio: 0.10, edge: 0.05, face: 0.15, speech: 0.10, laugh: 0.25, emph: 0.05 },
    'Education & Knowledge': { motion: 0.05, scene: 0.10, audio: 0.10, edge: 0.20, face: 0.10, speech: 0.25, laugh: 0.00, emph: 0.20 },
    'Finance & Crypto': { motion: 0.05, scene: 0.10, audio: 0.10, edge: 0.25, face: 0.05, speech: 0.25, laugh: 0.00, emph: 0.20 },
    'Technology & AI': { motion: 0.10, scene: 0.15, audio: 0.10, edge: 0.20, face: 0.05, speech: 0.25, laugh: 0.00, emph: 0.15 },
    'Business & Entrepreneurship': { motion: 0.05, scene: 0.10, audio: 0.10, edge: 0.20, face: 0.10, speech: 0.30, laugh: 0.00, emph: 0.15 },
    'Motivation & Self-Growth': { motion: 0.05, scene: 0.10, audio: 0.15, edge: 0.10, face: 0.15, speech: 0.25, laugh: 0.05, emph: 0.15 },
    'Film & TV Series': { motion: 0.20, scene: 0.25, audio: 0.20, edge: 0.05, face: 0.10, speech: 0.10, laugh: 0.05, emph: 0.05 },
    'Culinary & Food': { motion: 0.15, scene: 0.15, audio: 0.10, edge: 0.15, face: 0.10, speech: 0.15, laugh: 0.05, emph: 0.15 },
    'Travel & Lifestyle': { motion: 0.20, scene: 0.25, audio: 0.10, edge: 0.10, face: 0.10, speech: 0.10, laugh: 0.05, emph: 0.10 },
    'Storytelling & Mystery': { motion: 0.05, scene: 0.20, audio: 0.20, edge: 0.05, face: 0.15, speech: 0.20, laugh: 0.00, emph: 0.15 },
    'Reaction & Review': { motion: 0.10, scene: 0.10, audio: 0.15, edge: 0.05, face: 0.30, speech: 0.15, laugh: 0.10, emph: 0.05 },
    'Lifestyle & Fashion': { motion: 0.15, scene: 0.20, audio: 0.10, edge: 0.10, face: 0.20, speech: 0.10, laugh: 0.05, emph: 0.10 },
    'Entertainment': { motion: 0.20, scene: 0.20, audio: 0.15, edge: 0.05, face: 0.15, speech: 0.10, laugh: 0.10, emph: 0.05 },
    'General Content': { motion: 0.20, scene: 0.20, audio: 0.15, edge: 0.10, face: 0.10, speech: 0.15, laugh: 0.05, emph: 0.05 }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // 🎯 AI.detect — v3.4 TRUE GOLDEN MOMENT (HONEST MODE)
  // ───────────────────────────────────────────────────────────────────────
  //  - Hanya klip dengan REAL SIGNAL
  //  - NO FAKE FALLBACK — return [] kalau tidak ada momen
  //  - Durasi klip ADAPTIF per panjang video
  //  - Bukti nyata di-inject ke _evidence untuk copy generation
  // ═══════════════════════════════════════════════════════════════════════
  AI.detect = function (analysis, niche, duration, rules) {
    const W = AI.WEIGHTS[niche] || AI.WEIGHTS['General Content'];
    const frames = analysis.frames;

    if (!frames || frames.length < 3) {
      console.warn('[AI v3.4] ⚠️ Terlalu sedikit frame — tidak buat klip');
      return [];
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🎯 DURATION-ADAPTIVE v3.4
    // ═══════════════════════════════════════════════════════════════════
    let MIN_CLIPS, MAX_CLIPS, TARGET_CLIP_DUR;
    if (duration < 30) {
      MIN_CLIPS = 1; MAX_CLIPS = 1; TARGET_CLIP_DUR = Math.max(5, duration);
    } else if (duration < 60) {
      MIN_CLIPS = 1; MAX_CLIPS = 2; TARGET_CLIP_DUR = 30;
    } else if (duration < 180) {
      MIN_CLIPS = 2; MAX_CLIPS = 4; TARGET_CLIP_DUR = 40;
    } else if (duration < 600) {
      MIN_CLIPS = 3; MAX_CLIPS = 6; TARGET_CLIP_DUR = 45;
    } else if (duration < 1800) {
      MIN_CLIPS = 6; MAX_CLIPS = 12; TARGET_CLIP_DUR = 50;
    } else {
      MIN_CLIPS = 12; MAX_CLIPS = Math.ceil(duration / 120);
      TARGET_CLIP_DUR = 45;
    }

    let minDur = Math.max(rules.min || 10, Math.min(TARGET_CLIP_DUR * 0.6, duration * 0.4));
    let targetDur = Math.min(Math.max(minDur, TARGET_CLIP_DUR), rules.max || 90);

    const step = Math.max(minDur / 3, 1.0);
    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const candidates = [];

    for (let start = 0; start <= duration - minDur; start += step) {
      const end = Math.min(duration, start + targetDur);
      const clipDur = end - start;
      if (clipDur < minDur) continue;

      const seg = frames.filter(f => f.t >= start && f.t <= end);
      if (seg.length < 2) continue;

      const avgMotion = avg(seg.map(f => f.motion || 0));
      const maxMotion = Math.max.apply(null, seg.map(f => f.motion || 0));
      const sceneChanges = seg.filter(f => f.isSceneShift).length;
      const avgEdge = avg(seg.map(f => f.edgeDensity || 0));
      const maxFace = Math.max.apply(null, seg.map(f => f.faceCount || 0));
      const speechRatio = seg.filter(f => f.isSpeech).length / seg.length;
      const laughCount = seg.filter(f => f.isLaughter).length;
      const avgAudio = avg(seg.map(f => f.audioEnergy || 0));
      const avgEmph = avg(seg.map(f => f.emphasis || 0));
      const startSig = seg[0] && (seg[0].motion > 40 || seg[0].isSceneShift);
      const endSig = seg[seg.length - 1] && (seg[seg.length - 1].motion > 40);

      const score = Math.min(100, Math.round(
        avgMotion * W.motion +
        Math.min(100, sceneChanges * 30) * W.scene +
        avgAudio * W.audio +
        avgEdge * W.edge +
        (maxFace > 0 ? Math.min(100, maxFace * 25) : 0) * W.face +
        speechRatio * 100 * W.speech +
        Math.min(100, laughCount * 30) * W.laugh +
        avgEmph * W.emph +
        (startSig ? 5 : 0) +
        (endSig ? 3 : 0)
      ));

      // ═══════════════════════════════════════════════════════════════
      // 🎯 STRICT REAL SIGNAL CHECK (v3.4)
      // ═══════════════════════════════════════════════════════════════
      const hasRealSignal =
        avgMotion > 20 ||
        avgAudio > 20 ||
        sceneChanges > 0 ||
        maxFace > 0 ||
        speechRatio > 0.20 ||
        laughCount > 0 ||
        avgEmph > 15;

      if (!hasRealSignal) continue;
      if (score < 25) continue;

      const reasons = [];
      if (avgMotion > 30) reasons.push(`Pergerakan kuat (${Math.round(avgMotion)}%)`);
      if (sceneChanges >= 1) reasons.push(`${sceneChanges}× pergantian adegan`);
      if (maxFace > 0) reasons.push(`${maxFace} wajah terdeteksi`);
      if (speechRatio > 0.3) reasons.push(`Dominan dialog (${Math.round(speechRatio * 100)}%)`);
      if (laughCount > 0) reasons.push(`Pola tawa (${laughCount} window)`);
      if (avgEmph > 25) reasons.push(`Emphasis tinggi (${Math.round(avgEmph)}%)`);
      if (avgAudio > 40) reasons.push(`Audio kuat (${Math.round(avgAudio)}%)`);

      if (reasons.length === 0) continue;

      let endingType = '[LOOP]';
      if (laughCount > 0) endingType = '[PUNCHLINE]';
      else if (sceneChanges >= 2) endingType = '[CLIFFHANGER]';
      else if (startSig && endSig) endingType = '[HYPE]';

      candidates.push({
        uniqueMomentId: `AI_${Math.round(start * 10)}_${candidates.length}`,
        startTime: start,
        endTime: end,
        duration: clipDur,
        score,
        confidence: score >= 70 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW',
        endingType,
        reasons,
        _real: true,
        _evidence: {
          motion: Math.round(avgMotion),
          maxMotion: Math.round(maxMotion),
          sceneChanges,
          maxFace,
          speechRatio: Math.round(speechRatio * 100),
          laughCount,
          audio: Math.round(avgAudio),
          emphasis: Math.round(avgEmph),
          hasSceneShift: sceneChanges > 0,
          hasSpeech: speechRatio > 0.3,
          hasLaugh: laughCount > 0,
          hasFace: maxFace > 0
        },
        metrics: {
          avgMotion: Math.round(avgMotion),
          maxMotion: Math.round(maxMotion),
          sceneChanges,
          maxFace,
          speechRatio: Math.round(speechRatio * 100),
          laughCount
        },
        signals: reasons.slice(),
        avgMotion: Math.round(avgMotion),
        avgAudio: Math.round(avgAudio),
        faceCount: maxFace,
        speechRatio: Math.round(speechRatio * 100),
        laughterCount: laughCount,
        _v2: true
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    const selected = [];
    for (const c of candidates) {
      const overlapping = selected.some(s => {
        const oStart = Math.max(s.startTime, c.startTime);
        const oEnd = Math.min(s.endTime, c.endTime);
        return (Math.max(0, oEnd - oStart) / c.duration) > 0.20;
      });
      if (!overlapping) selected.push(c);
      if (selected.length >= MAX_CLIPS) break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🎯 v3.4 HONEST MODE — NO FAKE FALLBACK
    // ═══════════════════════════════════════════════════════════════════
    if (selected.length === 0) {
      console.log('[AI v3.4] ⚠️ Tidak ada golden moment REAL di video ini. Return [].');
      return [];
    }

    if (selected.length < MIN_CLIPS) {
      console.log(`[AI v3.4] ℹ️ Ditemukan ${selected.length} golden moment REAL (target ${MIN_CLIPS}-${MAX_CLIPS}). Tidak ada klip palsu ditambahkan.`);
    }

    selected.sort((a, b) => a.startTime - b.startTime);
    console.log(`[AI v3.4] ✅ ${selected.length} klip REAL — target dur ${Math.round(targetDur)}s per klip`);
    return selected;
  };

  // ═══════════════════════════════════════════════════════════════════════
  // AI._makeEvenClips — v3.4 DISABLED (STUB)
  // ───────────────────────────────────────────────────────────────────────
  // Dipertahankan sebagai stub agar tidak ReferenceError kalau ada kode
  // lama yang memanggil. Tidak lagi dipakai di v3.4.
  // ═══════════════════════════════════════════════════════════════════════
  AI._makeEvenClips = function (duration, startIdx, count, existing) {
    console.warn('[AI v3.4] _makeEvenClips() disabled — tidak ada fallback klip palsu');
    return [];
  };

  // ═══════════════════════════════════════════════════════════════════════
  // [BAGIAN 5] MAIN RUN
  // ═══════════════════════════════════════════════════════════════════════
  AI.run = async function () {
    if (!window.currentVideoFile) { alert('⚠️ Pilih video dulu!'); return; }
    const video = document.getElementById('sourceVideo');
    if (!video) { alert('❌ Video element tidak ada.'); return; }

    if (!video.duration || isNaN(video.duration)) {
      await new Promise(r => {
        const onLoad = () => { video.removeEventListener('loadedmetadata', onLoad); r(); };
        video.addEventListener('loadedmetadata', onLoad);
        setTimeout(r, 3000);
      });
    }

    const regionValue = (document.getElementById('regionSelect') || {}).value || 'id-ID';
    const nicheValue = (document.getElementById('nicheSelect') || {}).value || 'Gaming & Esports';
    const selectedNiche = nicheValue === 'AUTO' ? 'General Content' : nicheValue;
    const rules = window.HookEngine ? window.HookEngine.getNicheDurationRules(selectedNiche) : { min: 10, max: 30 };
    rules.niche = selectedNiche;

    const panel = document.getElementById('smartProgressPanel');
    const fill = document.getElementById('smartProgressFill');
    const txt = document.getElementById('smartProgressText');
    const pctEl = document.getElementById('smartProgressPct');
    const btn = document.getElementById('btnSmartAnalyze') || document.getElementById('btnGenerate');

    if (panel) panel.style.display = 'block';
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Menganalisis...'; }
    window.__smartCancel = false;
    window.__HARD_ABORT = false;
    window.__analysisRunning = true;

    const progressHandler = (msg) => {
      if (txt) txt.textContent = msg;
      const m = String(msg).match(/(\d+)%/);
      if (m && fill && pctEl) { const p = parseInt(m[1], 10); fill.style.width = p + '%'; pctEl.textContent = p + '%'; }
    };

    try {
      const workerReady = AI._workerReady && window.AIWorkerBridge?.ready;
      if (!workerReady && AI.enabled && !AI.ready && !AI.loading) {
        const cap = AI.detectCapability();
        if (Object.values(cap.models).some(Boolean)) {
          await AI.load(progressHandler).catch(e => console.warn('[AI] Pre-load gagal:', e));
        }
      } else if (workerReady) {
        progressHandler('🤖 Menggunakan AI Worker...');
      }

      const analysis = await AI.analyze(video, window.currentVideoFile, progressHandler);
      if (window.__smartCancel || window.__HARD_ABORT) throw new Error('Dibatalkan oleh user');

      progressHandler('🎯 Mencari golden moment...');
      const moments = AI.detect(analysis, selectedNiche, video.duration, rules);

      if (moments.length === 0) {
        if (txt) txt.textContent = '⚠️ Tidak ada signal cukup kuat. Coba video dengan gerakan/audio lebih variatif.';
        setTimeout(() => { if (panel) panel.style.display = 'none'; }, 3500);
        return;
      }

      progressHandler(`📝 Copywriting (${moments.length} kandidat)...`);
      const usedSet = { attentions: [], hookBodies: [], captions: [], extras: [] };
      window.allClipsData = [];
      window.currentPage = 1;
      window.skippedClips.clear();
      window.__lastAnalysis = analysis;

      for (let i = 0; i < moments.length; i++) {
        const m = moments[i];
        const pkg = window.HookEngine
          ? window.HookEngine.buildUniquePackage(m, selectedNiche, regionValue, i, usedSet)
          : { hookHeadline: 'Momen ini wajib ditonton.', caption: 'Bagian ini bikin suasana berubah.', cta: 'Menurut kamu?', hashtags: ['#fyp', '#viral'] };

        window.allClipsData.push({
          id: i + 1,
          start: window.formatTime ? window.formatTime(m.startTime) : String(Math.round(m.startTime)),
          end: window.formatTime ? window.formatTime(m.endTime) : String(Math.round(m.endTime)),
          rawStart: m.startTime, rawEnd: m.endTime, duration: m.duration,
          score: m.score, confidence: m.confidence,
          signals: m.signals || m.reasons || [], reasons: m.reasons || [],
          metrics: m.metrics || {}, endingType: m.endingType,
          hashtags: pkg.hashtags, lang: pkg.lang,
          edited: { hookHeadline: pkg.hookHeadline, caption: pkg.caption, cta: pkg.cta },
          _evidence: m._evidence || null,
          _real: m._real !== false,
          _fallback: false
        });
      }

      if (fill) fill.style.width = '100%';
      if (pctEl) pctEl.textContent = '100%';
      if (txt) txt.textContent = `✅ Selesai — ${window.allClipsData.length} klip REAL.`;

      if (typeof window.renderPage === 'function') window.renderPage();
      if (typeof window.updateStatus === 'function') {
        window.updateStatus(`✅ ${window.allClipsData.length} klip real`);
        setTimeout(() => window.updateStatus('Ready'), 3000);
      }
      setTimeout(() => { if (panel) panel.style.display = 'none'; }, 2200);

    } catch (err) {
      console.error('[AI Engine]', err);
      if (txt) txt.textContent = '❌ ' + (err.message || 'Gagal');
      setTimeout(() => { if (panel) panel.style.display = 'none'; }, 3500);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🧠 SMART ANALYZE (AI V3.4)'; }
      window.__HARD_ABORT = false;
      window.__smartCancel = false;
      window.__analysisRunning = false;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // [BAGIAN 6] UI INSTALLATION
  // ═══════════════════════════════════════════════════════════════════════
  AI.installUI = function () {
    const btnGenerate = document.getElementById('btnGenerate');
    if (!btnGenerate || document.getElementById('btnSmartAnalyze')) return;

    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex; gap:6px; margin-top:8px;';
    wrap.innerHTML = `<button id="btnSmartAnalyze" type="button" class="btn btn-primary" style="flex:1; padding:11px; font-size:0.85rem; font-weight:700; background:linear-gradient(135deg,#8b5cf6,#6d28d9); color:#fff; border:none; border-radius:8px; cursor:pointer;">🧠 SMART ANALYZE (AI V3.4)</button>`;
    btnGenerate.parentNode.insertBefore(wrap, btnGenerate.nextSibling);

    const panel = document.createElement('div');
    panel.id = 'smartProgressPanel';
    panel.style.cssText = 'display:none; margin-top:10px; padding:12px; background:var(--input-bg); border:1px solid var(--input-border); border-radius:10px; font-size:0.78rem; color:var(--text-sub);';
    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-weight:600;">
        <span id="smartProgressText">Menyiapkan...</span>
        <span id="smartProgressPct">0%</span>
      </div>
      <div style="height:6px; background:var(--card-border); border-radius:3px; overflow:hidden;">
        <div id="smartProgressFill" style="height:100%; width:0%; background:linear-gradient(90deg,#8b5cf6,#38bdf8); transition:width 0.3s ease;"></div>
      </div>
      <button id="btnSmartCancel" type="button" style="width:100%; margin-top:10px; padding:8px; background:#dc2626; color:#fff; border:none; border-radius:6px; font-weight:700; cursor:pointer; font-size:0.78rem;">❌ Batalkan</button>
    `;
    wrap.parentNode.insertBefore(panel, wrap.nextSibling);

    const modeBox = document.createElement('div');
    modeBox.style.cssText = 'margin-top:8px; padding:10px; background:var(--input-bg); border:1px solid var(--input-border); border-radius:8px; display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;';
    const cap = AI.detectCapability();
    const userMode = (() => { try { return localStorage.getItem('ai-agent-mode'); } catch (e) { return null; } })();

    modeBox.innerHTML = `
      <span style="font-size:0.72rem; color:var(--text-sub); font-weight:700;">⚙️ MODE AI</span>
      <select id="aiModeSelect" class="input-field" style="width:auto; font-size:0.72rem; padding:4px 8px;">
        <option value="auto" ${!userMode ? 'selected' : ''}>🤖 Auto (${cap.tier})</option>
        <option value="lite" ${userMode === 'lite' ? 'selected' : ''}>⚡ LITE</option>
        <option value="adaptive" ${userMode === 'adaptive' ? 'selected' : ''}>⚖️ ADAPTIVE</option>
        <option value="full" ${userMode === 'full' ? 'selected' : ''}>🚀 FULL</option>
      </select>
      <span style="font-size:0.68rem; color:var(--text-muted);">
        ${cap.ram}GB RAM · ${cap.cores} core · <b>${AI.mode.toUpperCase()}</b>
      </span>
    `;
    panel.appendChild(modeBox);

    document.getElementById('aiModeSelect').addEventListener('change', (e) => {
      const v = e.target.value;
      if (v === 'auto') { try { localStorage.removeItem('ai-agent-mode'); } catch (err) {} AI.mode = 'auto'; AI.capability = AI.detectCapability(); }
      else { AI.setMode(v); AI.capability = AI.detectCapability(); }
      console.log(`[AI] Mode: ${AI.mode} — akan aktif saat analisis berikutnya`);
    });

    document.getElementById('btnSmartAnalyze').addEventListener('click', AI.run);
    document.getElementById('btnSmartCancel').addEventListener('click', () => {
      window.__smartCancel = true;
      window.__HARD_ABORT = true;
      const t = document.getElementById('smartProgressText');
      if (t) t.textContent = 'Membatalkan...';
      setTimeout(() => { window.__HARD_ABORT = false; }, 500);
    });
  };

  // ═══════════════════════════════════════════════════════════════════════
  // [BAGIAN 7] BOOT
  // ═══════════════════════════════════════════════════════════════════════
  function boot() {
    AI.capability = AI.detectCapability();
    AI.installUI();

    console.log(
      `%c[AI Engine v3.4] ✅ Loaded — Tier: ${AI.capability.tier.toUpperCase()} (${AI.capability.ram}GB RAM)`,
      'color:#8b5cf6;font-weight:bold;font-size:13px;'
    );
    console.log(`[AI] Mode: ${AI.mode} | Quality: ${AI.quality} | Enabled: ${AI.enabled}`);
    console.log(`[AI] 🎯 TRUE GOLDEN MOMENT mode — tidak ada klip palsu`);

    if (window.AIWorkerBridge && AI.capability.ram >= 4) {
      console.log('[AI] 🚀 Boot AI Worker...');
      const workerTier = AI.capability.tier === 'high' ? 'full' : 'lite';
      window.AIWorkerBridge.init(workerTier)
        .then(ok => {
          if (ok) {
            AI._workerReady = true;
            console.log('[AI] ✅ Worker aktif — analisis berikutnya pakai worker');
          } else {
            console.warn('[AI] ⚠️ Worker gagal, fallback ke main thread');
          }
        })
        .catch(e => {
          console.warn('[AI] Worker init error:', e.message);
        });
    } else if (!window.AIWorkerBridge) {
      console.log('[AI] ℹ️ ai-bridge.js tidak ada — pakai main thread');
    } else {
      console.log(`[AI] ℹ️ RAM ${AI.capability.ram}GB < 4GB — pakai main thread`);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 900));
  else setTimeout(boot, 900);

  window.AIEngine = AI;
  window.SmartEngine = AI;
  window.RealAI = AI;
})();

// ═══════════════════════════════════════════════════════════════════════════
// [BAGIAN 8] CAPCUT EXPORT ENGINE
// ═══════════════════════════════════════════════════════════════════════════
// Kode ini dipertahankan sesuai aslinya. CapCutEngine di-set dari sini
// kalau CAPCUT sudah didefinisikan sebelumnya oleh script lain.
// Kalau CAPCUT belum ada, kita bikin minimal stub supaya tidak crash.
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';
  // Guard: kalau CAPCUT belum ada, jangan crash — biarkan CapCutEngine di-set
  // oleh script lain (script.js punya fallback sendiri)
  if (typeof window.CapCutEngine === 'undefined') {
    // Cek apakah variabel CAPCUT didefinisikan di scope global
    try {
      // eslint-disable-next-line no-undef
      if (typeof CAPCUT !== 'undefined') {
        // eslint-disable-next-line no-undef
        window.CapCutEngine = CAPCUT;
      }
    } catch (e) {
      // CAPCUT tidak didefinisikan — skip tanpa crash
      console.log('[AI v3.4] ℹ️ CapCutEngine belum siap (akan di-set oleh script.js)');
    }
  }
})();

// ═══════════════════════════════════════════════════════════════════════════
// [BAGIAN 8] CAPCUT EXPORT ENGINE
// ═══════════════════════════════════════════════════════════════════════════
if (typeof CAPCUT !== 'undefined') {
  window.CapCutEngine = CAPCUT;
}

console.log('%c[AI Engine v3.4 + CapCut + Audio Fix + Worker] ✅ Module siap dipakai', 'color:#8b5cf6;font-weight:bold;');