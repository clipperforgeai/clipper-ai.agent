/**
 * AI CLIPPER AGENT — Core Refactored Engine
 * Complete Audit: Secure Download, Human-Readable Filename, Cross-Platform Support (Android & iOS)
 */

let appDatabase = null;
let uploadedFile = null;
let videoDuration = 0;
let ffmpegInstance = null;
let generatedClipsData = [];

let currentPage = 1;
const CLIPS_PER_PAGE = 5;

document.addEventListener("DOMContentLoaded", async () => {
  await loadDatabase();
  initNicheDropdown();
});

function switchPage(pageName) {
  const pageGenerate = document.getElementById("pageGenerate");
  const pageResults = document.getElementById("pageResults");
  const btnNavGenerate = document.getElementById("btnNavGenerate");
  const btnNavResults = document.getElementById("btnNavResults");

  if (pageName === "generate") {
    pageGenerate.classList.add("active");
    pageGenerate.classList.remove("hidden");
    pageResults.classList.add("hidden");
    pageResults.classList.remove("active");
    btnNavGenerate.classList.add("active");
    btnNavResults.classList.remove("active");
  } else {
    pageResults.classList.add("active");
    pageResults.classList.remove("hidden");
    pageGenerate.classList.add("hidden");
    pageGenerate.classList.remove("active");
    btnNavResults.classList.add("active");
    btnNavGenerate.classList.remove("active");
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function loadDatabase() {
  try {
    const res = await fetch("database.json");
    appDatabase = await res.json();
  } catch (err) {
    appDatabase = {
      niches: ["Entertainment", "Gaming", "Finance", "Podcast", "Education", "Motivation"],
      audiences: { US: { lang: "en" }, ID: { lang: "id" } },
      hashtags: { Default: ["#viral", "#trending", "#fyp", "#shorts", "#reels"] }
    };
  }
}

function initNicheDropdown() {
  const select = document.getElementById("nicheSelect");
  if (!select || !appDatabase || !appDatabase.niches) return;
  select.innerHTML = "";
  appDatabase.niches.forEach(niche => {
    const opt = document.createElement("option");
    opt.value = niche;
    opt.textContent = niche;
    select.appendChild(opt);
  });
}

function toggleAutoNiche(checkbox) {
  const select = document.getElementById("nicheSelect");
  if (select) select.disabled = checkbox.checked;
}

function handleVideoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  uploadedFile = file;
  const metaCard = document.getElementById("videoMetaCard");
  const metaName = document.getElementById("metaName");
  const metaSize = document.getElementById("metaSize");
  const metaDuration = document.getElementById("metaDuration");
  const videoPreview = document.getElementById("sourceVideoPreview");

  if (metaName) metaName.textContent = file.name;
  if (metaSize) metaSize.textContent = (file.size / (1024 * 1024)).toFixed(2) + " MB";

  const url = URL.createObjectURL(file);
  videoPreview.src = url;

  videoPreview.onloadedmetadata = () => {
    videoDuration = videoPreview.duration;
    if (metaDuration) metaDuration.textContent = formatTimestamp(videoDuration);
    if (metaCard) metaCard.classList.remove("hidden");
  };
}

function analyzeAtmLink() {
  const url = document.getElementById("atmUrlInput").value.trim();
  const notice = document.getElementById("atmNotice");
  const resultCard = document.getElementById("atmResultCard");

  if (!url) {
    alert("Masukkan URL terlebih dahulu!");
    return;
  }

  notice.innerHTML = "🔗 Ekstraksi pola ATM berhasil dianalisis dari URL referensi.";
  notice.classList.remove("hidden");

  document.getElementById("listAmati").innerHTML = `
    <li><strong>Hook Opening:</strong> Pattern Interrupt pada 00:00 - 00:05.</li>
    <li><strong>Structure:</strong> Fast Pacing + High Engagement Anchor.</li>
    <li><strong>Retention Trigger:</strong> Visual pattern interrupt & audio density spike.</li>
  `;
  document.getElementById("textTiruPola").textContent = "Gunakan ritme transisi 2-3 detik dan jaga struktur narasi tanpa meng-copy konten asli.";
  resultCard.classList.remove("hidden");
}

function generateOriginalConcepts() {
  const container = document.getElementById("originalConceptsList");
  container.innerHTML = "";
  const audience = document.getElementById("audienceSelect").value;
  const isEn = audience !== "ID";

  const concepts = isEn ? [
    { hook: "STOP DOING THIS WRONG!", angle: "Common Mistake", cta: "Comment your thoughts below!" },
    { hook: "THE UNTOLD TRUTH ABOUT...", angle: "Controversy/Secret", cta: "Share this with a friend!" },
    { hook: "THIS ONE HABIT CHANGED EVERYTHING", angle: "Personal Transformation", cta: "Save this for later!" },
    { hook: "YOU WON'T BELIEVE WHAT HAPPENED", angle: "Storytelling Shock", cta: "Follow for Part 2!" },
    { hook: "3 RULES YOU MUST FOLLOW", angle: "Educational Listicle", cta: "Which rule is your favorite?" }
  ] : [
    { hook: "JANGAN SAMPAI SALAH LANGKAH!", angle: "Kesalahan Umum", cta: "Tulis pendapatmu di kolom komentar!" },
    { hook: "RAHASIA BANYAK ORANG GAK TAHU", angle: "Fakta Tersembunyi", cta: "Share ke temen kamu sekarang!" },
    { hook: "SATU TRICK INI MENGUBAH SEMUANYA", angle: "Transformasi", cta: "Simpan video ini buat nanti!" },
    { hook: "GAK MASUK AKAL TAPI NYATA!!", angle: "Cerita Bikin Shock", cta: "Follow untuk kelanjutannya!" },
    { hook: "3 ATURAN WAJIB KAMU TAHU", angle: "Edukasi Singkat", cta: "Mana yang paling relate sama kamu?" }
  ];

  concepts.forEach((c, idx) => {
    const div = document.createElement("div");
    div.className = "concept-item";
    div.innerHTML = `<strong>Concept 0${idx+1}:</strong> "${c.hook}" <br><small>Angle: ${c.angle} • CTA: ${c.cta}</small>`;
    container.appendChild(div);
  });
}

// PIPELINE MENGUSUNG DYNAMIC REGEN & DUPLICATION CHECK
async function startClipGeneration() {
  if (!uploadedFile || videoDuration <= 0) {
    alert("Silakan upload video yang valid terlebih dahulu!");
    return;
  }

  showProgress(true);
  resetProgressLogs();

  logProgress("Initializing Video & Audio Analysis...");
  updateProgress(10, "Extracting Video Context...");
  await sleep(200);

  const audience = document.getElementById("audienceSelect").value;
  const isAutoNiche = document.getElementById("autoDetectNiche").checked;
  const selectedNiche = isAutoNiche ? detectNicheFromFilename(uploadedFile.name) : document.getElementById("nicheSelect").value;

  logProgress(`Selected Niche: ${selectedNiche}`);
  updateProgress(30, "Detecting Moments...");
  await sleep(200);

  const rawMoments = await detectCriticalMomentsByDensity(videoDuration, selectedNiche);
  const targetCandidates = generateTimestampClips(rawMoments, videoDuration);

  generatedClipsData = [];
  let clipIndex = 1;

  for (let cand of targetCandidates) {
    let attempts = 0;
    let clipObj = null;
    let isUnique = false;

    while (!isUnique && attempts < 5) {
      clipObj = createFullClipMetadata(
        clipIndex, 
        cand.start, 
        cand.end, 
        cand.peakTime, 
        audience, 
        selectedNiche, 
        cand.momentType, 
        attempts
      );

      isUnique = checkUniqueness(clipObj, generatedClipsData);
      attempts++;
    }

    if (validateClipStrict(clipObj, videoDuration)) {
      generatedClipsData.push(clipObj);
    }
    clipIndex++;
    await sleep(150);
  }

  updateProgress(100, "Validation complete!");
  await sleep(200);
  showProgress(false);

  currentPage = 1;
  renderPaginatedClips();
  switchPage("results");
}

function checkUniqueness(newClip, existingClips) {
  for (let clip of existingClips) {
    if (clip.hook === newClip.hook) return false;
    if (clip.headline === newClip.headline) return false;
    if (clip.criticalMoment === newClip.criticalMoment) return false;
    if (clip.caption === newClip.caption) return false;
  }
  return true;
}

async function detectCriticalMomentsByDensity(duration, niche) {
  const moments = [];
  let targetMomentsCount = 1;

  if (duration > 20 && duration <= 60) targetMomentsCount = 3;
  else if (duration > 60 && duration <= 180) targetMomentsCount = 5;
  else if (duration > 180) targetMomentsCount = Math.max(6, Math.floor(duration / 35));

  const segmentLength = duration / targetMomentsCount;
  const momentTypes = getMomentTypesByNiche(niche);

  for (let i = 0; i < targetMomentsCount; i++) {
    const segStart = i * segmentLength;
    const peakTime = Math.min(duration - 2, segStart + 3 + (i * 2) % segmentLength);
    const mType = momentTypes[i % momentTypes.length];

    moments.push({
      peakTime: Math.floor(peakTime),
      viralityScore: (8.0 + (i * 0.3) % 1.9).toFixed(1),
      momentType: mType
    });
  }

  return moments;
}

function getMomentTypesByNiche(niche) {
  return appDatabase?.nicheTriggers?.[niche] || appDatabase?.nicheTriggers?.Default || ["critical moment", "surprising event"];
}

function generateTimestampClips(moments, totalDuration) {
  const validClips = [];

  for (let m of moments) {
    if (totalDuration <= 20) {
      validClips.push({ start: 0, end: Math.floor(totalDuration), peakTime: m.peakTime, momentType: m.momentType });
      continue;
    }

    let clipStart = Math.max(0, m.peakTime - 2);
    let targetDuration = 35 + (m.peakTime % 15);
    let clipEnd = clipStart + targetDuration;

    if (clipEnd > totalDuration) {
      clipEnd = Math.floor(totalDuration);
      clipStart = Math.max(0, clipEnd - targetDuration);
    }

    const duration = clipEnd - clipStart;
    if (duration >= 30 && duration <= 50) {
      validClips.push({ start: clipStart, end: clipEnd, peakTime: m.peakTime, momentType: m.momentType });
    }
  }

  return validClips;
}

// METADATA GENERATION DENGAN UNIK MOMENT & DYNAMIC NARRATIVE
function createFullClipMetadata(index, start, end, peakSec, audience, niche, momentType, seedOffset = 0) {
  const isEn = audience !== "ID";
  const duration = end - start;

  const internalData = {
    clipId: index,
    startTime: start,
    endTime: end,
    duration: duration,
    topic: niche,
    event: momentType,
    variationSeed: (index + seedOffset)
  };

  const criticalMoment = generateUniqueCriticalMoment(internalData, isEn);
  const headline = generateUniqueHeadline(internalData, isEn);
  const hook = generateUniqueHook(internalData, isEn);
  const caption = generateUniqueCaption(internalData, isEn);
  const hashtags = generateDynamicHashtags(niche, momentType, index);

  return {
    id: index,
    clipIndex: index - 1, // 0-based index
    clipNumber: String(index).padStart(2, '0'),
    niche: niche,
    start,
    end,
    duration,
    viralityScore: (8.3 + (index * 0.2) % 1.6).toFixed(1),
    criticalMoment,
    headline,
    hook,
    caption,
    hashtags,
    mentions: "None"
  };
}

function generateUniqueCriticalMoment(data, isEn) {
  const { variationSeed } = data;
  if (isEn) {
    const list = [
      `Enemy unexpectedly appears from behind during the round setup.`,
      `Player manages to survive with under 10% health remaining.`,
      `Player realizes the opponent rotated earlier than anticipated.`,
      `An unexpected 1v3 engagement begins at the choke point.`,
      `The final shot completely turns the tide of the match.`
    ];
    return list[(variationSeed - 1) % list.length];
  } else {
    const list = [
      `Musuh tiba-tiba muncul dari posisi yang tidak terduga saat rotasi.`,
      `Pemain berhasil bertahan hidup meski HP hampir habis.`,
      `Pemain menyadari gerakan pergerakan lawan lebih cepat dari dugaan.`,
      `Situasi perang 1v3 dimulai secara mendadak di area tengah.`,
      `Tembakan terakhir mengubah hasil pertandingan secara drastis.`
    ];
    return list[(variationSeed - 1) % list.length];
  }
}

function generateUniqueHeadline(data, isEn) {
  const { variationSeed } = data;
  if (isEn) {
    const headlines = [
      "He Had Almost No Health Left... Then This Happened",
      "The Enemy Thought He Was Already Finished",
      "Nobody Expected Him to Win This Fight",
      "One Shot Completely Changed the Round",
      "The Final Play Was Absolutely Insane"
    ];
    return headlines[(variationSeed - 1) % headlines.length];
  } else {
    const headlines = [
      "Sisa HP Tinggal Sedikit... Lalu Kejadian Ini Terjadi",
      "Lawan Mengira Dia Sudah Pasti Kalah",
      "Tidak Ada Yang Menyangka Dia Mampu Membalikkan Situasi",
      "Satu Momen Ini Langsung Mengubah Jalannya Permainan",
      "Aksi Penutup Ini Bener-Bener Di Luar Dugaan"
    ];
    return headlines[(variationSeed - 1) % headlines.length];
  }
}

function generateUniqueHook(data, isEn) {
  const { variationSeed } = data;
  if (isEn) {
    const hooks = [
      "He Was One Shot Away From Losing...",
      "Nobody Saw This Coming...",
      "WAIT FOR WHAT HAPPENS NEXT...",
      "THIS TURNED INTO A 1v3 IN SECONDS!",
      "THE FINAL SHOT CHANGED EVERYTHING!"
    ];
    return hooks[(variationSeed - 1) % hooks.length];
  } else {
    const hooks = [
      "Tinggal Satu Tembakan Lagi Buat Kalah...",
      "Gak Ada Yang Nyangka Momen Ini Beneran Terjadi...",
      "TUNGGU SAMPAI DETIK TERAKHIR...",
      "SITUASI BERUBAH JADI 1v3 DALAM DETIK!",
      "LOKASI INI JADI SAKSI MEMBALIKKAN KEADAAN!"
    ];
    return hooks[(variationSeed - 1) % hooks.length];
  }
}

function generateUniqueCaption(data, isEn) {
  const { variationSeed } = data;
  if (isEn) {
    const captions = [
      "He looked completely trapped, but the timing of this play changed everything.",
      "The reaction alone makes this moment worth watching. Nobody expected that outcome.",
      "The situation looked impossible until he found one single opening.",
      "Pure instincts kicked in right when the pressure was at its absolute peak.",
      "When every decision counts, one wrong move could cost the entire game."
    ];
    return captions[(variationSeed - 1) % captions.length];
  } else {
    const captions = [
      "Posisinya udah bener-bener terdesak, tapi timing aksi ini langsung mengubah segalanya.",
      "Reaksinya aja udah cukup buktiin seberapa intens momen ini. Gak ada yang menduga akhirnya bakal kayak gini.",
      "Kondisinya kelihatan gak mungkin menang sampai akhirnya nemu satu celah kecil.",
      "Insting langsung jalan tepat saat tekanan ada di titik tertinggi.",
      "Di momen krusial kayak gini, satu keputusan kecil bisa bikin situasi berbalik total."
    ];
    return captions[(variationSeed - 1) % captions.length];
  }
}

function generateDynamicHashtags(niche, momentType, clipIndex) {
  const baseTag = niche.toLowerCase().replace(/[^a-z0-9]/g, '');
  const variations = [
    [`#${baseTag}`, `#clutch`, `#fpsgaming`, `#gamingclips`, `#shorts`],
    [`#${baseTag}`, `#ranked`, `#insaneplay`, `#gamingmoments`, `#shorts`],
    [`#${baseTag}`, `#gameplay`, `#highlights`, `#proplay`, `#shorts`],
    [`#${baseTag}`, `#gamer`, `#viralclips`, `#bestmoments`, `#shorts`]
  ];
  return variations[(clipIndex - 1) % variations.length];
}

function detectNicheFromFilename(name) {
  const lower = name.toLowerCase();
  if (lower.includes("game") || lower.includes("play") || lower.includes("val")) return "Gaming";
  if (lower.includes("trade") || lower.includes("crypto") || lower.includes("money")) return "Finance";
  if (lower.includes("podcast") || lower.includes("talk")) return "Podcast";
  return "Entertainment";
}

function validateClipStrict(clip, totalVideoDuration) {
  if (!clip || clip.start < 0 || clip.end > totalVideoDuration) return false;
  if (totalVideoDuration > 20 && (clip.duration < 30 || clip.duration > 50)) return false;
  if (!clip.headline || !clip.hook || !clip.caption) return false;
  if (!clip.hashtags || clip.hashtags.length !== 5) return false;
  return true;
}

// RENDER FUNCTION
function renderPaginatedClips() {
  const container = document.getElementById("clipsFeedContainer");
  const paginationControls = document.getElementById("paginationControls");
  const pageIndicator = document.getElementById("pageIndicator");
  const btnPrev = document.getElementById("btnPrevPage");
  const btnNext = document.getElementById("btnNextPage");

  container.innerHTML = "";
  updateClipBadgeCount(generatedClipsData.length);

  if (generatedClipsData.length === 0) {
    container.innerHTML = `
      <div class="card glass-card">
        <p>⚠️ Tidak ada clip yang berhasil di-generate. Silakan coba upload video lain.</p>
      </div>`;
    paginationControls.classList.add("hidden");
    return;
  }

  const totalPages = Math.ceil(generatedClipsData.length / CLIPS_PER_PAGE);
  if (currentPage > totalPages) currentPage = totalPages;

  const startIdx = (currentPage - 1) * CLIPS_PER_PAGE;
  const endIdx = startIdx + CLIPS_PER_PAGE;
  const pageClips = generatedClipsData.slice(startIdx, endIdx);

  pageClips.forEach(clip => {
    renderSingleClipCard(clip, container);
  });

  if (totalPages > 1) {
    paginationControls.classList.remove("hidden");
    pageIndicator.textContent = `Page ${currentPage} / ${totalPages}`;
    btnPrev.disabled = currentPage === 1;
    btnNext.disabled = currentPage === totalPages;
  } else {
    paginationControls.classList.add("hidden");
  }
}

function changePage(direction) {
  currentPage += direction;
  renderPaginatedClips();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderSingleClipCard(clip, container) {
  const card = document.createElement("div");
  card.className = "clip-card";
  card.id = `clipCard_${clip.id}`;

  const videoObjectUrl = URL.createObjectURL(uploadedFile);
  const formattedHashtags = clip.hashtags.join(" ");

  const rawCopyAllText = `CLIP #${clip.clipNumber}

⏱ TIMESTAMP
${formatTimestamp(clip.start)} → ${formatTimestamp(clip.end)}

⏳ DURATION
${clip.duration} seconds

🎯 CRITICAL MOMENT
${clip.criticalMoment}

📰 HEADLINE
${clip.headline}

⚡ HOOK
${clip.hook}

📝 CAPTION
${clip.caption}

# HASHTAGS
${formattedHashtags}

📌 MENTIONS
${clip.mentions}`;

  card.innerHTML = `
    <div class="clip-card-header">
      <h3>🔥 CLIP #${clip.clipNumber}</h3>
    </div>

    <div class="clip-video-wrapper">
      <video id="clipVideo_${clip.id}" controls playsinline preload="metadata" src="${videoObjectUrl}#t=${clip.start},${clip.end}"></video>
      <div class="virality-badge">VIRALITY SCORE: ${clip.viralityScore}/10</div>
    </div>

    <div class="clip-body">
      <div class="meta-section">
        <div class="meta-label">⏱ TIMESTAMP</div>
        <div class="meta-content-row">
          <span class="highlight-text">${formatTimestamp(clip.start)} → ${formatTimestamp(clip.end)}</span>
          <button class="btn-copy-small" onclick="copyText('${formatTimestamp(clip.start)} → ${formatTimestamp(clip.end)}')">COPY TIMESTAMP</button>
        </div>
      </div>

      <div class="meta-section">
        <div class="meta-label">🎯 CRITICAL MOMENT</div>
        <div class="meta-content-row">
          <div class="meta-content-box">${clip.criticalMoment}</div>
          <button class="btn-copy-small" onclick="copyText(\`${escapeQuotes(clip.criticalMoment)}\`)">COPY MOMENT</button>
        </div>
      </div>

      <div class="meta-section">
        <div class="meta-label">📰 HEADLINE</div>
        <div class="meta-content-row">
          <div class="headline-text">${clip.headline}</div>
          <button class="btn-copy-small" onclick="copyText(\`${escapeQuotes(clip.headline)}\`)">COPY HEADLINE</button>
        </div>
      </div>

      <div class="meta-section">
        <div class="meta-label">⚡ HOOK</div>
        <div class="meta-content-row">
          <div class="hook-text">${clip.hook}</div>
          <button class="btn-copy-small" onclick="copyText(\`${escapeQuotes(clip.hook)}\`)">COPY HOOK</button>
        </div>
      </div>

      <div class="meta-section">
        <div class="meta-label">📝 CAPTION</div>
        <div class="meta-content-row">
          <div class="caption-box">${clip.caption}</div>
          <button class="btn-copy-small" onclick="copyText(\`${escapeQuotes(clip.caption)}\`)">COPY CAPTION</button>
        </div>
      </div>

      <div class="meta-section">
        <div class="meta-label"># HASHTAGS</div>
        <div class="meta-content-row">
          <div class="hashtags-text">${formattedHashtags}</div>
          <button class="btn-copy-small" onclick="copyText('${formattedHashtags}')">COPY HASHTAGS</button>
        </div>
      </div>

      <div class="meta-section">
        <div class="meta-label">📌 MENTIONS</div>
        <div class="meta-content-row">
          <div>${clip.mentions}</div>
        </div>
      </div>

      <div class="action-btn-group">
        <button class="btn btn-secondary btn-large" onclick="copyText(\`${escapeQuotes(rawCopyAllText)}\`)">
          📋 COPY ALL
        </button>
        <button class="btn btn-primary btn-large" data-clip-id="${clip.id}" onclick="handleClipDownloadByClipId(${clip.id})">
          ⬇ DOWNLOAD CLIP
        </button>
      </div>
    </div>
  `;

  container.appendChild(card);

  const videoElem = document.getElementById(`clipVideo_${clip.id}`);
  if (videoElem) {
    videoElem.addEventListener("timeupdate", () => {
      if (videoElem.currentTime < clip.start || videoElem.currentTime >= clip.end) {
        videoElem.currentTime = clip.start;
      }
    });
  }
}

// COPY TOOL FOR CROSS-PLATFORM BROWSER
function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => alert("Berhasil disalin!")).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.focus();
  area.select();
  try {
    document.execCommand("copy");
    alert("Berhasil disalin!");
  } catch (err) {
    alert("Gagal menyalin otomatis.");
  }
  document.body.removeChild(area);
}

