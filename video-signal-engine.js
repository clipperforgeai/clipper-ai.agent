/**
 * AI CLIPPER AGENT - REAL-SIGNAL ENGINE
 * v2.6.1 UPDATE — Full Adaptive + Fail-Safe
 */

class VideoSignalEngine {

  // ============================================================
  // [BAGIAN 1] KODE LAMA — 100% UTUH, TIDAK DIUBAH
  // ============================================================

  static async analyzeVideoSignals(videoElement, file, duration, nicheRules, onProgress, onClipFound) {
    if (isNaN(duration) || duration <= 0) {
      throw new Error("Durasi video tidak valid untuk analisis sinyal.");
    }

    const usePlayback = duration <= 60 && typeof videoElement.requestVideoFrameCallback === 'function';

    if (onProgress) {
      onProgress(usePlayback
        ? "🚀 Mode playback scan (video pendek)..."
        : "🎬 Mode seek scan adaptif...");
    }

    let sampledFrames;
    if (usePlayback) {
      try {
        sampledFrames = await this._playbackAnalysis(videoElement, file, duration, onProgress);
      } catch (e) {
        console.warn('[Playback gagal, fallback ke seek]', e);
        sampledFrames = await this._seekAnalysis(videoElement, file, duration, onProgress);
      }
    } else {
      sampledFrames = await this._seekAnalysis(videoElement, file, duration, onProgress);
    }

    if (!sampledFrames || sampledFrames.length < 3) {
      if (onProgress) onProgress("⚠️ Frame terlalu sedikit, tidak cukup untuk analisis.");
      return [];
    }

    return this._postProcess(sampledFrames, duration, nicheRules, onProgress, onClipFound);
  }

