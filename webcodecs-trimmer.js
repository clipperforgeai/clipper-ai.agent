/**
 * ═══════════════════════════════════════════════════════════════════════
 * WEBCODECS TRIMMER — Hardware-Accelerated Lossless-ish Trim
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Alur:
 *   MP4Box.js  → demux (ambil sample H.264 dari MP4)
 *   VideoDecoder → decode ke VideoFrame (pakai hardware HP)
 *   VideoEncoder → encode ulang (pakai hardware HP)
 *   mp4-muxer  → bungkus jadi MP4 video-only
 * 
 * Hasil: Blob MP4 video-only → kirim ke FFmpegMuxer untuk tempel audio
 * ═══════════════════════════════════════════════════════════════════════
 */

const WebCodecsTrimmer = {

  // ═══════════════════════════════════════════════════════════════════
  // 0. CEK DUKUNGAN BROWSER
  // ═══════════════════════════════════════════════════════════════════
  isSupported() {
    return typeof VideoDecoder !== 'undefined' &&
           typeof VideoEncoder !== 'undefined' &&
           typeof VideoFrame !== 'undefined' &&
           typeof EncodedVideoChunk !== 'undefined';
  },

  // ═══════════════════════════════════════════════════════════════════
  // 1. ENTRY POINT
  // ═══════════════════════════════════════════════════════════════════
  /**
   * @param {File}   file      — file MP4 asli
   * @param {number} startSec  — awal trim (detik)
   * @param {number} endSec    — akhir trim (detik)
   * @param {Object} opts      — { quality: 'high'|'medium'|'low', onProgress }
   * @returns {Promise<Blob>}  — MP4 video-only (belum ada audio)
   */
  async trimVideo(file, startSec, endSec, opts = {}) {
    if (!this.isSupported()) {
      throw new Error(
        'Browser tidak support WebCodecs. Pakai Chrome/Edge 94+, Safari 16.4+, atau Android Chrome modern.'
      );
    }

    const { quality = 'high', onProgress = null } = opts;
    const durationSec = endSec - startSec;

    if (durationSec <= 0) throw new Error('Durasi trim tidak valid.');

    console.log(
      `[WCV Trimmer] 🎬 Trim ${startSec}s → ${endSec}s ` +
      `(${durationSec.toFixed(2)}s) — quality: ${quality}`
    );

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: DEMUX — ambil encoded video samples dari MP4
    // ═══════════════════════════════════════════════════════════════
    const demuxed = await this._demuxVideo(file, startSec, endSec);
    // demuxed = {
    //   samples, codecString, description, width, height, timescale,
    //   firstKeyframeIndex, lastSampleIndex, videoTrackId
    // }

    console.log(
      `[WCV Trimmer] 📦 Demuxed: ${demuxed.samples.length} samples, ` +
      `codec=${demuxed.codecString}, ${demuxed.width}x${demuxed.height}`
    );

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: DECODE → ENCODE (WebCodecs pipeline)
    // ═══════════════════════════════════════════════════════════════
    const videoBlob = await this._transcode(
      demuxed, startSec, endSec, durationSec, quality, onProgress
    );

    console.log(
      `[WCV Trimmer] ✅ Video-only Blob: ` +
      `${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`
    );

    return videoBlob;
  },

  // ═══════════════════════════════════════════════════════════════════
  // 2. DEMUX — MP4Box.js baca sample H.264 dari file
  // ═══════════════════════════════════════════════════════════════════
  _demuxVideo(file, startSec, endSec) {
    return new Promise((resolve, reject) => {
      const mp4 = MP4Box.createFile();

      let videoTrack = null;
      let samples = [];
      let firstKeyframeIndex = -1;
      let lastSampleIndex = -1;
      let done = false;

      const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB per baca
      let offset = 0;

      // ─── Baca file per-chunk biar RAM aman ───
      const readNext = async () => {
        if (done) return;
        if (offset >= file.size) {
          // Selesai baca file, flush
          try { mp4.flush(); } catch (e) {}
          finalize();
          return;
        }

        const end = Math.min(file.size, offset + CHUNK_SIZE);
        const slice = file.slice(offset, end);
        const buf = await slice.arrayBuffer();
        buf.fileStart = offset;
        mp4.appendBuffer(buf);
        offset = end;

        // Yield ke event loop biar UI tidak freeze
        setTimeout(readNext, 0);
      };

      // ─── Saat moov ketemu ───
      mp4.onReady = (info) => {
        if (!info.videoTracks || info.videoTracks.length === 0) {
          reject(new Error('File tidak punya video track.'));
          return;
        }
        videoTrack = info.videoTracks[0];
        console.log(
          `[WCV Trimmer] 📖 Video track #${videoTrack.id}: ` +
          `${videoTrack.video.width}x${videoTrack.video.height}, ` +
          `codec=${videoTrack.codec}, timescale=${videoTrack.timescale}`
        );

        mp4.setExtractionOptions(videoTrack.id, null, { nbSamples: 1000 });
        mp4.start();
      };

      // ─── Saat sample di-extract ───
      mp4.onSamples = (trackId, user, extracted) => {
        if (trackId !== videoTrack.id) return;
        for (const s of extracted) samples.push(s);
      };

      mp4.onError = (e) => reject(new Error('MP4Box error: ' + e));

      // ═══════════════════════════════════════════════════════════════
      // 3. FINALIZE — kumpulkan metadata untuk decoder
      // ═══════════════════════════════════════════════════════════════
      const finalize = () => {
        if (done) return;
        done = true;

        if (samples.length === 0) {
          reject(new Error('Tidak ada sample video yang terbaca.'));
          return;
        }

        // Sort by DTS biar urut (penting untuk decoder)
        samples.sort((a, b) => a.dts - b.dts);

        const ts = videoTrack.timescale;
        const startTicks = startSec * ts;
        const endTicks = endSec * ts;

        // ─── Cari keyframe terakhir SEBELUM startSec ───
        // Decoder WAJIB mulai dari keyframe
        for (let i = 0; i < samples.length; i++) {
          if (samples[i].cts >= startTicks) break;
          if (samples[i].is_sync) firstKeyframeIndex = i;
        }
        // Kalau tidak ada keyframe sebelum start, mulai dari keyframe pertama
        if (firstKeyframeIndex === -1) {
          firstKeyframeIndex = samples.findIndex((s) => s.is_sync);
          if (firstKeyframeIndex === -1) {
            reject(new Error('Tidak ada keyframe di video. Corrupt?'));
            return;
          }
        }

        // ─── Cari sample terakhir SEBELUM endSec ───
        for (let i = samples.length - 1; i >= 0; i--) {
          if (samples[i].cts <= endTicks) {
            lastSampleIndex = i;
            break;
          }
        }
        if (lastSampleIndex === -1) lastSampleIndex = samples.length - 1;

        // ─── Ambil extradata (avcC/hvcC) untuk decoder config ───
        const description = this._extractDescription(mp4, videoTrack);

        resolve({
          samples,
          codecString: videoTrack.codec,
          description,
          width: videoTrack.video.width,
          height: videoTrack.video.height,
          timescale: ts,
          firstKeyframeIndex,
          lastSampleIndex,
          videoTrackId: videoTrack.id
        });
      };

      readNext().catch(reject);
    });
  },

  // ═══════════════════════════════════════════════════════════════════
  // 4. EXTRACT DESCRIPTION (avcC / hvcC box)
  // ═══════════════════════════════════════════════════════════════════
  _extractDescription(mp4, track) {
    try {
      const trak = mp4.getTrackById(track.id);
      const stsd = trak.mdia.minf.stbl.stsd;
      const entry = stsd.entries[0];

      // ─── Cari avcC atau hvcC box ───
      const configBox = entry.avcC || entry.hvcC;
      if (!configBox) return undefined;

      // Serialize config box ke Uint8Array
      const stream = new DataStream(undefined, 0, DataStream.BIG_ENDIAN);
      configBox.write(stream);

      // Buang 8-byte header box (size + type)
      return new Uint8Array(stream.buffer, 8);
    } catch (e) {
      console.warn('[WCV Trimmer] Gagal extract description:', e.message);
      return undefined;
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // 5. TRANSCODE — Decode → Encode → Mux
  // ═══════════════════════════════════════════════════════════════════
  async _transcode(demuxed, startSec, endSec, durationSec, quality, onProgress) {
    const {
      samples, codecString, description, width, height,
      timescale, firstKeyframeIndex, lastSampleIndex
    } = demuxed;

    // ─── Setup bitrate sesuai kualitas ───
    const bitrateMap = {
      high:   8_000_000,
      medium: 4_000_000,
      low:    2_000_000
    };
    const bitrate = bitrateMap[quality] || bitrateMap.medium;

    // ─── Muxer: mp4-muxer untuk bungkus output ───
    const { Muxer, ArrayBufferTarget } = window.Mp4Muxer || {};
    if (!Muxer) {
      throw new Error('mp4-muxer belum diload. Tambahkan <script> mp4-muxer.min.js');
    }

    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: {
        codec: 'avc', // mp4-muxer saat ini fokus H.264
        width,
        height
      },
      fastStart: 'in-memory'
    });

    // ─── Encoder: frame → H.264 chunk ───
    let encodedCount = 0;
    const encoder = new VideoEncoder({
      output: (chunk, metadata) => {
        muxer.addVideoChunk(chunk, metadata);
        encodedCount++;
      },
      error: (e) => {
        console.error('[WCV Trimmer] Encoder error:', e);
      }
    });

    encoder.configure({
      codec: codecString,
      width,
      height,
      bitrate,
      framerate: 30,
      latencyMode: 'quality',
      avc: { format: 'avc' } // AVCC (bukan Annex-B) → kompatibel MP4
    });

    // ─── Decoder: H.264 chunk → frame ───
    const startTimeUs = startSec * 1e6;
    const endTimeUs = endSec * 1e6;
    let decodedCount = 0;
    let encodedReady = 0;
    let keyFrameRequested = true;

    const decoder = new VideoDecoder({
      output: (frame) => {
        try {
          // ─── Filter frame di luar range ───
          const tsUs = frame.timestamp;
          if (tsUs < startTimeUs || tsUs > endTimeUs) {
            frame.close();
            return;
          }

          // ─── Paksa keyframe di frame pertama ───
          const isFirst = encodedCount === 0;
          encoder.encode(frame, { keyFrame: isFirst || keyFrameRequested });
          keyFrameRequested = false;

          frame.close();
          decodedCount++;

          // ─── Progress ───
          if (onProgress && decodedCount % 30 === 0) {
            const pct = Math.min(
              0.99,
              (tsUs - startTimeUs) / (endTimeUs - startTimeUs)
            );
            onProgress(Math.max(0, pct));
          }
        } catch (e) {
          console.error('[WCV Trimmer] Frame handling error:', e);
          try { frame.close(); } catch (_) {}
        }
      },
      error: (e) => {
        console.error('[WCV Trimmer] Decoder error:', e);
      }
    });

    decoder.configure({
      codec: codecString,
      description,
      codedWidth: width,
      codedHeight: height,
      hardwareAcceleration: 'prefer-hardware'
    });

    // ═══════════════════════════════════════════════════════════════
    // 6. FEED SAMPLES KE DECODER
    // ═══════════════════════════════════════════════════════════════
    // Mulai dari keyframe, berhenti di lastSampleIndex
    for (let i = firstKeyframeIndex; i <= lastSampleIndex; i++) {
      const s = samples[i];
      const timestampUs = Math.round((s.cts / timescale) * 1e6);
      const durationUs = Math.round((s.duration / timescale) * 1e6);

      const chunk = new EncodedVideoChunk({
        type: s.is_sync ? 'key' : 'delta',
        timestamp: timestampUs,
        duration: durationUs,
        data: s.data
      });

      decoder.decode(chunk);
    }

    // ═══════════════════════════════════════════════════════════════
    // 7. FLUSH — tunggu sampai semua frame diproses
    // ═══════════════════════════════════════════════════════════════
    await decoder.flush();
    await encoder.flush();

    decoder.close();
    encoder.close();

    muxer.finalize();

    console.log(
      `[WCV Trimmer] 🎞️ Decoded: ${decodedCount} frames, ` +
      `Encoded: ${encodedCount} chunks`
    );

    if (onProgress) onProgress(1);

    const buffer = muxer.target.buffer;
    return new Blob([buffer], { type: 'video/mp4' });
  }
};

if (typeof window !== 'undefined') {
  window.WebCodecsTrimmer = WebCodecsTrimmer;
  console.log('[WebCodecsTrimmer] ✅ Loaded');
}