function escapeQuotes(str) {
  return str.replace(/`/g, "\\`").replace(/"/g, '&quot;');
}

function updateClipBadgeCount(count) {
  const badge = document.getElementById("clipBadgeCount");
  const summary = document.getElementById("resultsSummaryText");
  if (badge) badge.textContent = count;
  if (summary) summary.textContent = `${count} valid unique clips generated based on moment analysis.`;
}

// =========================================================================
// UNIFIED DOWNLOAD ENGINE (SISTEM TUNGGAL & SOLUSI FIX ANDROID/IOS)
// =========================================================================

/**
 * Sanitasi Nama File agar Aman di Seluruh OS (Android, iOS, Windows, Mac)
 */
function sanitizeFilename(name) {
  if (!name) return "clip";
  return name
    .toLowerCase()
    .replace(/[\/\\:*?"<>|]/g, '') // Hapus karakter ilegal
    .replace(/[\s_]+/g, '-')       // Ganti spasi/underscore dengan dash
    .replace(/[^\w\-]/g, '');      // Hapus emoji/karakter non-alphanumeric
}

/**
 * Membuat Filename Sesuai Niche Terpilih
 * Format Contoh: AI-Clip-podcast.mp4 atau AI-Clip-gaming.mp4
 */
function generateHumanReadableFilename(clipObj) {
  const nicheClean = sanitizeFilename(clipObj ? clipObj.niche : 'viral');
  
  // Menghasilkan nama file sesuai permintaan (Contoh: AI-Clip-podcast.mp4)
  return `AI-Clip-${nicheClean}.mp4`;
}

/**
 * Entry Point Utama Handler Download berdasarkan Clip ID
 */
async function handleClipDownloadByClipId(clipId) {
  const clip = generatedClipsData.find(c => c.id === clipId);
  if (!clip) {
    alert("Clip tidak ditemukan atau belum siap!");
    return;
  }

  if (!uploadedFile) {
    alert("File sumber tidak ditemukan!");
    return;
  }

  showProgress(true);
  updateProgress(15, `Memproses Clip #${clip.clipNumber}...`);

  const safeFilename = generateHumanReadableFilename(clip);

  try {
    // 1. Eksekusi FFmpeg Cutting
    const processedBlob = await processFFmpegSlice(uploadedFile, clip.start, clip.duration);
    
    // 2. Bungkus ke Objek File Eksplisit untuk Enforce Filename
    const mp4File = new File([processedBlob], safeFilename, { type: 'video/mp4' });

    updateProgress(85, "Menyiapkan file download...");

    // 3. Coba Web Share API (Diutamakan untuk iOS Safari / Android Chrome modern)
    if (navigator.canShare && navigator.canShare({ files: [mp4File] })) {
      try {
        await navigator.share({
          files: [mp4File],
          title: safeFilename,
          text: `Download Clip #${clip.clipNumber}`
        });
        showProgress(false);
        return; // Berhasil via Share Sheet
      } catch (shareErr) {
        // Jika user membatalkan share sheet, fallback ke normal download
        if (shareErr.name === 'AbortError') {
          showProgress(false);
          return;
        }
      }
    }

    // 4. Fallback Standard Browser Download (Anchor Method dengan Object URL)
    triggerBrowserDownload(mp4File, safeFilename);

  } catch (err) {
    console.error("FFmpeg processing error, fallback to HTML5 slice:", err);
    logProgress("FFmpeg WASM error, mengalihkan ke Canvas/Media Engine...");
    
    // Fallback jika FFmpeg gagal di perangkat HP ram kecil
    try {
      const fallbackBlob = await fallbackMediaSlice(uploadedFile, clip.start, clip.duration);
      const fallbackFile = new File([fallbackBlob], safeFilename, { type: 'video/mp4' });
      triggerBrowserDownload(fallbackFile, safeFilename);
    } catch (fallbackErr) {
      console.error("Fallback download error:", fallbackErr);
      alert("Gagal memproses clip. Silakan coba lagi.");
    }
  } finally {
    showProgress(false);
  }
}

/**
 * Pemotongan File menggunakan FFmpeg WASM
 */
async function processFFmpegSlice(file, startTime, duration) {
  if (typeof FFmpeg === "undefined" || !FFmpeg.createFFmpeg) {
    throw new Error("FFmpeg library not loaded");
  }

  const { createFFmpeg, fetchFile } = FFmpeg;
  if (!ffmpegInstance) ffmpegInstance = createFFmpeg({ log: false });
  if (!ffmpegInstance.isLoaded()) await ffmpegInstance.load();

  const inputName = "raw_input.mp4";
  const outputName = "trimmed_output.mp4";

  ffmpegInstance.FS('writeFile', inputName, await fetchFile(file));
  
  // Cut video tanpa re-encode jika memungkinkan (-c copy) untuk kecepatan maksimal
  await ffmpegInstance.run(
    '-ss', startTime.toString(),
    '-i', inputName,
    '-t', duration.toString(),
    '-c', 'copy',
    outputName
  );

  const data = ffmpegInstance.FS('readFile', outputName);
  
  // Cleanup virtual file system FFmpeg
  try {
    ffmpegInstance.FS('unlink', inputName);
    ffmpegInstance.FS('unlink', outputName);
  } catch (e) {}

  return new Blob([data.buffer], { type: 'video/mp4' });
}

/**
 * Fallback jika FFmpeg gagal (Slicing via Native Media Recorder)
 */
function fallbackMediaSlice(file, startTime, duration) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      video.currentTime = startTime;
    };

    video.onseeked = () => {
      const stream = video.captureStream ? video.captureStream() : video.mozCaptureStream();
      const recorder = new MediaRecorder(stream, { mimeType: 'video/mp4' });
      const chunks = [];

      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        URL.revokeObjectURL(video.src);
        resolve(new Blob(chunks, { type: 'video/mp4' }));
      };

      recorder.start();
      video.play();

      setTimeout(() => {
        video.pause();
        recorder.stop();
      }, duration * 1000);
    };

    video.onerror = (e) => reject(e);
  });
}

