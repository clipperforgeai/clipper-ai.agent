/**
 * ============================================================================
 * CLIPPER FORGE - LOCAL WHISPER TRANSCRIBE ADD-ON (v1.1 - Dynamic Language)
 * ============================================================================
 * Menggunakan Transformers.js (ONNX Runtime / WebAssembly) untuk menjalankan
 * model Whisper secara 100% lokal di browser dengan deteksi bahasa dinamis
 * berdasarkan pilihan Region/Language di aplikasi utama.
 * ============================================================================
 */
(function () {
  'use strict';
  if (window.__WHISPER_ADDON_LOADED) return;
  window.__WHISPER_ADDON_LOADED = true;

  console.log('[WhisperAddon] 🎙️ Modul Local Whisper Transcribe (Dynamic Lang) dimuat...');

  // 1. Inject UI Button ke dalam Aplikasi secara Otomatis
  function injectWhisperUI() {
    const targetSection = document.getElementById('btnGenerate') || document.querySelector('.card');
    if (!targetSection || document.getElementById('whisperAddonPanel')) return;

    const panel = document.createElement('div');
    panel.id = 'whisperAddonPanel';
    panel.style.cssText = 'margin-top:10px;';
    
    panel.innerHTML = `
      <button id="btnRunWhisper" type="button" style="width:100%; padding:11px; background:linear-gradient(135deg,#7c3aed,#6d28d9); color:#fff; border:none; border-radius:8px; font-size:0.82rem; font-weight:700; cursor:pointer; box-shadow:0 4px 12px rgba(124,58,237,0.3);">
        🎙️ Auto-Transcribe (Local Whisper AI)
      </button>
      <div id="whisperProgress" style="display:none; margin-top:6px; font-size:0.72rem; color:var(--text-sub); text-align:center;">
        Memuat model Whisper & memproses audio...
      </div>
    `;

    targetSection.parentNode.insertBefore(panel, targetSection.nextSibling);
    document.getElementById('btnRunWhisper').addEventListener('click', runLocalWhisper);
  }

  // 2. Ekstraksi Audio ke 16kHz Float32Array (Standar yang dibutuhkan Whisper)
  async function extractAudioFromFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0); // Ambil channel audio mono
    await audioCtx.close();
    return channelData;
  }

  // 3. Eksekusi Utama Whisper AI di Browser dengan Mapping Bahasa Dinamis
  async function runLocalWhisper() {
    if (!window.currentVideoFile) {
      alert('⚠️ Silakan pilih atau unggah video terlebih dahulu!');
      return;
    }

    const btn = document.getElementById('btnRunWhisper');
    const progressEl = document.getElementById('whisperProgress');
    
    btn.disabled = true;
    btn.textContent = '⏳ Menyiapkan AI Whisper...';
    progressEl.style.display = 'block';
    progressEl.textContent = 'Memuat library Transformers.js & model Whisper...';

    if (window.updateStatus) window.updateStatus('🎙️ Memuat model Whisper AI...');

    try {
      // Dynamic import Transformers.js dari CDN resmi
      const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0');

      progressEl.textContent = 'Mengunduh/Memuat model AI (Xenova/whisper-tiny)...';
      
      // Menggunakan model whisper-tiny agar proses cepat dan ringan di browser
      const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
        device: 'webgpu' in navigator ? 'webgpu' : 'wasm'
      });

      progressEl.textContent = 'Mengekstrak audio video (16kHz)...';
      const audioData = await extractAudioFromFile(window.currentVideoFile);

      progressEl.textContent = 'Mentranskrip audio (bisa memakan waktu beberapa detik)...';
      if (window.updateStatus) window.updateStatus('🎙️ Sedang mentranskrip suara...');

      // ── MAPPING BAHASA DINAMIS DARI REGION SELECT ──
      const regionSelect = document.getElementById('regionSelect');
      let whisperLang = 'indonesian'; // Default aman

      if (regionSelect) {
        const selectedVal = regionSelect.value.toLowerCase();
        if (selectedVal.includes('en') || selectedVal.includes('us') || selectedVal.includes('gb') || selectedVal.includes('ca')) {
          whisperLang = 'english'; // Whisper mendukung 'english' untuk en-US, en-GB, en-CA
        } else if (selectedVal.includes('id')) {
          whisperLang = 'indonesian';
        } else if (selectedVal === 'auto') {
          whisperLang = null; // Biarkan Whisper melakukan Auto-Detect bahasa secara otomatis
        }
      }

      const transcribeOptions = {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true,
        task: 'transcribe'
      };

      if (whisperLang) {
        transcribeOptions.language = whisperLang;
      }

      console.log(`[WhisperAddon] Target bahasa transkrip: ${whisperLang || 'Auto-Detect'}`);

      // Jalankan transkrip otomatis sesuai konfigurasi bahasa
      const output = await transcriber(audioData, transcribeOptions);

      console.log('[WhisperAddon] Hasil transkrip:', output);

      // Sinkronkan hasil transkrip ke dalam data klip yang sudah dibuat aplikasi
      if (window.allClipsData && window.allClipsData.length > 0 && output.chunks) {
        window.allClipsData.forEach(clip => {
          const matchedChunks = output.chunks.filter(c => c.timestamp[0] >= clip.rawStart && c.timestamp[1] <= clip.rawEnd);
          if (matchedChunks.length > 0) {
            const fullText = matchedChunks.map(c => c.text.trim()).join(' ');
            if (fullText) {
              clip.edited.caption = fullText; // Memperbarui caption klip dengan teks transkrip asli
            }
          }
        });

        // Perbarui tampilan halaman aplikasi jika fungsi render tersedia
        if (typeof window.renderPage === 'function') {
          window.renderPage();
        }
      }

      progressEl.textContent = '✅ Transkrip selesai & disinkronkan ke klip!';
      if (window.updateStatus) {
        window.updateStatus('✅ Transkrip Whisper selesai');
        setTimeout(() => window.updateStatus('Ready'), 3000);
      }
      btn.textContent = '✨ Transkrip Selesai (Ulangi)';

    } catch (err) {
      console.error('[WhisperAddon] Error:', err);
      progressEl.textContent = '❌ Gagal: ' + err.message;
      alert('Gagal menjalankan Whisper: ' + err.message);
      btn.textContent = '🎙️ Auto-Transcribe (Local Whisper AI)';
      if (window.updateStatus) window.updateStatus('❌ Gagal transkrip');
    } finally {
      btn.disabled = false;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(injectWhisperUI, 1200));
  } else {
    setTimeout(injectWhisperUI, 1200);
  }
})();
