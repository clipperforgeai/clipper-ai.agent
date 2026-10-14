/**
 * ═══════════════════════════════════════════════════════════════════════
 * TRIM ROUTER — Intelligent Method Selector v1.0
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Tugas:
 *   1. Deteksi kemampuan browser + device (sekali, cached)
 *   2. Inspeksi file (codec, container, size) tanpa baca full file
 *   3. Pilih metode optimal: Hybrid / FFmpeg-copy / MediaRecorder
 *   4. Eksekusi dengan fallback berantai (auto-degrade kalau gagal)
 *   5. Report progress terpadu ke UI
 * 
 * Metode:
 *   ┌──────────────────┬──────────────────┬──────────────┬─────────────┐
 *   │ Hybrid (WCV+FF)  │ FFmpeg fastTrim  │ MediaRecorder│ Keterangan  │
 *   ├──────────────────┼──────────────────┼──────────────┼─────────────┤
 *   │ Akurat ke frame  │ Lossless         │ Universal    │             │
 *   │ ~5-15x realtime  │ ~50-200x realtime│ ~0.5-2x RT   │ Kecepatan   │
 *   │ Kualitas turun   │ Kualitas utuh    │ Kualitas     │             │
 *   │   sedikit        │                  │   turun      │             │
 *   │ Modern browser   │ Semua browser    │ Semua browser│ Kompat.     │
 *   └──────────────────┴──────────────────┴──────────────┴─────────────┘
 * ═══════════════════════════════════════════════════════════════════════
 */