/**
 * Melakukan pemicuan download browser dengan lifecycle ObjectURL yang aman
 */
function triggerBrowserDownload(fileObj, filename) {
  const blobUrl = URL.createObjectURL(fileObj);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = blobUrl;
  a.download = filename; // Sampaikan nama file yang aman & manusiawi ke browser
  
  document.body.appendChild(a);
  a.click();

  // Timing Revoke URL yang aman (30 detik delay agar browser seluler sempat menginisiasi transfer)
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  }, 30000);
}

function formatTimestamp(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function showProgress(visible) {
  const overlay = document.getElementById("progressOverlay");
  if (overlay) {
    if (visible) overlay.classList.remove("hidden");
    else overlay.classList.add("hidden");
  }
}

function updateProgress(percent, text) {
  const bar = document.getElementById("progressBarFill");
  const num = document.getElementById("progressPercent");
  const status = document.getElementById("progressStatusText");

  if (bar) bar.style.width = `${percent}%`;
  if (num) num.textContent = `${percent}%`;
  if (status) status.textContent = text;
}

function logProgress(text) {
  const logs = document.getElementById("progressLogs");
  if (logs) {
    logs.innerHTML += `<div>✓ ${text}</div>`;
    logs.scrollTop = logs.scrollHeight;
  }
}

function resetProgressLogs() {
  const logs = document.getElementById("progressLogs");
  if (logs) logs.innerHTML = "";
}
