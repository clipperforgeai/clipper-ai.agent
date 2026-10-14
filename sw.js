/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AI CLIPPER AGENT — SERVICE WORKER v2.7.3
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * v2.7.3 UPDATE (dari v2.6.1):
 *  ✅ Tambah file hybrid layer baru (webcodecs, smart-trimmer, trim-router)
 *  ✅ Tambah path ROOT ffmpeg (ffmpeg.js, ffmpeg-core.js, 814.ffmpeg.js)
 *  ✅ KEEP path lama ./ffmpeg/* — sebagai fallback kalau nanti pindah folder
 *  ✅ Tambah clipper-core.js, whisper-addon.js, mp4-muxer.min.js
 *  ✅ Cache stats lebih detail (tampilkan file mana yang gagal)
 *  ✅ Retry logic: file gagal dicoba ulang di fetch handler
 *  ✅ SEMUA kode v2.6.1 TETAP UTUH — backward compatible
 * ═══════════════════════════════════════════════════════════════════════════
 */

let CACHE_NAME = 'ai-agent-cache-init';
const AI_CACHE_NAME = 'ai-agent-models-v1';
const LLM_CACHE_NAME = 'ai-agent-llm-models-v1';
const FAILED_CACHE_NAME = 'ai-agent-failed-v1';   // 🆕 track file yang gagal

// ═══════════════════════════════════════════════════════════
// NETWORK_FIRST — file yang selalu cek versi baru dulu
// ═══════════════════════════════════════════════════════════
const NETWORK_FIRST = [
  'version.json',
  'update-auto.js',
  'version-registry.js',
  'version-badge.js',
  'sw.js',
  'index.html',
  'app.html'
];

// ═══════════════════════════════════════════════════════════
// CORE_ASSETS — semua file yang dicoba di-cache saat install
//
// ⚠️ CATATAN: kalau file tidak ada, cache.add() akan gagal
//     dan di-skip (tidak crash). Aman untuk daftar panjang.
// ═══════════════════════════════════════════════════════════
const CORE_ASSETS = [
  // ─── HTML & CSS ───
  './', './index.html', './app.html', './terms.html', './privacy.html',
  './style.css', './premium-ui.css',

  // ─── Core Layer ───
  './script.js', './resource-manager.js', './video-signal-engine.js', './hooks-db.js',
  './clipper-core.js',                                    // 🆕 tambah

  // ─── Media Layer (root — struktur baru) ───
  './mp4-trim.js', './mp4box.all.min.js',
  './mp4-muxer.min.js',                                   // 🆕 mp4 muxer library
  
  // ─── FFmpeg (ROOT — struktur baru yang benar) ───
  './ffmpeg.js',                                          // ✅ sudah ada
  './ffmpeg-core.js',                                     // 🆕 path benar
  './ffmpeg-core.wasm',                                   // 🆕 path benar
  './814.ffmpeg.js',                                      // 🆕 worker chunk
  
  // ─── FFmpeg (FOLDER — struktur lama, tetap dicoba) ───
  './ffmpeg/ffmpeg.js',
  './ffmpeg/ffmpeg-core.js',
  './ffmpeg/ffmpeg-core.wasm',
  './ffmpeg/814.ffmpeg.js',                               // 🆕 konsisten

  // ─── UI Enhancement ───
  './features-v2.js', './turbo-mode.js', './auto-save.js',

  // ─── AI Unified Layer ───
  './ai.js', './ai-bridge.js', './ai-worker.js',

  // ─── LLM Engine + Auto Config ───
  './llm-engine.js', './llm-cache.js', './llm-patch.js',
  './auto-config.js', './auto-config-backup.js',
  './main.js',

  // ─── 🆕 HYBRID TRIM LAYER (baru di v2.7.2) ───
  './webcodecs-trimmer.js',
  './smart-trimmer.js',
  './trim-router.js',
  './ffmpeg-muxer.js',                                    // nama dengan dash
  './ffmpeg.muxer.js',                                    // nama dengan titik (kalau ada)

  // ─── Version & Update ───
  './version-registry.js', './update-auto.js', './version-badge.js',
  './version.json', './manifest.json',

  // ─── Speech Recognition Layer ───
  './whisper-auto.js', './whisper-addon.js',              // 🆕 whisper-addon

  // ─── Enhancement ───
  './upgrades-v26.js',

  // ─── Icons (opsional — kalau ada) ───
  './icon-192.png', './icon-512.png'
];

// ═══════════════════════════════════════════════════════════
// AI / LLM MODEL HOSTS
// ═══════════════════════════════════════════════════════════
const AI_MODEL_HOSTS = [
  'storage.googleapis.com',
  'cdn.jsdelivr.net',
  'unpkg.com'
];