const TrimRouter = {

  // ═══════════════════════════════════════════════════════════════════
  // 1. CAPABILITY PROBE — deteksi sekali, cache selamanya
  // ═══════════════════════════════════════════════════════════════════
  _caps: null,

  probeCapabilities() {
    if (this._caps) return this._caps;

    const caps = {
      // ─── API detection ───
      hasWebCodecs:
        typeof VideoDecoder !== 'undefined' &&
        typeof VideoEncoder !== 'undefined' &&
        typeof VideoFrame !== 'undefined' &&
        typeof EncodedVideoChunk !== 'undefined',

      hasMp4Muxer: typeof window.Mp4Muxer !== 'undefined',
      hasFFmpeg: typeof window.FFmpegMuxer !== 'undefined',
      hasMP4Box: typeof window.MP4Box !== 'undefined',
      hasMediaRecorder: typeof MediaRecorder !== 'undefined',

      // ─── Device hints ───
      deviceMemory: navigator.deviceMemory || 4,
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
      isMobile: /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent),
      isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),

      // ─── H.264 encoder support (async, will fill later) ───
      h264EncodeSupport: null,
      h265EncodeSupport: null,
    };

    // ─── Safari: WebCodecs ada tapi buggy di beberapa versi ───
    caps.webCodecsReliable = caps.hasWebCodecs && !caps.isSafari;

    // ─── Bisa hybrid? ───
    caps.canHybrid =
      caps.webCodecsReliable &&
      caps.hasMp4Muxer &&
      caps.hasFFmpeg;

    // ─── Bisa fastTrim? ───
    caps.canFastTrim = caps.hasFFmpeg;

    // ─── Bisa MediaRecorder? ───
    caps.canRecord = caps.hasMediaRecorder;

    this._caps = caps;

    console.log(
      '%c[TrimRouter] 🔍 Capabilities:',
      'color:#38bdf8;font-weight:bold;',
      {
        hybrid: caps.canHybrid ? '✅' : '❌',
        fastTrim: caps.canFastTrim ? '✅' : '❌',
        record: caps.canRecord ? '✅' : '❌',
        device: `${caps.deviceMemory}GB RAM / ${caps.hardwareConcurrency} cores`,
        mobile: caps.isMobile,
        safari: caps.isSafari,
      }
    );

    return caps;
  },

  // ═══════════════════════════════════════════════════════════════════
  // 2. ASYNC PROBE: cek dukungan encoder H.264 / H.265
  // ═══════════════════════════════════════════════════════════════════
  async probeEncoders() {
    const caps = this.probeCapabilities();
    if (!caps.hasWebCodecs) return caps;
    if (caps.h264EncodeSupport !== null) return caps;

    try {
      // ─── Probe H.264 (avc1) ───
      const h264Support = await VideoEncoder.isConfigSupported({
        codec: 'avc1.42001f',
        width: 1280,
        height: 720,
        bitrate: 2_000_000,
        framerate: 30,
      });
      caps.h264EncodeSupport = !!(h264Support && h264Support.supported);

      // ─── Probe H.265 (hvc1) ───
      try {
        const h265Support = await VideoEncoder.isConfigSupported({
          codec: 'hvc1.1.6.L93.B0',
          width: 1280,
          height: 720,
          bitrate: 2_000_000,
          framerate: 30,
        });
        caps.h265EncodeSupport = !!(h265Support && h265Support.supported);
      } catch (_) {
        caps.h265EncodeSupport = false;
      }

      console.log(
        `[TrimRouter] 🎥 Encoder: H.264=${caps.h264EncodeSupport ? '✅' : '❌'} ` +
        `H.265=${caps.h265EncodeSupport ? '✅' : '❌'}`
      );
    } catch (e) {
      console.warn('[TrimRouter] Probe encoder gagal:', e.message);
      caps.h264EncodeSupport = false;
      caps.h265EncodeSupport = false;
    }

    return caps;
  },

  // ═══════════════════════════════════════════════════════════════════
  // 3. CODE INSPECTOR — baca header MP4 (bukan full file)
  // ═══════════════════════════════════════════════════════════════════
  /**
   * Baca HANYA moov atom (biasanya di awal atau akhir file).
   * Return: { codec, videoCodecString, audioCodecString, width, height, 
   *           duration, container, isCompatible }
   */
  async inspectFile(file) {
    // ─── Cek ekstensi dulu (murah) ───
    const name = (file.name || '').toLowerCase();
    const isMP4 = name.endsWith('.mp4') || name.endsWith('.m4v');
    const isMOV = name.endsWith('.mov');
    const isWebM = name.endsWith('.webm');
    const isMKV = name.endsWith('.mkv');

    const info = {
      container: isMP4 ? 'mp4' : isMOV ? 'mov' : isWebM ? 'webm' : isMKV ? 'mkv' : 'unknown',
      sizeMB: file.size / 1024 / 1024,
      codec: 'unknown',
      videoCodecString: null,
      audioCodecString: null,
      width: 0,
      height: 0,
      duration: 0,
      isMP4Family: isMP4 || isMOV,
    };

    // ─── Kalau bukan MP4 family, langsung skip inspeksi ───
    if (!info.isMP4Family) {
      console.log(`[TrimRouter] 📼 Container: ${info.container} (non-MP4)`);
      return info;
    }

    // ─── Baca 2 MB pertama + 2 MB terakhir (moov bisa di mana saja) ───
    const PROBE_SIZE = 2 * 1024 * 1024;
    const headSize = Math.min(PROBE_SIZE, file.size);
    const tailOffset = Math.max(0, file.size - PROBE_SIZE);
    const tailSize = file.size - tailOffset;

    const headBuf = await file.slice(0, headSize).arrayBuffer();
    headBuf.fileStart = 0;

    let tailBuf = null;
    if (tailOffset > 0) {
      tailBuf = await file.slice(tailOffset, tailOffset + tailSize).arrayBuffer();
      tailBuf.fileStart = tailOffset;
    }

    // ─── Parse pakai MP4Box ───
    return new Promise((resolve) => {
      const mp4 = MP4Box.createFile();
      let resolved = false;

      const finalize = () => {
        if (resolved) return;
        resolved = true;
        try { mp4.flush(); } catch (_) {}
        resolve(info);
      };

      mp4.onReady = (mp4info) => {
        try {
          if (mp4info.videoTracks && mp4info.videoTracks.length > 0) {
            const v = mp4info.videoTracks[0];
            info.videoCodecString = v.codec;
            info.width = v.video ? v.video.width : 0;
            info.height = v.video ? v.video.height : 0;

            // ─── Map codec ke kategori ───
            const c = (v.codec || '').toLowerCase();
            if (c.startsWith('avc1') || c.startsWith('avc3')) info.codec = 'h264';
            else if (c.startsWith('hvc1') || c.startsWith('hev1')) info.codec = 'h265';
            else if (c.startsWith('av01')) info.codec = 'av1';
            else if (c.startsWith('vp09') || c.startsWith('vp08')) info.codec = 'vp9';
            else if (c.startsWith('vvc1') || c.startsWith('vvi1')) info.codec = 'vvc';
            else info.codec = 'other';
          }

          if (mp4info.audioTracks && mp4info.audioTracks.length > 0) {
            info.audioCodecString = mp4info.audioTracks[0].codec;
          }

          info.duration = mp4info.duration / (mp4info.timescale || 1);

          console.log(
            `[TrimRouter] 📖 Inspect: ${info.codec} ` +
            `${info.width}x${info.height} ` +
            `${info.duration.toFixed(1)}s`
          );
        } catch (e) {
          console.warn('[TrimRouter] Parse moov error:', e.message);
        }
        finalize();
      };

      mp4.onError = () => finalize();

      try {
        mp4.appendBuffer(headBuf);
        if (tailBuf && tailOffset > headSize) {
          mp4.appendBuffer(tailBuf);
        }
        // ─── Kalau moov tidak ada di head/tail, timeout ───
        setTimeout(finalize, 800);
      } catch (e) {
        finalize();
      }
    });
  },

  // ═══════════════════════════════════════════════════════════════════
  // 4. ROUTER — pilih metode terbaik berdasarkan semua faktor
  // ═══════════════════════════════════════════════════════════════════
  /**
   * @returns {Object} {
   *   method: 'hybrid' | 'fastTrim' | 'mediaRecorder',
   *   reason: string,
   *   fallbacks: string[],
   *   quality: 'lossless' | 'high' | 'medium' | 'low'
   * }
   */
  route(file, fileInfo, userPrefs = {}) {
    const caps = this.probeCapabilities();
    const sizeMB = fileInfo.sizeMB;
    const { preferLossless = false, preferAccurate = true } = userPrefs;

    // ═══ ATURAN 1: File sangat kecil, codec compatible → fastTrim ═══
    // Lossless & cepat. Cocok untuk clip pendek.
    if (
      caps.canFastTrim &&
      fileInfo.isMP4Family &&
      (fileInfo.codec === 'h264' || fileInfo.codec === 'h265') &&
      sizeMB < 200
    ) {
      return {
        method: 'fastTrim',
        reason: `File kecil (${sizeMB.toFixed(0)} MB) + codec ${fileInfo.codec.toUpperCase()} → lossless & cepat`,
        fallbacks: ['hybrid', 'mediaRecorder'],
        quality: 'lossless',
      };
    }

    // ═══ ATURAN 2: User pilih lossless → coba fastTrim dulu ═══
    if (preferLossless && caps.canFastTrim && fileInfo.isMP4Family) {
      return {
        method: 'fastTrim',
        reason: 'User pilih lossless — fastTrim prioritas',
        fallbacks: ['hybrid', 'mediaRecorder'],
        quality: 'lossless',
      };
    }

    // ═══ ATURAN 3: Hybrid ideal — modern device + H.264 + size OK ═══
    if (
      caps.canHybrid &&
      caps.h264EncodeSupport !== false &&
      fileInfo.codec === 'h264' &&
      sizeMB < 800 &&
      !caps.isSafari
    ) {
      return {
        method: 'hybrid',
        reason: `Device modern + H.264 + ${sizeMB.toFixed(0)} MB → akurat ke frame`,
        fallbacks: ['fastTrim', 'mediaRecorder'],
        quality: 'high',
      };
    }

    // ═══ ATURAN 4: Hybrid untuk H.265 (kalau didukung) ═══
    if (
      caps.canHybrid &&
      caps.h265EncodeSupport === true &&
      fileInfo.codec === 'h265' &&
      sizeMB < 500
    ) {
      return {
        method: 'hybrid',
        reason: `H.265 didukung encoder → hybrid aman`,
        fallbacks: ['fastTrim', 'mediaRecorder'],
        quality: 'high',
      };
    }

    // ═══ ATURAN 5: File medium, non-H.264 → fastTrim (kalau bisa) ═══
    if (
      caps.canFastTrim &&
      fileInfo.isMP4Family &&
      sizeMB < 1500
    ) {
      return {
        method: 'fastTrim',
        reason: `File ${sizeMB.toFixed(0)} MB, codec ${fileInfo.codec} → fastTrim paling aman`,
        fallbacks: ['mediaRecorder'],
        quality: 'lossless',
      };
    }

    // ═══ ATURAN 6: File besar (>1.5 GB) → MediaRecorder ═══
    if (sizeMB >= 1500) {
      return {
        method: 'mediaRecorder',
        reason: `File besar (${(sizeMB / 1024).toFixed(2)} GB) → hindari MEMFS crash`,
        fallbacks: [],
        quality: 'medium',
      };
    }

    // ═══ ATURAN 7: Non-MP4 container → MediaRecorder ═══
    if (!fileInfo.isMP4Family) {
      return {
        method: 'mediaRecorder',
        reason: `Container ${fileInfo.container} tidak lossless-compatible`,
        fallbacks: [],
        quality: 'medium',
      };
    }

    // ═══ ATURAN 8: Default fallback ═══
    if (caps.canHybrid) {
      return {
        method: 'hybrid',
        reason: 'Default: hybrid untuk device modern',
        fallbacks: ['fastTrim', 'mediaRecorder'],
        quality: 'high',
      };
    }

    return {
      method: 'mediaRecorder',
      reason: 'Tidak ada metode lain tersedia',
      fallbacks: [],
      quality: 'medium',
    };
  },

  // ═══════════════════════════════════════════════════════════════════
  // 5. EXECUTOR — jalankan metode + fallback berantai
  // ═══════════════════════════════════════════════════════════════════
  /**
   * @param {File}   file
   * @param {number} startSec
   * @param {number} endSec
   * @param {Object} opts { onProgress, userPrefs }
   * @returns {Promise<Blob>}
   */
  async execute(file, startSec, endSec, opts = {}) {
    const { onProgress = null, userPrefs = {} } = opts;

    // ─── Boot: probe + inspect ───
    onProgress?.({ stage: 'probe', pct: 0, message: 'Mendeteksi device...' });
    await this.probeEncoders();

    onProgress?.({ stage: 'inspect', pct: 0.05, message: 'Membaca metadata...' });
    const fileInfo = await this.inspectFile(file);

    // ─── Route ───
    const route = this.route(file, fileInfo, userPrefs);
    console.log(
      `%c[TrimRouter] 🎯 Route: ${route.method.toUpperCase()} — ${route.reason}`,
      'color:#10b981;font-weight:bold;'
    );

    onProgress?.({
      stage: 'routing',
      pct: 0.1,
      message: `Metode: ${route.method}`,
      method: route.method,
      reason: route.reason,
    });

    // ─── Coba metode utama + fallback berantai ───
    const chain = [route.method, ...route.fallbacks];
    const errors = [];

    for (let i = 0; i < chain.length; i++) {
      const method = chain[i];
      const isLast = i === chain.length - 1;

      try {
        console.log(
          `[TrimRouter] ▶️ [${i + 1}/${chain.length}] Coba: ${method}`
        );

        const blob = await this._runMethod(
          method, file, startSec, endSec, route, onProgress
        );

        if (!blob || !blob.size) {
          throw new Error('Output blob kosong');
        }

        console.log(
          `%c[TrimRouter] ✅ Berhasil via ${method} — ` +
          `${(blob.size / 1024 / 1024).toFixed(2)} MB`,
          'color:#10b981;font-weight:bold;'
        );

        onProgress?.({
          stage: 'done',
          pct: 1,
          message: 'Selesai!',
          method,
          blob,
        });

        return blob;

      } catch (e) {
        const msg = e && e.message ? e.message : String(e);
        console.warn(`[TrimRouter] ⚠️ ${method} gagal: ${msg}`);
        errors.push({ method, error: msg });

        if (isLast) {
          // Semua metode gagal
          throw new Error(
            `Semua metode gagal:\n` +
            errors.map((x) => `  • ${x.method}: ${x.error}`).join('\n')
          );
        }

        onProgress?.({
          stage: 'fallback',
          pct: 0.1,
          message: `${method} gagal, coba ${chain[i + 1]}...`,
        });
      }
    }

    // Should never reach here
    throw new Error('Router chain empty');
  },

  // ═══════════════════════════════════════════════════════════════════
  // 6. RUN METHOD — wrapper untuk masing-masing engine
  // ═══════════════════════════════════════════════════════════════════
  async _runMethod(method, file, startSec, endSec, route, onProgress) {
    switch (method) {

      // ─── Hybrid: WebCodecs + FFmpeg mux ───
      case 'hybrid': {
        if (!window.WebCodecsTrimmer) throw new Error('WebCodecsTrimmer tidak tersedia');
        if (!window.FFmpegMuxer) throw new Error('FFmpegMuxer tidak tersedia');

        const quality = route.quality === 'lossless' ? 'high' : route.quality;

        // Step 1: video-only
        const videoOnly = await window.WebCodecsTrimmer.trimVideo(
          file, startSec, endSec,
          {
            quality,
            onProgress: (p) => onProgress?.({
              stage: 'video', pct: 0.1 + p * 0.5,
              message: `Encode video ${Math.round(p * 100)}%`,
            }),
          }
        );

        // Step 2: extract audio
        const audioOnly = await window.FFmpegMuxer.extractAudio(file, {
          onProgress: (p) => onProgress?.({
            stage: 'audio', pct: 0.6 + p * 0.15,
            message: `Ekstrak audio ${Math.round(p * 100)}%`,
          }),
        });

        // Step 3: mux
        const finalBlob = await window.FFmpegMuxer.mux(
          videoOnly, audioOnly,
          {
            audioOffsetSec: startSec,
            durationSec: endSec - startSec,
            onProgress: (p) => onProgress?.({
              stage: 'mux', pct: 0.75 + p * 0.25,
              message: `Mux audio+video ${Math.round(p * 100)}%`,
            }),
          }
        );

        return finalBlob;
      }

      // ─── FFmpeg fastTrim (-c copy) ───
      case 'fastTrim': {
        if (!window.FFmpegMuxer) throw new Error('FFmpegMuxer tidak tersedia');

        return await window.FFmpegMuxer.fastTrim(file, startSec, endSec, {
          onProgress: (p) => onProgress?.({
            stage: 'fastTrim', pct: 0.1 + p * 0.9,
            message: `Trim cepat ${Math.round(p * 100)}%`,
          }),
        });
      }

      // ─── MediaRecorder: rekam ulang video element ───
      case 'mediaRecorder': {
        return await this._mediaRecorderTrim(file, startSec, endSec, onProgress);
      }

      default:
        throw new Error(`Metode tidak dikenal: ${method}`);
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // 7. MEDIA RECORDER FALLBACK
  // ═══════════════════════════════════════════════════════════════════
  async _mediaRecorderTrim(file, startSec, endSec, onProgress) {
    if (!window.MediaRecorder) throw new Error('MediaRecorder tidak didukung');

    const durationSec = endSec - startSec;

    // Buat video element untuk playback
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.muted = false;
    video.playsInline = true;
    video.preload = 'auto';

    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = () => reject(new Error('Video load error'));
      setTimeout(() => reject(new Error('Load timeout')), 15000);
    });

    if (video.duration < endSec) {
      endSec = video.duration;
      console.warn('[TrimRouter] endSec di-clamp ke durasi video');
    }

    video.currentTime = startSec;
    await new Promise((r) => {
      video.onseeked = r;
      setTimeout(r, 3000);
    });

    // ─── Setup MediaRecorder ───
    const stream = video.captureStream
      ? video.captureStream()
      : video.mozCaptureStream
      ? video.mozCaptureStream()
      : null;

    if (!stream) throw new Error('captureStream tidak didukung');

    const mimeType = this._pickRecorderMimeType();
    if (!mimeType) throw new Error('Tidak ada codec recorder yang cocok');

    console.log(`[TrimRouter] 🎥 MediaRecorder mimeType: ${mimeType}`);

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 4_000_000,
      audioBitsPerSecond: 128_000,
    });

    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const donePromise = new Promise((resolve, reject) => {
      recorder.onstop = () => resolve();
      recorder.onerror = (e) => reject(e.error || new Error('Recorder error'));
    });

    recorder.start(1000); // chunk per detik

    // ─── Play video ───
    try { await video.play(); } catch (_) {
      throw new Error('Autoplay ditolak browser');
    }

    // ─── Progress + stop saat endSec ───
    const startWall = performance.now();
    const tick = setInterval(() => {
      const elapsed = (performance.now() - startWall) / 1000;
      const cur = startSec + elapsed;
      const pct = Math.min(0.99, elapsed / durationSec);

      onProgress?.({
        stage: 'record',
        pct: 0.1 + pct * 0.9,
        message: `Rekam ulang ${Math.round(pct * 100)}%`,
      });

      if (cur >= endSec) {
        clearInterval(tick);
        video.pause();
        try { recorder.stop(); } catch (_) {}
      }
    }, 250);

    await donePromise;

    // ─── Cleanup ───
    try { video.src = ''; video.load(); } catch (_) {}
    try {
      stream.getTracks().forEach((t) => t.stop());
    } catch (_) {}

    const blob = new Blob(chunks, { type: mimeType });
    return blob;
  },

  _pickRecorderMimeType() {
    const candidates = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4;codecs=avc1,mp4a',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];
    for (const m of candidates) {
      if (MediaRecorder.isTypeSupported(m)) return m;
    }
    return null;
  },

  // ═══════════════════════════════════════════════════════════════════
  // 8. HELPERS untuk UI
  // ═══════════════════════════════════════════════════════════════════
  getMethodLabel(method) {
    return {
      hybrid: '🎬 Akurat ke Frame',
      fastTrim: '⚡ Lossless Cepat',
      mediaRecorder: '📼 Universal (Re-encode)',
    }[method] || method;
  },

  getQualityLabel(quality) {
    return {
      lossless: '💎 Lossless',
      high: '⭐ High',
      medium: '✓ Medium',
      low: '◐ Low',
    }[quality] || quality;
  },
};

// ═══════════════════════════════════════════════════════════════════════
// EXPOSE GLOBAL
// ═══════════════════════════════════════════════════════════════════════
if (typeof window !== 'undefined') {
  window.TrimRouter = TrimRouter;
  console.log('[TrimRouter] ✅ Loaded — intelligent method selector v1.0');
}

export default TrimRouter;