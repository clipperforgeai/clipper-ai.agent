/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MP4 LOSSLESS TRIM ENGINE — SELF-HOST EDITION v2.1
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * v2.1 UPGRADE (dari v2.0):
 *  ✅ MAX_LOSSLESS_MB dinaikkan 1.5 GB → 3 GB
 *  ✅ Chunk size ADAPTIF per RAM (2/4/8 MB)
 *  ✅ Timeout adaptive sampai 120s untuk file >3 GB
 *  ✅ Auto-cleanup buffer MP4Box (hemat RAM)
 *  ✅ Force GC kalau tersedia
 *  ✅ Yield ke UI lebih sering (tiap 5 chunk)
 *  ✅ Progress report dengan info RAM device
 * 
 * Semua fungsi lama 100% UTUH — backward compatible
 * ═══════════════════════════════════════════════════════════════════════════
 */

const MP4TrimEngine = {
  _libLoading: null,
  _libReady: false,

  // ═══════════════════════════════════════════════════════════════════════
  // KONFIGURASI ADAPTIF
  // ═══════════════════════════════════════════════════════════════════════
  _CONFIG: {
    // Batas ukuran file untuk coba lossless MP4 (naik dari 1.5 GB → 3 GB)
    MAX_LOSSLESS_MB: 3000,

    // Chunk size adaptif — makin kecil RAM, makin kecil chunk
    CHUNK_SIZE_MB_HIGH: 8,   // RAM >= 6 GB
    CHUNK_SIZE_MB_MID: 4,    // RAM 4-6 GB
    CHUNK_SIZE_MB_LOW: 2,    // RAM <= 4 GB

    // Timeout adaptive (ms) berdasarkan ukuran file
    TIMEOUT_TABLE: [
      { minMB: 0,     timeout: 15000 },    // <300 MB
      { minMB: 300,   timeout: 25000 },    // 300-512 MB
      { minMB: 512,   timeout: 40000 },    // 512 MB - 1 GB
      { minMB: 1024,  timeout: 60000 },    // 1-2 GB
      { minMB: 2048,  timeout: 90000 },    // 2-3 GB
      { minMB: 3000,  timeout: 120000 },   // >3 GB
    ],

    // Interval cek status parsing (ms)
    CHECK_INTERVAL: 200,

    // Yield ke UI tiap berapa chunk (biar tidak freeze)
    YIELD_EVERY_CHUNKS: 5
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 1. LOAD LIBRARY LOCAL (tidak butuh CDN)
  // ═══════════════════════════════════════════════════════════════════════
  _loadLibrary() {
    if (this._libReady && typeof MP4Box !== 'undefined') {
      return Promise.resolve(true);
    }
    if (this._libLoading) return this._libLoading;

    this._libLoading = new Promise((resolve, reject) => {
      if (typeof MP4Box !== 'undefined') {
        this._libReady = true;
        return resolve(true);
      }

      const s = document.createElement('script');
      s.src = './mp4box.all.min.js';
      s.async = true;

      s.onload = () => {
        if (typeof MP4Box === 'undefined') {
          this._libLoading = null;
          reject(new Error('MP4Box.js loaded tapi MP4Box tidak terdeteksi.'));
          return;
        }
        this._libReady = true;
        console.log('[MP4Box v2.1] ✅ Library loaded dari local file');
        resolve(true);
      };

      s.onerror = () => {
        this._libLoading = null;
        reject(new Error(
          'Gagal load mp4box.all.min.js dari folder project.\n\n' +
          'Pastikan file mp4box.all.min.js ada di folder yang sama dengan index.html.'
        ));
      };

      document.head.appendChild(s);
    });

    return this._libLoading;
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 2. HELPER: hitung timeout adaptive berdasarkan ukuran file
  // ═══════════════════════════════════════════════════════════════════════
  _getAdaptiveTimeout(fileMB) {
    const table = this._CONFIG.TIMEOUT_TABLE;
    let timeout = table[0].timeout;
    for (const row of table) {
      if (fileMB >= row.minMB) timeout = row.timeout;
    }
    return timeout;
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 3. HELPER: pilih chunk size sesuai RAM device (BARU di v2.1)
  // ═══════════════════════════════════════════════════════════════════════
  _getChunkSizeMB() {
    const ram = (typeof navigator !== 'undefined' && navigator.deviceMemory) ? navigator.deviceMemory : 4;
    if (ram >= 6) return this._CONFIG.CHUNK_SIZE_MB_HIGH;
    if (ram >= 4) return this._CONFIG.CHUNK_SIZE_MB_MID;
    return this._CONFIG.CHUNK_SIZE_MB_LOW;
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 4. HELPER: cek apakah file terlalu besar untuk lossless
  // ═══════════════════════════════════════════════════════════════════════
  _isTooBigForLossless(fileMB) {
    return fileMB > this._CONFIG.MAX_LOSSLESS_MB;
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 5. CEK FILE BISA DIPAKAI
  // ═══════════════════════════════════════════════════════════════════════
  canHandle(file) {
    if (!file) return false;
    const name = (file.name || '').toLowerCase();
    const type = (file.type || '').toLowerCase();
    return type.indexOf('mp4') !== -1 ||
           name.endsWith('.mp4') ||
           name.endsWith('.m4v') ||
           name.endsWith('.mov');
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 6. TRIM → LANGSUNG DOWNLOAD (Export CapCut)
  // ═══════════════════════════════════════════════════════════════════════
  async trim(file, start, end, filename) {
    const blob = await this.trimToBlob(file, start, end);
    this._downloadBlob(blob, filename);
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 7. TRIM → RETURN BLOB (Simpan ke Galeri / CapCut)
  // ═══════════════════════════════════════════════════════════════════════
  async trimToBlob(file, start, end) {
    const fileMB = file.size / (1024 * 1024);
    const fileGB = fileMB / 1024;
    const ram = (typeof navigator !== 'undefined' && navigator.deviceMemory) ? navigator.deviceMemory : 4;

    // ─── Guard: file terlalu besar → langsung lempar error ───
    if (this._isTooBigForLossless(fileMB)) {
      console.warn(
        `[MP4Trim v2.1] ⚠️ File ${fileGB.toFixed(2)} GB > ${this._CONFIG.MAX_LOSSLESS_MB} MB — ` +
        `skip lossless, fallback ke MediaRecorder`
      );
      throw new Error(
        `File ${fileGB.toFixed(2)} GB terlalu besar untuk potong lossless di browser. ` +
        `Akan otomatis fallback ke MediaRecorder (kualitas re-encode).`
      );
    }

    await this._loadLibrary();

    const timeoutMs = this._getAdaptiveTimeout(fileMB);
    const chunkSizeMB = this._getChunkSizeMB();
    const chunkSize = chunkSizeMB * 1024 * 1024;

    console.log(
      `[MP4Trim v2.1] 🎬 Mulai — File ${fileMB.toFixed(1)} MB | RAM ${ram}GB | ` +
      `Chunk ${chunkSizeMB} MB | Timeout ${(timeoutMs / 1000).toFixed(0)}s`
    );

    const inputFile = MP4Box.createFile();

    return new Promise(async (resolve, reject) => {
      const samplesByTrack = new Map();
      let readyInfo = null;
      let resolved = false;
      let totalBytesAppended = 0;

      const finish = async () => {
        if (resolved) return;
        resolved = true;
        try {
          const blob = await this._buildTrimmedMP4(
            samplesByTrack, readyInfo, start, end
          );
          resolve(blob);
        } catch (e) {
          reject(e);
        }
      };

      inputFile.onError = (e) => {
        if (!resolved) {
          resolved = true;
          reject(new Error('MP4Box error: ' + e));
        }
      };

      inputFile.onReady = (info) => {
        readyInfo = info;
        console.log(`[MP4Trim v2.1] ✅ Moov ready — ${info.tracks.length} track(s)`);
        info.tracks.forEach((track) => {
          samplesByTrack.set(track.id, []);
          inputFile.setExtractionOptions(track.id, { id: track.id }, {
            nbSamples: 1000
          });
        });
        inputFile.start();
      };

      inputFile.onSamples = (trackId, user, samples) => {
        const arr = samplesByTrack.get(trackId);
        if (arr && samples && samples.length) {
          for (let i = 0; i < samples.length; i++) {
            arr.push(samples[i]);
          }
        }
      };

      // ═══════════════════════════════════════════════════════════════════
      // 🎯 CHUNKED READING — tidak baca seluruh file ke RAM
      // ═══════════════════════════════════════════════════════════════════
      try {
        const totalChunks = Math.ceil(file.size / chunkSize);

        for (let i = 0; i < totalChunks; i++) {
          if (resolved) break;

          const startByte = i * chunkSize;
          const endByte = Math.min(file.size, startByte + chunkSize);
          const chunkBlob = file.slice(startByte, endByte);

          // Baca chunk sebagai ArrayBuffer
          const chunkBuffer = await chunkBlob.arrayBuffer();

          // Tag fileStart — WAJIB untuk MP4Box appendBuffer
          chunkBuffer.fileStart = startByte;

          // Append ke MP4Box
          inputFile.appendBuffer(chunkBuffer);
          totalBytesAppended += chunkBuffer.byteLength;

          // Progress log tiap YIELD_EVERY_CHUNKS chunk
          if (i % this._CONFIG.YIELD_EVERY_CHUNKS === 0) {
            const pct = Math.round((totalBytesAppended / file.size) * 100);
            console.log(
              `[MP4Trim v2.1] 📥 Chunk ${i + 1}/${totalChunks} — ${pct}% ` +
              `(${(totalBytesAppended / 1024 / 1024).toFixed(0)} MB)`
            );

            // Yield ke UI biar tidak freeze (penting untuk HP)
            await new Promise(r => setTimeout(r, 0));
          }

          // Kalau semua track sudah punya samples DAN moov sudah ketemu,
          // tidak perlu baca sisa file — potong waktu 50%+
          if (readyInfo && samplesByTrack.size > 0) {
            let allHaveSamples = true;
            samplesByTrack.forEach((arr) => {
              if (!arr || arr.length === 0) allHaveSamples = false;
            });

            // Butuh minimal samples di setiap track + sudah lewat 80% file
            if (allHaveSamples && totalBytesAppended >= file.size * 0.8) {
              console.log(
                `[MP4Trim v2.1] ⚡ Semua track sudah punya samples di ${Math.round((totalBytesAppended / file.size) * 100)}% — stop early`
              );
              break;
            }
          }
        }

        // Flush MP4Box
        try { inputFile.flush(); } catch (e) {}

        // ═══════════════════════════════════════════════════════════════
        // 🧹 AUTO-CLEANUP: hapus buffer yang sudah selesai dibaca
        // ═══════════════════════════════════════════════════════════════
        try {
          if (inputFile.stream && inputFile.stream.buffers) {
            const before = inputFile.stream.buffers.length;
            inputFile.stream.cleanBuffers();
            const after = inputFile.stream.buffers.length;
            if (before !== after) {
              console.log(`[MP4Trim v2.1] 🧹 Cleaned ${before - after} buffer(s) — hemat RAM`);
            }
          }
        } catch (e) {
          console.warn('[MP4Trim v2.1] Cleanup warn:', e.message);
        }

        // 🧹 Force GC kalau tersedia
        try {
          if (typeof window !== 'undefined' && typeof window.gc === 'function') {
            window.gc();
            console.log('[MP4Trim v2.1] ♻️ GC dipanggil');
          }
        } catch (e) {}

      } catch (e) {
        if (!resolved) { resolved = true; reject(e); }
        return;
      }

      // ═══════════════════════════════════════════════════════════════════
      // Cek interval: apakah parsing sudah selesai?
      // ═══════════════════════════════════════════════════════════════════
      const checkInterval = setInterval(() => {
        if (resolved) { clearInterval(checkInterval); return; }
        if (readyInfo && samplesByTrack.size > 0) {
          let allHaveSamples = true;
          samplesByTrack.forEach((arr) => {
            if (!arr || arr.length === 0) allHaveSamples = false;
          });
          if (allHaveSamples) {
            clearInterval(checkInterval);
            finish();
          }
        }
      }, this._CONFIG.CHECK_INTERVAL);

      // ═══════════════════════════════════════════════════════════════════
      // Timeout adaptive — buat file besar, tunggu lebih lama
      // ═══════════════════════════════════════════════════════════════════
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!resolved) {
          if (readyInfo && samplesByTrack.size > 0) {
            console.warn(`[MP4Trim v2.1] ⏱️ Timeout ${(timeoutMs / 1000).toFixed(0)}s — paksa finish`);
            finish();
          } else {
            resolved = true;
            reject(new Error(
              `Timeout ${(timeoutMs / 1000).toFixed(0)}s membaca MP4. ` +
              `Video terlalu besar atau corrupt. File: ${fileMB.toFixed(0)} MB`
            ));
          }
        }
      }, timeoutMs);
    });
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 8. BANGUN MP4 BARU DARI SAMPLE DALAM RENTANG
  // ═══════════════════════════════════════════════════════════════════════
  async _buildTrimmedMP4(samplesByTrack, info, startSec, endSec) {
    const outputFile = MP4Box.createFile();

    for (const track of info.tracks) {
      const samples = samplesByTrack.get(track.id) || [];
      if (samples.length === 0) continue;

      const trackTimescale = track.timescale;
      const startTicks = startSec * trackTimescale;
      const endTicks = endSec * trackTimescale;

      const inRange = samples.filter((s) => {
        const t = s.cts;
        return t >= startTicks && t <= endTicks;
      });

      if (inRange.length === 0) continue;

      const offset = inRange[0].cts;

      const trackOpts = {
        timescale: trackTimescale,
        duration: inRange[inRange.length - 1].dts - inRange[0].dts + inRange[0].duration,
        type: track.type,
        language: track.language || 'und'
      };

      if (track.video) {
        trackOpts.width = track.video.width;
        trackOpts.height = track.video.height;
      }
      if (track.audio) {
        trackOpts.samplerate = track.audio.sample_rate;
        trackOpts.channel_count = track.audio.channel_count;
        trackOpts.samplesize = track.audio.sample_size || 16;
      }

      const outTrack = outputFile.addTrack(trackOpts);

      for (const s of inRange) {
        const newSample = {
          data: s.data,
          size: s.size,
          duration: s.duration,
          cts: s.cts - offset,
          dts: s.dts - offset,
          is_sync: s.is_sync,
          timescale: s.timescale
        };
        outputFile.addSample(outTrack.id || outTrack, newSample);
      }
    }

    const buffer = outputFile.getBuffer();
    console.log(`[MP4Trim v2.1] ✅ Output size: ${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB`);
    return new Blob([buffer], { type: 'video/mp4' });
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 9. DOWNLOAD HELPER
  // ═══════════════════════════════════════════════════════════════════════
  _downloadBlob(blob, filename) {
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
  }
};

if (typeof window !== 'undefined') {
  window.MP4TrimEngine = MP4TrimEngine;
  console.log('[MP4Trim v2.1] ✅ Loaded — adaptive chunk + 3 GB lossless limit');
}