  static _playbackAnalysis(video, file, duration, onProgress) {
    return new Promise((resolve, reject) => {
      const W = 80, H = 45;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: false });

      const audioPromise = this.extractAudioSignalData(file, duration)
        .catch(e => { console.warn('[Audio skip]', e); return new Map(); });

      const MAX_SAMPLES = 40;
      const sampleEverySec = duration / MAX_SAMPLES;
      const sampledFrames = [];
      let prevGray = new Uint8Array(W * H);
      let prevGrayReady = false;
      let lastSampleT = -1;
      let done = false;

      const originalMuted = video.muted;
      const originalTime = video.currentTime;

      const restoreAndResolve = async (result) => {
        if (done) return;
        done = true;
        try { video.pause(); } catch (e) {}
        try { video.muted = originalMuted; } catch (e) {}
        try { video.currentTime = originalTime; } catch (e) {}
        clearTimeout(safetyTimer);
        resolve(result);
      };

      const restoreAndReject = (err) => {
        if (done) return;
        done = true;
        try { video.pause(); } catch (e) {}
        try { video.muted = originalMuted; } catch (e) {}
        try { video.currentTime = originalTime; } catch (e) {}
        clearTimeout(safetyTimer);
        reject(err);
      };

      const finish = async () => {
        if (done) return;
        try {
          const audioMap = await audioPromise;
          for (const f of sampledFrames) {
            f.audio = audioMap.get(Math.floor(f.time)) || 0;
          }
          await restoreAndResolve(sampledFrames);
        } catch (e) {
          restoreAndReject(e);
        }
      };

      const safetyTimer = setTimeout(() => {
        console.warn('[Playback timeout] Memaksa stop, menggunakan data yang ada.');
        finish();
      }, Math.max(20000, (duration + 15) * 1000));

      const onFrame = (now, meta) => {
        if (done) return;
        const t = meta.mediaTime;

        if (t - lastSampleT < sampleEverySec && t < duration - 0.3) {
          if (t < duration - 0.1) video.requestVideoFrameCallback(onFrame);
          else finish();
          return;
        }

        lastSampleT = t;

        try {
          ctx.drawImage(video, 0, 0, W, H);
          const imgData = ctx.getImageData(0, 0, W, H).data;

          let brightSum = 0;
          let motion = 0;
          const len = W * H;

          if (prevGrayReady) {
            let diff = 0;
            for (let p = 0, idx = 0; p < imgData.length; p += 4, idx++) {
              const g = (imgData[p] * 77 + imgData[p + 1] * 150 + imgData[p + 2] * 29) >> 8;
              brightSum += g;
              const d = g - prevGray[idx];
              diff += d < 0 ? -d : d;
              prevGray[idx] = g;
            }
            motion = Math.min(100, (diff / (len * 255)) * 400);
          } else {
            for (let p = 0, idx = 0; p < imgData.length; p += 4, idx++) {
              const g = (imgData[p] * 77 + imgData[p + 1] * 150 + imgData[p + 2] * 29) >> 8;
              brightSum += g;
              prevGray[idx] = g;
            }
            prevGrayReady = true;
          }

          sampledFrames.push({
            time: t,
            motion: Math.round(motion),
            brightness: brightSum / len,
            audio: 0
          });

          if (onProgress) {
            onProgress(`🚀 Scan ${sampledFrames.length}/${MAX_SAMPLES} (${Math.round((t / duration) * 100)}%)...`);
          }
        } catch (e) {
          console.warn('Frame processing error:', e);
        }

        if (t >= duration - 0.15) {
          finish();
        } else {
          video.requestVideoFrameCallback(onFrame);
        }
      };

      try {
        video.muted = true;
        video.currentTime = 0;
      } catch (e) {
        restoreAndReject(new Error("Gagal reset video untuk analisis."));
        return;
      }

      video.play().then(() => {
        video.requestVideoFrameCallback(onFrame);
      }).catch(err => {
        restoreAndReject(err);
      });
    });
  }

  static async _seekAnalysis(video, file, duration, onProgress) {
    const W = 80, H = 45;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: false });

    const audioPromise = this.extractAudioSignalData(file, duration)
      .catch(e => { console.warn('[Audio skip]', e); return new Map(); });

    let MAX_SAMPLES = 40;
    if (duration > 60) MAX_SAMPLES = 80;
    if (duration > 300) MAX_SAMPLES = 120;
    if (duration > 600) MAX_SAMPLES = 140;

    const interval = duration / MAX_SAMPLES;
    const sampledFrames = [];
    let prevGray = new Uint8Array(W * H);
    let prevGrayReady = false;

    const originalTime = video.currentTime;

    for (let i = 0; i < MAX_SAMPLES; i++) {
      const t = i * interval;

      if (onProgress && i % 8 === 0) {
        onProgress(`🔍 Seek scan ${i + 1}/${MAX_SAMPLES} (${Math.round((i / MAX_SAMPLES) * 100)}%)...`);
      }

      const ok = await this.seekVideoFast(video, t, 1500);
      if (!ok) continue;

      try {
        ctx.drawImage(video, 0, 0, W, H);
        const imgData = ctx.getImageData(0, 0, W, H).data;

        let brightSum = 0;
        let motion = 0;
        const len = W * H;

        if (prevGrayReady) {
          let diff = 0;
          for (let p = 0, idx = 0; p < imgData.length; p += 4, idx++) {
            const g = (imgData[p] * 77 + imgData[p + 1] * 150 + imgData[p + 2] * 29) >> 8;
            brightSum += g;
            const d = g - prevGray[idx];
            diff += d < 0 ? -d : d;
            prevGray[idx] = g;
          }
          motion = Math.min(100, (diff / (len * 255)) * 400);
        } else {
          for (let p = 0, idx = 0; p < imgData.length; p += 4, idx++) {
            const g = (imgData[p] * 77 + imgData[p + 1] * 150 + imgData[p + 2] * 29) >> 8;
            brightSum += g;
            prevGray[idx] = g;
          }
          prevGrayReady = true;
        }

        sampledFrames.push({
          time: t,
          motion: Math.round(motion),
          brightness: brightSum / len,
          audio: 0
        });
      } catch (e) {
        console.warn(`Frame ${i} skip:`, e);
      }

      if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
    }

    try { video.currentTime = originalTime; } catch (e) {}

    const audioMap = await audioPromise;
    for (const f of sampledFrames) {
      f.audio = audioMap.get(Math.floor(f.time)) || 0;
    }

    return sampledFrames;
  }

  static seekVideoFast(video, time, timeoutMs) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        try { video.removeEventListener('seeked', onSeeked); } catch (e) {}
        resolve(ok);
      };
      const onSeeked = () => finish(true);
      video.addEventListener('seeked', onSeeked);
      setTimeout(() => finish(false), timeoutMs);
      try { video.currentTime = time; } catch (e) { finish(false); }
    });
  }

  static async _postProcess(sampledFrames, duration, nicheRules, onProgress, onClipFound) {
    for (let k = 1; k < sampledFrames.length; k++) {
      const prev = sampledFrames[k - 1];
      const curr = sampledFrames[k];
      const bDiff = Math.abs(curr.brightness - prev.brightness);
      curr.isSceneShift = bDiff > 30 || curr.motion > 65;
      curr.isPatternInterrupt = curr.motion > 75 && bDiff > 18;
    }

    if (onProgress) onProgress("📊 Mengidentifikasi golden moment...");

    const targetDuration = Math.min(nicheRules.max, Math.max(nicheRules.min, 15));
    const stepTime = Math.max(nicheRules.min / 2, (duration / Math.max(sampledFrames.length, 1)) * 2);

    const candidates = [];
    for (let t = 0; t <= duration - nicheRules.min; t += stepTime) {
      const endT = Math.min(duration, t + targetDuration);
      const clipDur = endT - t;
      if (clipDur < nicheRules.min) break;

      const seg = sampledFrames.filter(f => f.time >= t && f.time <= endT);
      if (seg.length === 0) continue;

      const avgMotion = seg.reduce((a, f) => a + f.motion, 0) / seg.length;
      const avgAudio = seg.reduce((a, f) => a + f.audio, 0) / seg.length;
      const maxMotion = Math.max.apply(null, seg.map(f => f.motion));
      const hasScene = seg.some(f => f.isSceneShift);
      const hasPattern = seg.some(f => f.isPatternInterrupt);

      const durationFit = Math.max(0, 100 - Math.abs(clipDur - targetDuration) * 3);
      const score = Math.min(100, Math.round(
        avgMotion * 0.35 + avgAudio * 0.35 + maxMotion * 0.15 + durationFit * 0.15
      ));

      if (score < 25) continue;

      const signals = [];
      signals.push(`Motion Delta Peak: ${Math.round(avgMotion)}%`);
      signals.push(`Audio RMS Peak: ${Math.round(avgAudio)} dB`);
      if (hasScene) signals.push("Scene Transition: Cut & Contrast Shift Detected");
      if (hasPattern) signals.push("Pattern Interrupt: Sudden Visual Sequence Change");

      let endingType = '[LOOP]';
      if (hasPattern) endingType = '[CLIFFHANGER]';
      else if (hasScene) endingType = '[PUNCHLINE]';

      const confidence = score >= 70 ? 'HIGH' : (score >= 50 ? 'MEDIUM' : 'LOW');

      candidates.push({
        uniqueMomentId: `SIG_${Math.round(t * 10)}_${candidates.length}`,
        startTime: t,
        endTime: endT,
        duration: clipDur,
        score,
        confidence,
        avgMotion: Math.round(avgMotion),
        avgAudio: Math.round(avgAudio),
        signals,
        endingType
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    const selected = [];
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      const overlap = selected.some(s => {
        const oStart = Math.max(s.startTime, c.startTime);
        const oEnd = Math.min(s.endTime, c.endTime);
        return (Math.max(0, oEnd - oStart) / c.duration) > 0.25;
      });
      if (!overlap) selected.push(c);
    }
    selected.sort((a, b) => a.startTime - b.startTime);

    if (onProgress) onProgress(`✅ ${selected.length} golden moment valid.`);

    for (let i = 0; i < selected.length; i++) {
      if (typeof onClipFound === 'function') {
        try { onClipFound(selected[i], i); } catch (e) { console.warn('onClipFound err:', e); }
      }
      await new Promise(r => setTimeout(r, 0));
    }

    return selected;
  }

  static async extractAudioSignalData(file, duration) {
    const _fileMB = file ? (file.size / (1024 * 1024)) : 0;
    const _ram = navigator.deviceMemory || 4;
    const _SKIP_MB = 100;

    if (_fileMB > _SKIP_MB) {
      console.warn(`[Audio Guard] ⚠️ Skip decode: file ${_fileMB.toFixed(0)}MB > ${_SKIP_MB}MB (RAM guard)`);
      return new Map();
    }
    if (_ram <= 2 && _fileMB > 50) {
      console.warn(`[Audio Guard] ⚠️ Skip decode: RAM ${_ram}GB & file ${_fileMB.toFixed(0)}MB`);
      return new Map();
    }

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const rawData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const audioMap = new Map();

    const sampleWindow = Math.floor(sampleRate * 1);
    const totalWindows = Math.floor(rawData.length / sampleWindow);

    for (let w = 0; w < totalWindows; w++) {
      let sumSquares = 0;
      const startIdx = w * sampleWindow;
      for (let i = 0; i < sampleWindow; i++) {
        const s = rawData[startIdx + i];
        sumSquares += s * s;
      }
      const rms = Math.sqrt(sumSquares / sampleWindow);
      audioMap.set(w, Math.min(100, Math.round(rms * 400)));
    }

    try { await audioCtx.close(); } catch (e) {}
    return audioMap;
  }

  // ============================================================
  // [BAGIAN 2] KODE BARU — Enhanced Signal Analysis
  // ============================================================

  static async analyzeVideoSignalsEnhanced(videoElement, file, duration, nicheRules, onProgress, onClipFound) {
    if (isNaN(duration) || duration <= 0) {
      throw new Error("Durasi video tidak valid untuk analisis sinyal.");
    }

    const usePlayback = duration <= 60 && typeof videoElement.requestVideoFrameCallback === 'function';

    if (onProgress) {
      onProgress(usePlayback
        ? "🚀 Enhanced playback scan (audio class + face + edge)..."
        : "🎬 Enhanced seek scan (audio class + face + edge)...");
    }

    let sampledFrames;
    if (usePlayback) {
      try {
        sampledFrames = await this._playbackAnalysis(videoElement, file, duration, onProgress);
      } catch (e) {
        console.warn('[Playback gagal, fallback ke seek]', e);
        sampledFrames = await this._seekAnalysis(videoElement, file, duration, onProgress);
      }
    } else {
      sampledFrames = await this._seekAnalysis(videoElement, file, duration, onProgress);
    }

    if (!sampledFrames || sampledFrames.length < 3) {
      if (onProgress) onProgress("⚠️ Frame terlalu sedikit.");
      return [];
    }

    if (onProgress) onProgress("🧠 Memperkaya sinyal (audio class + face + edge)...");
    try {
      await this._enrichFramesWithEnhancedSignals(sampledFrames, videoElement, file, duration, onProgress);
    } catch (e) {
      console.warn('[Enhanced enrichment gagal, pakai data dasar]', e);
    }

    return this._postProcessEnhanced(sampledFrames, duration, nicheRules, onProgress, onClipFound);
  }

  static async extractRichAudioFeatures(file, duration) {
    const _fileMB = file ? (file.size / (1024 * 1024)) : 0;
    const _ram = navigator.deviceMemory || 4;

    if (_fileMB > 100) {
      console.warn(`[Rich Audio Guard] ⚠️ Skip: ${_fileMB.toFixed(0)}MB > 100MB`);
      return new Map();
    }
    if (_ram <= 2 && _fileMB > 50) {
      console.warn(`[Rich Audio Guard] ⚠️ Skip: RAM ${_ram}GB & file ${_fileMB.toFixed(0)}MB`);
      return new Map();
    }

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const rawData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const audioMap = new Map();

    const winSize = sampleRate;
    const totalWindows = Math.floor(rawData.length / winSize);

    let globalMaxRms = 0.0001;
    const rawWindows = [];

    for (let w = 0; w < totalWindows; w++) {
      const start = w * winSize;
      let sumSq = 0;
      let zeroCrossings = 0;
      let prevSign = 0;
      let lowBandEnergy = 0;
      let smoothed = 0;
      const alpha = 0.05;

      for (let i = 0; i < winSize; i++) {
        const s = rawData[start + i];
        sumSq += s * s;

        const sign = s >= 0 ? 1 : -1;
        if (prevSign !== 0 && sign !== prevSign) zeroCrossings++;
        prevSign = sign;

        smoothed = smoothed + alpha * (s - smoothed);
        lowBandEnergy += smoothed * smoothed;
      }

      const rms = Math.sqrt(sumSq / winSize);
      if (rms > globalMaxRms) globalMaxRms = rms;

      const zcr = zeroCrossings / winSize;
      const lowRatio = Math.sqrt(lowBandEnergy / winSize) / (rms + 1e-6);

      rawWindows.push({ w, rms, zcr, lowRatio });
    }

    for (let i = 0; i < rawWindows.length; i++) {
      const rw = rawWindows[i];
      const energy = Math.min(100, Math.round((rw.rms / globalMaxRms) * 100));

      const isSilence = rw.rms < globalMaxRms * 0.08;
      const isSpeech = !isSilence && rw.zcr > 0.02 && rw.zcr < 0.20;
      const isMusic = !isSilence && rw.lowRatio > 0.55 && rw.zcr < 0.08;

      let isLaughter = false;
      if (!isSilence && i >= 2 && i < rawWindows.length - 1) {
        const prev = rawWindows[i - 1];
        const next = rawWindows[i + 1];
        const fastChange = Math.abs(rw.zcr - prev.zcr) > 0.03 || Math.abs(rw.zcr - next.zcr) > 0.03;
        isLaughter = rw.zcr > 0.12 && energy > 30 && fastChange;
      }

      let emphasis = 0;
      if (i > 0 && i < rawWindows.length - 1) {
        const prev = rawWindows[i - 1].rms;
        const next = rawWindows[i + 1].rms;
        const baseline = (prev + next) / 2;
        if (baseline > 0) {
          emphasis = Math.min(100, Math.round(((rw.rms - baseline) / baseline) * 50));
          if (emphasis < 0) emphasis = 0;
        }
      }

      audioMap.set(rw.w, { energy, isSpeech, isMusic, isLaughter, isSilence, emphasis });
    }

    try { await audioCtx.close(); } catch (e) {}
    return audioMap;
  }

  static async _enrichFramesWithEnhancedSignals(sampledFrames, video, file, duration, onProgress) {
    let audioMap = new Map();
    try {
      audioMap = await this.extractRichAudioFeatures(file, duration);
    } catch (e) {
      console.warn('[Rich audio gagal]', e);
    }

    for (const f of sampledFrames) {
      const af = audioMap.get(Math.floor(f.time));
      if (af) {
        f.isSpeech = af.isSpeech;
        f.isMusic = af.isMusic;
        f.isLaughter = af.isLaughter;
        f.isSilence = af.isSilence;
        f.emphasis = af.emphasis;
        if (!f.audio || f.audio === 0) f.audio = af.energy;
      } else {
        f.isSpeech = false;
        f.isMusic = false;
        f.isLaughter = false;
        f.isSilence = true;
        f.emphasis = 0;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = 80; canvas.height = 45;
    const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: false });

    const faceDetector = ('FaceDetector' in window)
      ? new window.FaceDetector({ fastMode: true, maxDetectedFaces: 10 })
      : null;

    const originalTime = video.currentTime;

    for (let i = 0; i < sampledFrames.length; i++) {
      const f = sampledFrames[i];

      if (onProgress && i % 5 === 0) {
        onProgress(`🧠 Enrich ${i + 1}/${sampledFrames.length} (${Math.round((i / sampledFrames.length) * 100)}%)...`);
      }

      const ok = await this.seekVideoFast(video, f.time, 1200);
      if (!ok) {
        f.edgeDensity = 0;
        f.faceCount = 0;
        continue;
      }

      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        f.edgeDensity = this._edgeDensity(imgData, canvas.width, canvas.height);
      } catch (e) {
        f.edgeDensity = 0;
      }

      if (faceDetector) {
        try {
          const faces = await faceDetector.detect(video);
          f.faceCount = faces ? faces.length : 0;
        } catch (e) {
          f.faceCount = 0;
        }
      } else {
        f.faceCount = 0;
      }

      if (i % 4 === 0) await new Promise(r => setTimeout(r, 0));
    }

    try { video.currentTime = originalTime; } catch (e) {}
  }

  static _edgeDensity(imgData, W, H) {
    const gray = new Uint8Array(W * H);
    for (let p = 0, idx = 0; p < imgData.length; p += 4, idx++) {
      gray[idx] = (imgData[p] * 77 + imgData[p + 1] * 150 + imgData[p + 2] * 29) >> 8;
    }

    let edges = 0;
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        const gx = -gray[i - W - 1] - 2 * gray[i - 1] - gray[i + W - 1]
                 + gray[i - W + 1] + 2 * gray[i + 1] + gray[i + W + 1];
        const gy = -gray[i - W - 1] - 2 * gray[i - W] - gray[i - W + 1]
                 + gray[i + W - 1] + 2 * gray[i + W] + gray[i + W + 1];
        if (Math.abs(gx) + Math.abs(gy) > 120) edges++;
      }
    }
    return Math.round((edges / ((W - 2) * (H - 2))) * 100);
  }

  static _nicheWeights(niche) {
    const table = {
      'Gaming & Esports':            { motion: 0.40, audio: 0.25, edge: 0.05, face: 0.00, speech: 0.05, laughter: 0.05, emphasis: 0.10 },
      'Sports & Fitness':            { motion: 0.40, audio: 0.20, edge: 0.05, face: 0.05, speech: 0.05, laughter: 0.05, emphasis: 0.10 },
      'Podcast & Talkshow':          { motion: 0.05, audio: 0.20, edge: 0.05, face: 0.25, speech: 0.25, laughter: 0.10, emphasis: 0.10 },
      'Interview & Discussion':      { motion: 0.05, audio: 0.20, edge: 0.05, face: 0.25, speech: 0.25, laughter: 0.10, emphasis: 0.10 },
      'Comedy & Entertainment':      { motion: 0.20, audio: 0.15, edge: 0.05, face: 0.15, speech: 0.10, laughter: 0.30, emphasis: 0.05 },
      'Education & Knowledge':       { motion: 0.05, audio: 0.15, edge: 0.25, face: 0.15, speech: 0.25, laughter: 0.00, emphasis: 0.15 },
      'Finance & Crypto':            { motion: 0.05, audio: 0.15, edge: 0.30, face: 0.10, speech: 0.25, laughter: 0.00, emphasis: 0.15 },
      'Technology & AI':             { motion: 0.15, audio: 0.15, edge: 0.20, face: 0.10, speech: 0.25, laughter: 0.00, emphasis: 0.15 },
      'Business & Entrepreneurship': { motion: 0.05, audio: 0.15, edge: 0.20, face: 0.15, speech: 0.30, laughter: 0.00, emphasis: 0.15 },
      'Motivation & Self-Growth':    { motion: 0.10, audio: 0.20, edge: 0.10, face: 0.20, speech: 0.20, laughter: 0.05, emphasis: 0.15 },
      'Film & TV Series':            { motion: 0.25, audio: 0.25, edge: 0.10, face: 0.15, speech: 0.10, laughter: 0.05, emphasis: 0.10 }
    };
    return table[niche] || { motion: 0.35, audio: 0.25, edge: 0.10, face: 0.05, speech: 0.10, laughter: 0.05, emphasis: 0.10 };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🎯 _postProcessEnhanced — v2.6.1 (MODE LONGGAR + FAIL-SAFE)
  // ═══════════════════════════════════════════════════════════════════════
  static async _postProcessEnhanced(sampledFrames, duration, nicheRules, onProgress, onClipFound) {
    // ─── Mark scene shift & pattern interrupt ──────────────────────
    for (let k = 1; k < sampledFrames.length; k++) {
      const prev = sampledFrames[k - 1];
      const curr = sampledFrames[k];
      const bDiff = Math.abs(curr.brightness - prev.brightness);
      curr.isSceneShift = bDiff > 30 || curr.motion > 65;
      curr.isPatternInterrupt = curr.motion > 75 && bDiff > 18;
    }

    const weights = this._nicheWeights(nicheRules.niche || '');
    if (onProgress) onProgress("📊 Skor adaptif per niche (mode longgar)...");

    // ═══════════════════════════════════════════════════════════════════
    // TARGET KLIP — Minimal 10-15 klip
    // ═══════════════════════════════════════════════════════════════════
    let MIN_CLIPS, MAX_CLIPS, TARGET_CLIP_DUR;

    if (duration < 30) {
      MIN_CLIPS = 1; MAX_CLIPS = 3; TARGET_CLIP_DUR = 10;
    } else if (duration < 60) {
      MIN_CLIPS = 3; MAX_CLIPS = 8; TARGET_CLIP_DUR = 12;
    } else if (duration < 180) {
      MIN_CLIPS = 8; MAX_CLIPS = 15; TARGET_CLIP_DUR = 15;
    } else if (duration < 600) {
      MIN_CLIPS = 15;
      MAX_CLIPS = 30;
      TARGET_CLIP_DUR = Math.max(8, Math.floor(duration / 20));
    } else if (duration < 1800) {
      MIN_CLIPS = 20; MAX_CLIPS = 40; TARGET_CLIP_DUR = 20;
    } else {
      MIN_CLIPS = 30; MAX_CLIPS = 60; TARGET_CLIP_DUR = 25;
    }

    const minDur = Math.max(4, Math.floor(TARGET_CLIP_DUR * 0.5));
    const targetDuration = TARGET_CLIP_DUR;
    const stepTime = Math.max(2, Math.floor(minDur / 2));

    if (onProgress) {
      onProgress(`🎯 Target: ${MIN_CLIPS}-${MAX_CLIPS} klip @ ~${targetDuration}s...`);
    }

    const candidates = [];

    for (let t = 0; t <= duration - minDur; t += stepTime) {
      const endT = Math.min(duration, t + targetDuration);
      const clipDur = endT - t;
      if (clipDur < minDur) continue;

      const seg = sampledFrames.filter(f => f.time >= t && f.time <= endT);
      if (seg.length === 0) continue;

      const avgMotion = seg.reduce((a, f) => a + f.motion, 0) / seg.length;
      const avgAudio = seg.reduce((a, f) => a + f.audio, 0) / seg.length;
      const maxMotion = Math.max.apply(null, seg.map(f => f.motion));
      const avgEdge = seg.reduce((a, f) => a + (f.edgeDensity || 0), 0) / seg.length;
      const maxFace = Math.max.apply(null, seg.map(f => f.faceCount || 0));
      const speechRatio = seg.filter(f => f.isSpeech).length / seg.length;
      const laughterCount = seg.filter(f => f.isLaughter).length;
      const emphasisAvg = seg.reduce((a, f) => a + (f.emphasis || 0), 0) / seg.length;
      const hasScene = seg.some(f => f.isSceneShift);
      const hasPattern = seg.some(f => f.isPatternInterrupt);

      const score = Math.min(100, Math.round(
        avgMotion * (weights.motion || 0.3) +
        avgAudio * (weights.audio || 0.2) +
        maxMotion * 0.10 +
        avgEdge * (weights.edge || 0.1) +
        (maxFace > 0 ? Math.min(100, maxFace * 25) : 0) * (weights.face || 0.05) +
        speechRatio * 100 * (weights.speech || 0.1) +
        (laughterCount > 0 ? Math.min(100, laughterCount * 30) : 0) * (weights.laughter || 0.05) +
        emphasisAvg * (weights.emphasis || 0.1) +
        (hasScene ? 5 : 0) +
        (hasPattern ? 5 : 0)
      ));

      // 🔥 FILTER SANGAT LONGGAR
      const hasAnySignal = avgMotion > 2 || avgAudio > 3 || hasScene || maxFace > 0 || speechRatio > 0.05 || avgEdge > 2 || maxMotion > 5;
      if (!hasAnySignal) continue;
      if (score < 3) continue;

      const signals = [];
      if (avgMotion > 5) signals.push(`Motion: ${Math.round(avgMotion)}%`);
      if (avgAudio > 5) signals.push(`Audio: ${Math.round(avgAudio)}%`);
      if (avgEdge > 5) signals.push(`Edge: ${Math.round(avgEdge)}%`);
      if (maxFace > 0) signals.push(`Wajah: ${maxFace}`);
      if (hasScene) signals.push("Scene Shift");
      if (hasPattern) signals.push("Pattern Interrupt");
      if (signals.length === 0) signals.push("Variasi visual terdeteksi");

      let endingType = '[LOOP]';
      if (hasPattern || laughterCount > 0) endingType = '[PUNCHLINE]';
      else if (hasScene) endingType = '[CLIFFHANGER]';

      const confidence = score >= 60 ? 'HIGH' : (score >= 30 ? 'MEDIUM' : 'LOW');

      candidates.push({
        uniqueMomentId: `SIGX_${Math.round(t * 10)}_${candidates.length}`,
        startTime: t,
        endTime: endT,
        duration: clipDur,
        score: score,
        confidence: confidence,
        avgMotion: Math.round(avgMotion),
        avgAudio: Math.round(avgAudio),
        signals: signals,
        endingType: endingType,
        faceCount: maxFace,
        speechRatio: Math.round(speechRatio * 100),
        laughterCount: laughterCount,
        _real: true,
        _fallback: false,
        _evidence: {
          motion: Math.round(avgMotion),
          audio: Math.round(avgAudio),
          edge: Math.round(avgEdge),
          face: maxFace,
          speechRatio: Math.round(speechRatio * 100),
          laughCount: laughterCount,
          emphasis: Math.round(emphasisAvg),
          hasScene: hasScene,
          hasPattern: hasPattern
        },
        _enhanced: true
      });
    }

    if (onProgress) {
      onProgress(`🔍 ${candidates.length} kandidat ditemukan, memilih top ${MAX_CLIPS}...`);
    }

    candidates.sort((a, b) => b.score - a.score);

    const selected = [];
    for (const c of candidates) {
      const overlap = selected.some(s => {
        const oStart = Math.max(s.startTime, c.startTime);
        const oEnd = Math.min(s.endTime, c.endTime);
        return (Math.max(0, oEnd - oStart) / c.duration) > 0.25;
      });
      if (!overlap) selected.push(c);
      if (selected.length >= MAX_CLIPS) break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🛟 FAIL-SAFE: Kalau kurang dari MIN_CLIPS, potong rata
    // ═══════════════════════════════════════════════════════════════════
    if (selected.length < MIN_CLIPS) {
      const needed = MIN_CLIPS - selected.length;
      console.warn(`[FailSafe] Kurang ${needed} klip — potong rata video`);
      if (onProgress) onProgress(`🛟 Menambah ${needed} klip cadangan...`);

      const forceDur = Math.max(4, Math.floor(duration / MIN_CLIPS));

      for (let i = 0; i < MIN_CLIPS && selected.length < MAX_CLIPS; i++) {
        const t = i * forceDur;
        const endT = Math.min(duration, t + forceDur);
        if (endT - t < 4) continue;

        const hasOverlap = selected.some(s => {
          const oStart = Math.max(s.startTime, t);
          const oEnd = Math.min(s.endTime, endT);
          return (Math.max(0, oEnd - oStart) / (endT - t)) > 0.5;
        });
        if (hasOverlap) continue;

        const seg = sampledFrames.filter(f => f.time >= t && f.time <= endT);
        const avgMotion = seg.length > 0 ? seg.reduce((a, f) => a + f.motion, 0) / seg.length : 5;

        selected.push({
          uniqueMomentId: `FORCE_${i}_${Math.round(t * 10)}`,
          startTime: t,
          endTime: endT,
          duration: endT - t,
          score: Math.max(15, Math.round(avgMotion * 1.5)),
          confidence: 'LOW',
          avgMotion: Math.round(avgMotion),
          avgAudio: 0,
          signals: ['Potongan cadangan (fail-safe)'],
          endingType: '[LOOP]',
          faceCount: 0,
          speechRatio: 0,
          laughterCount: 0,
          _real: false,
          _fallback: true,
          _evidence: {
            motion: Math.round(avgMotion),
            audio: 0, edge: 0, face: 0,
            speechRatio: 0, laughCount: 0, emphasis: 0,
            hasScene: false, hasPattern: false
          },
          _enhanced: false
        });
      }
    }

    selected.sort((a, b) => a.startTime - b.startTime);

    if (onProgress) {
      onProgress(`✅ ${selected.length} klip siap (${selected.filter(c => !c._fallback).length} real + ${selected.filter(c => c._fallback).length} fallback)`);
    }

    for (let i = 0; i < selected.length; i++) {
      if (typeof onClipFound === 'function') {
        try { onClipFound(selected[i], i); } catch (e) { console.warn('onClipFound err:', e); }
      }
      await new Promise(r => setTimeout(r, 0));
    }

    return selected;
  }

  // ============================================================
  // [BAGIAN 3] HUGE MODE v2.0 — Adaptive Multi-Tier untuk file >300 MB
  // ============================================================
  static async analyzeVideoSignalsHuge(videoElement, file, duration, nicheRules, onProgress, onClipFound) {
    if (isNaN(duration) || duration <= 0) throw new Error("Durasi tidak valid.");

    const fileMB = file ? (file.size / (1024 * 1024)) : 0;
    const fileGB = fileMB / 1024;
    const ram = navigator.deviceMemory || 4;

    let MAX_SAMPLES, SEEK_TIMEOUT, YIELD_EVERY, CONFIG_NAME;

    if (fileMB < 1024) {
      MAX_SAMPLES = 15; SEEK_TIMEOUT = 2500; YIELD_EVERY = 4;
      CONFIG_NAME = 'MEDIUM (300MB-1GB)';
    } else if (fileMB < 2048) {
      MAX_SAMPLES = 12; SEEK_TIMEOUT = 3000; YIELD_EVERY = 3;
      CONFIG_NAME = 'LARGE (1-2GB)';
    } else if (fileMB < 5120) {
      MAX_SAMPLES = 8; SEEK_TIMEOUT = 4500; YIELD_EVERY = 2;
      CONFIG_NAME = 'XLARGE (2-5GB)';
    } else {
      MAX_SAMPLES = 6; SEEK_TIMEOUT = 6000; YIELD_EVERY = 1;
      CONFIG_NAME = 'EXTREME (>5GB)';
    }

    if (duration > 600)  MAX_SAMPLES = Math.min(MAX_SAMPLES, 10);
    if (duration > 1200) MAX_SAMPLES = Math.min(MAX_SAMPLES, 8);
    if (duration > 2400) MAX_SAMPLES = Math.min(MAX_SAMPLES, 6);

    MAX_SAMPLES = Math.max(4, MAX_SAMPLES);

    if (ram <= 2) {
      MAX_SAMPLES = Math.max(4, Math.floor(MAX_SAMPLES * 0.5));
    }
    if (ram <= 4 && fileMB > 2048) {
      MAX_SAMPLES = Math.max(4, Math.floor(MAX_SAMPLES * 0.75));
    }

    const sizeLabel = fileGB >= 1 ? `${fileGB.toFixed(2)} GB` : `${fileMB.toFixed(0)} MB`;

    if (onProgress) {
      onProgress(`⚡ ${CONFIG_NAME} — ${sizeLabel} · ${MAX_SAMPLES} samples · seek ${SEEK_TIMEOUT}ms`);
    }

    console.log(`%c[Huge v2.0] 📊 ${CONFIG_NAME}`, 'color:#f59e0b;font-weight:bold');
    console.log(`  File    : ${sizeLabel}`);
    console.log(`  Duration: ${Math.round(duration)}s`);
    console.log(`  Samples : ${MAX_SAMPLES}`);
    console.log(`  Timeout : ${SEEK_TIMEOUT}ms`);
    console.log(`  Device  : ${ram}GB RAM`);

    if (fileMB > 5120) {
      const msg = `🚨 File ${sizeLabel} EXTREME — jangan tutup tab!`;
      if (onProgress) onProgress(msg);
    }

    const W = 80, H = 45;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: false });

    const interval = duration / MAX_SAMPLES;
    const sampledFrames = [];
    let prevGray = new Uint8Array(W * H);
    let prevGrayReady = false;
    const originalTime = videoElement.currentTime;
    const t0 = performance.now();

    let successSeek = 0;
    let failedSeek = 0;

    for (let i = 0; i < MAX_SAMPLES; i++) {
      const t = i * interval;
      const elapsed = ((performance.now() - t0) / 1000).toFixed(1);

      if (onProgress) {
        onProgress(`⚡ Sample ${i + 1}/${MAX_SAMPLES} (${Math.round((i / MAX_SAMPLES) * 100)}%) · ${elapsed}s`);
      }

      const ok = await this.seekVideoFast(videoElement, t, SEEK_TIMEOUT);
      if (!ok) {
        failedSeek++;
        console.warn(`[Huge v2.0] ⚠️ Seek gagal di t=${t.toFixed(1)}s`);
        if (failedSeek >= 3 && successSeek === 0) {
          console.error(`[Huge v2.0] ❌ 3x seek gagal — video mungkin corrupt`);
          break;
        }
        continue;
      }
      successSeek++;

      try {
        ctx.drawImage(videoElement, 0, 0, W, H);
        const imgData = ctx.getImageData(0, 0, W, H).data;
        const len = W * H;
        let brightSum = 0;
        let motion = 0;

        if (prevGrayReady) {
          let diff = 0;
          for (let p = 0, idx = 0; p < imgData.length; p += 4, idx++) {
            const g = (imgData[p] * 77 + imgData[p + 1] * 150 + imgData[p + 2] * 29) >> 8;
            brightSum += g;
            const d = g - prevGray[idx];
            diff += d < 0 ? -d : d;
            prevGray[idx] = g;
          }
          motion = Math.min(100, (diff / (len * 255)) * 400);
        } else {
          for (let p = 0, idx = 0; p < imgData.length; p += 4, idx++) {
            const g = (imgData[p] * 77 + imgData[p + 1] * 150 + imgData[p + 2] * 29) >> 8;
            brightSum += g;
            prevGray[idx] = g;
          }
          prevGrayReady = true;
        }

        let edgeDensity = 0;
        try { edgeDensity = this._edgeDensity(imgData, W, H); } catch (e) {}

        sampledFrames.push({
          time: t,
          motion: Math.round(motion),
          brightness: brightSum / len,
          edgeDensity: edgeDensity,
          faceCount: 0,
          audio: 0,
          isSpeech: false,
          isMusic: false,
          isLaughter: false,
          isSilence: true,
          emphasis: 0
        });
      } catch (e) {
        console.warn(`[Huge v2.0] Frame ${i} skip:`, e.message);
      }

      if (i % YIELD_EVERY === 0) {
        await new Promise(r => setTimeout(r, 0));
      }
    }

    try { videoElement.currentTime = originalTime; } catch (e) {}

    const totalTime = ((performance.now() - t0) / 1000).toFixed(1);
    console.log(`[Huge v2.0] ✅ Selesai — ${sampledFrames.length}/${MAX_SAMPLES} frame dalam ${totalTime}s`);

    if (sampledFrames.length < 3) {
      if (onProgress) onProgress(`⚠️ Hanya ${sampledFrames.length} frame berhasil`);
      return [];
    }

    if (onProgress) onProgress(`✅ ${sampledFrames.length} frame terkumpul (${totalTime}s). Skoring...`);

    return this._postProcessEnhanced(sampledFrames, duration, nicheRules, onProgress, onClipFound);
  }

}  // ← KURUNG TUTUP CLASS

if (typeof window !== 'undefined') {
  window.VideoSignalEngine = VideoSignalEngine;
}