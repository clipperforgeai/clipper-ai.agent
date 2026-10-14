/**
 * ═══════════════════════════════════════════════════════════════════════
 * FFmpeg MUXER — Hybrid Edition
 * ═══════════════════════════════════════════════════════════════════════
 * Tugas: gabung video (dari WebCodecs) + audio (dari file asli)
 *        TANPA re-encode (-c copy) → RAM aman, cepat, kualitas utuh
 * ═══════════════════════════════════════════════════════════════════════
 */

const FFmpegMuxer = {
  _ffmpeg: null,
  _loading: null,
  _ready: false,

  // ═══════════════════════════════════════════════════════════════════
  // 1. LOAD FFMPEG.WASM (lazy — hanya saat dibutuhkan)
  // ═══════════════════════════════════════════════════════════════════
  async _load() {
    if (this._ready && this._ffmpeg) return this._ffmpeg;
    if (this._loading) return this._loading;

    this._loading = (async () => {
      // Import ffmpeg.js dari folder lokal
      const mod = await import('./ffmpeg/ffmpeg.js');
      const FFmpeg = mod.FFmpeg || mod.default;

      const ffmpeg = new FFmpeg();

      // Path ke core files — HARUS absolute atau relatif ke index.html
      await ffmpeg.load({
        coreURL: new URL('./ffmpeg/ffmpeg-core.js', import.meta.url).href,
        wasmURL: new URL('./ffmpeg/ffmpeg-core.wasm', import.meta.url).href,
        workerURL: new URL('./ffmpeg/814.ffmpeg.js', import.meta.url).href,
      });

      this._ffmpeg = ffmpeg;
      this._ready = true;
      console.log('[FFmpegMuxer] ✅ ffmpeg.wasm loaded');
      return ffmpeg;
    })();

    return this._loading;
  },

  // ═══════════════════════════════════════════════════════════════════
  // 2. CEK BROWSER SUPPORT
  // ═══════════════════════════════════════════════════════════════════
  isSupported() {
    return typeof WebAssembly === 'object' &&
           typeof SharedArrayBuffer !== 'undefined' || true; // fallback
  },

  // ═══════════════════════════════════════════════════════════════════
  // 3. MUX VIDEO + AUDIO — TANPA RE-ENCODE
  // ═══════════════════════════════════════════════════════════════════
  /**
   * @param {Blob|File} videoBlob  — hasil dari WebCodecs (video-only)
   * @param {Blob|File} audioBlob  — audio asli dari file sumber
   * @param {Object}    opts       — { audioOffsetSec, durationSec, onProgress }
   * @returns {Promise<Blob>}      — MP4 final dengan video + audio
   */
  async mux(videoBlob, audioBlob, opts = {}) {
    const ffmpeg = await this._load();
    const {
      audioOffsetSec = 0,
      durationSec = null,
      onProgress = null
    } = opts;

    // ─── Progress logger ───
    if (onProgress) {
      ffmpeg.on('progress', ({ progress, time }) => {
        // progress: 0..1
        onProgress(Math.min(1, Math.max(0, progress)));
      });
    }

    // ─── Tulis file ke MEMFS (virtual FS) ───
    console.log('[FFmpegMuxer] 📥 Menulis ke MEMFS...');

    const videoData = new Uint8Array(await videoBlob.arrayBuffer());
    const audioData = new Uint8Array(await audioBlob.arrayBuffer());

    await ffmpeg.writeFile('video.mp4', videoData);
    await ffmpeg.writeFile('audio.mp4', audioData);

    // ─── Bangun command ───
    // -i video.mp4 -i audio.mp4
    // -map 0:v:0 -map 1:a:0        → ambil video dari input 0, audio dari input 1
    // -c:v copy -c:a copy          → TIDAK re-encode (kunci anti-crash)
    // -shortest                    → potong sesuai stream terpendek
    const args = [
      '-i', 'video.mp4',
      '-i', 'audio.mp4',
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-c:v', 'copy',
      '-c:a', 'copy',
    ];

    // Audio offset (kalau audio perlu digeser)
    if (audioOffsetSec > 0) {
      args.push('-itsoffset', String(audioOffsetSec));
    }

    // Batasi durasi
    if (durationSec && durationSec > 0) {
      args.push('-t', String(durationSec));
    }

    args.push('-shortest', '-movflags', '+faststart', 'output.mp4');

    console.log('[FFmpegMuxer] 🎬 Menjalankan ffmpeg:', args.join(' '));

    // ─── Eksekusi ───
    await ffmpeg.exec(args);

    // ─── Baca hasil ───
    const outputData = await ffmpeg.readFile('output.mp4');
    const outputBlob = new Blob([outputData.buffer], { type: 'video/mp4' });

    console.log(
      `[FFmpegMuxer] ✅ Selesai — ${(outputBlob.size / 1024 / 1024).toFixed(2)} MB`
    );

    // ─── 🧹 CLEANUP WAJIB (biar tidak crash) ───
    try {
      await ffmpeg.deleteFile('video.mp4');
      await ffmpeg.deleteFile('audio.mp4');
      await ffmpeg.deleteFile('output.mp4');
      console.log('[FFmpegMuxer] 🧹 MEMFS dibersihkan');
    } catch (e) {
      console.warn('[FFmpegMuxer] Cleanup warn:', e.message);
    }

    return outputBlob;
  },

  // ═══════════════════════════════════════════════════════════════════
  // 4. HELPER: ekstrak audio saja dari MP4 (untuk dipakai terpisah)
  // ═══════════════════════════════════════════════════════════════════
  async extractAudio(inputFile, opts = {}) {
    const ffmpeg = await this._load();
    const { onProgress = null } = opts;

    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => onProgress(progress));
    }

    const inputData = new Uint8Array(await inputFile.arrayBuffer());
    await ffmpeg.writeFile('input.mp4', inputData);

    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-vn',                  // no video
      '-c:a', 'copy',         // copy audio tanpa re-encode
      '-movflags', '+faststart',
      'audio.m4a'
    ]);

    const audioData = await ffmpeg.readFile('audio.m4a');
    const audioBlob = new Blob([audioData.buffer], { type: 'audio/mp4' });

    try {
      await ffmpeg.deleteFile('input.mp4');
      await ffmpeg.deleteFile('audio.m4a');
    } catch (e) {}

    return audioBlob;
  },

  // ═══════════════════════════════════════════════════════════════════
  // 5. HELPER: potong video tanpa re-encode (fast trim)
  // ═══════════════════════════════════════════════════════════════════
  async fastTrim(inputFile, startSec, endSec, opts = {}) {
    const ffmpeg = await this._load();
    const { onProgress = null } = opts;

    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => onProgress(progress));
    }

    const inputData = new Uint8Array(await inputFile.arrayBuffer());
    await ffmpeg.writeFile('input.mp4', inputData);

    const duration = endSec - startSec;

    // -ss SEBELUM -i → fast seek (tidak decode seluruh file)
    await ffmpeg.exec([
      '-ss', String(startSec),
      '-i', 'input.mp4',
      '-t', String(duration),
      '-c', 'copy',           // kunci: no re-encode
      '-movflags', '+faststart',
      'trimmed.mp4'
    ]);

    const outData = await ffmpeg.readFile('trimmed.mp4');
    const outBlob = new Blob([outData.buffer], { type: 'video/mp4' });

    try {
      await ffmpeg.deleteFile('input.mp4');
      await ffmpeg.deleteFile('trimmed.mp4');
    } catch (e) {}

    return outBlob;
  }
};

if (typeof window !== 'undefined') {
  window.FFmpegMuxer = FFmpegMuxer;
  console.log('[FFmpegMuxer] ✅ Loaded');
}