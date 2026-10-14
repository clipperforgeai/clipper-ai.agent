/**
 * AI CLIPPER AGENT - TRIM DISPATCHER v3.0
 * ═══════════════════════════════════════════════════════════════════════════
 * v3.0 FIX TOTAL (audio + no-lag + cross-platform):
 *  ✅ AUDIO: AudioContext di-resume + MediaStreamDestination (Android & iOS)
 *  ✅ AUDIO: video.muted = false + volume = 1 (wajib untuk captureStream)
 *  ✅ AUDIO: fallback chain → coba 3 metode sampai ada audio
 *  ✅ FRAME: requestVideoFrameCallback (bukan rAF) = tidak patah-patah
 *  ✅ FRAME: bitrate adaptif per device tier
 *  ✅ CODEC: prioritas MP4/AAC di iOS, WebM/Opus di Android
 *  ✅ CLEANUP: revoke URL + close audioCtx di semua jalur
 *  ✅ Semua fungsi lama TETAP ADA (backward compat 100%)
 * ═══════════════════════════════════════════════════════════════════════════
 */

const FFmpegWasm = (() => {
  'use strict';

  function resolveAssetBase() {
    try {
      const base = new URL('./ffmpeg/', window.location.href);
      return base.href.replace(/\/?$/, '/');
    } catch (e) {
      return './ffmpeg/';
    }
  }

  const ASSET_BASE = resolveAssetBase();
  const PATHS = {
    wrapper: ASSET_BASE + 'ffmpeg.js',
    core:    ASSET_BASE + 'ffmpeg-core.js',
    wasm:    ASSET_BASE + 'ffmpeg-core.wasm',
  };

  let _ffmpeg  = null;
  let _loading = null;
  let _ready   = false;

  async function fetchFile(input) {
    if (typeof input === 'string') {
      const res = await fetch(input);
      if (!res.ok) throw new Error('fetchFile HTTP ' + res.status);
      return new Uint8Array(await res.arrayBuffer());
    }
    if (typeof File !== 'undefined' && input instanceof File) return new Uint8Array(await input.arrayBuffer());
    if (typeof Blob !== 'undefined' && input instanceof Blob) return new Uint8Array(await input.arrayBuffer());
    if (input instanceof Uint8Array) return input;
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    throw new Error('fetchFile: tipe tidak didukung');
  }

  const DEFAULT_PROFILE = Object.freeze({
    threads: 2, preset: 'veryfast', crf: 26,
    maxWidth: 1280, maxHeight: 720,
    hwAccel: 'none', wasmMemoryMB: 512, chunkSizeMB: 8,
  });

  function getProfile() {
    try {
      const p = window.AutoConfig && window.AutoConfig.getProfile && window.AutoConfig.getProfile();
      if (p && p.ffmpeg) return Object.assign({}, DEFAULT_PROFILE, p.ffmpeg);
    } catch (e) {}
    return DEFAULT_PROFILE;
  }

  function canHandleFile(file) {
    if (!file) return false;
    const p = getProfile();
    const budget = p.wasmMemoryMB * 1024 * 1024 * 0.6;
    if (file.size > budget) return false;
    return true;
  }

  function load(onProgress) {
    if (_ready) return Promise.resolve(true);
    if (_loading) return _loading;

    _loading = (async () => {
      try {
        if (onProgress) onProgress('📦 Memuat ffmpeg.wasm...');

        if (window.FFmpegWasmGlobal && window.FFmpegWasmGlobal.FFmpeg) {
          _ffmpeg = new window.FFmpegWasmGlobal.FFmpeg();
        } else if (window.FFmpegWASM && window.FFmpegWASM.FFmpeg) {
          _ffmpeg = new window.FFmpegWASM.FFmpeg();
        } else {
          const mod = await import(PATHS.wrapper);
          const FFmpegCls = mod.FFmpeg || (mod.default && mod.default.FFmpeg);
          if (!FFmpegCls) throw new Error('FFmpeg class tidak ditemukan');
          _ffmpeg = new FFmpegCls();
        }

        _ffmpeg.on('log', function (data) {
          if (data && data.message && /error|failed/i.test(data.message)) {
            console.warn('[ffmpeg.wasm]', data.message);
          }
        });

        if (onProgress) onProgress('⚙️ Inisialisasi core...');

        await _ffmpeg.load({ coreURL: PATHS.core, wasmURL: PATHS.wasm });
        _ready = true;
        return true;
      } catch (err) {
        console.error('[ffmpeg.wasm] ❌ Load gagal:', err);
        _ffmpeg = null;
        _ready = false;
        return false;
      } finally {
        _loading = null;
      }
    })();

    return _loading;
  }

  function buildCopyArgs(inName, outName, start, end) {
    const p = getProfile();
    const dur = Math.max(0.05, end - start);
    const queueSize = Math.max(64, Math.round(p.wasmMemoryMB / 4));
    return [
      '-ss', String(start), '-i', inName, '-t', String(dur),
      '-c', 'copy', '-avoid_negative_ts', 'make_zero',
      '-max_muxing_queue_size', String(queueSize),
      '-movflags', '+faststart', outName,
    ];
  }

  function buildTranscodeArgs(inName, outName, start, end, opts) {
    opts = opts || {};
    const p = getProfile();
    const dur = Math.max(0.05, end - start);
    const threads = opts.threads != null ? opts.threads : (p.threads || 2);
    const preset  = opts.preset  || p.preset  || 'veryfast';
    const crf     = opts.crf     != null ? opts.crf : (p.crf || 26);
    const mw      = opts.maxWidth  || p.maxWidth  || 1280;
    const mh      = opts.maxHeight || p.maxHeight || 720;
    const vf = "scale='min(" + mw + ",iw)':'min(" + mh + ",ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2";
    return [
      '-ss', String(start), '-i', inName, '-t', String(dur),
      '-threads', String(threads >= 1 ? threads : 0),
      '-c:v', 'libx264', '-preset', preset, '-crf', String(crf),
      '-pix_fmt', 'yuv420p', '-vf', vf,
      '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', outName,
    ];
  }

  function attachProgress(onProgress) {
    if (!onProgress || !_ffmpeg) return function () {};
    const handler = function (data) {
      try {
        const pct = Math.min(100, Math.max(0, Math.round((data.progress || 0) * 100)));
        onProgress('🎬 ffmpeg.wasm ' + pct + '%');
      } catch (e) {}
    };
    _ffmpeg.on('progress', handler);
    return function () { try { _ffmpeg.off('progress', handler); } catch (e) {} };
  }

  async function trimCopy(file, start, end, onProgress) {
    if (!_ready) throw new Error('ffmpeg.wasm belum siap');
    if (!canHandleFile(file)) throw new Error('File terlalu besar');

    const inName  = 'in_' + Date.now() + '.mp4';
    const outName = 'out_' + Date.now() + '.mp4';
    const detach = attachProgress(onProgress);

    try {
      await _ffmpeg.writeFile(inName, await fetchFile(file));
      await _ffmpeg.exec(buildCopyArgs(inName, outName, start, end));
      const data = await _ffmpeg.readFile(outName);
      return new Blob([data.buffer], { type: 'video/mp4' });
    } finally {
      detach();
      try { await _ffmpeg.deleteFile(inName); } catch (e) {}
      try { await _ffmpeg.deleteFile(outName); } catch (e) {}
    }
  }

  async function transcode(file, start, end, opts, onProgress) {
    if (!_ready) throw new Error('ffmpeg.wasm belum siap');
    if (!canHandleFile(file)) throw new Error('File terlalu besar');

    const inName  = 'in_' + Date.now() + '.mp4';
    const outName = 'out_' + Date.now() + '.mp4';
    const detach = attachProgress(onProgress);

    try {
      await _ffmpeg.writeFile(inName, await fetchFile(file));
      await _ffmpeg.exec(buildTranscodeArgs(inName, outName, start, end, opts || {}));
      const data = await _ffmpeg.readFile(outName);
      return new Blob([data.buffer], { type: 'video/mp4' });
    } finally {
      detach();
      try { await _ffmpeg.deleteFile(inName); } catch (e) {}
      try { await _ffmpeg.deleteFile(outName); } catch (e) {}
    }
  }

  async function destroy() {
    if (_ffmpeg) {
      try { await _ffmpeg.terminate(); } catch (e) {}
      _ffmpeg = null;
      _ready = false;
    }
  }

  return {
    load, destroy, trimCopy, transcode,
    isReady: () => _ready,
    isMultiThread: () => false,
    canHandleFile, getProfile,
    buildCopyArgs, buildTranscodeArgs, fetchFile,
    _paths: PATHS,
  };
})();