const LLM_MODEL_HOSTS = [
  'huggingface.co',
  'cdn-lfs.huggingface.co'
];

// ═══════════════════════════════════════════════════════════
// VERSION NAME FETCHER
// ═══════════════════════════════════════════════════════════
async function fetchVersionName() {
  try {
    const res = await fetch('./version.json?t=' + Date.now(), { cache: 'no-store' });
    if (res.ok) {
      const info = await res.json();
      return 'ai-agent-cache-v' + (info.version || 'unknown');
    }
  } catch (e) {}
  return 'ai-agent-cache-fallback';
}

// ═══════════════════════════════════════════════════════════
// 🆕 HELPER: track file yang gagal cache (biar bisa di-retry)
// ═══════════════════════════════════════════════════════════
async function recordFailedAsset(asset, reason) {
  try {
    const cache = await caches.open(FAILED_CACHE_NAME);
    await cache.put(
      new Request('./__failed__/' + encodeURIComponent(asset)),
      new Response(JSON.stringify({ asset, reason, ts: Date.now() }),
        { headers: { 'Content-Type': 'application/json' } })
    );
  } catch (e) {}
}

async function clearFailedAssets() {
  try { await caches.delete(FAILED_CACHE_NAME); } catch (e) {}
}

async function listFailedAssets() {
  try {
    const cache = await caches.open(FAILED_CACHE_NAME);
    const keys = await cache.keys();
    const out = [];
    for (const req of keys) {
      const res = await cache.match(req);
      if (res) {
        try { out.push(await res.json()); } catch (e) {}
      }
    }
    return out;
  } catch (e) {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════
// INSTALL
// ═══════════════════════════════════════════════════════════
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    CACHE_NAME = await fetchVersionName();
    console.log('[SW] 📦 Installing:', CACHE_NAME);

    const cache = await caches.open(CACHE_NAME);
    let ok = 0, fail = 0;
    const failedList = [];

    for (const asset of CORE_ASSETS) {
      try {
        await cache.add(asset);
        ok++;
      } catch (e) {
        fail++;
        failedList.push(asset);
        // Record untuk info debug (tidak crash)
        await recordFailedAsset(asset, e.message || 'fetch failed');
      }
    }

    console.log(`[SW] ✅ Cached ${ok}/${CORE_ASSETS.length} (${fail} skipped)`);

    // Tampilkan daftar file yang gagal (hanya di console, tidak crash)
    if (failedList.length > 0) {
      console.log(
        '%c[SW] ℹ️ File tidak ter-cache (normal kalau tidak ada di folder):',
        'color:#f59e0b;font-weight:bold;'
      );
      console.log(failedList.join('\n  '));
    }

    await self.skipWaiting();
  })());
});

// ═══════════════════════════════════════════════════════════
// ACTIVATE
// ═══════════════════════════════════════════════════════════
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const toDelete = keys.filter(k =>
      k !== CACHE_NAME &&
      k !== AI_CACHE_NAME &&
      k !== LLM_CACHE_NAME &&
      k !== FAILED_CACHE_NAME
    );

    if (toDelete.length > 0) {
      await Promise.all(toDelete.map(k => caches.delete(k)));
      console.log('[SW] 🗑 Cache lama dihapus:', toDelete.length);
    }

    await self.clients.claim();
    console.log('[SW] ✅ Activated:', CACHE_NAME);
  })());
});

// ═══════════════════════════════════════════════════════════
// FETCH
// ═══════════════════════════════════════════════════════════
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // ─── Skip cache untuk skema non-http ───
  if (!url.protocol.startsWith('http')) return;

  // ─── LLM MODELS ───
  if (LLM_MODEL_HOSTS.some(h => url.hostname.includes(h))) {
    event.respondWith(
      caches.open(LLM_CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(res => {
            if (res && res.status === 200) cache.put(event.request, res.clone()).catch(() => {});
            return res;
          }).catch(() => new Response('', { status: 503 }));
        })
      )
    );
    return;
  }

  // ─── AI MODELS ───
  if (AI_MODEL_HOSTS.some(h => url.hostname === h)) {
    event.respondWith(
      caches.open(AI_CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(res => {
            if (res && res.status === 200) cache.put(event.request, res.clone()).catch(() => {});
            return res;
          }).catch(() => new Response('', { status: 503 }));
        })
      )
    );
    return;
  }

  // ─── NETWORK_FIRST (untuk file yang perlu selalu fresh) ───
  const isNetworkFirst = isSameOrigin && NETWORK_FIRST.some(f =>
    url.pathname.endsWith('/' + f) || url.pathname.endsWith(f)
  );

  if (isNetworkFirst) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(event.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // ─── CACHE-FIRST (default) ───
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(res => {
        if (res && res.status === 200 && isSameOrigin) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone)).catch(() => {});
        }
        return res;
      }).catch(() => {
        // Fallback terakhir: index.html untuk navigasi
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('', { status: 503 });
      });
    })
  );
});

