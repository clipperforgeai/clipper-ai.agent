/**
 * AI CLIPPER AGENT v2.6 — SPEECH RECOGNITION (Web Speech API)
 *
 * CATATAN JUJUR:
 *  - Ini BUKAN Whisper. Ini pakai Web Speech Recognition bawaan browser.
 *  - Input = MICROPHONE, bukan audio file langsung.
 *  - Kualitas tergantung perangkat, browser, dan akurasi mic.
 *  - Hasil = eksperimental, JANGAN diklaim sebagai transkrip final.
 *  - Kalau browser tidak support, fallback ke null (kompatibel kode lama).
 *
 * v2.6 UPDATE:
 *  ✅ Language mapping (id-ID, en-US, en-GB, en-CA)
 *  ✅ Cap max segments (cegah RAM blow)
 *  ✅ Hormati startAt/endAt (tidak reset currentTime sembarangan)
 *  ✅ Auto-stop di endAt klip
 *  ✅ Log jujur: bukan Whisper, bukan transkrip resmi
 */

(function () {
  'use strict';
  if (window.__WHISPER_AUTO_LOADED) return;
  window.__WHISPER_AUTO_LOADED = true;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SR) {
    console.log('[SpeechRec v2.6] ❌ SpeechRecognition tidak tersedia di browser ini');
    window.WhisperAutoEngine = null;
    return;
  }

  const MAX_SEGMENTS = 500;
  const LANG_MAP = {
    'id-ID': 'id-ID',
    'en-US': 'en-US',
    'en-GB': 'en-GB',
    'en-CA': 'en-CA',
    'id': 'id-ID',
    'en': 'en-US'
  };

  const WhisperAuto = {
    available: true,
    recognition: null,
    isListening: false,

    /**
     * Rekam suara via microphone saat video diputar.
     * @param {HTMLVideoElement} video
     * @param {object} opts - { lang, startAt, endAt, onResult, onError, onEnd }
     * @returns {Promise<Array<{t:number, text:string}>>}
     */
    async transcribeVideo(video, opts = {}) {
      if (!SR) throw new Error('SpeechRecognition tidak tersedia');
      if (this.isListening) throw new Error('Transkripsi sedang berjalan');

      const lang = LANG_MAP[opts.lang] || 'id-ID';
      const startAt = (typeof opts.startAt === 'number') ? opts.startAt : 0;
      const endAt = (typeof opts.endAt === 'number') ? opts.endAt : null;
      const segments = [];

      console.log(`[SpeechRec v2.6] 🎙️ Mulai — lang=${lang}, range=${startAt.toFixed(2)}..${endAt ? endAt.toFixed(2) : 'end'}`);
      console.log('[SpeechRec v2.6] ⚠️ Ini Web Speech API (mic-based), BUKAN Whisper, hasil eksperimental.');

      return new Promise((resolve, reject) => {
        const rec = new SR();
        this.recognition = rec;
        rec.lang = lang;
        rec.continuous = true;
        rec.interimResults = false;
        rec.maxAlternatives = 1;

        let originTime = startAt;

        rec.onresult = (event) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (!event.results[i].isFinal) continue;
            const text = event.results[i][0].transcript.trim();
            if (!text) continue;

            // Hitung t relatif terhadap startAt
            const currentTime = video.currentTime;
            const t = Math.max(0, currentTime - originTime);

            if (segments.length < MAX_SEGMENTS) {
              segments.push({ t, text, confidence: event.results[i][0].confidence });
              if (opts.onResult) opts.onResult({ t, text });
            }
          }
        };

        rec.onerror = (e) => {
          console.warn('[SpeechRec v2.6] ⚠️', e.error);
          if (opts.onError) opts.onError(e);
          if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
            this.isListening = false;
            reject(new Error('Izin microphone ditolak'));
          }
        };

        rec.onend = () => {
          this.isListening = false;
          if (opts.onEnd) opts.onEnd(segments);
          resolve(segments);
        };

        // Hormati posisi klip
        try {
          video.pause();
          video.currentTime = startAt;
        } catch (e) {}

        // Auto-stop ketika sampai endAt
        let stopCheck = null;
        if (typeof endAt === 'number' && endAt > startAt) {
          stopCheck = setInterval(() => {
            if (video.currentTime >= endAt || video.ended || video.paused) {
              clearInterval(stopCheck);
              try { video.pause(); } catch (e) {}
              try { rec.stop(); } catch (e) {}
            }
          }, 250);
        }

        video.play().then(() => {
          try {
            rec.start();
            this.isListening = true;
          } catch (e) {
            if (stopCheck) clearInterval(stopCheck);
            reject(e);
          }
        }).catch((err) => {
          if (stopCheck) clearInterval(stopCheck);
          reject(err);
        });
      });
    },

    stop() {
      if (this.recognition && this.isListening) {
        try { this.recognition.stop(); } catch (e) {}
        this.isListening = false;
      }
    },

    findSegmentsInRange(segments, start, end) {
      return segments.filter(s => s.t >= start && s.t <= end);
    },

    buildTextFromRange(segments, start, end, maxChars = 200) {
      const inRange = this.findSegmentsInRange(segments, start, end);
      const text = inRange.map(s => s.text).join(' ');
      return text.length > maxChars ? text.slice(0, maxChars) + '...' : text;
    }
  };

  window.WhisperAutoEngine = WhisperAuto;
  console.log('[SpeechRec v2.6] ✅ Siap — pakai Web Speech API (mic), hasil eksperimental');
})();