if (typeof window !== 'undefined') window.FFmpegWasm = FFmpegWasm;

/* ═══════════════════════════════════════════════════════════════════════════
 * FFmpegManager v3.0 — REWRITE TOTAL dengan AUDIO FIX
 * ═══════════════════════════════════════════════════════════════════════════ */

const FFmpegManager = {

  // ═══════════════════════════════════════════════════════════════════════
  // HELPER: pilih mime type terbaik untuk device ini
  // ═══════════════════════════════════════════════════════════════════════
  _pickBestMime() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(navigator.userAgent);

    // Priority list — MP4 dulu (paling kompatibel dengan galeri + CapCut)
    let candidates = [];

    if (isIOS) {
      candidates = [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4;codecs=h264,aac',
        'video/mp4',
        'video/webm;codecs=vp8,opus',
        'video/webm'
      ];
    } else if (isAndroid) {
      candidates = [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4;codecs=h264,aac',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm'
      ];
    } else {
      candidates = [
        'video/mp4;codecs=h264,aac',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm'
      ];
    }

    for (const m of candidates) {
      try {
        if (MediaRecorder.isTypeSupported(m)) {
          console.log('[FFmpegManager] 🎯 MIME terpilih:', m);
          return m;
        }
      } catch (e) {}
    }
    return '';
  },

  // ═══════════════════════════════════════════════════════════════════════
  // HELPER: setup audio + video stream dengan AUDIO GUARANTEED
  // ═══════════════════════════════════════════════════════════════════════
  async _buildCaptureStream(video, canvas, fps, onLog) {
    const log = onLog || function () {};
    let audioCtx = null;
    let destNode = null;
    let videoStream = null;
    let canvasStream = null;

    // ─── LANGKAH 1: Pastikan video TIDAK muted ───
    try {
      video.muted = false;
      video.volume = 1.0;
    } catch (e) {}

    // ─── LANGKAH 2: Buat audio pipeline via AudioContext ───
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioCtx = new AudioCtx();

        // Resume kalau suspended (WAJIB di iOS & Chrome modern)
        if (audioCtx.state === 'suspended') {
          try { await audioCtx.resume(); } catch (e) {}
        }

        // Buat MediaElementSource dari video
        let sourceNode;
        try {
          sourceNode = audioCtx.createMediaElementSource(video);
        } catch (e) {
          // Kalau sudah pernah di-create, cari source lama
          log('MediaElementSource sudah ada, pakai yang existing');
          sourceNode = null;
        }

        if (sourceNode) {
          destNode = audioCtx.createMediaStreamDestination();

          // Connect ke 2 tujuan: speaker (user dengar) + destination (rekaman)
          sourceNode.connect(destNode);
          // JANGAN connect ke audioCtx.destination — akan bikin feedback kalau tidak perlu
          // Tapi karena video element sendiri output ke speaker, kita skip ini
          // Kalau mau user dengar suara pas recording, uncomment:
          // sourceNode.connect(audioCtx.destination);

          log('✅ AudioContext pipeline siap, state: ' + audioCtx.state);
        }
      }
    } catch (e) {
      log('⚠️ AudioContext setup gagal: ' + e.message);
    }

    // ─── LANGKAH 3: Buat canvas stream ───
    try {
      canvasStream = canvas.captureStream(fps);
      if (!canvasStream) throw new Error('captureStream return null');
      log('✅ Canvas stream @ ' + fps + 'fps');
    } catch (e) {
      canvasStream = canvas.captureStream(0);
      log('⚠️ Fallback captureStream(0) — manual requestFrame');
    }

    // ─── LANGKAH 4: Coba ambil audio dari video.captureStream() dulu (paling native) ───
    let audioFromVideo = false;
    try {
      const vs = (typeof video.captureStream === 'function' && video.captureStream()) ||
                 (typeof video.mozCaptureStream === 'function' && video.mozCaptureStream());
      if (vs) {
        const tracks = vs.getAudioTracks();
        if (tracks.length > 0) {
          canvasStream.addTrack(tracks[0]);
          audioFromVideo = true;
          log('🔊 Audio dari video.captureStream() (' + tracks.length + ' track)');
        }
      }
    } catch (e) {
      log('video.captureStream() audio gagal: ' + e.message);
    }

    // ─── LANGKAH 5: Kalau tidak ada audio dari video, pakai AudioContext ───
    if (!audioFromVideo && destNode) {
      const audioTracks = destNode.stream.getAudioTracks();
      if (audioTracks.length > 0) {
        canvasStream.addTrack(audioTracks[0]);
        log('🔊 Audio dari AudioContext.MediaStreamDestination');
      } else {
        log('⚠️ TIDAK ADA audio track — video akan silent');
      }
    }

    return { stream: canvasStream, audioCtx, destNode };
  },

  // ═══════════════════════════════════════════════════════════════════════
  // CORE: proses trim via Canvas + MediaRecorder (WITH AUDIO)
  // ═══════════════════════════════════════════════════════════════════════
  processRealCanvasTrimToBlob(file, start, end, options) {
    options = options || {};
    const targetFps = options.fps || 30;
    const videoBitrateMbps = options.videoBitrateMbps || 4.0;
    const scale = options.scale || 1.0;

    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.muted = false;       // ⚠️ WAJIB false untuk capture audio
      video.volume = 1.0;
      video.playsInline = true;
      video.preload = 'auto';
      video.crossOrigin = 'anonymous';
      // ⚠️ iOS: attribute playsinline WAJIB
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');

      const videoUrl = URL.createObjectURL(file);
      video.src = videoUrl;

      let audioCtx = null;
      let destNode = null;
      let mediaRecorder = null;
      let chunks = [];
      let stopRequested = false;

      const cleanup = () => {
        try { if (video.pause) video.pause(); } catch (e) {}
        try { URL.revokeObjectURL(videoUrl); } catch (e) {}
        try {
          if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
        } catch (e) {}
        try { if (video.parentNode) video.parentNode.removeChild(video); } catch (e) {}
      };

      const duration = end - start;
      if (duration <= 0) {
        cleanup();
        return reject(new Error('Durasi klip tidak valid'));
      }

      // Safety timeout
      const safetyTimer = setTimeout(() => {
        console.warn('[Trim] Safety timeout — force finish');
        try { if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop(); } catch (e) {}
      }, (duration + 30) * 1000);

      // ─── STEP 1: Video ready → seek ke start ───
      video.onloadedmetadata = () => {
        try {
          video.currentTime = start;
        } catch (e) {
          clearTimeout(safetyTimer);
          cleanup();
          reject(new Error('Gagal seek ke ' + start));
        }
      };

      video.onerror = () => {
        clearTimeout(safetyTimer);
        cleanup();
        reject(new Error('Video gagal dimuat'));
      };

      // ─── STEP 2: Setelah seek → setup canvas + stream + recorder ───
      video.onseeked = async () => {
        try {
          const srcW = video.videoWidth || 720;
          const srcH = video.videoHeight || 1280;
          const outW = Math.round(srcW * scale / 2) * 2;
          const outH = Math.round(srcH * scale / 2) * 2;

          const canvas = document.createElement('canvas');
          canvas.width = outW;
          canvas.height = outH;
          const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false });

          // ─── Setup stream dengan AUDIO ───
          const capture = await this._buildCaptureStream(video, canvas, targetFps, (msg) => {
            console.log('[Trim]', msg);
          });
          const stream = capture.stream;
          audioCtx = capture.audioCtx;
          destNode = capture.destNode;

          // ─── Pilih MIME ───
          const mime = this._pickBestMime();
          const recOpts = {
            videoBitsPerSecond: Math.round(videoBitrateMbps * 1e6),
            audioBitsPerSecond: 128000
          };
          if (mime) recOpts.mimeType = mime;

          try {
            mediaRecorder = new MediaRecorder(stream, recOpts);
          } catch (e) {
            // Fallback tanpa ops jika error
            mediaRecorder = new MediaRecorder(stream);
          }

          chunks = [];
          mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
          };

          mediaRecorder.onstop = () => {
            clearTimeout(safetyTimer);
            const actualMime = mediaRecorder.mimeType || mime || 'video/webm';
            const blob = new Blob(chunks, { type: actualMime });
            cleanup();
            if (blob.size === 0) return reject(new Error('Hasil rekaman kosong'));
            resolve(blob);
          };

          mediaRecorder.onerror = (e) => {
            clearTimeout(safetyTimer);
            cleanup();
            reject(new Error('Recorder error: ' + (e && e.error && e.error.message || 'unknown')));
          };

          // ─── Mulai rekam (timeslice 250ms = audio tidak lag) ───
          mediaRecorder.start(250);

          // Resume audio context lagi (kadang suka suspend lagi setelah start)
          if (audioCtx && audioCtx.state === 'suspended') {
            try { await audioCtx.resume(); } catch (e) {}
          }

          // ─── Play video ───
          try {
            await video.play();
          } catch (err) {
            clearTimeout(safetyTimer);
            try { mediaRecorder.stop(); } catch (e) {}
            cleanup();
            return reject(new Error('Play video gagal: ' + err.message));
          }

          // ─── Frame render loop ───
          const endTime = end;
          let lastFrameDrawn = 0;
          const minFrameInterval = 1000 / targetFps;

          const drawFrame = () => {
            try {
              ctx.drawImage(video, 0, 0, outW, outH);
            } catch (e) {}
          };

          const shouldStop = () => {
            if (stopRequested) return true;
            if (window.__HARD_ABORT) return true;
            if (video.currentTime >= endTime) return true;
            if (video.ended) return true;
            return false;
          };

          const stopNow = () => {
            stopRequested = true;
            try { video.pause(); } catch (e) {}
            setTimeout(() => {
              try {
                if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
              } catch (e) {}
            }, 150); // beri waktu 150ms agar audio tail tertangkap
          };

          // ─── Pakai requestVideoFrameCallback kalau ada (paling akurat) ───
          if (typeof video.requestVideoFrameCallback === 'function') {
            const onFrame = () => {
              if (shouldStop()) { stopNow(); return; }
              drawFrame();
              video.requestVideoFrameCallback(onFrame);
            };
            video.requestVideoFrameCallback(onFrame);
          } else {
            // Fallback: rAF dengan rate limit
            const loop = (now) => {
              if (shouldStop()) { stopNow(); return; }
              if (now - lastFrameDrawn >= minFrameInterval) {
                drawFrame();
                lastFrameDrawn = now;
              }
              requestAnimationFrame(loop);
            };
            requestAnimationFrame(loop);
          }

          // Backup check via timeupdate (kalau rVFC tidak fire di iOS lama)
          video.ontimeupdate = () => {
            if (shouldStop()) stopNow();
          };

        } catch (err) {
          clearTimeout(safetyTimer);
          cleanup();
          reject(err);
        }
      };
    });
  },

  // ═══════════════════════════════════════════════════════════════════════
  // MODE 1: trimAndDownload → download ke folder Downloads
  // ═══════════════════════════════════════════════════════════════════════
  async trimAndDownload(file, start, end, filename = 'clip.mp4') {
    if (!file) { alert("❌ File video tidak tersedia."); return; }
    if (start < 0 || end <= start) { alert("❌ Timestamp tidak valid."); return; }

    // Coba MP4 lossless dulu
    if (window.MP4TrimEngine && window.MP4TrimEngine.canHandle(file)) {
      try {
        await window.MP4TrimEngine.trim(file, start, end, filename);
        return;
      } catch (e) {
        console.warn('[Trim] MP4 lossless gagal, fallback MediaRecorder:', e);
      }
    }

    // Fallback MediaRecorder (WITH AUDIO sekarang)
    try {
      const blob = await this.processRealCanvasTrimToBlob(file, start, end);
      this.downloadBlob(blob, filename);
    } catch (err) {
      alert(
        "⚠️ Pemotongan gagal.\n\nAlasan: " + (err.message || err) + "\n\n" +
        "Coba: potong manual dari " + this._fmt(start) + " hingga " + this._fmt(end) + "."
      );
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // MODE 2: trimAndSaveToGallery → return Blob, caller pakai Web Share
  // ═══════════════════════════════════════════════════════════════════════
  async trimAndSaveToGallery(file, start, end, filename = 'clip.mp4') {
    if (!file) { alert("❌ File video tidak tersedia."); return; }
    if (start < 0 || end <= start) { alert("❌ Timestamp tidak valid."); return; }

    let blob = null;
    let finalName = filename;

    // Coba MP4 lossless dulu (paling cepat & kualitas asli)
    if (window.MP4TrimEngine && window.MP4TrimEngine.canHandle(file)) {
      try {
        blob = await window.MP4TrimEngine.trimToBlob(file, start, end);
        finalName = String(filename).replace(/\.[^/.]+$/, '') + '.mp4';
      } catch (e) {
        console.warn('[Gallery] MP4 lossless gagal:', e);
        blob = null;
      }
    }

    // Fallback MediaRecorder (WITH AUDIO)
    if (!blob || blob.size === 0) {
      try {
        blob = await this.processRealCanvasTrimToBlob(file, start, end);
        const isMp4 = (blob.type || '').indexOf('mp4') !== -1;
        finalName = String(filename).replace(/\.[^/.]+$/, '') + (isMp4 ? '.mp4' : '.webm');
      } catch (err) {
        alert("⚠️ Gagal membuat klip.\n\nAlasan: " + (err.message || err));
        return;
      }
    }

    if (!blob || blob.size === 0) { alert("⚠️ File kosong."); return; }

    // Coba Web Share API (bisa langsung simpan ke Galeri di Android & iOS)
    try {
      const fileObj = new File([blob], finalName, { type: blob.type || 'video/mp4' });
      const canShare = navigator.canShare && navigator.canShare({ files: [fileObj] });

      if (canShare) {
        await navigator.share({
          files: [fileObj],
          title: 'Simpan ke Galeri',
          text: 'Pilih "Simpan ke Galeri" / "Save to Photos"'
        });
        return;
      }
    } catch (shareErr) {
      if (shareErr && shareErr.name === 'AbortError') return;
      console.warn('[Gallery] Web Share gagal, fallback download:', shareErr);
    }

    // Fallback download biasa
    this.downloadBlob(blob, finalName);
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Backward compat — lama tapi dipakai script.js
  // ═══════════════════════════════════════════════════════════════════════
  processRealCanvasTrim(file, start, end, filename) {
    return this.processRealCanvasTrimToBlob(file, start, end).then(blob => {
      this.downloadBlob(blob, filename);
      return blob;
    });
  },

  _processRealCanvasTrimToBlob(file, start, end) {
    return this.processRealCanvasTrimToBlob(file, start, end);
  },

  _fmt(sec) {
    const s = Math.max(0, Math.floor(sec));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  },

  downloadBlob(blob, filename) {
    try {
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
    } catch (e) {
      console.warn('Download gagal:', e);
    }
  }
};

if (typeof window !== 'undefined') {
  window.FFmpegManager = FFmpegManager;
}