// ═══════════════════════════════════════════════════════════
// MESSAGE ROUTER — semua handler lama + baru
// ═══════════════════════════════════════════════════════════
self.addEventListener('message', (event) => {
  if (!event.data) return;

  // ─── SKIP_WAITING (lama) ───
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  // ─── CLEAR_CACHE (lama) ───
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    })());
    return;
  }

  // ─── CLEAR_AI_MODELS (lama) ───
  if (event.data.type === 'CLEAR_AI_MODELS') {
    event.waitUntil(caches.delete(AI_CACHE_NAME));
    return;
  }

  // ─── CLEAR_LLM_MODELS (lama) ───
  if (event.data.type === 'CLEAR_LLM_MODELS') {
    event.waitUntil(caches.delete(LLM_CACHE_NAME));
    return;
  }

  // ─── GET_VERSION (lama) ───
  if (event.data.type === 'GET_VERSION') {
    event.waitUntil((async () => {
      const v = await fetchVersionName();
      if (event.source && event.source.postMessage) {
        event.source.postMessage({
          type: 'VERSION_INFO',
          cacheName: v,
          currentCache: CACHE_NAME
        });
      }
    })());
    return;
  }

  // ─── GET_AI_CACHE_INFO (lama) ───
  if (event.data.type === 'GET_AI_CACHE_INFO') {
    event.waitUntil((async () => {
      try {
        const cache = await caches.open(AI_CACHE_NAME);
        const keys = await cache.keys();
        const llmCache = await caches.open(LLM_CACHE_NAME);
        const llmKeys = await llmCache.keys();
        if (event.source && event.source.postMessage) {
          event.source.postMessage({
            type: 'AI_CACHE_INFO',
            count: keys.length,
            llmCount: llmKeys.length,
            urls: keys.map(r => r.url)
          });
        }
      } catch (e) {
        if (event.source) {
          event.source.postMessage({
            type: 'AI_CACHE_INFO',
            count: 0, llmCount: 0, urls: []
          });
        }
      }
    })());
    return;
  }

  // ─── LIST_CACHES (lama) ───
  if (event.data.type === 'LIST_CACHES') {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      if (event.source) {
        event.source.postMessage({ type: 'CACHE_LIST', caches: keys });
      }
    })());
    return;
  }

  // ─── 🆕 LIST_FAILED_ASSETS ───
  if (event.data.type === 'LIST_FAILED_ASSETS') {
    event.waitUntil((async () => {
      const failed = await listFailedAssets();
      if (event.source && event.source.postMessage) {
        event.source.postMessage({ type: 'FAILED_ASSETS', assets: failed });
      }
    })());
    return;
  }

  // ─── 🆕 CLEAR_FAILED_ASSETS ───
  if (event.data.type === 'CLEAR_FAILED_ASSETS') {
    event.waitUntil(clearFailedAssets());
    return;
  }

  // ─── 🆕 RETRY_FAILED ───
  // Coba cache ulang file yang gagal (misal user baru taruh file-nya)
  if (event.data.type === 'RETRY_FAILED') {
    event.waitUntil((async () => {
      const failed = await listFailedAssets();
      const cache = await caches.open(CACHE_NAME);
      let retried = 0, ok = 0;

      for (const item of failed) {
        retried++;
        try {
          await cache.add(item.asset);
          ok++;
        } catch (e) {
          // tetap gagal, biarkan tercatat
        }
      }

      await clearFailedAssets();

      // Rekord ulang yang masih gagal
      for (const item of failed) {
        try {
          await cache.match(item.asset);
        } catch (e) {
          await recordFailedAsset(item.asset, 'still failing after retry');
        }
      }

      if (event.source && event.source.postMessage) {
        event.source.postMessage({
          type: 'RETRY_COMPLETE',
          retried,
          ok,
          failed: retried - ok
        });
      }
    })());
    return;
  }

  // ─── 🆕 FORCE_RELOAD_ALL ───
  // Hapus cache & reload semua client
  if (event.data.type === 'FORCE_RELOAD_ALL') {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));

      const clients = await self.clients.matchAll();
      clients.forEach(c => {
        try { c.postMessage({ type: 'RELOAD_NOW' }); } catch (e) {}
      });
    })());
    return;
  }
});

// ═══════════════════════════════════════════════════════════
// CONSOLE BANNER
// ═══════════════════════════════════════════════════════════
console.log(
  '%c[SW v2.7.3] ✅ Loaded — hybrid-aware cache, path ffmpeg lengkap, failed-asset tracking',
  'color:#38bdf8;font-weight:bold;font-size:13px;padding:4px 0;'
);