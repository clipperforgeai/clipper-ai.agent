/* ═══════════════════════════════════════════════════════════════════════════
 * 🔧 WORKER-SAFE GUARD (v2.7 IMPROVED)
 * ---------------------------------------------------------------------------
 * File ini bisa di-load dari main thread ATAU web worker.
 * ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var __IS_WORKER__ = false;
  try {
    __IS_WORKER__ = (typeof importScripts === 'function') &&
                    (typeof document === 'undefined') &&
                    (typeof self !== 'undefined') &&
                    (self.constructor && /WorkerGlobalScope/.test(self.constructor.name || ''));
  } catch (e) {
    __IS_WORKER__ = (typeof importScripts === 'function');
  }

  if (__IS_WORKER__) {
    if (!self.window) self.window = self;
    self.__POLISH_V4_LOADED = true;
    self.__POLISH_V5_LOADED = true;
    self.__POLISH_V6_LOADED = true;
    self.__POLISH_V7_LOADED = true;
  }
})();


/* ═══════════════════════════════════════════════════════════════════════════
 * PART 1 / 6 — hooks-db.js (ORIGINAL)
 * ═══════════════════════════════════════════════════════════════════════════ */

class HookEngine {

  static getRegionConfig(regionCode) {
    const region = (!regionCode || regionCode === 'auto') ? 'id-ID' : regionCode;
    const configs = this._buildConfigs();
    return configs[region] || configs['id-ID'];
  }

  static _buildConfigs() {
    return {

      // ═══════════════════════════════════════════
      // INDONESIA
      // ═══════════════════════════════════════════
      'id-ID': {
        lang: 'id',

        attentions: [
          'GILA!!', 'LAH?!', 'BUSYET!!', 'ANJIR...', 'WADUH...',
          'NGGAK NYANGKA...', 'PLOT TWIST...', 'TERNYATA!!', 'ASTAGA!!',
          'HEBOH!!', 'GAK MASUK AKAL!!', 'DETIK-DETIK!!', 'BARU TAU!!',
          'INI YANG BIKIN...', 'SERIUS?!'
        ],

        hookBodies: {
          motion: [
            'Bagian ini bikin suasana langsung berubah 💀',
            'Dari santai langsung jadi chaos',
            'Detik ini nggak ada yang siap-siap 😭',
            'Ini yang bikin semua orang reflek mundur',
            'Momen ini bener-bener nggak bisa diprediksi',
            'Awalnya biasa aja, terus jadi gini',
            'Bagian ini yang bikin gue replay dua kali',
            'Nggak ada yang expect ini bakal terjadi'
          ],
          audio: [
            'Reaksi di bagian ini yang bikin merinding',
            'Suasananya langsung berubah pas momen ini muncul',
            'Bagian ini paling susah dilupain 💀',
            'Momen ini beneran ngagetin',
            'Ini yang bikin bulu kuduk berdiri',
            'Momen kecil ini efeknya gede banget',
            'Bagian ini bikin semua orang diem',
            'Ini yang orang sering skip padahal seru'
          ],
          scene: [
            'Bagian ini bikin alurnya muter total',
            'Plot twist-nya muncul pas nggak diduga 😭',
            'Momen ini yang bikin cerita berubah',
            'Ini titik balik yang nggak ada yang sadar',
            'Bagian ini wajib ditonton sampai habis',
            'Setelah momen ini, semuanya beda',
            'Ini yang bikin semuanya masuk akal'
          ],
          generic: [
            'Momen ini kelihatan biasa... sampai kamu sadar apa yang terjadi',
            'Bagian ini nggak ada yang notice sampai kedua kali',
            'Ini yang orang sering skip padahal seru',
            'Momen ini kecil, tapi efeknya besar',
            'Bagian ini wajib ditonton sampai habis',
            'Nggak banyak yang sadar sama detail ini',
            'Ini yang bikin momen ini beda dari yang lain',
            'Kelihatan sepele, ternyata penting banget'
          ]
        },

        captions: [
          'Awalnya kelihatan aman... sampai momen ini terjadi 💀 Kalau kamu ada di posisi itu, bakal ngapain?',
          'Bagian ini bener-bener bikin suasana berubah dalam hitungan detik 😭 Ada yang sadar sama detail ini?',
          'Momen ini nggak kelihatan heboh di awal, tapi pas sampai di bagian ini... semua orang ngerti. Kalau kamu, bakal notice nggak?',
          'Serius deh, momen ini jadi salah satu bagian yang paling susah dilupain 😭 Menurut kamu ini sengaja atau cuma kebetulan?',
          'POV: kamu lagi santai, terus tiba-tiba bagian ini muncul 💀 Ada yang pernah ngalamin hal kayak gini?',
          'Ini yang bikin nontonnya sampai selesai tanpa skip. Ada yang ngeh nggak sama hal ini?',
          'Kalau gue jadi dia, mungkin udah mundur duluan 😂 Kalian gimana?',
          'Ada momen yang bikin kita mikir: "kok bisa ya?". Nah bagian ini salah satunya.',
          'Nggak banyak yang sadar, tapi begitu lihat kedua kali, langsung paham 💀',
          'Bagian ini memang nggak kelihatan heboh, tapi setelah dipikirin... gila juga ya.',
          'Kalau kamu ada di situasi ini, bakal tetap lanjut atau langsung stop?',
          'Ini salah satu momen yang bikin nontonnya jadi susah move on 😭'
        ],

        extras: [
          'Ada yang sadar bagian ini juga atau cuma gue?',
          'Ini beneran terjadi, bukan hasil edit 👀',
          'Detail kecil ini yang bikin semuanya masuk akal.',
          'Kalau kamu, bakal lanjut atau langsung mundur?',
          'Nggak nyangka aja bagian ini jadi sepenting itu.'
        ],

        ctas: {
          LOOP: 'Coba putar ulang, kamu bakal sadar detail ini 👀',
          CLIFFHANGER: 'Menurut kamu, bakal lanjut ke mana ceritanya?',
          PUNCHLINE: 'Kalian bakal ngapain kalau ada di posisi itu?',
          PAYOFF: 'Ada yang ngeh sama bagian ini juga nggak?',
          OPEN_END: 'Kalau kamu, bakal lanjut atau stop di situ?',
          HYPE: 'Rate momen ini 1–10 👇',
          REACTION: 'Yang sadar sama detail ini, komen 👇'
        },

        hashtagsBase: ['#fyp', '#viral', '#foryoupage', '#trending', '#shortsviral']
      },

      // ═══════════════════════════════════════════
      // UNITED STATES
      // ═══════════════════════════════════════════
      'en-US': {
        lang: 'en-US',

        attentions: [
          'INSANE!!', 'WAIT WHAT?!', 'NO WAY!!', 'HOLD UP...', 'BRO...',
          'I DIDN\'T EXPECT...', 'PLOT TWIST...', 'APPARENTLY...', 'FOR REAL?!',
          'BRO WHAT!!', 'THIS IS HUGE!!', 'OKAY THIS IS IT...', 'WAIT FOR IT...',
          'NO CAP...', 'STRAIGHT UP CRAZY!!'
        ],

        hookBodies: {
          motion: [
            'The moment everything goes from chill to full chaos 💀',
            'Nobody was ready for this part 😭',
            'This is the clip everyone keeps replaying',
            'The switch-up nobody saw coming',
            'This moment was absolutely unpredictable',
            'Started normal, ended insane',
            'The part that makes you rewatch twice',
            'Nobody expected this to happen'
          ],
          audio: [
            'The reaction here is what gets everyone',
            'The whole vibe shifts in this part',
            'This is the part people can\'t stop rewatching 💀',
            'This moment genuinely caught me off guard',
            'This part still gives me chills',
            'Small moment, huge impact',
            'Everyone went silent at this part',
            'Easy to miss, impossible to forget'
          ],
          scene: [
            'This part completely flips the story',
            'The plot twist hits right when you least expect 😭',
            'This is the moment the story changes',
            'This is the turning point nobody noticed',
            'You have to watch this through to the end',
            'After this moment, everything is different',
            'This is the part that makes it all make sense'
          ],
          generic: [
            'Looks normal at first — until you see what actually happens',
            'Most people skip this part until they see it again',
            'Easy to miss, impossible to forget',
            'Small moment, massive impact',
            'You have to watch this part until the end',
            'Not many people catch this detail',
            'This is what makes this moment stand out',
            'Looks small, turns out it matters a lot'
          ]
        },

        captions: [
          'It starts calm... then this happens 💀 What would you do in that situation?',
          'The whole vibe changes in seconds 😭 Did anyone else catch the small detail?',
          'Nothing crazy at first — but once you reach this part, you get it. Would you notice?',
          'Genuinely one of the hardest moments to forget 😭 Do you think this was on purpose or pure luck?',
          'POV: everything is fine, then this part hits 💀 Anyone ever been in a moment like this?',
          'This is the part that keeps you watching till the end. Did you catch this too?',
          'If I were them, I\'d have backed out instantly 😂 What about you?',
          'There are moments that make you go "how is that even possible?". This is one of them.',
          'Not many people notice it at first, but once you see it, you can\'t unsee it 💀',
          'Looks chill at first, but after you think about it... that\'s wild.',
          'If you were in this situation, would you keep going or stop right there?',
          'One of those moments that\'s impossible to move on from 😭'
        ],

        extras: [
          'Did anyone else notice this or just me?',
          'This is real, not edited 👀',
          'This tiny detail makes the whole thing make sense.',
          'Would you keep going or back out instantly?',
          'Didn\'t expect this part to matter this much.'
        ],

        ctas: {
          LOOP: 'Watch it again — you\'ll spot the detail 👀',
          CLIFFHANGER: 'Where do you think this is going next?',
          PUNCHLINE: 'What would you do in that exact moment?',
          PAYOFF: 'Did anyone else catch this too?',
          OPEN_END: 'Would you keep watching or stop right there?',
          HYPE: 'Rate this moment 1–10 👇',
          REACTION: 'If you caught the detail, drop a comment 👇'
        },

        hashtagsBase: ['#fyp', '#viral', '#foryoupage', '#trending', '#shorts']
      },

      // ═══════════════════════════════════════════
      // UNITED KINGDOM
      // ═══════════════════════════════════════════
      'en-GB': {
        lang: 'en-GB',

        attentions: [
          'MATE!!', 'WAIT WHAT?!', 'NO WAY MATE!!', 'HOLD ON...', 'BLOODY HELL...',
          'DIDN\'T SEE THAT COMING...', 'PLOT TWIST...', 'APPARENTLY...', 'FOR REAL?!',
          'PROPER MADNESS!!', 'THIS IS MASSIVE!!', 'RIGHT THEN...', 'WAIT FOR IT MATE...',
          'SPOT ON...', 'ABSOLUTELY INSANE!!'
        ],

        hookBodies: {
          motion: [
            'The moment it goes from chill to proper madness 💀',
            'Nobody was ready for this bit mate 😭',
            'This is the clip everyone keeps replaying',
            'The switch-up nobody saw coming',
            'This bit was absolutely unpredictable',
            'Started normal, ended proper mental',
            'The bit that makes you replay it twice',
            'Nobody expected this to happen'
          ],
          audio: [
            'The reaction here is what gets everyone',
            'The whole vibe shifts on this bit',
            'This is the part people can\'t stop rewatching 💀',
            'This moment genuinely caught me off guard',
            'This bit still gives me chills',
            'Small moment, massive impact',
            'Everyone went quiet at this bit',
            'Easy to miss, impossible to forget'
          ],
          scene: [
            'This bit completely flips the story',
            'The plot twist hits right when you least expect 😭',
            'This is the moment the story changes',
            'This is the turning point nobody noticed',
            'You have to watch this through to the end',
            'After this bit, everything is different',
            'This is the bit that makes it all make sense'
          ],
          generic: [
            'Looks normal at first — until you see what really happens',
            'Most people skip this bit until they see it again',
            'Easy to miss, impossible to forget',
            'Small moment, massive impact',
            'You have to watch this bit through to the end',
            'Not many people catch this detail',
            'This is what makes this bit stand out',
            'Looks small, turns out it matters a lot'
          ]
        },

        captions: [
          'Starts calm... then this happens 💀 What would you do in that situation mate?',
          'The whole vibe shifts in seconds 😭 Did anyone else spot the small detail?',
          'Nothing mad at first — but once you reach this bit, you get it. Would you notice?',
          'Genuinely one of the hardest moments to forget 😭 Do you reckon this was on purpose or luck?',
          'POV: everything is fine, then this bit hits 💀 Anyone ever been in a moment like this?',
          'This is the bit that keeps you watching to the end. Did you catch this too?',
          'If I were them, I\'d have backed out straight away 😂 What about you?',
          'There are moments that make you go "how is that even possible?". This is one of them.',
          'Not many people notice it at first, but once you see it, you can\'t unsee it 💀',
          'Looks chill at first, but after you think about it... that\'s wild.',
          'If you were in this situation, would you keep going or stop right there?',
          'One of those moments that\'s impossible to move on from 😭'
        ],

        extras: [
          'Did anyone else notice this or just me mate?',
          'This is real, not edited 👀',
          'This tiny detail makes the whole thing make sense.',
          'Would you keep going or back out straight away?',
          'Didn\'t expect this bit to matter this much.'
        ],

        ctas: {
          LOOP: 'Replay it — you\'ll spot the detail 👀',
          CLIFFHANGER: 'Where do you reckon this goes next?',
          PUNCHLINE: 'What would you do in that exact moment mate?',
          PAYOFF: 'Did anyone else catch this too?',
          OPEN_END: 'Would you keep watching or stop right there?',
          HYPE: 'Rate this moment 1–10 👇',
          REACTION: 'If you spotted the detail, drop a comment 👇'
        },

        hashtagsBase: ['#fyp', '#ukviral', '#foryouuk', '#uktrending', '#shorts']
      },

      // ═══════════════════════════════════════════
      // CANADA
      // ═══════════════════════════════════════════
      'en-CA': {
        lang: 'en-CA',

        attentions: [
          'THIS IS WILD!!', 'WAIT WHAT?!', 'NO WAY EH...', 'HOLD ON...', 'BRO...',
          'DIDN\'T EXPECT THAT...', 'PLOT TWIST...', 'APPARENTLY...', 'FOR REAL?!',
          'OKAY THIS IS IT...', 'WAIT FOR IT EH...', 'THAT MOMENT...', 'NO CAP...',
          'UNREAL EH...', 'MASSIVE!!'
        ],

        hookBodies: {
          motion: [
            'The moment it goes from chill to straight-up wild 💀',
            'Nobody was ready for this part eh 😭',
            'This is the clip everyone keeps replaying',
            'The switch-up nobody saw coming',
            'This moment was absolutely unpredictable',
            'Started normal, ended insane',
            'The part that makes you rewatch twice',
            'Nobody expected this to happen'
          ],
          audio: [
            'The reaction here is what gets everyone',
            'The whole vibe shifts on this part',
            'This is the part people can\'t stop rewatching 💀',
            'This moment genuinely caught me off guard eh',
            'This part still gives me chills',
            'Small moment, huge impact',
            'Everyone went quiet at this part',
            'Easy to miss, impossible to forget'
          ],
          scene: [
            'This part completely flips the story',
            'The plot twist hits right when you least expect 😭',
            'This is the moment the story changes',
            'This is the turning point nobody noticed',
            'You have to watch this through to the end',
            'After this part, everything is different',
            'This is the part that makes it all make sense'
          ],
          generic: [
            'Looks normal at first — until you see what really happens',
            'Most people skip this part until they see it again',
            'Easy to miss, impossible to forget',
            'Small moment, huge impact',
            'You have to watch this part until the end',
            'Not many people catch this detail',
            'This is what makes this part stand out',
            'Looks small, turns out it matters a lot'
          ]
        },

        captions: [
          'Starts calm... then this happens 💀 What would you do in that situation eh?',
          'The whole vibe shifts in seconds 😭 Did anyone else catch the small detail?',
          'Nothing wild at first — but once you reach this part, you get it. Would you notice?',
          'Genuinely one of the hardest moments to forget 😭 Do you think this was on purpose or just luck?',
          'POV: everything is fine, then this part hits 💀 Anyone ever been in a moment like this?',
          'This is the part that keeps you watching until the end. Did you catch this too?',
          'If I were them, I\'d have backed out instantly 😂 What about you?',
          'There are moments that make you go "how is that even possible?". This is one of them.',
          'Not many people notice it at first, but once you see it, you can\'t unsee it 💀',
          'Looks chill at first, but after you think about it... that\'s wild.',
          'If you were in this situation, would you keep going or stop right there?',
          'One of those moments that\'s impossible to move on from 😭'
        ],

        extras: [
          'Did anyone else notice this or just me?',
          'This is real, not edited 👀',
          'This tiny detail makes the whole thing make sense.',
          'Would you keep going or back out instantly?',
          'Didn\'t expect this part to matter this much.'
        ],

        ctas: {
          LOOP: 'Watch it again — you\'ll spot the detail 👀',
          CLIFFHANGER: 'Where do you think this goes next eh?',
          PUNCHLINE: 'What would you do in that exact moment?',
          PAYOFF: 'Did anyone else catch this too?',
          OPEN_END: 'Would you keep watching or stop right there?',
          HYPE: 'Rate this moment 1–10 👇',
          REACTION: 'If you caught the detail, drop a comment 👇'
        },

        hashtagsBase: ['#fyp', '#canadaviral', '#foryoupage', '#canadatok', '#shorts']
      }
    };
  }

  static getNicheDurationRules(niche) {
    const rules = {
      "Gaming & Esports": { min: 10, max: 20 },
      "Podcast & Talkshow": { min: 15, max: 30 },
      "Comedy & Entertainment": { min: 5, max: 30 },
      "Education & Knowledge": { min: 15, max: 30 },
      "Finance & Crypto": { min: 15, max: 40 },
      "Technology & AI": { min: 10, max: 20 },
      "Business & Entrepreneurship": { min: 15, max: 30 },
      "Motivation & Self-Growth": { min: 10, max: 20 },
      "Sports & Fitness": { min: 10, max: 25 },
      "Film & TV Series": { min: 15, max: 30 }
    };
    return rules[niche] || { min: 10, max: 30 };
  }

  static categorizeMoment(moment) {
    if (moment.avgMotion >= 55) return 'motion';
    if (moment.avgAudio >= 55) return 'audio';
    if (moment.endingType && moment.endingType.indexOf('PUNCHLINE') !== -1) return 'scene';
    if (moment.signals && moment.signals.some(s => s.indexOf('Scene') !== -1)) return 'scene';
    return 'generic';
  }

  static ensureUsedSet(usedSet) {
    usedSet = usedSet || {};
    ['attentions', 'hookBodies', 'captions', 'extras'].forEach(k => {
      if (!Array.isArray(usedSet[k])) usedSet[k] = [];
    });
    return usedSet;
  }

  static pickUnique(list, usedSet, key, seed) {
    if (!list || list.length === 0) return '';
    this.ensureUsedSet(usedSet);
    const used = usedSet[key];
    const startIdx = Math.abs(seed || 0) % list.length;
    for (let i = 0; i < list.length; i++) {
      const cand = list[(startIdx + i) % list.length];
      if (used.indexOf(cand) === -1) {
        used.push(cand);
        return cand;
      }
    }
    const fallback = list[startIdx % list.length];
    used.push(fallback);
    return fallback;
  }

  static buildUniquePackage(moment, niche, regionCode, clipIndex, usedSet) {
    const cfg = this.getRegionConfig(regionCode);
    const category = this.categorizeMoment(moment);
    const seed = clipIndex || 0;

    const attention = this.pickUnique(cfg.attentions, usedSet, 'attentions', seed);
    const hookBodyList = (cfg.hookBodies[category] || []).concat(cfg.hookBodies.generic || []);
    const hookBody = this.pickUnique(hookBodyList, usedSet, 'hookBodies', seed);
    const hookHeadline = `${attention} ${hookBody}`;

    let caption = this.pickUnique(cfg.captions, usedSet, 'captions', seed);
    const extra = this.pickUnique(cfg.extras, usedSet, 'extras', seed);
    if (extra) caption += ' ' + extra;

    const endKey = (moment.endingType || '[LOOP]').replace(/[\[\]]/g, '');
    const cta = cfg.ctas[endKey] || cfg.ctas.LOOP;

    const hashtags = this.buildHashtags(niche, cfg, usedSet, seed);

    return {
      attention,
      hook: hookBody,
      headline: hookBody,
      hookHeadline,
      caption,
      cta,
      hashtags,
      endingType: moment.endingType,
      lang: cfg.lang
    };
  }

  static buildHashtags(niche, cfg, usedSet, seed) {
    const nicheTag = (niche || 'trending').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const nicheTags = ['#' + nicheTag, '#' + nicheTag + 'clips'];

    const nicheExtra = {
      'Gaming & Esports': ['#gaming', '#gamingclips', '#gamers', '#esports'],
      'Podcast & Talkshow': ['#podcast', '#talkshow', '#podcastclips'],
      'Comedy & Entertainment': ['#comedy', '#funny', '#comedyclips'],
      'Education & Knowledge': ['#edukasi', '#learning', '#knowledge'],
      'Finance & Crypto': ['#finance', '#crypto', '#moneytips'],
      'Technology & AI': ['#tech', '#ai', '#technology'],
      'Business & Entrepreneurship': ['#business', '#entrepreneur', '#startup'],
      'Motivation & Self-Growth': ['#motivation', '#selfgrowth', '#mindset'],
      'Sports & Fitness': ['#sports', '#fitness', '#workout'],
      'Film & TV Series': ['#film', '#tvseries', '#cinema']
    }[niche] || ['#trending', '#foryou', '#content'];

    const pool = nicheTags.concat(nicheExtra, cfg.hashtagsBase);
    const result = [];
    const startIdx = Math.abs(seed || 0) % pool.length;
    for (let i = 0; i < pool.length && result.length < 6; i++) {
      const tag = pool[(startIdx + i) % pool.length];
      if (result.indexOf(tag) === -1) result.push(tag);
    }
    return result;
  }

  static generateCombinedHookHeadline(moment, niche, regionCode, usedHooks) {
    const usedSet = { attentions: usedHooks || [], hookBodies: [], captions: [], extras: [] };
    const pkg = this.buildUniquePackage(moment, niche, regionCode, (usedHooks || []).length, usedSet);
    return { attention: pkg.attention, hookHeadline: pkg.hookHeadline };
  }

  static generateRichCaption(moment, niche, regionCode) {
    const cfg = this.getRegionConfig(regionCode);
    return cfg.captions[0];
  }

  static generateCTA(moment, niche, regionCode) {
    const cfg = this.getRegionConfig(regionCode);
    const endKey = (moment.endingType || '[LOOP]').replace(/[\[\]]/g, '');
    return cfg.ctas[endKey] || cfg.ctas.LOOP;
  }

  static generateHashtags(niche, regionCode) {
    const cfg = this.getRegionConfig(regionCode);
    return this.buildHashtags(niche, cfg, {}, 0);
  }
}

if (typeof window !== 'undefined') {
  window.HookEngine = HookEngine;
}


/* ═══════════════════════════════════════════════════════════════════════════
 * PART 2 / 6 — polish-v4.js (ORIGINAL)
 * ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';
  if (window.__POLISH_V4_LOADED) return;
  window.__POLISH_V4_LOADED = true;

  console.log('%c[Polish V4] 🚀 Loading 100% Precision Edition...', 'color:#f59e0b;font-weight:bold;font-size:13px');

  const NICHE_EMOJI = {
    'Gaming & Esports': '🎮', 'Sports & Fitness': '⚽', 'Podcast & Talkshow': '🎙️',
    'Comedy & Entertainment': '😂', 'Education & Knowledge': '💡', 'Finance & Crypto': '📈',
    'Technology & AI': '🤖', 'Business & Entrepreneurship': '💼', 'Motivation & Self-Growth': '🔥',
    'Film & TV Series': '🎬', 'Culinary & Food': '🍽️', 'Travel & Lifestyle': '✈️',
    'Storytelling & Mystery': '📖', 'Interview & Discussion': '💬', 'Reaction & Review': '👀',
    'Lifestyle & Fashion': '👗', 'Entertainment': '🎭', 'General Content': '📺'
  };

  const NICHE_HASHTAGS = {
    'Gaming & Esports': {
      'id-ID': ['#gaming', '#gamerindo', '#gamingindonesia', '#esports', '#gamingclips'],
      'en-US': ['#gaming', '#gamertok', '#gamingcommunity', '#esports', '#gamingclips'],
      'en-GB': ['#gaming', '#ukgamers', '#britishgaming', '#esports', '#gamingclips'],
      'en-CA': ['#gaming', '#canadagaming', '#torontogamers', '#esports', '#gamingclips']
    },
    'Sports & Fitness': {
      'id-ID': ['#sepakbola', '#olahraga', '#fitnes', '#gymindonesia', '#timnas'],
      'en-US': ['#sports', '#athlete', '#fitness', '#workout', '#gymtok'],
      'en-GB': ['#sports', '#ukfootball', '#fitnessuk', '#workout', '#gymuk'],
      'en-CA': ['#hockey', '#sports', '#fitnesscanada', '#workout', '#gymcanada']
    },
    'Podcast & Talkshow': {
      'id-ID': ['#podcast', '#ngobrol', '#curhat', '#talkshowid', '#podcastindonesia'],
      'en-US': ['#podcast', '#podcastclips', '#podcasttok', '#interview', '#talkshow'],
      'en-GB': ['#podcast', '#ukpodcast', '#podcastclips', '#interview', '#talkshow'],
      'en-CA': ['#podcast', '#canadapodcast', '#podcastclips', '#interview', '#talkshow']
    },
    'Comedy & Entertainment': {
      'id-ID': ['#komedi', '#ngakak', '#receh', '#lucu', '#humorindonesia'],
      'en-US': ['#comedy', '#funny', '#comedytok', '#lol', '#humor'],
      'en-GB': ['#comedy', '#britishhumour', '#funnyuk', '#lol', '#banter'],
      'en-CA': ['#comedy', '#funnycanada', '#canadianhumor', '#lol', '#humor']
    },
    'Education & Knowledge': {
      'id-ID': ['#edukasi', '#belajar', '#serunyabelajar', '#infopenting', '#pengetahuan'],
      'en-US': ['#education', '#learnontiktok', '#didyouknow', '#knowledge', '#learning'],
      'en-GB': ['#education', '#uklearn', '#didyouknow', '#knowledge', '#learning'],
      'en-CA': ['#education', '#canadalearn', '#didyouknow', '#knowledge', '#learning']
    },
    'Finance & Crypto': {
      'id-ID': ['#investasi', '#keuangan', '#crypto', '#uang', '#moneytips'],
      'en-US': ['#finance', '#crypto', '#investing', '#stockmarket', '#moneytips'],
      'en-GB': ['#finance', '#ukfinance', '#crypto', '#investinguk', '#moneytips'],
      'en-CA': ['#finance', '#canadafinance', '#crypto', '#investing', '#moneytips']
    },
    'Technology & AI': {
      'id-ID': ['#teknologi', '#gadget', '#reviewtech', '#ai', '#techindonesia'],
      'en-US': ['#tech', '#ai', '#technology', '#gadgets', '#techreview'],
      'en-GB': ['#tech', '#uktech', '#ai', '#gadgets', '#techreview'],
      'en-CA': ['#tech', '#canadatech', '#ai', '#gadgets', '#techreview']
    },
    'Business & Entrepreneurship': {
      'id-ID': ['#bisnis', '#umkm', '#wirausaha', '#startup', '#entrepreneur'],
      'en-US': ['#business', '#entrepreneur', '#startup', '#sidehustle', '#smallbiz'],
      'en-GB': ['#business', '#ukbusiness', '#entrepreneur', '#startupuk', '#smallbiz'],
      'en-CA': ['#business', '#canadabusiness', '#entrepreneur', '#startup', '#smallbiz']
    },
    'Motivation & Self-Growth': {
      'id-ID': ['#motivasi', '#mindset', '#pengembangandiri', '#inspirasi', '#selfgrowth'],
      'en-US': ['#motivation', '#mindset', '#selfgrowth', '#inspiration', '#selfhelp'],
      'en-GB': ['#motivation', '#ukmotivation', '#mindset', '#selfgrowth', '#inspiration'],
      'en-CA': ['#motivation', '#canadamotivation', '#mindset', '#selfgrowth', '#inspiration']
    },
    'Film & TV Series': {
      'id-ID': ['#film', '#series', '#drakor', '#nontonfilm', '#moviereview'],
      'en-US': ['#film', '#tvseries', '#movietok', '#cinema', '#moviereview'],
      'en-GB': ['#film', '#ukfilm', '#tvseries', '#cinema', '#moviereview'],
      'en-CA': ['#film', '#canadafilm', '#tvseries', '#cinema', '#moviereview']
    },
    'Culinary & Food': {
      'id-ID': ['#kuliner', '#masakan', '#resep', '#makanan', '#foodieindonesia'],
      'en-US': ['#food', '#cooking', '#recipe', '#foodtok', '#foodie'],
      'en-GB': ['#food', '#ukfood', '#cooking', '#recipe', '#foodieuk'],
      'en-CA': ['#food', '#canadafood', '#cooking', '#recipe', '#foodiecanada']
    },
    'Travel & Lifestyle': {
      'id-ID': ['#traveling', '#jalanjalan', '#wisata', '#lifestyle', '#travel'],
      'en-US': ['#travel', '#lifestyle', '#wanderlust', '#traveltok', '#traveling'],
      'en-GB': ['#travel', '#uktravel', '#lifestyle', '#wanderlust', '#traveltok'],
      'en-CA': ['#travel', '#canadatravel', '#lifestyle', '#wanderlust', '#traveltok']
    },
    'Storytelling & Mystery': {
      'id-ID': ['#cerita', '#misteri', '#horror', '#creepy', '#story'],
      'en-US': ['#storytime', '#mystery', '#creepy', '#storytok', '#creepytok'],
      'en-GB': ['#storytime', '#ukstory', '#mystery', '#creepy', '#storytok'],
      'en-CA': ['#storytime', '#canadastory', '#mystery', '#creepy', '#storytok']
    },
    'Interview & Discussion': {
      'id-ID': ['#interview', '#ngobrol', '#diskusi', '#talkshow', '#podcast'],
      'en-US': ['#interview', '#discussion', '#talkshow', '#podcastclips', '#interviewtok'],
      'en-GB': ['#interview', '#uktalkshow', '#discussion', '#podcastclips', '#interview'],
      'en-CA': ['#interview', '#canadatalkshow', '#discussion', '#podcastclips', '#interview']
    },
    'Reaction & Review': {
      'id-ID': ['#reaction', '#reviewjujur', '#review', '#rekomen', '#tanggapan'],
      'en-US': ['#reaction', '#honestreview', '#reviewtok', '#review', '#react'],
      'en-GB': ['#reaction', '#reviewuk', '#honestreview', '#review', '#react'],
      'en-CA': ['#reaction', '#reviewcanada', '#honestreview', '#review', '#react']
    },
    'Lifestyle & Fashion': {
      'id-ID': ['#fashion', '#ootd', '#outfit', '#fashionindonesia', '#lifestyle'],
      'en-US': ['#fashion', '#ootd', '#styletok', '#outfitinspo', '#lifestyle'],
      'en-GB': ['#fashion', '#ukfashion', '#ootd', '#styletok', '#lifestyle'],
      'en-CA': ['#fashion', '#canadafashion', '#ootd', '#styletok', '#lifestyle']
    },
    'Entertainment': {
      'id-ID': ['#hiburan', '#seru', '#entertainment', '#viral', '#fyp'],
      'en-US': ['#entertainment', '#fun', '#viral', '#fyp', '#trending'],
      'en-GB': ['#entertainment', '#ukfun', '#viral', '#fyp', '#trending'],
      'en-CA': ['#entertainment', '#canadafun', '#viral', '#fyp', '#trending']
    },
    'General Content': {
      'id-ID': ['#fyp', '#viral', '#trending', '#foryoupage', '#shortsviral'],
      'en-US': ['#fyp', '#viral', '#trending', '#foryoupage', '#shorts'],
      'en-GB': ['#fyp', '#ukviral', '#foryouuk', '#uktrending', '#shorts'],
      'en-CA': ['#fyp', '#canadaviral', '#foryoupage', '#canadatok', '#shorts']
    }
  };

  const PLATFORM_BASE = {
    'id-ID': { base: '#fyp', tag: '#tiktokindonesia' },
    'en-US': { base: '#fyp', tag: '#tiktok' },
    'en-GB': { base: '#fyp', tag: '#tiktokuk' },
    'en-CA': { base: '#fyp', tag: '#tiktokcanada' }
  };

  const NICHE_CTA_FLAVOR = {
    'Gaming & Esports': {
      'id-ID': ['GG atau NG? komen 👇', 'Skill level 1-10? 👇', 'Main game apa nih? 👇'],
      'en-US': ['GG or NG? drop below 👇', 'Rate the skill 1-10 👇', 'What game is this? 👇'],
      'en-GB': ['GG or NG mate? 👇', 'Rate the skill 1-10 👇', 'What game is this? 👇'],
      'en-CA': ['GG or NG eh? 👇', 'Rate the skill 1-10 👇', 'What game is this? 👇']
    },
    'Sports & Fitness': {
      'id-ID': ['Menang siapa? 👇', 'GOAT? komen 👇', 'Tim mana kamu dukung? 👇'],
      'en-US': ['Who won this? 👇', 'GOAT or not? 👇', 'Which team you got? 👇'],
      'en-GB': ['Who won mate? 👇', 'GOAT or not? 👇', 'Which team you got? 👇'],
      'en-CA': ['Who won eh? 👇', 'GOAT or not? 👇', 'Which team you got? 👇']
    },
    'Podcast & Talkshow': {
      'id-ID': ['Setuju nggak? 👇', 'Menurutmu gimana? 👇', 'Ada yang relate? 👇'],
      'en-US': ['Agree or not? 👇', 'What do you think? 👇', 'Can anyone relate? 👇'],
      'en-GB': ['Agree mate? 👇', 'What do you reckon? 👇', 'Anyone relate? 👇'],
      'en-CA': ['Agree eh? 👇', 'What do you think? 👇', 'Anyone relate? 👇']
    },
    'Comedy & Entertainment': {
      'id-ID': ['Ketawa nggak? 👇', 'Receh nggak? 👇', 'Yang ngakak komen 👇'],
      'en-US': ['Did you laugh? 👇', 'Funny or nah? 👇', 'If you laughed, comment 👇'],
      'en-GB': ['Did you laugh mate? 👇', 'Funny or nah? 👇', 'If you chuckled, comment 👇'],
      'en-CA': ['Did you laugh eh? 👇', 'Funny or nah? 👇', 'If you laughed, comment 👇']
    },
    'Education & Knowledge': {
      'id-ID': ['Baru tau? 👇', 'Save biar nggak lupa 📌', 'Ada yang mau ditambah? 👇'],
      'en-US': ['Did you know this? 👇', 'Save for later 📌', 'Anything to add? 👇'],
      'en-GB': ['Did you know this? 👇', 'Save for later 📌', 'Anything to add mate? 👇'],
      'en-CA': ['Did you know this eh? 👇', 'Save for later 📌', 'Anything to add? 👇']
    },
    'Finance & Crypto': {
      'id-ID': ['Setuju nggak? 👇', 'Ada tips lain? 👇', 'Save dulu 📌'],
      'en-US': ['Agree or not? 👇', 'Any other tips? 👇', 'Save this first 📌'],
      'en-GB': ['Agree mate? 👇', 'Any other tips? 👇', 'Save this first 📌'],
      'en-CA': ['Agree eh? 👇', 'Any other tips? 👇', 'Save this first 📌']
    },
    'Technology & AI': {
      'id-ID': ['Worth it nggak? 👇', 'Kamu pakai apa? 👇', 'Menurutmu gimana? 👇'],
      'en-US': ['Worth it? 👇', 'What do you use? 👇', 'Thoughts below 👇'],
      'en-GB': ['Worth it mate? 👇', 'What do you use? 👇', 'Thoughts below 👇'],
      'en-CA': ['Worth it eh? 👇', 'What do you use? 👇', 'Thoughts below 👇']
    },
    'Business & Entrepreneurship': {
      'id-ID': ['Setuju? komen 👇', 'Ada pengalaman? 👇', 'Save untuk nanti 📌'],
      'en-US': ['Agree? 👇', 'Any experience? 👇', 'Save for later 📌'],
      'en-GB': ['Agree mate? 👇', 'Any experience? 👇', 'Save for later 📌'],
      'en-CA': ['Agree eh? 👇', 'Any experience? 👇', 'Save for later 📌']
    },
    'Motivation & Self-Growth': {
      'id-ID': ['Setuju nggak? 👇', 'Save buat reminder 📌', 'Ada yang relate? 👇'],
      'en-US': ['Agree? 👇', 'Save as reminder 📌', 'Anyone relate? 👇'],
      'en-GB': ['Agree mate? 👇', 'Save as reminder 📌', 'Anyone relate? 👇'],
      'en-CA': ['Agree eh? 👇', 'Save as reminder 📌', 'Anyone relate? 👇']
    },
    'Film & TV Series': {
      'id-ID': ['Nonton nggak? 👇', 'Plot twist apa? 👇', 'Save dulu 📌'],
      'en-US': ['Did you watch? 👇', 'What plot twist? 👇', 'Save for later 📌'],
      'en-GB': ['Did you watch mate? 👇', 'What plot twist? 👇', 'Save for later 📌'],
      'en-CA': ['Did you watch eh? 👇', 'What plot twist? 👇', 'Save for later 📌']
    },
    'Culinary & Food': {
      'id-ID': ['Enak nggak? 👇', 'Coba dulu ya 📌', 'Resepnya apa? 👇'],
      'en-US': ['Looks good? 👇', 'Gonna try this 📌', 'What\'s the recipe? 👇'],
      'en-GB': ['Looks delicious mate? 👇', 'Gonna try this 📌', 'What\'s the recipe? 👇'],
      'en-CA': ['Looks good eh? 👇', 'Gonna try this 📌', 'What\'s the recipe? 👇']
    },
    'Travel & Lifestyle': {
      'id-ID': ['Mau ke sini juga? 👇', 'Save buat liburan 📌', 'Tag temenmu 👇'],
      'en-US': ['Want to visit? 👇', 'Save for vacation 📌', 'Tag a friend 👇'],
      'en-GB': ['Want to visit? 👇', 'Save for your hols 📌', 'Tag a mate 👇'],
      'en-CA': ['Want to visit eh? 👇', 'Save for vacation 📌', 'Tag a friend 👇']
    },
    'Storytelling & Mystery': {
      'id-ID': ['Misterinya apa? 👇', 'Save buat malam 📌', 'Percaya nggak? 👇'],
      'en-US': ['What\'s the mystery? 👇', 'Save for tonight 📌', 'Do you believe? 👇'],
      'en-GB': ['What\'s the mystery? 👇', 'Save for tonight 📌', 'Do you believe mate? 👇'],
      'en-CA': ['What\'s the mystery eh? 👇', 'Save for tonight 📌', 'Do you believe? 👇']
    },
    'Interview & Discussion': {
      'id-ID': ['Setuju nggak? 👇', 'Menurutmu gimana? 👇', 'Komen di bawah 👇'],
      'en-US': ['Agree? 👇', 'Your thoughts? 👇', 'Drop a comment 👇'],
      'en-GB': ['Agree mate? 👇', 'Your thoughts? 👇', 'Drop a comment 👇'],
      'en-CA': ['Agree eh? 👇', 'Your thoughts? 👇', 'Drop a comment 👇']
    },
    'Reaction & Review': {
      'id-ID': ['Setuju? 👇', 'Skor 1-10? 👇', 'Ada rekomendasi? 👇'],
      'en-US': ['Agree? 👇', 'Rate 1-10? 👇', 'Any recommendations? 👇'],
      'en-GB': ['Agree mate? 👇', 'Rate 1-10? 👇', 'Any recommendations? 👇'],
      'en-CA': ['Agree eh? 👇', 'Rate 1-10? 👇', 'Any recommendations? 👇']
    },
    'Lifestyle & Fashion': {
      'id-ID': ['Cocok nggak? 👇', 'Rate outfit 1-10? 👇', 'Save buat inspirasi 📌'],
      'en-US': ['Fire or nah? 👇', 'Rate the fit 1-10 👇', 'Save for inspo 📌'],
      'en-GB': ['Look good mate? 👇', 'Rate the fit 1-10 👇', 'Save for inspo 📌'],
      'en-CA': ['Look good eh? 👇', 'Rate the fit 1-10 👇', 'Save for inspo 📌']
    },
    'Entertainment': {
      'id-ID': ['Seru nggak? 👇', 'Save dulu 📌', 'Tag temenmu 👇'],
      'en-US': ['Entertaining? 👇', 'Save for later 📌', 'Tag a friend 👇'],
      'en-GB': ['Entertaining mate? 👇', 'Save for later 📌', 'Tag a mate 👇'],
      'en-CA': ['Entertaining eh? 👇', 'Save for later 📌', 'Tag a friend 👇']
    },
    'General Content': {
      'id-ID': ['Komen di bawah 👇', 'Save dulu 📌', 'Follow buat konten lain!'],
      'en-US': ['Comment below 👇', 'Save for later 📌', 'Follow for more!'],
      'en-GB': ['Comment below mate 👇', 'Save for later 📌', 'Follow for more!'],
      'en-CA': ['Comment below eh 👇', 'Save for later 📌', 'Follow for more!']
    }
  };

  const ENDING_NICHE_CTA = {
    'LOOP': {
      'Gaming & Esports': { 'id-ID': 'Tonton sampai akhir, ada detail kecil 👀', 'en-US': 'Watch till the end — small detail 👀', 'en-GB': 'Watch till the end — small detail 👀', 'en-CA': 'Watch till the end — small detail eh 👀' },
      'default': { 'id-ID': 'Putar ulang, detailnya ada di sana 👀', 'en-US': 'Replay — the detail is right there 👀', 'en-GB': 'Replay — the detail is right there 👀', 'en-CA': 'Replay — the detail is right there eh 👀' }
    },
    'CLIFFHANGER': {
      'Gaming & Esports': { 'id-ID': 'Match selanjutnya bakal gimana? 🤔', 'en-US': 'What happens next match? 🤔', 'en-GB': 'What happens next match? 🤔', 'en-CA': 'What happens next match eh? 🤔' },
      'default': { 'id-ID': 'Menurut kamu, lanjutnya gimana? 🤔', 'en-US': 'Where do you think this is going? 🤔', 'en-GB': 'Where do you reckon this goes? 🤔', 'en-CA': 'Where do you think this goes eh? 🤔' }
    },
    'PUNCHLINE': {
      'Comedy & Entertainment': { 'id-ID': 'Yang ngakak, komen 👇😂', 'en-US': 'If you laughed, comment 👇😂', 'en-GB': 'If you laughed, comment 👇😂', 'en-CA': 'If you laughed, comment eh 👇😂' },
      'default': { 'id-ID': 'Reaksimu gimana? komen 👇', 'en-US': 'What\'s your reaction? drop below 👇', 'en-GB': 'What\'s your reaction mate? 👇', 'en-CA': 'What\'s your reaction eh? 👇' }
    },
    'PAYOFF': {
      'default': { 'id-ID': 'Baru sadar pas lihat kedua kali 👀', 'en-US': 'You\'ll only catch it on the second watch 👀', 'en-GB': 'You\'ll only catch it on the second watch 👀', 'en-CA': 'You\'ll only catch it on the second watch eh 👀' }
    },
    'OPEN_END': {
      'default': { 'id-ID': 'Kamu bakal lanjut atau stop di situ?', 'en-US': 'Would you keep going or stop right there?', 'en-GB': 'Would you keep going or stop right there?', 'en-CA': 'Would you keep going or stop right there eh?' }
    },
    'HYPE': {
      'default': { 'id-ID': 'Rate momen ini 1-10 👇', 'en-US': 'Rate this moment 1-10 👇', 'en-GB': 'Rate this moment 1-10 👇', 'en-CA': 'Rate this moment 1-10 eh 👇' }
    },
    'REACTION': {
      'default': { 'id-ID': 'Yang ngeh detail ini, komen 👇', 'en-US': 'If you caught the detail, comment 👇', 'en-GB': 'If you spotted the detail, comment 👇', 'en-CA': 'If you caught the detail, comment eh 👇' }
    }
  };

  const NICHE_EMOTION = {
    'Gaming & Esports': ['🎮', '💀', '🔥'],
    'Sports & Fitness': ['⚽', '🔥', '💪'],
    'Podcast & Talkshow': ['🎙️', '💭', '👀'],
    'Comedy & Entertainment': ['😂', '💀', '🤣'],
    'Education & Knowledge': ['💡', '📚', '🧠'],
    'Finance & Crypto': ['📈', '💰', '🧠'],
    'Technology & AI': ['🤖', '⚡', '🔬'],
    'Business & Entrepreneurship': ['💼', '📊', '🚀'],
    'Motivation & Self-Growth': ['🔥', '💪', '✨'],
    'Film & TV Series': ['🎬', '😱', '💔'],
    'Culinary & Food': ['🍽️', '😋', '🔥'],
    'Travel & Lifestyle': ['✈️', '🌍', '📸'],
    'Storytelling & Mystery': ['📖', '😨', '🌙'],
    'Interview & Discussion': ['💬', '🤔', '👏'],
    'Reaction & Review': ['👀', '😲', '💯'],
    'Lifestyle & Fashion': ['👗', '✨', '💅'],
    'Entertainment': ['🎭', '🎉', '✨'],
    'General Content': ['👀', '✨', '🎯']
  };

  const NICHE_HOOK_BODIES = {
    'Gaming & Esports': {
      'id-ID': ['Skill issue atau plot armor? 💀', 'Tim ini menang karena apa? 🤔', 'Frame perfect, gila!'],
      'en-US': ['Skill or luck? drop below 💀', 'This play is insane', 'Frame-perfect timing!'],
      'en-GB': ['Skill or luck mate? 💀', 'Absolute madness this play', 'Frame-perfect that!'],
      'en-CA': ['Skill or luck eh? 💀', 'Insane play eh', 'Frame-perfect that!']
    },
    'Comedy & Entertainment': {
      'id-ID': ['Timing-nya pas banget 😂', 'Nggak mungkin ini real 💀', 'Dari mana datangnya ini?'],
      'en-US': ['The timing here is insane 😂', 'No way this is real 💀', 'Where did this even come from?'],
      'en-GB': ['The timing mate 😂', 'No way that\'s real 💀', 'Where did this come from?'],
      'en-CA': ['The timing eh 😂', 'No way that\'s real 💀', 'Where did this come from?']
    },
    'Podcast & Talkshow': {
      'id-ID': ['Yang diomongin bener banget sih', 'Ini insight yang jarang dibahas', 'Stop scrolling, dengerin ini'],
      'en-US': ['This point hits hard', 'Insight nobody talks about', 'Stop scrolling, listen to this'],
      'en-GB': ['This point hits hard mate', 'Insight nobody talks about', 'Stop scrolling, listen to this'],
      'en-CA': ['This point hits hard eh', 'Insight nobody talks about', 'Stop scrolling, listen to this']
    },
    'Education & Knowledge': {
      'id-ID': ['Ini yang bikin kamu paham', 'Insight yang jarang dibahas', 'Save dulu, penting!'],
      'en-US': ['This is the part that clicks', 'Insight rarely discussed', 'Save this — important!'],
      'en-GB': ['This is the bit that clicks', 'Insight rarely discussed', 'Save this — important!'],
      'en-CA': ['This is the part that clicks eh', 'Insight rarely discussed', 'Save this — important!']
    },
    'Motivation & Self-Growth': {
      'id-ID': ['Reminder buat kamu hari ini', 'Dengerin sampai habis', 'Ini yang bikin beda'],
      'en-US': ['Reminder for you today', 'Listen till the end', 'This is what makes the difference'],
      'en-GB': ['Reminder for you today', 'Listen till the end mate', 'This is what makes the difference'],
      'en-CA': ['Reminder for you today eh', 'Listen till the end', 'This is what makes the difference']
    },
    'Finance & Crypto': {
      'id-ID': ['Setiap trader harus tau ini', 'Ini yang jarang dibahas', 'Uang bukan segalanya, tapi...'],
      'en-US': ['Every trader should know this', 'Rarely discussed', 'Money isn\'t everything, but...'],
      'en-GB': ['Every trader should know this', 'Rarely discussed', 'Money isn\'t everything, but...'],
      'en-CA': ['Every trader should know this eh', 'Rarely discussed', 'Money isn\'t everything, but...']
    },
    'Sports & Fitness': {
      'id-ID': ['Momen ini bikin semua orang loncat', 'Skill level dewa 💀', 'Tim ini beneran solid'],
      'en-US': ['This moment made everyone jump', 'Next-level skill 💀', 'This team is legit'],
      'en-GB': ['This moment made everyone jump', 'Next-level skill mate 💀', 'This team is legit'],
      'en-CA': ['This moment made everyone jump eh', 'Next-level skill 💀', 'This team is legit']
    },
    'Culinary & Food': {
      'id-ID': ['Bikin laper jam segini 😭', 'Resep ini gampang banget', 'Aroma-nya nyampe sini'],
      'en-US': ['Making me hungry right now 😭', 'This recipe is so easy', 'The aroma is real'],
      'en-GB': ['Making me hungry now 😭', 'This recipe is dead easy', 'The aroma is real'],
      'en-CA': ['Making me hungry eh 😭', 'This recipe is so easy', 'The aroma is real']
    }
  };

  const CAPTION_PREFIX = {
    'Gaming & Esports': { 'id-ID': '🎮 Di tengah permainan...', 'en-US': '🎮 Mid-game moment...', 'en-GB': '🎮 Mid-match mate...', 'en-CA': '🎮 Mid-match eh...' },
    'Sports & Fitness': { 'id-ID': '⚽ Di lapangan...', 'en-US': '⚽ On the field...', 'en-GB': '⚽ On the pitch...', 'en-CA': '⚽ On the field...' },
    'Podcast & Talkshow': { 'id-ID': '🎙️ Di tengah obrolan...', 'en-US': '🎙️ Mid-conversation...', 'en-GB': '🎙️ Mid-conversation...', 'en-CA': '🎙️ Mid-conversation...' },
    'Comedy & Entertainment': { 'id-ID': '😂 Scene lucu ini...', 'en-US': '😂 This funny moment...', 'en-GB': '😂 This funny bit...', 'en-CA': '😂 This funny moment...' },
    'Education & Knowledge': { 'id-ID': '💡 Insight penting:', 'en-US': '💡 Key insight:', 'en-GB': '💡 Key insight:', 'en-CA': '💡 Key insight:' },
    'Finance & Crypto': { 'id-ID': '📈 Poin penting:', 'en-US': '📈 Key point:', 'en-GB': '📈 Key point:', 'en-CA': '📈 Key point:' },
    'Technology & AI': { 'id-ID': '🤖 Di sisi teknologi:', 'en-US': '🤖 Tech-side:', 'en-GB': '🤖 Tech-side:', 'en-CA': '🤖 Tech-side:' },
    'Business & Entrepreneurship': { 'id-ID': '💼 Business insight:', 'en-US': '💼 Business insight:', 'en-GB': '💼 Business insight:', 'en-CA': '💼 Business insight:' },
    'Motivation & Self-Growth': { 'id-ID': '🔥 Reminder:', 'en-US': '🔥 Reminder:', 'en-GB': '🔥 Reminder:', 'en-CA': '🔥 Reminder:' },
    'Film & TV Series': { 'id-ID': '🎬 Scene ini...', 'en-US': '🎬 This scene...', 'en-GB': '🎬 This scene...', 'en-CA': '🎬 This scene...' },
    'Culinary & Food': { 'id-ID': '🍽️ Momen ini...', 'en-US': '🍽️ This food moment...', 'en-GB': '🍽️ This food moment...', 'en-CA': '🍽️ This food moment...' },
    'Travel & Lifestyle': { 'id-ID': '✈️ Di perjalanan...', 'en-US': '✈️ On the trip...', 'en-GB': '✈️ On the trip...', 'en-CA': '✈️ On the trip...' },
    'Storytelling & Mystery': { 'id-ID': '📖 Cerita ini...', 'en-US': '📖 This story...', 'en-GB': '📖 This story...', 'en-CA': '📖 This story...' },
    'Interview & Discussion': { 'id-ID': '💬 Di sesi ini...', 'en-US': '💬 In this session...', 'en-GB': '💬 In this session...', 'en-CA': '💬 In this session...' },
    'Reaction & Review': { 'id-ID': '👀 Reaksi ini...', 'en-US': '👀 This reaction...', 'en-GB': '👀 This reaction...', 'en-CA': '👀 This reaction...' },
    'Lifestyle & Fashion': { 'id-ID': '👗 Look ini...', 'en-US': '👗 This look...', 'en-GB': '👗 This look...', 'en-CA': '👗 This look...' },
    'Entertainment': { 'id-ID': '🎭 Momen ini...', 'en-US': '🎭 This moment...', 'en-GB': '🎭 This moment...', 'en-CA': '🎭 This moment...' },
    'General Content': { 'id-ID': '', 'en-US': '', 'en-GB': '', 'en-CA': '' }
  };

  function bootHookEngine() {
    if (!window.HookEngine) { setTimeout(bootHookEngine, 100); return; }
    if (HookEngine.__polishV4Installed) return;
    HookEngine.__polishV4Installed = true;

    const _origCategorize = HookEngine.categorizeMoment.bind(HookEngine);
    HookEngine.categorizeMoment = function(moment, niche) {
      if (niche === 'Podcast & Talkshow' || niche === 'Interview & Discussion') {
        if (moment.avgAudio >= 40) return 'audio';
        return 'scene';
      }
      if (niche === 'Comedy & Entertainment') {
        if (moment.laughterCount > 0) return 'audio';
        if (moment.endingType && moment.endingType.indexOf('PUNCHLINE') !== -1) return 'scene';
        return 'generic';
      }
      if (niche === 'Education & Knowledge' || niche === 'Finance & Crypto' ||
          niche === 'Technology & AI' || niche === 'Business & Entrepreneurship') {
        if (moment.avgEdge >= 15 || (moment.speechRatio || 0) >= 40) return 'scene';
        if (moment.avgAudio >= 40) return 'audio';
        return 'generic';
      }
      if (niche === 'Motivation & Self-Growth') {
        if ((moment.speechRatio || 0) >= 40) return 'audio';
        return 'scene';
      }
      if (niche === 'Film & TV Series') {
        if (moment.endingType && (moment.endingType.indexOf('CLIFFHANGER') !== -1 || moment.endingType.indexOf('PUNCHLINE') !== -1)) return 'scene';
        return 'generic';
      }
      return _origCategorize(moment);
    };

    const _origBuild = HookEngine.buildUniquePackage.bind(HookEngine);
    HookEngine.buildUniquePackage = function(moment, niche, regionCode, clipIndex, usedSet) {
      const pkg = _origBuild(moment, niche, regionCode, clipIndex, usedSet);
      const region = (!regionCode || regionCode === 'auto') ? 'id-ID' : regionCode;
      const seed = clipIndex || 0;

      const nicheBodies = (NICHE_HOOK_BODIES[niche] || {})[region] || [];
      if (nicheBodies.length > 0) {
        const pick = nicheBodies[seed % nicheBodies.length];
        const attention = pkg.attention || '';
        pkg.hook = pick;
        pkg.headline = pick;
        pkg.hookHeadline = attention ? `${attention} ${pick}` : pick;
      }

      const prefixMap = CAPTION_PREFIX[niche] || {};
      const prefix = prefixMap[region] || '';
      let caption = pkg.caption || '';

      const emotions = NICHE_EMOTION[niche] || ['👀'];
      const emoPick = emotions[seed % emotions.length];
      if (caption && !/[\u{1F300}-\u{1FAFF}]$/u.test(caption)) {
        caption = caption + ' ' + emoPick;
      }

      if (prefix && !caption.startsWith(prefix)) {
        caption = prefix + ' ' + caption;
      }

      const dur = moment.duration || 15;
      if (dur >= 25 && caption.length < 100) {
        const insightTag = {
          'id-ID': 'Fokus ke detailnya, banyak yang skip bagian ini 👀',
          'en-US': 'Focus on the details — most people skip this 👀',
          'en-GB': 'Focus on the details — most people skip this 👀',
          'en-CA': 'Focus on the details — most people skip this eh 👀'
        }[region];
        caption = caption + ' ' + insightTag;
      }

      pkg.caption = caption;

      const nicheTags = (NICHE_HASHTAGS[niche] || {})[region] || [];
      const platform = PLATFORM_BASE[region] || { base: '#fyp', tag: '#tiktok' };
      const baseTags = Array.isArray(pkg.hashtags) ? pkg.hashtags : [];

      const merged = [];
      const push = (t) => {
        if (!t) return;
        if (merged.indexOf(t) === -1) merged.push(t);
      };

      const rotated = [];
      for (let i = 0; i < nicheTags.length; i++) {
        rotated.push(nicheTags[(seed + i) % nicheTags.length]);
      }
      rotated.slice(0, 3).forEach(push);

      push(platform.tag);
      baseTags.forEach(push);

      pkg.hashtags = merged.slice(0, 6);

      const endKey = (moment.endingType || '[LOOP]').replace(/[\[\]]/g, '');
      const matrix = ENDING_NICHE_CTA[endKey] || {};
      const specific = matrix[niche] || matrix['default'];
      const ctaText = specific ? (specific[region] || specific['en-US']) : null;
      if (ctaText) {
        pkg.cta = ctaText;
      } else {
        const flavorList = (NICHE_CTA_FLAVOR[niche] || {})[region] || [];
        if (flavorList.length > 0) {
          pkg.cta = flavorList[seed % flavorList.length];
        }
      }

      pkg.__niche = niche;
      pkg.__nicheEmoji = NICHE_EMOJI[niche] || '📺';
      return pkg;
    };

    console.log('[Polish V4] ✅ Hook, caption, hashtag, CTA — 100% precision aktif');
  }

  function bootUI() {
    if (!window.renderPage) { setTimeout(bootUI, 100); return; }
    if (window.__polishV4UIInstalled) return;
    window.__polishV4UIInstalled = true;

    const _prevRenderPage = window.renderPage;

    window.renderPage = function() {
      _prevRenderPage.apply(this, arguments);
      try { enhanceClipsV4(); } catch (e) { console.warn('[V4] enhance err:', e); }
    };

    const rc = document.getElementById('clipResults');
    if (rc) {
      const obs = new MutationObserver(() => {
        try { enhanceClipsV4(); } catch (e) {}
      });
      obs.observe(rc, { childList: true, subtree: false });
    }
  }

  function enhanceClipsV4() {
    const cards = document.querySelectorAll('#clipResults .clip-card');
    if (!cards.length) return;

    cards.forEach((card, i) => {
      if (card.__polishV4) return;
      card.__polishV4 = true;

      const idx = parseInt(card.getAttribute('data-clip-idx'), 10);
      const clip = window.allClipsData && window.allClipsData[idx];
      if (!clip) return;

      const scoreSpan = card.querySelector('span[style*="10b981"]');
      if (scoreSpan) {
        const score = clip.score || 0;
        let color, bg, label, tooltip;
        if (score >= 70) {
          color = '#10b981'; bg = 'rgba(16,185,129,0.15)'; label = '🔥';
          tooltip = 'Skor tinggi — momen kuat, engagement tinggi';
        } else if (score >= 50) {
          color = '#f59e0b'; bg = 'rgba(245,158,11,0.15)'; label = '⚡';
          tooltip = 'Skor sedang — momen cukup baik';
        } else {
          color = '#ef4444'; bg = 'rgba(239,68,68,0.15)'; label = '💤';
          tooltip = 'Skor rendah — pertimbangkan skip';
        }
        scoreSpan.style.color = color;
        scoreSpan.style.background = bg;
        scoreSpan.style.border = `1px solid ${color}44`;
        scoreSpan.title = tooltip;
        scoreSpan.style.cursor = 'help';
        scoreSpan.innerHTML = `${label} Golden Score: ${score}/100`;
      }

      const headerRow = card.querySelector('div[style*="display: flex"]');
      if (headerRow) {
        if (!card.querySelector('.polish-niche-badge')) {
          const nicheVal = (document.getElementById('nicheSelect') || {}).value || 'General Content';
          const emoji = NICHE_EMOJI[nicheVal] || '📺';
          const nb = document.createElement('span');
          nb.className = 'polish-niche-badge';
          nb.textContent = `${emoji} ${nicheVal}`;
          nb.style.cssText = 'display:inline-block;padding:3px 8px;border-radius:6px;background:rgba(56,189,248,0.12);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);font-size:0.65rem;font-weight:700;margin-right:6px;';
          headerRow.insertBefore(nb, headerRow.firstChild);
        }

        if (!card.querySelector('.polish-conf-badge')) {
          const conf = clip.confidence || 'MEDIUM';
          let confColor, confBg;
          if (conf === 'HIGH') { confColor = '#10b981'; confBg = 'rgba(16,185,129,0.12)'; }
          else if (conf === 'MEDIUM') { confColor = '#f59e0b'; confBg = 'rgba(245,158,11,0.12)'; }
          else { confColor = '#ef4444'; confBg = 'rgba(239,68,68,0.12)'; }
          const cb = document.createElement('span');
          cb.className = 'polish-conf-badge';
          cb.textContent = `${conf} confidence`;
          cb.style.cssText = `display:inline-block;padding:3px 8px;border-radius:6px;background:${confBg};color:${confColor};border:1px solid ${confColor}44;font-size:0.65rem;font-weight:700;margin-left:4px;`;
          headerRow.appendChild(cb);
        }

        const durSpan = Array.from(headerRow.querySelectorAll('span')).find(s => s.textContent && s.textContent.indexOf('⏱') !== -1);
        if (durSpan) {
          const dur = clip.duration || 0;
          let dColor;
          if (dur >= 15 && dur <= 30) dColor = '#10b981';
          else if (dur >= 8 && dur < 15) dColor = '#38bdf8';
          else if (dur > 30 && dur <= 45) dColor = '#f59e0b';
          else dColor = '#ef4444';
          durSpan.style.color = dColor;
        }
      }

      const video = card.querySelector('video');
      if (video && !video.__polishSeeked) {
        video.__polishSeeked = true;
        const start = clip.rawStart;
        const end = clip.rawEnd;
        const seek = () => {
          try {
            if (Math.abs(video.currentTime - start) > 0.3) video.currentTime = start;
          } catch (e) {}
        };
        if (video.readyState >= 1) seek();
        else video.addEventListener('loadedmetadata', seek, { once: true });
        video.addEventListener('timeupdate', () => {
          if (video.currentTime > end) {
            video.pause();
            try { video.currentTime = start; } catch (e) {}
          }
        });
      }

      card.querySelectorAll('textarea').forEach(ta => {
        if (ta.__polishCounter) return;
        ta.__polishCounter = true;
        const counter = document.createElement('div');
        counter.style.cssText = 'font-size:0.62rem;color:var(--text-muted);text-align:right;margin-top:2px;';
        const update = () => {
          const len = ta.value.length;
          const max = 2200;
          counter.textContent = `${len}/${max}`;
          counter.style.color = len > 180 ? '#f59e0b' : 'var(--text-muted)';
        };
        ta.addEventListener('input', update);
        ta.parentNode.appendChild(counter);
        update();
      });

      card.style.opacity = '0';
      card.style.transform = 'translateY(8px)';
      card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      const delay = Math.min(i * 60, 500);
      setTimeout(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, delay);
    });
  }

  function installSkeletonLoading() {
    if (!window.startRealSignalAnalysis) { setTimeout(installSkeletonLoading, 100); return; }
    if (window.startRealSignalAnalysis.__polishV4Skeleton) return;
    window.startRealSignalAnalysis.__polishV4Skeleton = true;

    const orig = window.startRealSignalAnalysis;
    window.startRealSignalAnalysis = async function() {
      const cont = document.getElementById('clipResults');
      const showSkeleton = cont && (!window.allClipsData || window.allClipsData.length === 0);
      if (showSkeleton) {
        cont.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${Array.from({ length: 2 }).map(() => `
              <div style="background:var(--input-bg);border:1px solid var(--input-border);border-radius:12px;padding:15px;animation:pulse 1.5s ease-in-out infinite;">
                <div style="height:24px;width:40%;background:var(--input-border);border-radius:6px;margin-bottom:10px;"></div>
                <div style="height:14px;width:100%;background:var(--input-border);border-radius:4px;margin-bottom:6px;"></div>
                <div style="height:14px;width:80%;background:var(--input-border);border-radius:4px;margin-bottom:10px;"></div>
                <div style="height:60px;width:100%;background:var(--input-border);border-radius:8px;"></div>
              </div>
            `).join('')}
          </div>
          <style>
            @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
          </style>
        `;
      }
      return await orig.apply(this, arguments);
    };
  }

  function installToast() {
    if (document.getElementById('polishV4Toast')) return;
    const toast = document.createElement('div');
    toast.id = 'polishV4Toast';
    toast.style.cssText = [
      'position:fixed', 'bottom:24px', 'left:50%',
      'transform:translateX(-50%) translateY(20px)',
      'background:linear-gradient(135deg,#10b981,#059669)',
      'color:#fff', 'padding:10px 20px', 'border-radius:10px',
      'font-size:0.82rem', 'font-weight:700',
      'box-shadow:0 8px 24px rgba(16,185,129,0.4)',
      'z-index:9999999', 'opacity:0', 'pointer-events:none',
      'transition:opacity 0.2s ease, transform 0.2s ease',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'
    ].join(';');
    document.body.appendChild(toast);

    window.__polishToast = function (msg, type) {
      toast.textContent = msg;
      toast.style.background = type === 'error'
        ? 'linear-gradient(135deg,#dc2626,#b91c1c)'
        : type === 'info'
          ? 'linear-gradient(135deg,#3b82f6,#2563eb)'
          : 'linear-gradient(135deg,#10b981,#059669)';
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
      clearTimeout(window.__polishToastTimer);
      window.__polishToastTimer = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
      }, 1800);
    };

    document.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('button');
      if (!btn) return;
      const oc = btn.getAttribute('onclick') || '';
      if (oc.indexOf('copyField') !== -1) {
        const fieldMatch = oc.match(/copyField\(\d+,\s*'([^']+)'\)/);
        const field = fieldMatch ? fieldMatch[1] : '';
        const labels = { hookHeadline: 'Hook+Headline', caption: 'Caption', cta: 'CTA', hashtags: 'Hashtag' };
        setTimeout(() => {
          window.__polishToast(`✅ ${labels[field] || 'Copied'} disalin!`, 'success');
        }, 100);
      } else if (oc.indexOf('copyClipText') !== -1) {
        setTimeout(() => window.__polishToast('✅ Copy semua (Hook+Caption+CTA+Hashtag)!', 'success'), 100);
      }
    }, true);
  }

  function installHotkeys() {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const btn = document.getElementById('btnGenerate');
        if (btn && !btn.disabled) {
          e.preventDefault();
          btn.click();
          if (window.__polishToast) window.__polishToast('⚡ Analyzing...', 'info');
        }
      }
    });
  }

  function installAutoScroll() {
    if (!window.startRealSignalAnalysis) { setTimeout(installAutoScroll, 100); return; }
    if (window.startRealSignalAnalysis.__polishV4Scroll) return;
    window.startRealSignalAnalysis.__polishV4Scroll = true;

    const orig = window.startRealSignalAnalysis;
    window.startRealSignalAnalysis = async function() {
      const result = await orig.apply(this, arguments);
      setTimeout(() => {
        const firstCard = document.querySelector('#clipResults .clip-card');
        if (firstCard) {
          try { firstCard.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
        }
      }, 900);
      return result;
    };
  }

  function installEditCue() {
    document.addEventListener('input', (e) => {
      const t = e.target;
      if (!t || !t.matches || !t.matches('textarea, input[type="text"]')) return;
      t.style.transition = 'background 0.2s ease';
      t.style.background = 'rgba(56,189,248,0.08)';
      clearTimeout(t.__polishEditTimer);
      t.__polishEditTimer = setTimeout(() => {
        t.style.background = 'transparent';
      }, 400);
    }, true);
  }

  function installEmptyState() {
    const obs = new MutationObserver(() => {
      const rc = document.getElementById('clipResults');
      if (!rc) return;
      const empty = rc.querySelector('.empty-state');
      if (empty && !empty.__polishUpgraded) {
        empty.__polishUpgraded = true;
        empty.innerHTML = `
          <div style="text-align:center;padding:30px 16px;">
            <div style="font-size:2.5rem;margin-bottom:10px;">🎬</div>
            <h3 style="font-size:1rem;color:var(--text-main);margin-bottom:6px;">Belum ada klip</h3>
            <p style="font-size:0.82rem;color:var(--text-sub);margin-bottom:14px;line-height:1.5;">
              Upload video di panel kiri, lalu klik <b style="color:var(--accent-color);">⚡ AUTO-ANALYZE</b> untuk mulai.
            </p>
            <div style="display:inline-block;padding:8px 14px;background:var(--input-bg);border:1px dashed var(--input-border);border-radius:8px;font-size:0.72rem;color:var(--text-muted);">
              💡 Tips: Tekan <b>Ctrl+Enter</b> untuk analyze cepat
            </div>
          </div>
        `;
      }
    });
    const target = document.getElementById('clipResults');
    if (target) {
      obs.observe(target, { childList: true, subtree: true });
    }
  }

  function boot() {
    bootHookEngine();
    bootUI();
    installSkeletonLoading();
    installToast();
    installHotkeys();
    installAutoScroll();
    installEditCue();
    installEmptyState();

    console.log('%c[Polish V4] ✅ 100% PRECISION — siap pakai', 'color:#10b981;font-weight:bold;font-size:13px;padding:6px 0');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 400));
  } else {
    setTimeout(boot, 400);
  }
})();


/* ═══════════════════════════════════════════════════════════════════════════
 * PART 3 / 6 — polish-v5.js (ORIGINAL)
 * ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';
  if (window.__POLISH_V5_LOADED) return;
  window.__POLISH_V5_LOADED = true;

  console.log('%c[Polish V5] 🎯 Context-Aware Edition loading...', 'color:#8b5cf6;font-weight:bold;');

  window.__clipContext = {
    topic: '',
    people: '',
    extra: '',
    filename: '',
    keywords: [],
    metadata: {},
    hasContext: false
  };

  function parseFilename(filename) {
    if (!filename) return { topic: '', keywords: [] };
    let clean = filename.replace(/\.[^.]+$/, '');
    clean = clean.replace(/[_\-\.]+/g, ' ');
    const stopwords = [
      'video', 'vid', 'clip', 'final', 'ver', 'version', 'hd', '4k', '1080p', '720p',
      'download', 'downloaded', 'edit', 'editing', 'raw', 'output', 'export',
      'recording', 'record', 'screen', 'capture', 'y2mate', 'ytdl', 'tiktok'
    ];
    const words = clean.split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length >= 2)
      .filter(w => !stopwords.includes(w.toLowerCase()))
      .filter(w => !/^\d+$/.test(w));
    if (words.length === 0) return { topic: '', keywords: [] };
    let topic = '';
    if (words.length <= 4) {
      topic = words.join(' ');
    } else {
      topic = words.slice(0, 3).join(' ');
    }
    return {
      topic: topic,
      keywords: words.slice(0, 6)
    };
  }

  async function readMp4Metadata(file) {
    try {
      const buffer = await file.slice(0, Math.min(file.size, 512 * 1024)).arrayBuffer();
      const view = new DataView(buffer);
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const metadata = {};
      const markers = {
        '©nam': 'title',
        '©ART': 'artist',
        '©cmt': 'comment',
        '©too': 'encoder',
        'desc': 'description',
        'titl': 'title',
        'auth': 'artist'
      };
      for (const [tag, field] of Object.entries(markers)) {
        const tagBytes = new Uint8Array(tag.length);
        for (let i = 0; i < tag.length; i++) tagBytes[i] = tag.charCodeAt(i);
        const found = findBytes(new Uint8Array(buffer), tagBytes);
        if (found !== -1) {
          const valueStart = found + 16;
          const valueBytes = new Uint8Array(buffer.slice(valueStart, valueStart + 200));
          const value = decoder.decode(valueBytes).replace(/\0.*$/, '').trim();
          if (value && value.length >= 2 && value.length <= 150) {
            metadata[field] = value;
          }
        }
      }
      return metadata;
    } catch (e) {
      console.warn('[V5] Metadata read error:', e);
      return {};
    }
  }

  function findBytes(haystack, needle) {
    outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
      for (let j = 0; j < needle.length; j++) {
        if (haystack[i + j] !== needle[j]) continue outer;
      }
      return i;
    }
    return -1;
  }

  function installContextPanel() {
    if (document.getElementById('contextPanel')) return;
    const dropzone = document.getElementById('dropzone');
    if (!dropzone) return;

    const panel = document.createElement('div');
    panel.id = 'contextPanel';
    panel.style.cssText = [
      'display:none',
      'padding:12px',
      'background:linear-gradient(135deg,rgba(139,92,246,0.08),rgba(56,189,248,0.08))',
      'border:1px solid rgba(139,92,246,0.3)',
      'border-radius:10px',
      'margin-top:8px'
    ].join(';');

    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:1rem;">🎯</span>
          <span style="font-size:0.78rem;font-weight:700;color:var(--text-main);">Konteks Video</span>
          <span style="font-size:0.62rem;color:var(--text-muted);">(opsional — biar hasil tidak generik)</span>
        </div>
        <button id="toggleContext" type="button" style="background:transparent;border:none;color:var(--text-sub);cursor:pointer;font-size:0.7rem;font-weight:700;padding:2px 6px;">▼</button>
      </div>
      <div id="contextFields">
        <div style="margin-bottom:8px;">
          <label style="display:block;font-size:0.68rem;color:var(--text-sub);font-weight:600;margin-bottom:3px;">Topik / Judul</label>
          <input type="text" id="ctxTopic" placeholder="Contoh: Messi vs Ronaldo, Valorant Ace, Review iPhone 16..." class="input-field" style="font-size:0.78rem;padding:6px 10px;">
        </div>
        <div style="margin-bottom:8px;">
          <label style="display:block;font-size:0.68rem;color:var(--text-sub);font-weight:600;margin-bottom:3px;">Nama Orang di Video</label>
          <input type="text" id="ctxPeople" placeholder="Contoh: Messi, Ronaldo, Pak Budi..." class="input-field" style="font-size:0.78rem;padding:6px 10px;">
        </div>
        <div>
          <label style="display:block;font-size:0.68rem;color:var(--text-sub);font-weight:600;margin-bottom:3px;">Info Tambahan</label>
          <input type="text" id="ctxExtra" placeholder="Contoh: Menit 89, gol kemenangan, reaksi lucu..." class="input-field" style="font-size:0.78rem;padding:6px 10px;">
        </div>
        <div id="ctxDetected" style="display:none;margin-top:10px;padding:8px;background:rgba(16,185,129,0.08);border:1px dashed rgba(16,185,129,0.3);border-radius:6px;font-size:0.7rem;color:var(--text-sub);"></div>
      </div>
    `;

    dropzone.parentNode.insertBefore(panel, dropzone.nextSibling);

    document.getElementById('toggleContext').onclick = () => {
      const fields = document.getElementById('contextFields');
      const btn = document.getElementById('toggleContext');
      const isHidden = fields.style.display === 'none';
      fields.style.display = isHidden ? 'block' : 'none';
      btn.innerText = isHidden ? '▼' : '▶';
    };

    const updateContext = () => {
      const topic = (document.getElementById('ctxTopic') || {}).value || '';
      const people = (document.getElementById('ctxPeople') || {}).value || '';
      const extra = (document.getElementById('ctxExtra') || {}).value || '';

      window.__clipContext.topic = topic.trim();
      window.__clipContext.people = people.trim();
      window.__clipContext.extra = extra.trim();
      window.__clipContext.hasContext = !!(window.__clipContext.topic || window.__clipContext.people || window.__clipContext.extra);
    };

    ['ctxTopic', 'ctxPeople', 'ctxExtra'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', updateContext);
    });

    const videoInput = document.getElementById('videoInput');
    if (videoInput) {
      videoInput.addEventListener('change', () => {
        panel.style.display = 'block';
      });
    }
  }

  function showDetectedContext() {
    const box = document.getElementById('ctxDetected');
    if (!box) return;

    const ctx = window.__clipContext;
    const lines = [];

    if (ctx.filename) lines.push(`📁 File: <b>${escapeHtml(ctx.filename)}</b>`);

    if (ctx.metadata && Object.keys(ctx.metadata).length > 0) {
      if (ctx.metadata.title) lines.push(`🏷️ Title: <b>${escapeHtml(ctx.metadata.title)}</b>`);
      if (ctx.metadata.artist) lines.push(`👤 Artist: <b>${escapeHtml(ctx.metadata.artist)}</b>`);
      if (ctx.metadata.comment) lines.push(`💬 Comment: <b>${escapeHtml(ctx.metadata.comment.slice(0, 80))}</b>`);
    }

    if (ctx.keywords && ctx.keywords.length > 0) {
      lines.push(`🔍 Auto-detect: <b>${escapeHtml(ctx.keywords.slice(0, 5).join(', '))}</b>`);
    }

    if (lines.length > 0) {
      box.style.display = 'block';
      box.innerHTML = lines.join('<br>');
    } else {
      box.style.display = 'none';
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  function bootHookEngineV5() {
    if (!window.HookEngine) { setTimeout(bootHookEngineV5, 100); return; }
    if (HookEngine.__polishV5Installed) return;
    HookEngine.__polishV5Installed = true;

    const _origBuild = HookEngine.buildUniquePackage.bind(HookEngine);

    HookEngine.buildUniquePackage = function(moment, niche, regionCode, clipIndex, usedSet) {
      const pkg = _origBuild(moment, niche, regionCode, clipIndex, usedSet);
      const region = (!regionCode || regionCode === 'auto') ? 'id-ID' : regionCode;
      const seed = clipIndex || 0;
      const ctx = window.__clipContext;

      const topic = ctx.topic || (ctx.metadata && ctx.metadata.title) || (ctx.keywords[0] ? ctx.keywords.join(' ') : '');
      const people = ctx.people || (ctx.metadata && ctx.metadata.artist) || '';
      const extra = ctx.extra || (ctx.metadata && ctx.metadata.comment) || '';

      if (topic) {
        const attentions = {
          'id-ID': ['GILA!!', 'LAH?!', 'BUSYET!!', 'NGGAK NYANGKA...', 'DETIK-DETIK!!'],
          'en-US': ['WAIT WHAT?!', 'NO WAY!!', 'INSANE!!', 'HOLD UP...', 'FOR REAL?!'],
          'en-GB': ['MATE!!', 'BLOODY HELL...', 'PROPER MADNESS!!', 'NO WAY MATE!!', 'RIGHT THEN...'],
          'en-CA': ['THIS IS WILD!!', 'NO WAY EH...', 'HOLD ON...', 'UNREAL EH...', 'MASSIVE!!']
        };
        const attention = (attentions[region] || attentions['en-US'])[seed % 5];

        const hookTemplates = {
          'id-ID': [
            `${attention} Momen ${topic} yang bikin semua orang diem!`,
            `${attention} ${topic} — ini yang nggak ada yang expect!`,
            `${attention} Bagian ${topic} yang wajib kamu tonton sampai habis!`
          ],
          'en-US': [
            `${attention} This ${topic} moment is unreal!`,
            `${attention} That ${topic} part nobody saw coming!`,
            `${attention} The ${topic} clip everyone's replaying!`
          ],
          'en-GB': [
            `${attention} This ${topic} bit is proper mental!`,
            `${attention} That ${topic} moment nobody expected!`,
            `${attention} The ${topic} clip everyone's on about!`
          ],
          'en-CA': [
            `${attention} This ${topic} moment is wild eh!`,
            `${attention} That ${topic} part nobody saw coming!`,
            `${attention} The ${topic} clip everyone's replaying!`
          ]
        };
        pkg.hookHeadline = (hookTemplates[region] || hookTemplates['en-US'])[seed % 3];
        pkg.hook = pkg.hookHeadline;
        pkg.headline = pkg.hookHeadline;
      } else {
        const honestHooks = {
          'id-ID': [
            'Momen ini beneran di luar dugaan 👀',
            'Bagian ini yang bikin semua orang diem',
            'Detik ini bener-bener nggak bisa diprediksi'
          ],
          'en-US': [
            'This moment is genuinely unexpected 👀',
            'The part where everything goes quiet',
            'Nobody could predict this moment'
          ],
          'en-GB': [
            'This bit is genuinely unexpected mate 👀',
            'The part where everyone went quiet',
            'Nobody could predict this moment'
          ],
          'en-CA': [
            'This moment is genuinely unexpected eh 👀',
            'The part where everyone went quiet',
            'Nobody could predict this moment'
          ]
        };
        const honest = honestHooks[region] || honestHooks['en-US'];
        if (!pkg.hookHeadline || pkg.hookHeadline.length < 5) {
          pkg.hookHeadline = honest[seed % honest.length];
          pkg.hook = pkg.hookHeadline;
        }
      }

      let caption = pkg.caption || '';

      if (topic || people || extra) {
        const parts = [];

        if (topic) {
          parts.push({
            'id-ID': `📌 ${topic}`,
            'en-US': `📌 ${topic}`,
            'en-GB': `📌 ${topic}`,
            'en-CA': `📌 ${topic}`
          }[region]);
        }

        if (people) {
          parts.push({
            'id-ID': `👤 ${people}`,
            'en-US': `👤 ${people}`,
            'en-GB': `👤 ${people}`,
            'en-CA': `👤 ${people}`
          }[region]);
        }

        if (extra) {
          parts.push({
            'id-ID': `💬 ${extra}`,
            'en-US': `💬 ${extra}`,
            'en-GB': `💬 ${extra}`,
            'en-CA': `💬 ${extra}`
          }[region]);
        }

        const strippedCaption = caption
          .replace(/^[🎮⚽🎙️😂💡📈🤖💼🔥🎬🍽️✈️📖💬👀👗🎭]+\s+(Di tengah|Mid-game|On the field|On the pitch|Mid-conversation|This funny|Key insight|Key point|Tech-side|Business insight|Reminder|This scene|This food|On the trip|This story|In this session|This reaction|This look|This moment|Momen ini|Scene lucu|Insight penting|Poin penting|Di sisi teknologi|Di perjalanan|Cerita ini|Di sesi ini|Reaksi ini|Look ini)[^.]*\.\s*/i, '')
          .trim();

        caption = parts.join(' · ') + '\n\n' + strippedCaption;
      } else {
        caption = caption
          .replace(/^[🎮⚽🎙️😂💡📈🤖💼🔥🎬🍽️✈️📖💬👀👗🎭]+\s+(Di tengah|Mid-game|On the field|On the pitch|Mid-conversation|This funny|Key insight|Key point|Tech-side|Business insight|Reminder|This scene|This food|On the trip|This story|In this session|This reaction|This look|This moment)[^.]*\.\s*/i, '')
          .trim();
      }

      caption = caption
        .replace(/This is real, not edited[^.]*\.\s*/gi, '')
        .replace(/Ini beneran terjadi, bukan hasil edit[^.]*\.\s*/gi, '')
        .replace(/Did anyone else catch the small detail\?/gi, 'Ada yang ngeh sama detail ini?')
        .replace(/Ada yang sadar sama detail ini\?/gi, 'Ada yang ngeh juga?')
        .replace(/This is real[^.]*\.\s*/gi, '')
        .trim();

      pkg.caption = caption;

      if (topic || people) {
        const ctaMap = {
          'id-ID': [
            `Menurut kamu tentang ${topic || people} ini gimana? 👇`,
            `Setuju nggak sama momen ${topic || people} ini? 👇`,
            `Yang relate, komen 👇`
          ],
          'en-US': [
            `Thoughts on this ${topic || people} moment? 👇`,
            `Agree with this ${topic || people} moment? 👇`,
            `If you can relate, comment 👇`
          ],
          'en-GB': [
            `Thoughts on this ${topic || people} moment mate? 👇`,
            `Agree with this ${topic || people} bit? 👇`,
            `If you can relate, comment 👇`
          ],
          'en-CA': [
            `Thoughts on this ${topic || people} moment eh? 👇`,
            `Agree with this ${topic || people} moment? 👇`,
            `If you can relate, comment 👇`
          ]
        };
        pkg.cta = (ctaMap[region] || ctaMap['en-US'])[seed % 3];
      } else {
        const honestCta = {
          'id-ID': [
            'Menurut kamu, momen ini gimana? 👇',
            'Ada yang ngalamin hal serupa? 👇',
            'Komen di bawah 👇'
          ],
          'en-US': [
            'What do you think of this moment? 👇',
            'Anyone experienced something similar? 👇',
            'Drop a comment below 👇'
          ],
          'en-GB': [
            'What do you reckon about this moment? 👇',
            'Anyone been through something similar? 👇',
            'Drop a comment below 👇'
          ],
          'en-CA': [
            'What do you think of this moment eh? 👇',
            'Anyone experienced something similar? 👇',
            'Drop a comment below 👇'
          ]
        };
        pkg.cta = (honestCta[region] || honestCta['en-US'])[seed % 3];
      }

      if (topic) {
        const slug = topic.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter(w => w.length >= 3)
          .slice(0, 2)
          .map(w => '#' + w)
          .filter(t => t.length >= 4);

        if (slug.length > 0) {
          const current = Array.isArray(pkg.hashtags) ? pkg.hashtags : [];
          pkg.hashtags = [...slug, ...current].slice(0, 6);
        }
      }

      return pkg;
    };

    console.log('[Polish V5] ✅ Context-aware hook/caption/CTA/hashtag aktif');
  }

  function installFileContextReader() {
    const videoInput = document.getElementById('videoInput');
    if (!videoInput) { setTimeout(installFileContextReader, 100); return; }
    if (videoInput.__polishV5Hooked) return;
    videoInput.__polishV5Hooked = true;

    videoInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const ctx = window.__clipContext;

      ctx.topic = '';
      ctx.people = '';
      ctx.extra = '';
      ctx.filename = file.name;
      ctx.keywords = [];
      ctx.metadata = {};

      const parsed = parseFilename(file.name);
      ctx.keywords = parsed.keywords;
      if (parsed.topic && !ctx.topic) {
        const topicInput = document.getElementById('ctxTopic');
        if (topicInput && !topicInput.value) {
          topicInput.value = parsed.topic;
          ctx.topic = parsed.topic;
        }
      }

      const isMp4 = file.name.toLowerCase().endsWith('.mp4') || file.type.indexOf('mp4') !== -1;
      if (isMp4) {
        try {
          ctx.metadata = await readMp4Metadata(file);
        } catch (err) {
          console.warn('[V5] Metadata read failed:', err);
        }
      }

      ctx.hasContext = !!(ctx.topic || ctx.people || ctx.extra || ctx.metadata.title);

      showDetectedContext();

      const panel = document.getElementById('contextPanel');
      if (panel) panel.style.display = 'block';
    });
  }

  function boot() {
    installContextPanel();
    installFileContextReader();
    bootHookEngineV5();

    console.log('%c[Polish V5] ✅ AKTIF — Output tidak akan terasa "palsu" lagi', 'color:#8b5cf6;font-weight:bold;font-size:13px;padding:6px 0');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 500));
  } else {
    setTimeout(boot, 500);
  }
})();


/* ═══════════════════════════════════════════════════════════════════════════
 * PART 4 / 6 — polish-v6.js (MODIFIED — NICHE AWARE + UNLIMITED)
 * ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';
  if (window.__POLISH_V6_LOADED) return;
  window.__POLISH_V6_LOADED = true;

  console.log('%c[Polish V6] ♾️  UNLIMITED + NICHE AWARE loading...', 'color:#8b5cf6;font-weight:bold;font-size:13px');

  const NICHE_VOCAB = {
    'Gaming & Esports': {
      subjects: { 'id-ID': ['Play ini', 'Ace ini', 'Ranked match ini', 'Clutch ini'], 'en-US': ['This play', 'This ace', 'This ranked match', 'This clutch'] },
      outcomes: { 'id-ID': ['bikin tim musuh kacau', 'bikin satu lobby diem', 'bikin comeback mustahil jadi nyata', 'bikin chat ribut'], 'en-US': ['breaks the enemy team', 'silences the whole lobby', 'turns an impossible comeback real', 'makes the chat go wild'] },
      captionDetails: { 'id-ID': ['skill level yang bikin lawan nyerah 💀', 'gerakan yang susah ditiru 😭', 'momen yang bikin tim musuh tepok jidat 🔥', 'clutch yang nggak masuk akal 🤯'], 'en-US': ['skill level that makes enemies surrender 💀', 'movement that\'s hard to copy 😭', 'moment that made enemies facepalm 🔥', 'clutch that defies logic 🤯'] },
      ctaObjects: { 'id-ID': ['skill-mu', 'rank-mu', 'main-mu', 'loadout-mu'], 'en-US': ['your skill', 'your rank', 'your main', 'your loadout'] }
    },
    'Sports & Fitness': {
      subjects: { 'id-ID': ['Gol ini', 'Skill ini', 'Pertandingan ini', 'Momen ini'], 'en-US': ['This goal', 'This skill', 'This match', 'This moment'] },
      outcomes: { 'id-ID': ['bikin stadion meledak', 'bikin semua orang loncat', 'bikin komentator kehabisan kata', 'bikin lawan nyerah'], 'en-US': ['makes the stadium erupt', 'makes everyone jump', 'leaves the commentator speechless', 'breaks the opponent'] },
      captionDetails: { 'id-ID': ['skill level dewa 💀', 'gol yang bikin semua orang loncat 🔥', 'momen yang bikin merinding 😱', 'aksi yang jarang terjadi ⚡'], 'en-US': ['next-level skill 💀', 'goal that made everyone jump 🔥', 'moment that gives chills 😱', 'rare action ⚡'] },
      ctaObjects: { 'id-ID': ['prediksimu', 'tim favoritmu', 'skill-mu', 'form-mu'], 'en-US': ['your prediction', 'your favorite team', 'your skill', 'your form'] }
    },
    'Podcast & Talkshow': {
      subjects: { 'id-ID': ['Poin ini', 'Statement ini', 'Insight ini', 'Momen ini'], 'en-US': ['This point', 'This statement', 'This insight', 'This moment'] },
      outcomes: { 'id-ID': ['bikin semua orang diem', 'bikin mikir ulang', 'bikin dunia maya ribut', 'bikin orang setuju 100%'], 'en-US': ['silences the room', 'makes you rethink everything', 'breaks the internet', 'makes everyone agree'] },
      captionDetails: { 'id-ID': ['insight yang jarang dibahas 🎙️', 'poin yang bikin mikir ulang 💭', 'statement yang bikin semua orang diem 👀', 'momen yang bikin gue setuju 100% 🔥'], 'en-US': ['insight rarely discussed 🎙️', 'point that makes you rethink 💭', 'statement that silences everyone 👀', 'moment that made me agree 100% 🔥'] },
      ctaObjects: { 'id-ID': ['pendapatmu', 'pandanganmu', 'pengalamanmu', 'setuju nggak'], 'en-US': ['your take', 'your view', 'your experience', 'agree or not'] }
    },
    'Comedy & Entertainment': {
      subjects: { 'id-ID': ['Bagian ini', 'Timing ini', 'Adegan ini', 'Momen ini'], 'en-US': ['This part', 'This timing', 'This scene', 'This moment'] },
      outcomes: { 'id-ID': ['bikin semua orang ngakak', 'bikin susah napas', 'bikin ngakak sampai nangis', 'bikin semua orang tepok jidat'], 'en-US': ['makes everyone laugh', 'makes you lose your breath', 'makes you laugh till you cry', 'makes everyone facepalm'] },
      captionDetails: { 'id-ID': ['timing yang sempurna 😂', 'ekspresi yang nggak bisa ditiru 💀', 'momen yang bikin ngakak parah 🤣', 'kelakuan yang bikin tepok jidat 🔥'], 'en-US': ['perfect timing 😂', 'expression that can\'t be copied 💀', 'moment that made you laugh hard 🤣', 'behavior that made everyone facepalm 🔥'] },
      ctaObjects: { 'id-ID': ['kelucuanmu', 'reaksimu', 'pendapatmu', 'skormu'], 'en-US': ['your humor', 'your reaction', 'your opinion', 'your score'] }
    },
    'Education & Knowledge': {
      subjects: { 'id-ID': ['Fakta ini', 'Penjelasan ini', 'Tips ini', 'Insight ini'], 'en-US': ['This fact', 'This explanation', 'This tip', 'This insight'] },
      outcomes: { 'id-ID': ['bikin otak nyala', 'bikin kamu paham langsung', 'bikin semua orang tercengang', 'bikin banyak orang berubah pikiran'], 'en-US': ['lights up your brain', 'makes you understand instantly', 'leaves everyone stunned', 'changes a lot of minds'] },
      captionDetails: { 'id-ID': ['fakta yang jarang diketahui 💡', 'penjelasan yang gampang dipahami 📚', 'insight yang bikin mikir 🧠', 'tips yang wajib di-save 📌'], 'en-US': ['fact rarely known 💡', 'explanation that\'s easy to follow 📚', 'insight that makes you think 🧠', 'tip you must save 📌'] },
      ctaObjects: { 'id-ID': ['pemahamanmu', 'catatanmu', 'pengalamanmu', 'pendapatmu'], 'en-US': ['your understanding', 'your notes', 'your experience', 'your take'] }
    },
    'Finance & Crypto': {
      subjects: { 'id-ID': ['Strategi ini', 'Tips ini', 'Analisis ini', 'Poin ini'], 'en-US': ['This strategy', 'This tip', 'This analysis', 'This point'] },
      outcomes: { 'id-ID': ['bikin portfolio naik', 'bikin trader mikir ulang', 'bikin banyak orang sadar', 'bikin mindset keuangan berubah'], 'en-US': ['boosts your portfolio', 'makes traders rethink', 'opens a lot of eyes', 'changes your money mindset'] },
      captionDetails: { 'id-ID': ['strategi yang jarang dibahas 📈', 'tips yang bikin portfolio naik 💰', 'analisis yang bikin mikir 🧠', 'insight yang wajib di-save 📌'], 'en-US': ['strategy rarely discussed 📈', 'tip that boosts your portfolio 💰', 'analysis that makes you think 🧠', 'insight you must save 📌'] },
      ctaObjects: { 'id-ID': ['strategimu', 'portfolio-mu', 'pendapatmu', 'pengalamanmu'], 'en-US': ['your strategy', 'your portfolio', 'your take', 'your experience'] }
    },
    'Technology & AI': {
      subjects: { 'id-ID': ['Gadget ini', 'Fitur ini', 'Update ini', 'AI ini'], 'en-US': ['This gadget', 'This feature', 'This update', 'This AI'] },
      outcomes: { 'id-ID': ['bikin semua orang pengen', 'bikin gadget lama ketinggalan', 'bikin produktivitas naik', 'bikin pekerjaan lebih cepat'], 'en-US': ['makes everyone want one', 'makes old gadgets obsolete', 'boosts your productivity', 'makes work faster'] },
      captionDetails: { 'id-ID': ['fitur yang jarang dipakai 🤖', 'gadget yang bikin pengen beli ⚡', 'update yang penting banget 🔬', 'teknologi yang bikin kerjaan cepat 💻'], 'en-US': ['feature rarely used 🤖', 'gadget that makes you want to buy ⚡', 'update that matters a lot 🔬', 'tech that makes work faster 💻'] },
      ctaObjects: { 'id-ID': ['gadget-mu', 'setup-mu', 'pendapatmu', 'pengalamanmu'], 'en-US': ['your gadget', 'your setup', 'your take', 'your experience'] }
    },
    'Business & Entrepreneurship': {
      subjects: { 'id-ID': ['Strategi ini', 'Peluang ini', 'Pelajaran ini', 'Insight ini'], 'en-US': ['This strategy', 'This opportunity', 'This lesson', 'This insight'] },
      outcomes: { 'id-ID': ['bikin bisnis naik level', 'bikin kompetitor waspada', 'bikin kamu mikir ulang', 'bikin omzet naik'], 'en-US': ['takes your business to the next level', 'puts competitors on alert', 'makes you rethink', 'increases your revenue'] },
      captionDetails: { 'id-ID': ['strategi yang jarang dibahas 💼', 'peluang yang orang lewatkan 📊', 'pelajaran yang wajib di-save 🚀', 'insight yang bikin bisnis berubah 📌'], 'en-US': ['strategy rarely discussed 💼', 'opportunity people miss 📊', 'lesson you must save 🚀', 'insight that transforms your business 📌'] },
      ctaObjects: { 'id-ID': ['strategimu', 'bisnismu', 'pengalamanmu', 'pendapatmu'], 'en-US': ['your strategy', 'your business', 'your experience', 'your take'] }
    },
    'Motivation & Self-Growth': {
      subjects: { 'id-ID': ['Reminder ini', 'Pesan ini', 'Kata-kata ini', 'Insight ini'], 'en-US': ['This reminder', 'This message', 'These words', 'This insight'] },
      outcomes: { 'id-ID': ['bikin mindset berubah', 'bikin semangat balik', 'bikin mikir ulang', 'bikin hari lebih baik'], 'en-US': ['changes your mindset', 'brings your spark back', 'makes you rethink', 'makes your day better'] },
      captionDetails: { 'id-ID': ['reminder yang wajib di-save 🔥', 'pesan yang bikin semangat balik 💪', 'kata yang bikin mikir ulang ✨', 'insight yang bikin hari lebih baik 🌟'], 'en-US': ['reminder you must save 🔥', 'message that brings your spark back 💪', 'words that make you rethink ✨', 'insight that makes your day better 🌟'] },
      ctaObjects: { 'id-ID': ['versi terbaikmu', 'mimpimu', 'perjalananmu', 'mindset-mu'], 'en-US': ['your best self', 'your dream', 'your journey', 'your mindset'] }
    },
    'Film & TV Series': {
      subjects: { 'id-ID': ['Scene ini', 'Plot twist ini', 'Adegan ini', 'Karakter ini'], 'en-US': ['This scene', 'This plot twist', 'This moment', 'This character'] },
      outcomes: { 'id-ID': ['bikin semua orang shock', 'bikin cerita berubah total', 'bikin nggak bisa move on', 'bikin teori baru muncul'], 'en-US': ['shocks everyone', 'completely flips the story', 'makes you unable to move on', 'sparks new theories'] },
      captionDetails: { 'id-ID': ['plot twist yang nggak ada yang expect 🎬', 'scene yang bikin merinding 😱', 'adegan yang bikin sedih 💔', 'momen yang bikin ulang nonton 🔥'], 'en-US': ['plot twist nobody expected 🎬', 'scene that gives chills 😱', 'moment that breaks your heart 💔', 'scene that makes you rewatch 🔥'] },
      ctaObjects: { 'id-ID': ['teorimu', 'scene favoritmu', 'review-mu', 'prediksimu'], 'en-US': ['your theory', 'your favorite scene', 'your review', 'your prediction'] }
    },
    'Culinary & Food': {
      subjects: { 'id-ID': ['Resep ini', 'Masakan ini', 'Plating ini', 'Bahan ini'], 'en-US': ['This recipe', 'This dish', 'This plating', 'This ingredient'] },
      outcomes: { 'id-ID': ['bikin semua orang lapar', 'bikin dapur jadi sibuk', 'bikin semua orang pengen', 'bikin aroma-nya nyampe kemana-mana'], 'en-US': ['makes everyone hungry', 'gets the kitchen busy', 'makes everyone want one', 'fills the air with aroma'] },
      captionDetails: { 'id-ID': ['resep yang gampang banget 🍽️', 'masakan yang bikin lapar 😋', 'plating yang bikin semua orang pengen 🔥', 'bahan yang jarang dipakai 👨‍🍳'], 'en-US': ['recipe that\'s super easy 🍽️', 'dish that makes you hungry 😋', 'plating everyone wants to copy 🔥', 'ingredient rarely used 👨‍🍳'] },
      ctaObjects: { 'id-ID': ['resep andalanmu', 'masakan favoritmu', 'tips dapurmu', 'versi kamu'], 'en-US': ['your go-to recipe', 'your favorite dish', 'your kitchen tips', 'your version'] }
    },
    'Travel & Lifestyle': {
      subjects: { 'id-ID': ['Tempat ini', 'Trip ini', 'Spot ini', 'Momen ini'], 'en-US': ['This place', 'This trip', 'This spot', 'This moment'] },
      outcomes: { 'id-ID': ['bikin semua orang pengen', 'bikin feed instagram estetik', 'bikin liburan nggak terlupakan', 'bikin kamu pengen book tiket'], 'en-US': ['makes everyone want to visit', 'makes your feed aesthetic', 'makes an unforgettable trip', 'makes you book a ticket'] },
      captionDetails: { 'id-ID': ['spot yang jarang diketahui ✈️', 'tempat yang bikin pengen 📸', 'trip yang nggak akan lupa 🌍', 'momen yang wajib di-save 📌'], 'en-US': ['spot rarely known ✈️', 'place that makes you want to go 📸', 'trip you\'ll never forget 🌍', 'moment you must save 📌'] },
      ctaObjects: { 'id-ID': ['destinasi favoritmu', 'trip-mu', 'budget-mu', 'bucket list-mu'], 'en-US': ['your favorite destination', 'your trip', 'your budget', 'your bucket list'] }
    },
    'Storytelling & Mystery': {
      subjects: { 'id-ID': ['Cerita ini', 'Misteri ini', 'Kejadian ini', 'Fakta ini'], 'en-US': ['This story', 'This mystery', 'This event', 'This fact'] },
      outcomes: { 'id-ID': ['bikin merinding', 'bikin susah tidur', 'bikin mikir ulang', 'bikin penasaran banget'], 'en-US': ['gives you chills', 'makes you unable to sleep', 'makes you rethink', 'makes you so curious'] },
      captionDetails: { 'id-ID': ['cerita yang bikin merinding 📖', 'misteri yang belum terpecahkan 😨', 'kejadian yang bikin susah tidur 🌙', 'fakta yang bikin penasaran 👀'], 'en-US': ['story that gives chills 📖', 'mystery still unsolved 😨', 'event that keeps you up at night 🌙', 'fact that makes you curious 👀'] },
      ctaObjects: { 'id-ID': ['teorimu', 'pendapatmu', 'pengalamanmu', 'versimu'], 'en-US': ['your theory', 'your take', 'your experience', 'your version'] }
    },
    'Interview & Discussion': {
      subjects: { 'id-ID': ['Poin ini', 'Statement ini', 'Jawaban ini', 'Momen ini'], 'en-US': ['This point', 'This statement', 'This answer', 'This moment'] },
      outcomes: { 'id-ID': ['bikin semua orang mikir', 'bikin pembicaraan panas', 'bikin banyak orang setuju', 'bikin sudut pandang baru muncul'], 'en-US': ['makes everyone think', 'heats up the conversation', 'makes a lot of people agree', 'opens a new perspective'] },
      captionDetails: { 'id-ID': ['jawaban yang jujur 💬', 'statement yang bikin mikir 🤔', 'momen yang bikin setuju 👏', 'poin yang jarang dibahas 📌'], 'en-US': ['honest answer 💬', 'statement that makes you think 🤔', 'moment that makes you agree 👏', 'point rarely discussed 📌'] },
      ctaObjects: { 'id-ID': ['pendapatmu', 'sudut pandangmu', 'jawabanmu', 'pengalamanmu'], 'en-US': ['your opinion', 'your perspective', 'your answer', 'your experience'] }
    },
    'Reaction & Review': {
      subjects: { 'id-ID': ['Reaksi ini', 'Review ini', 'Pendapat ini', 'Momen ini'], 'en-US': ['This reaction', 'This review', 'This take', 'This moment'] },
      outcomes: { 'id-ID': ['bikin semua orang setuju', 'bikin orang mikir ulang', 'bikin banyak yang comment', 'bikin perbandingan muncul'], 'en-US': ['makes everyone agree', 'makes people rethink', 'gets a lot of comments', 'sparks comparisons'] },
      captionDetails: { 'id-ID': ['reaksi yang jujur 👀', 'review yang jarang dibahas 💯', 'pendapat yang bikin mikir 😲', 'momen yang bikin comment 🔥'], 'en-US': ['honest reaction 👀', 'review rarely discussed 💯', 'take that makes you think 😲', 'moment that gets comments 🔥'] },
      ctaObjects: { 'id-ID': ['review-mu', 'reaksimu', 'skormu', 'pendapatmu'], 'en-US': ['your review', 'your reaction', 'your score', 'your take'] }
    },
    'Lifestyle & Fashion': {
      subjects: { 'id-ID': ['Outfit ini', 'Look ini', 'Style ini', 'Kombinasi ini'], 'en-US': ['This outfit', 'This look', 'This style', 'This combination'] },
      outcomes: { 'id-ID': ['bikin semua orang pengen', 'bikin look naik level', 'bikin banyak orang tanya', 'bikin style kamu standout'], 'en-US': ['makes everyone want one', 'takes the look to the next level', 'gets a lot of questions', 'makes your style stand out'] },
      captionDetails: { 'id-ID': ['outfit yang gampang ditiru 👗', 'look yang bikin standout ✨', 'kombinasi yang jarang dipakai 💅', 'style yang wajib di-save 📌'], 'en-US': ['outfit that\'s easy to copy 👗', 'look that makes you stand out ✨', 'combination rarely used 💅', 'style you must save 📌'] },
      ctaObjects: { 'id-ID': ['outfit favoritmu', 'style-mu', 'koleksi-mu', 'rating-mu'], 'en-US': ['your favorite outfit', 'your style', 'your collection', 'your rating'] }
    },
    'Entertainment': {
      subjects: { 'id-ID': ['Momen ini', 'Adegan ini', 'Bagian ini', 'Kejadian ini'], 'en-US': ['This moment', 'This scene', 'This part', 'This event'] },
      outcomes: { 'id-ID': ['bikin semua orang fokus', 'bikin suasana berubah', 'bikin banyak orang ngomongin', 'bikin viral'], 'en-US': ['makes everyone focused', 'changes the vibe', 'gets everyone talking', 'goes viral'] },
      captionDetails: { 'id-ID': ['momen yang bikin semua orang fokus 🎭', 'adegan yang bikin suasana berubah 🎉', 'kejadian yang bikin ngomongin ✨', 'bagian yang bikin viral 🔥'], 'en-US': ['moment that makes everyone focused 🎭', 'scene that changes the vibe 🎉', 'event that gets everyone talking ✨', 'part that goes viral 🔥'] },
      ctaObjects: { 'id-ID': ['pendapatmu', 'favoritmu', 'reaksimu', 'skormu'], 'en-US': ['your take', 'your favorite', 'your reaction', 'your score'] }
    },
    'General Content': {
      subjects: { 'id-ID': ['Momen ini', 'Bagian ini', 'Kejadian ini', 'Video ini'], 'en-US': ['This moment', 'This part', 'This event', 'This video'] },
      outcomes: { 'id-ID': ['bikin semua orang notice', 'bikin banyak yang share', 'bikin orang penasaran', 'bikin feed kamu beda'], 'en-US': ['makes everyone notice', 'gets a lot of shares', 'makes people curious', 'makes your feed different'] },
      captionDetails: { 'id-ID': ['momen yang bikin notice 👀', 'bagian yang bikin penasaran ✨', 'kejadian yang bikin share 🎯', 'video yang wajib ditonton 📌'], 'en-US': ['moment that makes you notice 👀', 'part that makes you curious ✨', 'event that makes you share 🎯', 'video you must watch 📌'] },
      ctaObjects: { 'id-ID': ['pendapatmu', 'reaksimu', 'favoritmu', 'skormu'], 'en-US': ['your take', 'your reaction', 'your favorite', 'your score'] }
    }
  };

  function getNicheVocab(niche, category, region) {
    const nv = NICHE_VOCAB[niche];
    if (!nv || !nv[category]) return [];
    const bucket = nv[category];
    if (bucket[region]) return bucket[region];
    if ((region === 'en-GB' || region === 'en-CA') && bucket['en-US']) return bucket['en-US'];
    if (bucket['en-US']) return bucket['en-US'];
    if (bucket['id-ID']) return bucket['id-ID'];
    return [];
  }

  const VOCAB = {
    'id-ID': {
      attention: ['GILA!!', 'LAH?!', 'BUSYET!!', 'ANJIR...', 'WADUH...', 'NGGAK NYANGKA...', 'PLOT TWIST...', 'TERNYATA!!', 'ASTAGA!!', 'HEBOH!!', 'GAK MASUK AKAL!!', 'DETIK-DETIK!!', 'BARU TAU!!', 'INI YANG BIKIN...', 'SERIUS?!', 'OKE GILA...', 'AKU NGGAK NYANGKA...', 'TUNGGU DULU...', 'MOMEN INI...', 'PARAH SIH...', 'FIX NO DEBAT...', 'SPILL DONG...', 'RIIL NGGAK SIH?!', 'SYOK PARAH!!', 'GEGER!!', 'WAH WAH WAH...', 'BUSET DAH!!', 'YA AMPUN!!', 'DEMI APA?!', 'NGAKAK BANGET!!'],
      subject: ['Bagian ini', 'Momen ini', 'Detik ini', 'Ini', 'Bagian sini', 'Video ini', 'Klip ini', 'Adegan ini', 'Scene ini', 'Bagian begini', 'Momen begini', 'Situasi ini', 'Kejadian ini', 'Frame ini', 'Detik begini', 'Bagian selanjutnya', 'Moment ini', 'Bagian tadi', 'Bagian setelah ini', 'Bagian nanti'],
      transition: ['langsung', 'tiba-tiba', 'bener-bener', 'nggak bisa diprediksi', 'di luar dugaan', 'nggak disangka', 'seketika', 'mendadak', 'tanpa aba-aba', 'tiba-tiba aja', 'secara nggak sadar', 'secara tiba-tiba', 'secara mendadak', 'langsung aja', 'langsung banget'],
      outcome: ['bikin suasana berubah', 'bikin semua orang diem', 'bikin chaos', 'bikin panik', 'bikin semua orang reflek mundur', 'bikin merinding', 'bikin kaget', 'bikin kaget setengah mati', 'bikin susah move on', 'bikin nagis', 'bikin ketawa ngakak', 'bikin tercengang', 'bikin speechless', 'bikin nganga', 'bikin ciut', 'bikin tepuk tangan', 'bikin semua orang loncat', 'bikin semua orang tepok jidat', 'bikin gue replay dua kali', 'bikin gue skip napas', 'bikin gue mikir ulang', 'bikin gue ngakak', 'bikin gue merinding', 'bikin gue diem', 'bikin gue tepuk tangan', 'bikin penonton kaget', 'bikin penonton ngakak', 'bikin penonton tepok jidat', 'bikin ending berubah', 'bikin plot twist', 'bikin cerita muter', 'bikin alur beda', 'bikin cerita menarik', 'bikin penasaran', 'bikin tegang'],
      emoji: ['💀', '😭', '🔥', '😱', '🤯', '😂', '⚡', '👀', '🤔', '😳'],
      captionOpener: ['Awalnya kelihatan aman...', 'Nggak ada yang expect...', 'Dari santai...', 'Kelihatan biasa aja...', 'Semua tenang...', 'Nggak ada tanda-tanda...', 'POV: kamu lagi santai...', 'Detik-detik sebelumnya...', 'Baru mulai...', 'Pelan-pelan aja...', 'Kelihatan wajar...', 'Semua normal...', 'Bahkan penonton setia...', 'Kalau bukan karena kejadian ini...', 'Sumpah nggak nyangka...', 'Ini bukan setup...', 'Semua berjalan biasa...', 'Awalnya nggak menarik perhatian...', 'Bagian ini sering di-skip...', 'Nggak ada yang notice...'],
      captionDetail: ['sampai momen ini muncul 💀', 'terus bagian ini kejadian 😭', 'tiba-tiba berubah total 🔥', 'sampai detik ini semua beda 😱', 'terus ada hal yang nggak wajar 🤯', 'sampai bagian ini ngagetin 😂', 'terus jadi chaos ⚡', 'sampai semua orang diem 👀', 'terus plot twist datang 🤔', 'sampai atmosfer berubah 😳', 'terus bagian ini bikin kaget 💀', 'sampai semua orang tepok jidat 😭', 'terus jadi momen ikonik 🔥', 'sampai bikin susah move on 😱', 'terus jadi topik perbincangan 🤯', 'sampai semua orang replay 😂', 'terus jadi meme ⚡', 'sampai bikin penasaran 👀', 'terus jadi turning point 🤔', 'sampai bikin merinding 😳'],
      captionQuestion: ['Kalau kamu ada di posisi itu, bakal ngapain?', 'Ada yang ngeh detail ini nggak?', 'Menurut kamu ini sengaja atau kebetulan?', 'Ada yang pernah ngalamin hal kayak gini?', 'Kalau kamu, bakal lanjut atau stop?', 'Setuju nggak sama reaksi ini?', 'Menurut kamu, apa yang sebenarnya terjadi?', 'Kalau kamu jadi dia, bakal gimana?', 'Ada yang sadar sama bagian ini juga nggak?', 'Kira-kira apa yang dipikirin di momen itu?', 'Kalian bakal ngapain kalau ada di situasi ini?', 'Ada yang relate sama momen ini?', 'Menurut kamu ini wajar nggak sih?', 'Kalau bukan karena bagian ini, bakal beda ceritanya?', 'Ada yang notice hal ini sejak awal?', 'Kalian setuju sama keputusan ini?', 'Apa yang bakal kamu lakuin kalau jadi dia?', 'Ada yang punya pengalaman serupa nggak?', 'Menurut kamu ini bagian paling penting nggak?', 'Kalau kamu, bakal notice nggak?'],
      captionClose: ['Coba tonton sampai habis 👀', 'Bagian ini wajib dilihat 💀', 'Save dulu biar nggak lupa 📌', 'Replay kalau perlu 🔥', 'Yang ngeh, komen 👇', 'Nggak banyak yang sadar ini 👀', 'Kalo kamu setuju, like 👍', 'Ada yang sama nggak? 👇', 'Share ke temenmu 📩', 'Follow buat konten selanjutnya ✨', 'Coba tebak selanjutnya gimana 🤔', 'Ini yang bikin susah berhenti 💀', 'Ada yang expect ini? 👀', 'Save buat tonton ulang 📌', 'Yang relate, komen 👇', 'Rate momen ini 1-10 👇', 'Kalau suka, follow ya ✨', 'Tonton sambil fokus 🔥', 'Ada yang ngalamin juga nggak? 💬', 'Tag temen yang harus lihat ini 📩']
    },
    'en-US': {
      attention: ['INSANE!!', 'WAIT WHAT?!', 'NO WAY!!', 'HOLD UP...', 'BRO...', 'I DIDN\'T EXPECT...', 'PLOT TWIST...', 'APPARENTLY...', 'FOR REAL?!', 'BRO WHAT!!', 'THIS IS HUGE!!', 'OKAY THIS IS IT...', 'WAIT FOR IT...', 'NO CAP...', 'STRAIGHT UP CRAZY!!', 'OKAY WILD...', 'I DIDN\'T KNOW...', 'HOLD ON...', 'THIS MOMENT...', 'CAN\'T BELIEVE...', 'YO WHAT...', 'STOP SCROLLING...', 'LOOK AT THIS...', 'THIS IS WILD!!', 'UNREAL!!', 'THIS HITS HARD...', 'DEADASS?!', 'FR FR...', 'LOWKEY INSANE...', 'ON GOD!!'],
      subject: ['This part', 'This moment', 'That second', 'Right here', 'This clip', 'This video', 'This scene', 'This bit', 'This second', 'Right there', 'This shot', 'That part', 'This frame', 'This next part', 'This section', 'That clip', 'This shot right here', 'This cut', 'This here', 'This part'],
      transition: ['instantly', 'suddenly', 'genuinely', 'completely unpredictable', 'out of nowhere', 'unexpected', 'in a second', 'rapidly', 'without warning', 'just like that', 'somehow', 'right then', 'in that exact moment', 'straight up', 'for real'],
      outcome: ['changes everything', 'silences the room', 'goes full chaos', 'triggers panic', 'makes everyone back up', 'gives chills', 'shocks the crowd', 'shocks everyone', 'makes it unforgettable', 'makes you cry', 'makes you laugh hard', 'leaves you stunned', 'leaves you speechless', 'makes you gasp', 'gives you goosebumps', 'makes everyone applaud', 'makes everyone jump', 'makes everyone facepalm', 'makes you rewatch twice', 'takes your breath away', 'makes you rethink', 'makes you laugh out loud', 'shuts you up', 'makes you clap', 'shocks the audience', 'cracks everyone up', 'makes the audience facepalm', 'changes the ending', 'drops a plot twist', 'spins the story', 'shifts the flow', 'makes the story interesting', 'makes you curious', 'builds tension'],
      emoji: ['💀', '😭', '🔥', '😱', '🤯', '😂', '⚡', '👀', '🤔', '😳'],
      captionOpener: ['Starts calm...', 'Nobody expected...', 'Chill at first...', 'Looked normal...', 'Everything was fine...', 'No warning signs...', 'POV: you\'re just chilling...', 'Seconds before...', 'Just started...', 'Slow and steady...', 'Seemed normal...', 'All good...', 'Even loyal viewers...', 'If not for this moment...', 'Swear didn\'t see this coming...', 'Not a setup...', 'Everything was going normally...', 'Nothing grabbed attention...', 'Most people skip this part...', 'Nobody noticed...'],
      captionDetail: ['then this hits 💀', 'and this part hits 😭', 'then it all changes 🔥', 'and everything shifts 😱', 'then something weird happens 🤯', 'and this part catches you off guard 😂', 'then it goes full chaos ⚡', 'and everyone goes quiet 👀', 'then the plot twist arrives 🤔', 'and the vibe changes 😳', 'then this part shocks you 💀', 'and everyone facepalms 😭', 'then it becomes iconic 🔥', 'and it stays with you 😱', 'then it becomes the talk 🤯', 'and everyone replays it 😂', 'then it becomes a meme ⚡', 'and you can\'t stop wondering 👀', 'then it becomes the turning point 🤔', 'and it gives you chills 😳'],
      captionQuestion: ['What would you do in that moment?', 'Did anyone else catch this detail?', 'Do you think it was on purpose or luck?', 'Anyone ever been in a moment like this?', 'Would you keep going or stop right there?', 'Agree with this reaction?', 'What do you think actually happened?', 'If you were them, what would you do?', 'Did anyone else notice this too?', 'What was going through their mind?', 'What would you do in this situation?', 'Can anyone relate to this?', 'Do you think this was normal?', 'Would the story change without this?', 'Did you notice this from the start?', 'Agree with this decision?', 'What would you do if you were them?', 'Anyone with a similar experience?', 'Is this the most important part?', 'Would you notice this too?'],
      captionClose: ['Watch till the end 👀', 'This part is a must-watch 💀', 'Save for later 📌', 'Replay if you need to 🔥', 'If you caught it, comment 👇', 'Not many noticed this 👀', 'Like if you agree 👍', 'Anyone else? 👇', 'Share with a friend 📩', 'Follow for more ✨', 'Guess what happens next 🤔', 'This keeps you watching 💀', 'Anyone expecting this? 👀', 'Save for the rewatch 📌', 'If you relate, comment 👇', 'Rate this 1-10 👇', 'Like and follow for more ✨', 'Watch closely 🔥', 'Anyone experienced this? 💬', 'Tag someone who needs to see this 📩']
    },
    'en-GB': {
      attention: ['MATE!!', 'WAIT WHAT?!', 'NO WAY MATE!!', 'HOLD ON...', 'BLOODY HELL...', 'DIDN\'T SEE THAT COMING...', 'PLOT TWIST...', 'APPARENTLY...', 'FOR REAL?!', 'PROPER MADNESS!!', 'THIS IS MASSIVE!!', 'RIGHT THEN...', 'WAIT FOR IT MATE...', 'SPOT ON...', 'ABSOLUTELY INSANE!!', 'PROPER MENTAL...', 'GUTTED...', 'ABSOLUTE CHAOS...', 'OH MY DAYS!!', 'RIGHT, HOLD ON...', 'YOU WOT?!', 'NO WAY...', 'BLOODY BRILLIANT!!', 'THAT\'S WILD MATE...', 'SAKE...', 'MAD INNIT?!', 'FAIR PLAY...', 'PARDON?!', 'INNIT?!', 'BRILLIANT!!'],
      subject: ['This bit', 'This moment', 'That second', 'Right here', 'This clip', 'This video', 'This scene', 'That bit', 'Right there', 'This shot', 'That part', 'This frame', 'This next bit', 'That moment', 'This section', 'This cut', 'This here', 'This bit right here', 'This bit mate', 'This moment here'],
      transition: ['instantly', 'suddenly', 'genuinely', 'proper unpredictable', 'out of nowhere', 'unexpected', 'in a flash', 'rapidly', 'without warning', 'just like that', 'somehow', 'right then', 'in that exact moment', 'straight up', 'for real'],
      outcome: ['changes everything', 'silences the room', 'goes proper mental', 'triggers chaos', 'makes everyone back up', 'gives chills', 'shocks the room', 'shocks everyone', 'makes it unforgettable', 'brings tears', 'gets everyone laughing', 'leaves you stunned', 'leaves you speechless', 'makes you gasp', 'gives you goosebumps', 'gets everyone clapping', 'gets everyone jumping', 'gets everyone facepalming', 'makes you rewatch it twice', 'takes your breath away', 'makes you rethink', 'gets a proper laugh', 'gives you proper chills', 'shuts you right up', 'gets a round of applause', 'shocks the crowd', 'cracks everyone up', 'has everyone facepalming', 'changes the ending', 'drops a plot twist', 'spins the story', 'shifts the flow', 'makes the story gripping', 'makes you curious', 'builds tension'],
      emoji: ['💀', '😭', '🔥', '😱', '🤯', '😂', '⚡', '👀', '🤔', '😳'],
      captionOpener: ['Starts calm...', 'Nobody expected...', 'Chill at first...', 'Looked normal...', 'Everything was fine...', 'No warning signs...', 'POV: you\'re just chilling...', 'Seconds before...', 'Just started...', 'Slow and steady...', 'Seemed normal...', 'All good...', 'Even loyal viewers...', 'If not for this bit...', 'Swear didn\'t see this coming...', 'Not a setup...', 'Everything was going normally...', 'Nothing grabbed attention...', 'Most people skip this bit...', 'Nobody noticed...'],
      captionDetail: ['then this hits 💀', 'and this bit hits 😭', 'then it all changes 🔥', 'and everything shifts 😱', 'then something weird happens 🤯', 'and this bit catches you off guard 😂', 'then it goes proper mental ⚡', 'and everyone goes quiet 👀', 'then the plot twist arrives 🤔', 'and the vibe changes 😳', 'then this bit shocks you 💀', 'and everyone facepalms 😭', 'then it becomes iconic 🔥', 'and it stays with you 😱', 'then it becomes the talk 🤯', 'and everyone replays it 😂', 'then it becomes a meme ⚡', 'and you can\'t stop wondering 👀', 'then it becomes the turning point 🤔', 'and it gives you chills 😳'],
      captionQuestion: ['What would you do in that moment mate?', 'Did anyone else spot this detail?', 'Do you reckon it was on purpose or luck?', 'Anyone ever been in a moment like this?', 'Would you keep going or stop right there?', 'Agree with this reaction mate?', 'What do you think actually happened?', 'If you were them, what would you do?', 'Did anyone else notice this too?', 'What was going through their mind?', 'What would you do in this situation?', 'Can anyone relate to this?', 'Do you reckon this was normal?', 'Would the story change without this?', 'Did you notice this from the start?', 'Agree with this decision?', 'What would you do if you were them?', 'Anyone with a similar experience?', 'Is this the most important bit?', 'Would you notice this too?'],
      captionClose: ['Watch till the end 👀', 'This bit is a must-watch 💀', 'Save for later 📌', 'Replay if you need to 🔥', 'If you caught it, comment 👇', 'Not many noticed this 👀', 'Like if you agree 👍', 'Anyone else? 👇', 'Share with a mate 📩', 'Follow for more ✨', 'Reckon what happens next 🤔', 'This keeps you watching 💀', 'Anyone expecting this? 👀', 'Save for the rewatch 📌', 'If you relate, comment 👇', 'Rate this 1-10 👇', 'Like and follow for more ✨', 'Watch closely 🔥', 'Anyone experienced this? 💬', 'Tag a mate who needs to see this 📩']
    },
    'en-CA': {
      attention: ['THIS IS WILD!!', 'WAIT WHAT?!', 'NO WAY EH...', 'HOLD ON...', 'BRO...', 'DIDN\'T EXPECT THAT...', 'PLOT TWIST...', 'APPARENTLY...', 'FOR REAL?!', 'OKAY THIS IS IT...', 'WAIT FOR IT EH...', 'THAT MOMENT...', 'NO CAP...', 'UNREAL EH...', 'MASSIVE!!', 'OKAY WILD...', 'DIDN\'T KNOW...', 'THIS IS WHY...', 'HOLD ON EH...', 'FOR REAL?!', 'NO WAY...', 'THIS IS BIG...', 'INSANE EH...', 'CRAZY...', 'WAIT...', 'LOOK AT THIS EH...', 'YO...', 'THIS HITS...', 'SERIOUSLY?!', 'OKAY THEN!!'],
      subject: ['This part', 'This moment', 'That second', 'Right here', 'This clip', 'This video', 'This scene', 'This bit', 'That part', 'Right there', 'This shot', 'That moment', 'This frame', 'This next bit', 'This section', 'That clip', 'This cut', 'This here', 'This part eh', 'This moment eh'],
      transition: ['instantly', 'suddenly', 'genuinely', 'completely unpredictable', 'out of nowhere', 'unexpected', 'in a second', 'rapidly', 'without warning', 'just like that', 'somehow', 'right then', 'in that exact moment', 'straight up', 'for real eh'],
      outcome: ['changes everything', 'silences the room', 'goes full chaos', 'triggers panic', 'makes everyone back up', 'gives chills', 'shocks the crowd', 'shocks everyone', 'makes it unforgettable', 'brings tears', 'gets everyone laughing', 'leaves you stunned', 'leaves you speechless', 'makes you gasp', 'gives you goosebumps', 'gets everyone clapping', 'gets everyone jumping', 'gets everyone facepalming', 'makes you rewatch twice', 'takes your breath away', 'makes you rethink', 'gets a laugh', 'gives you chills eh', 'shuts you up', 'gets everyone clapping eh', 'shocks the crowd', 'cracks everyone up', 'has everyone facepalming', 'changes the ending', 'drops a plot twist', 'spins the story', 'shifts the flow', 'makes the story interesting', 'makes you curious', 'builds tension'],
      emoji: ['💀', '😭', '🔥', '😱', '🤯', '😂', '⚡', '👀', '🤔', '😳'],
      captionOpener: ['Starts calm...', 'Nobody expected...', 'Chill at first...', 'Looked normal...', 'Everything was fine...', 'No warning signs...', 'POV: you\'re just chilling...', 'Seconds before...', 'Just started...', 'Slow and steady...', 'Seemed normal...', 'All good eh...', 'Even loyal viewers...', 'If not for this moment...', 'Swear didn\'t see this coming...', 'Not a setup...', 'Everything was going normally...', 'Nothing grabbed attention...', 'Most people skip this part...', 'Nobody noticed eh...'],
      captionDetail: ['then this hits 💀', 'and this part hits 😭', 'then it all changes 🔥', 'and everything shifts 😱', 'then something weird happens 🤯', 'and this part catches you off guard 😂', 'then it goes full chaos ⚡', 'and everyone goes quiet 👀', 'then the plot twist arrives 🤔', 'and the vibe changes 😳', 'then this part shocks you 💀', 'and everyone facepalms 😭', 'then it becomes iconic 🔥', 'and it stays with you 😱', 'then it becomes the talk 🤯', 'and everyone replays it 😂', 'then it becomes a meme ⚡', 'and you can\'t stop wondering 👀', 'then it becomes the turning point 🤔', 'and it gives you chills 😳'],
      captionQuestion: ['What would you do in that moment eh?', 'Did anyone else catch this detail?', 'Do you think it was on purpose or luck?', 'Anyone ever been in a moment like this?', 'Would you keep going or stop right there?', 'Agree with this reaction eh?', 'What do you think actually happened?', 'If you were them, what would you do?', 'Did anyone else notice this too?', 'What was going through their mind?', 'What would you do in this situation?', 'Can anyone relate to this?', 'Do you think this was normal?', 'Would the story change without this?', 'Did you notice this from the start?', 'Agree with this decision?', 'What would you do if you were them?', 'Anyone with a similar experience?', 'Is this the most important part?', 'Would you notice this too?'],
      captionClose: ['Watch till the end 👀', 'This part is a must-watch 💀', 'Save for later 📌', 'Replay if you need to 🔥', 'If you caught it, comment 👇', 'Not many noticed this 👀', 'Like if you agree 👍', 'Anyone else? 👇', 'Share with a friend 📩', 'Follow for more ✨', 'Guess what happens next 🤔', 'This keeps you watching 💀', 'Anyone expecting this? 👀', 'Save for the rewatch 📌', 'If you relate, comment 👇', 'Rate this 1-10 👇', 'Like and follow for more ✨', 'Watch closely 🔥', 'Anyone experienced this? 💬', 'Tag someone who needs to see this 📩']
    }
  };

  function createRNG(seed) {
    let s = Math.abs(seed | 0) || 1;
    return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  }
  function pick(arr, rng) {
    if (!arr || arr.length === 0) return '';
    return arr[Math.floor(rng() * arr.length)];
  }

  const HOOK_TEMPLATES = [
    (v, rng) => `${pick(v.attention, rng)} ${pick(v.subject, rng)} ${pick(v.outcome, rng)} ${pick(v.emoji, rng)}`,
    (v, rng) => `${pick(v.attention, rng)} ${pick(v.subject, rng)} ${pick(v.transition, rng)} ${pick(v.outcome, rng)}`,
    (v, rng) => `${pick(v.subject, rng)} ${pick(v.transition, rng)} ${pick(v.outcome, rng)} ${pick(v.emoji, rng)}`,
    (v, rng) => `${pick(v.attention, rng)} ${pick(v.outcome, rng)} ${pick(v.emoji, rng)}`,
    (v, rng) => `${pick(v.subject, rng)} ${pick(v.outcome, rng)} ${pick(v.emoji, rng)}`
  ];

  function generateHook(region, niche, clipIndex, context) {
    const v = VOCAB[region] || VOCAB['en-US'];
    const nicheSubjects = getNicheVocab(niche, 'subjects', region);
    const nicheOutcomes = getNicheVocab(niche, 'outcomes', region);

    const vNiche = {
      ...v,
      subject: nicheSubjects.length > 0 ? [...v.subject, ...nicheSubjects] : v.subject,
      outcome: nicheOutcomes.length > 0 ? [...v.outcome, ...nicheOutcomes] : v.outcome
    };

    const nicheHash = (niche || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const regionHash = region.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const seed = (clipIndex + 1) * 7919 + nicheHash * 31 + regionHash * 17;
    const rng = createRNG(seed);

    const tplIndex = Math.floor(rng() * HOOK_TEMPLATES.length);
    let hook = HOOK_TEMPLATES[tplIndex](vNiche, rng).trim();

    if (context && context.topic) {
      const topic = context.topic;
      if (rng() > 0.5) {
        const inject = {
          'id-ID': [`${hook} (${topic})`, `[${topic}] ${hook}`, `${hook} — topik: ${topic}`],
          'en-US': [`${hook} (${topic})`, `[${topic}] ${hook}`, `${hook} — topic: ${topic}`],
          'en-GB': [`${hook} (${topic})`, `[${topic}] ${hook}`, `${hook} — topic: ${topic}`],
          'en-CA': [`${hook} (${topic})`, `[${topic}] ${hook}`, `${hook} — topic: ${topic}`]
        };
        const patterns = inject[region] || inject['en-US'];
        hook = patterns[Math.floor(rng() * patterns.length)];
      }
    }
    return hook.trim();
  }

  function generateCaption(region, niche, clipIndex, context) {
    const v = VOCAB[region] || VOCAB['en-US'];
    const nicheDetails = getNicheVocab(niche, 'captionDetails', region);

    const vNiche = {
      ...v,
      captionDetail: nicheDetails.length > 0 ? [...v.captionDetail, ...nicheDetails] : v.captionDetail
    };

    const nicheHash = (niche || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const regionHash = region.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const seed = (clipIndex + 2) * 7919 + nicheHash * 41 + regionHash * 23;
    const rng = createRNG(seed);

    const opener = pick(vNiche.captionOpener, rng);
    const detail = pick(vNiche.captionDetail, rng);
    const question = pick(vNiche.captionQuestion, rng);
    const close = pick(vNiche.captionClose, rng);

    let caption = `${opener} ${detail}\n\n${question}\n\n${close}`;

    if (context && (context.topic || context.people)) {
      const parts = [];
      if (context.topic) parts.push(`📌 ${context.topic}`);
      if (context.people) parts.push(`👤 ${context.people}`);
      if (context.extra) parts.push(`💬 ${context.extra}`);
      if (parts.length) caption = parts.join(' · ') + '\n\n' + caption;
    }
    return caption.trim();
  }

  const CTA_VERB = {
    'id-ID': ['Komen', 'Tulis', 'Share', 'Drop', 'Kasih tau', 'Jawab', 'Coba', 'Cek'],
    'en-US': ['Comment', 'Drop', 'Share', 'Tell', 'Answer', 'Try', 'Check', 'Type'],
    'en-GB': ['Comment', 'Drop', 'Share', 'Tell', 'Answer', 'Try', 'Check', 'Type'],
    'en-CA': ['Comment', 'Drop', 'Share', 'Tell', 'Answer', 'Try', 'Check', 'Type']
  };
  const CTA_OBJECT = {
    'id-ID': ['pendapatmu', 'reaksimu', 'pilihanmu', 'jawabanmu', 'pengalamanmu', 'yang kamu pikir', 'versi kamu', 'skormu'],
    'en-US': ['your thoughts', 'your reaction', 'your pick', 'your answer', 'your experience', 'what you think', 'your version', 'your score'],
    'en-GB': ['your thoughts', 'your reaction', 'your pick', 'your answer', 'your experience', 'what you reckon', 'your version', 'your score'],
    'en-CA': ['your thoughts', 'your reaction', 'your pick', 'your answer', 'your experience', 'what you think', 'your version', 'your score']
  };
  const CTA_TAIL = {
    'id-ID': ['👇', 'di bawah 👇', 'sekarang 👇', 'yuk 👇', 'bareng 👇', 'dong 👇', '👉', '👇👇'],
    'en-US': ['👇', 'below 👇', 'now 👇', 'let\'s go 👇', 'together 👇', 'please 👇', '👉', '👇👇'],
    'en-GB': ['👇', 'below 👇', 'now 👇', 'let\'s go 👇', 'together 👇', 'please 👇', '👉', '👇👇'],
    'en-CA': ['👇', 'below 👇', 'now 👇', 'let\'s go 👇', 'together 👇', 'please 👇', '👉', '👇👇']
  };

  function generateCTA(region, niche, clipIndex, endingType, context) {
    const verbs = CTA_VERB[region] || CTA_VERB['en-US'];
    const nicheObjects = getNicheVocab(niche, 'ctaObjects', region);
    const objects = nicheObjects.length > 0
      ? [...(CTA_OBJECT[region] || CTA_OBJECT['en-US']), ...nicheObjects]
      : (CTA_OBJECT[region] || CTA_OBJECT['en-US']);
    const tails = CTA_TAIL[region] || CTA_TAIL['en-US'];

    const seed = (clipIndex + 3) * 7919;
    const rng = createRNG(seed);

    if (context && (context.topic || context.people)) {
      const subject = context.topic || context.people;
      const templates = {
        'id-ID': [
          `Menurut kamu tentang ${subject} ini gimana? 👇`,
          `Setuju nggak sama momen ${subject} ini? 👇`,
          `${pick(verbs, rng)} ${pick(objects, rng)} tentang ${subject} ${pick(tails, rng)}`
        ],
        'en-US': [
          `Thoughts on this ${subject} moment? 👇`,
          `Agree with this ${subject} moment? 👇`,
          `${pick(verbs, rng)} ${pick(objects, rng)} about ${subject} ${pick(tails, rng)}`
        ],
        'en-GB': [
          `Thoughts on this ${subject} moment mate? 👇`,
          `Agree with this ${subject} bit? 👇`,
          `${pick(verbs, rng)} ${pick(objects, rng)} about ${subject} ${pick(tails, rng)}`
        ],
        'en-CA': [
          `Thoughts on this ${subject} moment eh? 👇`,
          `Agree with this ${subject} moment? 👇`,
          `${pick(verbs, rng)} ${pick(objects, rng)} about ${subject} ${pick(tails, rng)}`
        ]
      };
      const list = templates[region] || templates['en-US'];
      return list[Math.floor(rng() * list.length)];
    }

    return `${pick(verbs, rng)} ${pick(objects, rng)} ${pick(tails, rng)}`;
  }

  const HASHTAG_POOLS = {
    'id-ID': {
      general: ['#fyp', '#viral', '#trending', '#foryoupage', '#shortsviral', '#viralindonesia', '#indonesia', '#fypindonesia', '#foryou', '#masukberanda', '#beranda', '#rekomen'],
      platform: ['#tiktokindonesia', '#tiktokid', '#reelsindonesia', '#shortsindonesia'],
      mood: ['#viralvideo', '#trendinghariini', '#viralbanget', '#hot', '#ramai', '#viralterkini']
    },
    'en-US': {
      general: ['#fyp', '#viral', '#trending', '#foryoupage', '#shorts', '#foryou', '#viralvideo', '#tiktokviral', '#usa', '#american', '#content', '#explore'],
      platform: ['#tiktok', '#reels', '#shorts', '#youtubeshorts'],
      mood: ['#viralvideo', '#trending', '#hot', '#trendingnow', '#viralcontent', '#explore']
    },
    'en-GB': {
      general: ['#fyp', '#viral', '#ukviral', '#foryouuk', '#uktrending', '#shorts', '#foryoupage', '#ukcontent', '#britishcontent', '#uklife', '#britain', '#londonviral'],
      platform: ['#tiktokuk', '#uktiktok', '#reelsuk', '#shortsuk'],
      mood: ['#viralvideo', '#trendinguk', '#ukhot', '#trendingnow', '#viralcontent', '#exploreuk']
    },
    'en-CA': {
      general: ['#fyp', '#canadaviral', '#foryoupage', '#canadatok', '#shorts', '#foryou', '#canadiancontent', '#canadalife', '#torontoviral', '#canadacontent', '#canadian', '#canadatiktok'],
      platform: ['#tiktokcanada', '#canadatiktok', '#reelscanada', '#shortscanada'],
      mood: ['#viralvideo', '#trendingcanada', '#canadahot', '#trendingnow', '#viralcontent', '#explorecanada']
    }
  };

  function generateHashtags(region, niche, clipIndex, context, nicheHashtagsFromV4) {
    const seed = (clipIndex + 4) * 7919;
    const rng = createRNG(seed);
    const pools = HASHTAG_POOLS[region] || HASHTAG_POOLS['en-US'];

    const result = [];
    const push = (t) => { if (t && result.indexOf(t) === -1) result.push(t); };

    if (Array.isArray(nicheHashtagsFromV4)) {
      nicheHashtagsFromV4.slice(0, 3).forEach(push);
    }

    if (context && context.topic) {
      const contextTags = context.topic
        .toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
        .filter(w => w.length >= 3).slice(0, 2).map(w => '#' + w);
      contextTags.forEach(push);
    }

    const platformTags = pools.platform || [];
    if (platformTags.length > 0) push(platformTags[clipIndex % platformTags.length]);

    const generalPool = pools.general || [];
    for (let i = 0; i < generalPool.length && result.length < 6; i++) {
      push(generalPool[(clipIndex + i) % generalPool.length]);
    }

    const moodPool = pools.mood || [];
    for (let i = 0; i < moodPool.length && result.length < 6; i++) {
      push(moodPool[(clipIndex + i) % moodPool.length]);
    }

    return result.slice(0, 6);
  }

  function bootV6() {
    if (!window.HookEngine) { setTimeout(bootV6, 100); return; }
    if (HookEngine.__polishV6Installed) return;
    HookEngine.__polishV6Installed = true;

    const _origBuild = HookEngine.buildUniquePackage.bind(HookEngine);

    HookEngine.buildUniquePackage = function (moment, niche, regionCode, clipIndex, usedSet) {
      const pkg = _origBuild(moment, niche, regionCode, clipIndex, usedSet);
      const region = (!regionCode || regionCode === 'auto') ? 'id-ID' : regionCode;
      const context = window.__clipContext || {};
      const seed = clipIndex || 0;

      const generatedHook = generateHook(region, niche, seed, context);
      pkg.hookHeadline = generatedHook;
      pkg.hook = generatedHook;
      pkg.headline = generatedHook;

      const generatedCaption = generateCaption(region, niche, seed, context);
      pkg.caption = generatedCaption;

      const endKey = (moment.endingType || '[LOOP]').replace(/[\[\]]/g, '');
      pkg.cta = generateCTA(region, niche, seed, endKey, context);

      const v4Hashtags = Array.isArray(pkg.hashtags) ? pkg.hashtags : [];
      pkg.hashtags = generateHashtags(region, niche, seed, context, v4Hashtags);

      pkg.__niche = niche;
      pkg.__nicheEmoji = (window.NICHE_EMOJI && window.NICHE_EMOJI[niche]) || '📺';
      pkg.__generatedBy = 'v6-unlimited-niche-aware';

      return pkg;
    };

    console.log('[Polish V6] ✅ Grammar + 18 NICHE AWARE aktif');
  }

  function printCombinationStats() {
    const stats = {};
    for (const region of Object.keys(VOCAB)) {
      const v = VOCAB[region];
      const avgNicheSubjects = 4;
      const avgNicheOutcomes = 4;
      const avgNicheDetails = 4;
      const hookCombos = v.attention.length * (v.subject.length + avgNicheSubjects) * v.transition.length * (v.outcome.length + avgNicheOutcomes) * v.emoji.length * HOOK_TEMPLATES.length;
      const captionCombos = v.captionOpener.length * (v.captionDetail.length + avgNicheDetails) * v.captionQuestion.length * v.captionClose.length;
      stats[region] = { attention: v.attention.length, hookCombos, captionCombos };
    }
    console.log('┌─ KOMBINASI PER REGION (dengan 18 NICHE) ─────────');
    for (const r of Object.keys(stats)) {
      const s = stats[r];
      console.log(`│ ${r}:`);
      console.log(`│   Hook    = ${s.hookCombos.toLocaleString('id-ID')} kombinasi`);
      console.log(`│   Caption = ${s.captionCombos.toLocaleString('id-ID')} kombinasi`);
    }
    console.log('└─────────────────────────────────────────────────');
    window.__v6Stats = stats;
  }

  function boot() {
    bootV6();
    console.log('%c[Polish V6] ✅ UNLIMITED + 18 NICHE AKTIF', 'color:#8b5cf6;font-weight:bold;font-size:14px;padding:6px 0');
    printCombinationStats();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 600));
  } else {
    setTimeout(boot, 600);
  }
})();



/* ═══════════════════════════════════════════════════════════════════════════
 * PART 5 / 6 — polish-v7.js (MULTI-REGION VIRAL EDITION)
 * ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';
  if (window.__POLISH_V7_LOADED) return;
  window.__POLISH_V7_LOADED = true;

  console.log('%c[Polish V7] 🔥 Multi-Region Viral Edition loading...', 'color:#ef4444;font-weight:bold;font-size:13px');

  // ═══════════════════════════════════════════════════════════
  // SECTION 1 — VIRAL ATTENTIONS PER REGION
  // ═══════════════════════════════════════════════════════════

  const VIRAL_ATTENTIONS = {

    // ─────────────────────────────────────────────────────────
    // 🇮🇩 INDONESIA
    // ─────────────────────────────────────────────────────────
    'id-ID': {
      curiosity: [
        'TERNYATA INI ALASANNYA!', 'TERNYATA!!', 'TERNYATA INI YANG...', 'INI DIA YANG DICARI!',
        'INI YANG ORANG NGGAK TAU...', 'INI YANG BIKIN...', 'INI ALASANNYA!!', 'INI YANG JARANG DIBAHAS...',
        'PLOT TWIST!!', 'MAKANYA JANGAN SKIP...', 'PANTESAN...', 'GAK NYANGKA TERNJADI!!'
      ],
      urgency: [
        'BIKIN HARUS NONTON!!', 'BIKIN HARUS TAU!!', 'WAJIB TAU!!', 'WAJIB NONTON SAMPAI HABIS!!',
        'JANGAN SKIP DULU!!', 'STOP SCROLLING!!', 'AWAS KETINGGALAN!!', 'CEK SAMPAI HABIS!!',
        'REPLAY DEH!!', 'HARUS LIHAT INI!!'
      ],
      reaction: [
        'NJIR!!', 'NJIR PARAH!!', 'BEJIR!!', 'GILA SIH!!', 'GOKIL BANGET!!',
        'KOCAK BANGET!!', 'WKWKWK!!', 'WKWKWKWK!!', 'YAELAH...', 'MASA SIH?!',
        'BENERAN?!!', 'DEMI APA?!', 'YA AMPUN!!', 'BUSET DAH!!', 'JIR LAH!!'
      ],
      reveal: [
        'TERBONGKAR!!', 'TERBONGKAR SEMUA!!', 'BONGKAR!!', 'KETAHUAN!!', 'KETAHUAN DEH...',
        'GAK DISANGKA!!', 'GAK MASUK AKAL!!', 'SERIUS?!', 'SERIUS DEH!!', 'PERCAYA NGGAK?!',
        'BOONG?!', 'NIH RIIL!!'
      ],
      relatable: [
        'BANYAK YANG NGGAK SADAR!!', 'RELATE BANGET!!', 'ADA YANG NGALAMIN?!', 'POV: KAMU...',
        'KALO KAMU...', 'SIAPA SIH YANG NGGAK...', 'YANG BEGINI NIH...', 'INI SIH FAKTA!!',
        'BENER BANGET SIH!!', 'GAK BOONG!!', 'RIIL NGGAK SIH?!'
      ],
      opener: [
        'AWAS!!', 'STOP!!', 'TUNGGU!!', 'LAH?!', 'WAH!!',
        'OKE OKE...', 'JADI GINI...', 'DENGERIN DULU...', 'LIHAT INI!!', 'COBA TONTON...'
      ]
    },

    // ─────────────────────────────────────────────────────────
    // 🇺🇸 UNITED STATES
    // ─────────────────────────────────────────────────────────
    'en-US': {
      curiosity: [
        'TURNS OUT...', 'APPARENTLY...', 'NOBODY KNOWS THIS...', 'THE REAL REASON IS...',
        'HERE\'S WHY...', 'PLOT TWIST...', 'WAIT TILL YOU SEE...', 'NOBODY TALKS ABOUT THIS...',
        'THE TRUTH IS...', 'SO THIS HAPPENED...', 'GUESS WHAT HAPPENED...', 'AND THEN THIS...'
      ],
      urgency: [
        'YOU NEED TO SEE THIS!!', 'DON\'T SKIP!!', 'WAIT FOR IT!!', 'STOP SCROLLING!!',
        'MUST WATCH!!', 'WATCH TILL THE END!!', 'DON\'T BLINK!!', 'PAY ATTENTION!!',
        'LOOK AT THIS!!', 'KEEP WATCHING!!'
      ],
      reaction: [
        'BRO!!', 'NO WAY!!', 'WHAT?!', 'NAH!!', 'OMG!!',
        'INSANE!!', 'CRAZY!!', 'WILD!!', 'WHAT JUST HAPPENED?!', 'I CAN\'T!!',
        'FR?!', 'DEADASS?!', 'ON GOD!!', 'NO CAP!!', 'BRO WHAT?!'
      ],
      reveal: [
        'EXPOSED!!', 'CAUGHT!!', 'IT\'S OUT!!', 'TURNS OUT!!', 'PLOT TWIST!!',
        'GOTCHA!!', 'BUSTED!!', 'LEAKED!!', 'SURPRISE!!', 'REVEALED!!',
        'NO WAY THIS IS REAL!!', 'THIS IS HUGE!!'
      ],
      relatable: [
        'NOBODY TALKS ABOUT THIS!!', 'POV: YOU...', 'IF YOU KNOW YOU KNOW...', 'EVERYONE\'S BEEN THERE...',
        'WHO ELSE?!', 'CAN YOU RELATE?!', 'THIS IS SO REAL...', 'TOO REAL...',
        'FACTS!!', 'LOWKEY THIS IS ME...', 'THIS HITS DIFFERENT...'
      ],
      opener: [
        'WAIT!!', 'STOP!!', 'HOLD UP!!', 'OKAY SO...', 'LISTEN...',
        'LOOK...', 'CHECK THIS OUT...', 'PAY ATTENTION...', 'WATCH THIS...', 'YO...'
      ]
    },

    // ─────────────────────────────────────────────────────────
    // 🇬🇧 UNITED KINGDOM
    // ─────────────────────────────────────────────────────────
    'en-GB': {
      curiosity: [
        'TURNS OUT...', 'APPARENTLY...', 'NOBODY KNOWS THIS...', 'PROPER PLOT TWIST...',
        'RIGHT THEN...', 'HERE\'S THE THING...', 'WAIT TILL YOU SEE...', 'THE TRUTH IS...',
        'SO THIS HAPPENED...', 'GUESS WHAT HAPPENED...', 'NOBODY TALKS ABOUT THIS...', 'AND THEN THIS...'
      ],
      urgency: [
        'YOU NEED TO SEE THIS!!', 'DON\'T SKIP MATE!!', 'WAIT FOR IT!!', 'STOP SCROLLING!!',
        'MUST WATCH!!', 'WATCH TILL THE END!!', 'DON\'T BLINK!!', 'PAY ATTENTION!!',
        'HAVE A LOOK!!', 'KEEP WATCHING!!'
      ],
      reaction: [
        'MATE!!', 'BLOODY HELL!!', 'OH MY DAYS!!', 'WHAT?!', 'NO WAY MATE!!',
        'PROPER MADNESS!!', 'INNIT?!', 'BLOODY BRILLIANT!!', 'ABSOLUTE CHAOS!!', 'SAKE!!',
        'YOU WOT?!', 'GUTTED!!', 'RIGHT THEN!!', 'OH MY GOD!!', 'WHAT THE...'
      ],
      reveal: [
        'PROPER EXPOSED!!', 'CAUGHT OUT!!', 'IT\'S OUT!!', 'TURNS OUT!!', 'PLOT TWIST!!',
        'BUSTED!!', 'LEAKED!!', 'SURPRISE!!', 'REVEALED!!', 'BLOODY HELL!!',
        'NO WAY THAT\'S REAL!!', 'THIS IS MASSIVE!!'
      ],
      relatable: [
        'NOBODY TALKS ABOUT THIS MATE!!', 'POV: YOU...', 'IF YOU KNOW YOU KNOW...', 'EVERYONE\'S BEEN THERE...',
        'WHO ELSE?!', 'CAN YOU RELATE MATE?!', 'THIS IS SO REAL...', 'PROPER REAL...',
        'FACTS MATE!!', 'LOWKEY THIS IS ME...', 'THIS HITS DIFFERENT...'
      ],
      opener: [
        'RIGHT!!', 'HOLD UP!!', 'OI!!', 'LOOK HERE...', 'RIGHT THEN...',
        'LISTEN MATE...', 'CHECK THIS OUT...', 'HAVE A LOOK...', 'WATCH THIS MATE...', 'OI MATE...'
      ]
    },

    // ─────────────────────────────────────────────────────────
    // 🇨🇦 CANADA
    // ─────────────────────────────────────────────────────────
    'en-CA': {
      curiosity: [
        'TURNS OUT...', 'APPARENTLY...', 'SO HERE\'S THE THING...', 'NOBODY TALKS ABOUT THIS...',
        'THE REAL REASON IS...', 'HERE\'S WHY...', 'PLOT TWIST...', 'WAIT TILL YOU SEE...',
        'THE TRUTH IS...', 'GUESS WHAT HAPPENED...', 'AND THEN THIS...', 'OKAY SO...'
      ],
      urgency: [
        'YOU NEED TO SEE THIS!!', 'WAIT FOR IT EH!!', 'DON\'T SKIP!!', 'STOP SCROLLING!!',
        'MUST WATCH!!', 'WATCH TILL THE END!!', 'DON\'T BLINK!!', 'PAY ATTENTION!!',
        'LOOK AT THIS EH!!', 'KEEP WATCHING!!'
      ],
      reaction: [
        'NO WAY EH!!', 'WHAT?!', 'BRO!!', 'OH MY GOD!!', 'INSANE EH!!',
        'CRAZY EH!!', 'WILD EH!!', 'WHAT JUST HAPPENED?!', 'I CAN\'T EH!!', 'FR?!',
        'SERIOUSLY?!', 'OKAY WOW...', 'HOLD ON EH...', 'NO WAY...', 'THIS IS WILD!!'
      ],
      reveal: [
        'EXPOSED EH!!', 'CAUGHT IT!!', 'IT\'S OUT!!', 'TURNS OUT EH!!', 'PLOT TWIST!!',
        'BUSTED!!', 'LEAKED!!', 'SURPRISE!!', 'REVEALED EH!!', 'NO WAY!!',
        'THIS IS HUGE EH!!', 'MASSIVE!!'
      ],
      relatable: [
        'NOBODY TALKS ABOUT THIS EH!!', 'POV: YOU...', 'IF YOU KNOW YOU KNOW...', 'EVERYONE\'S BEEN THERE...',
        'WHO ELSE?!', 'CAN YOU RELATE EH?!', 'THIS IS SO REAL...', 'TOO REAL EH...',
        'FACTS!!', 'LOWKEY THIS IS ME...', 'THIS HITS DIFFERENT...'
      ],
      opener: [
        'OKAY SO...', 'WAIT WHAT?!', 'HOLD ON EH...', 'LOOK AT THIS!!', 'CHECK THIS OUT...',
        'PAY ATTENTION...', 'HEY...', 'SO ANYWAY...', 'WATCH THIS EH...', 'YO...'
      ]
    }
  };

  // Flatten per region
  const ALL_VIRAL = {};
  Object.keys(VIRAL_ATTENTIONS).forEach(region => {
    ALL_VIRAL[region] = [];
    Object.keys(VIRAL_ATTENTIONS[region]).forEach(cat => {
      VIRAL_ATTENTIONS[region][cat].forEach(a => {
        if (ALL_VIRAL[region].indexOf(a) === -1) ALL_VIRAL[region].push(a);
      });
    });
  });

  console.log('[Polish V7] Viral attention pools:',
    Object.keys(ALL_VIRAL).map(r => `${r}=${ALL_VIRAL[r].length}`).join(' | '));

  // ═══════════════════════════════════════════════════════════
  // SECTION 2 — ATTENTION REGEX (semua region, untuk strip)
  // ═══════════════════════════════════════════════════════════

  const ATTENTION_STRIP_REGEX = new RegExp(
    '^(?:' +
    // id-ID
    'GILA!!|LAH\\?!|BUSYET!!|ANJIR\\.\\.\\.|WADUH\\.\\.\\.|NGGAK NYANGKA\\.\\.\\.|PLOT TWIST\\.\\.\\.|TERNYATA!!|ASTAGA!!|HEBOH!!|GAK MASUK AKAL!!|DETIK-DETIK!!|BARU TAU!!|INI YANG BIKIN\\.\\.\\.|SERIUS\\?!|OKE GILA\\.\\.\\.|AKU NGGAK NYANGKA\\.\\.\\.|TUNGGU DULU\\.\\.\\.|MOMEN INI\\.\\.\\.|PARAH SIH\\.\\.\\.|FIX NO DEBAT\\.\\.\\.|SPILL DONG\\.\\.\\.|RIIL NGGAK SIH\\?!|SYOK PARAH!!|GEGER!!|WAH WAH WAH\\.\\.\\.|BUSET DAH!!|YA AMPUN!!|DEMI APA\\?!|NGAKAK BANGET!!|' +
    // en-US
    'INSANE!!|WAIT WHAT\\?!|NO WAY!!|HOLD UP\\.\\.\\.|BRO\\.\\.\\.|I DIDN\\\'T EXPECT\\.\\.\\.|APPARENTLY\\.\\.\\.|FOR REAL\\?!|BRO WHAT!!|THIS IS HUGE!!|OKAY THIS IS IT\\.\\.\\.|WAIT FOR IT\\.\\.\\.|NO CAP\\.\\.\\.|STRAIGHT UP CRAZY!!|OKAY WILD\\.\\.\\.|I DIDN\\\'T KNOW\\.\\.\\.|HOLD ON\\.\\.\\.|THIS MOMENT\\.\\.\\.|CAN\\\'T BELIEVE\\.\\.\\.|YO WHAT\\.\\.\\.|STOP SCROLLING\\.\\.\\.|LOOK AT THIS\\.\\.\\.|THIS IS WILD!!|UNREAL!!|THIS HITS HARD\\.\\.\\.|DEADASS\\?!|FR FR\\.\\.\\.|LOWKEY INSANE\\.\\.\\.|ON GOD!!|' +
    // en-GB
    'MATE!!|NO WAY MATE!!|BLOODY HELL\\.\\.\\.|DIDN\\\'T SEE THAT COMING\\.\\.\\.|PROPER MADNESS!!|THIS IS MASSIVE!!|RIGHT THEN\\.\\.\\.|WAIT FOR IT MATE\\.\\.\\.|SPOT ON\\.\\.\\.|ABSOLUTELY INSANE!!|PROPER MENTAL\\.\\.\\.|GUTTED\\.\\.\\.|ABSOLUTE CHAOS\\.\\.\\.|OH MY DAYS!!|RIGHT, HOLD ON\\.\\.\\.|YOU WOT\\?!|NO WAY\\.\\.\\.|BLOODY BRILLIANT!!|THAT\\\'S WILD MATE\\.\\.\\.|SAKE\\.\\.\\.|MAD INNIT\\?!|FAIR PLAY\\.\\.\\.|PARDON\\?!|INNIT\\?!|BRILLIANT!!|' +
    // en-CA
    'THIS IS WILD!!|NO WAY EH\\.\\.\\.|DIDN\\\'T EXPECT THAT\\.\\.\\.|OKAY THIS IS IT\\.\\.\\.|WAIT FOR IT EH\\.\\.\\.|THAT MOMENT\\.\\.\\.|UNREAL EH\\.\\.\\.|MASSIVE!!|DIDN\\\'T KNOW\\.\\.\\.|THIS IS WHY\\.\\.\\.|HOLD ON EH\\.\\.\\.|THIS IS BIG\\.\\.\\.|INSANE EH\\.\\.\\.|CRAZY\\.\\.\\.|WAIT\\.\\.\\.|LOOK AT THIS EH\\.\\.\\.|YO\\.\\.\\.|THIS HITS\\.\\.\\.|SERIOUSLY\\?!|OKAY THEN!!' +
    ')\\s*',
    'i'
  );

  // ═══════════════════════════════════════════════════════════
  // SECTION 3 — INJECT KE V6 (semua region)
  // ═══════════════════════════════════════════════════════════

  function injectIntoV6() {
    if (!window.HookEngine) { setTimeout(injectIntoV6, 100); return; }
    if (HookEngine.__polishV7Installed) return;
    HookEngine.__polishV7Installed = true;

    const _origBuild = HookEngine.buildUniquePackage.bind(HookEngine);

    HookEngine.buildUniquePackage = function (moment, niche, regionCode, clipIndex, usedSet) {
      const pkg = _origBuild(moment, niche, regionCode, clipIndex, usedSet);
      const region = (!regionCode || regionCode === 'auto') ? 'id-ID' : regionCode;

      const pool = ALL_VIRAL[region] || ALL_VIRAL['id-ID'];
      if (!pool || pool.length === 0) return pkg;

      const seed = clipIndex || 0;
      const context = window.__clipContext || {};

      const rngA = createRNG(seed * 7919 + 1234567);
      const viralAttention = pool[Math.floor(rngA() * pool.length)];

      if (pkg.hookHeadline && pkg.hookHeadline.length > 0) {
        if (!context.topic && !context.people) {
          let bodyPart = pkg.hookHeadline;
          bodyPart = bodyPart.replace(ATTENTION_STRIP_REGEX, '').trim();

          if (bodyPart.length < 10) {
            bodyPart = pkg.hookHeadline;
          }

          let newHook = `${viralAttention} ${bodyPart}`;
          newHook = newHook.replace(/\s+/g, ' ').trim();

          pkg.hookHeadline = newHook;
          pkg.hook = newHook;
          pkg.headline = newHook;
        } else {
          const withViral = `${viralAttention} ${pkg.hookHeadline}`;
          pkg.hookHeadline = withViral;
          pkg.hook = withViral;
          pkg.headline = withViral;
        }
      }

      pkg.__generatedBy = 'v7-viral-' + region.toLowerCase();
      pkg.__attentionCategory = getCategoryOf(region, viralAttention);
      pkg.__viralRegion = region;

      return pkg;
    };

    console.log('[Polish V7] ✅ Viral attention injection aktif untuk: id-ID, en-US, en-GB, en-CA');
  }

  function getCategoryOf(region, attention) {
    const bucket = VIRAL_ATTENTIONS[region];
    if (!bucket) return 'unknown';
    for (const cat of Object.keys(bucket)) {
      if (bucket[cat].indexOf(attention) !== -1) return cat;
    }
    return 'unknown';
  }

  // ═══════════════════════════════════════════════════════════
  // SECTION 4 — SEEDED RNG
  // ═══════════════════════════════════════════════════════════

  function createRNG(seed) {
    let s = Math.abs(seed | 0) || 1;
    return function () {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  // ═══════════════════════════════════════════════════════════
  // SECTION 5 — UI TOOLTIP
  // ═══════════════════════════════════════════════════════════

  function installAttentionBadge() {
    if (window.__polishV7BadgeInstalled) return;
    window.__polishV7BadgeInstalled = true;

    const _prevRender = window.renderPage;
    if (typeof _prevRender !== 'function') {
      setTimeout(installAttentionBadge, 200);
      return;
    }

    window.renderPage = function () {
      _prevRender.apply(this, arguments);
      try { enhanceWithAttentionBadge(); } catch (e) {}
    };

    const rc = document.getElementById('clipResults');
    if (rc) {
      const obs = new MutationObserver(() => {
        try { enhanceWithAttentionBadge(); } catch (e) {}
      });
      obs.observe(rc, { childList: true, subtree: false });
    }
  }

  function enhanceWithAttentionBadge() {
    const cards = document.querySelectorAll('#clipResults .clip-card');
    cards.forEach(card => {
      if (card.__polishV7) return;
      card.__polishV7 = true;

      const idx = parseInt(card.getAttribute('data-clip-idx'), 10);
      const clip = window.allClipsData && window.allClipsData[idx];
      if (!clip) return;

      const hookTextarea = card.querySelector('textarea[oninput*="hookHeadline"]');
      if (hookTextarea) {
        const region = clip.__viralRegion || 'id-ID';
        const category = clip.__attentionCategory || 'viral';
        hookTextarea.title = `Viral attention [${region}] — ${category}`;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // SECTION 6 — STATS
  // ═══════════════════════════════════════════════════════════

  function printV7Stats() {
    console.log('┌─ VIRAL ATTENTION STATS (MULTI-REGION) ─────────');
    Object.keys(VIRAL_ATTENTIONS).forEach(region => {
      const cats = Object.keys(VIRAL_ATTENTIONS[region]);
      const total = ALL_VIRAL[region].length;
      console.log(`│ ${region.padEnd(8)} : ${total} pattern (${cats.length} kategori)`);
      cats.forEach(cat => {
        console.log(`│   ${cat.padEnd(12)} : ${VIRAL_ATTENTIONS[region][cat].length}`);
      });
    });
    const grand = Object.keys(ALL_VIRAL).reduce((s, r) => s + ALL_VIRAL[r].length, 0);
    console.log(`│ TOTAL GABUNGAN : ${grand} pattern`);
    console.log('└─────────────────────────────────────────────────');

    window.__v7Data = {
      byRegion: VIRAL_ATTENTIONS,
      flat: ALL_VIRAL,
      totalPerRegion: Object.fromEntries(Object.keys(ALL_VIRAL).map(r => [r, ALL_VIRAL[r].length]))
    };
  }

  // ═══════════════════════════════════════════════════════════
  // SECTION 7 — PREVIEW CONSOLE
  // ═══════════════════════════════════════════════════════════

  window.__previewV7 = function (count, region) {
    count = count || 15;
    region = region || 'id-ID';
    const bucket = VIRAL_ATTENTIONS[region];
    if (!bucket) { console.warn('Region tidak dikenal:', region); return; }
    const pool = ALL_VIRAL[region];

    console.log(`%c🎬 ${count} Contoh Hook Viral V7 [${region}]:`, 'color:#ef4444;font-weight:bold;font-size:13px');

    const bodies = {
      'id-ID': ['bagian ini bikin semua orang diem 💀', 'momen ini bikin suasana berubah 🔥', 'detik ini bikin semua orang loncat 😱', 'bagian ini bikin gue replay dua kali 😭', 'momen ini bikin penasaran 👀'],
      'en-US': ['this moment left everyone speechless 💀', 'the whole vibe changed instantly 🔥', 'this part made everyone jump 😱', 'I had to rewatch this twice 😭', 'this moment is so satisfying 👀'],
      'en-GB': ['this bit left everyone speechless 💀', 'the whole vibe changed instantly 🔥', 'this part made everyone jump 😱', 'had to replay this twice mate 😭', 'this moment is so satisfying 👀'],
      'en-CA': ['this moment left everyone speechless 💀', 'the whole vibe changed instantly 🔥', 'this part made everyone jump 😱', 'had to rewatch this twice eh 😭', 'this moment is so satisfying 👀']
    }[region] || ['this moment is crazy 💀'];

    for (let i = 0; i < count; i++) {
      const rng = createRNG(i * 7919 + 42);
      const attention = pool[Math.floor(rng() * pool.length)];
      const body = bodies[Math.floor(rng() * bodies.length)];
      const cat = getCategoryOf(region, attention);
      console.log(`  ${i + 1}. [${cat}] ${attention} ${body}`);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // SECTION 8 — BOOT
  // ═══════════════════════════════════════════════════════════

  function boot() {
    injectIntoV6();
    installAttentionBadge();

    console.log('%c[Polish V7] ✅ MULTI-REGION VIRAL AKTIF', 'color:#ef4444;font-weight:bold;font-size:14px;padding:6px 0');
    console.log('┌─ Region aktif: id-ID, en-US, en-GB, en-CA');
    console.log('├─ Preview: __previewV7(20, "en-US")');
    console.log('└─ Semua region dapat injeksi viral attention');
    printV7Stats();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 700));
  } else {
    setTimeout(boot, 700);
  }
})();


/* ═══════════════════════════════════════════════════════════════════════════
 * PART 6 / 6 — polish-v8.js (⭐ BARU — EVIDENCE-DRIVEN COPY v3.0)
 * ═══════════════════════════════════════════════════════════════════════════
 * INJECT BUKTI NYATA ke Hook/Caption supaya tidak generik.
 *
 * Baca dari `moment._evidence` (dari ai.js v3.4 / video-signal-engine v2.6):
 *   - motion, audio, sceneChanges, maxFace, speechRatio, laughCount, emphasis
 *
 * Tambah ke hook/caption berdasarkan bukti spesifik:
 *   - Kalau ada scene shift → sebutkan "pergantian adegan"
 *   - Kalau ada tawa       → tambah emoji 😂 / mention "ngakak"
 *   - Kalau ada wajah      → tambah "reaksi wajah" / "ekspresi"
 *   - Kalau ada dialog     → tambah "ada orang ngomong"
 *   - Kalau motion tinggi  → tambah "pergerakan cepat"
 * ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';
  if (window.__POLISH_V8_LOADED) return;
  window.__POLISH_V8_LOADED = true;

  console.log('%c[Polish V8] 🎯 Evidence-Driven Copy loading...', 'color:#10b981;font-weight:bold;font-size:13px');

  // ═══════════════════════════════════════════════════════════════
  // EVIDENCE TAGLINES PER REGION
  // ═══════════════════════════════════════════════════════════════
  const EVIDENCE_HOOKS = {
    'id-ID': {
      sceneShift: ['alurnya berubah di sini', 'pergantian adegan yang bikin kaget', 'scene-nya berubah total', 'pindah adegan yang bikin beda'],
      laugh: ['ngakak parah 😂', 'tawa lepas 😂', 'ngakak sampai nggak bisa berhenti', 'kelucuan yang natural 🤣'],
      face: ['reaksi wajah yang jujur', 'ekspresi yang nggak bisa dipalsukan', 'wajah yang ngomong segalanya', 'tatapan yang bikin penasaran 👀'],
      speech: ['ada yang ngomong di sini', 'obrolan yang menarik', 'dialog penting di bagian ini', 'kalimat yang bikin mikir'],
      motion: ['pergerakan cepat yang mengejutkan', 'gerakan mendadak', 'aksi cepat tanpa aba-aba', 'pergerakan yang nggak bisa dihindari'],
      emphasis: ['ada penekanan kuat di sini', 'momen yang ditegaskan', 'bagian yang bikin fokus', 'klimaks yang intens'],
      audio: ['audio kuat yang bikin kaget', 'suara yang bikin merinding', 'reaksi audio yang nyata', 'kualitas suara yang cinematic']
    },
    'en-US': {
      sceneShift: ['the scene changes here', 'a plot twist nobody saw', 'cut transition that shocks', 'scene switch that hits hard'],
      laugh: ['laughing out loud 😂', 'uncontrollable laughter 😂', 'can\'t stop laughing', 'genuine humor 🤣'],
      face: ['raw reaction on the face', 'expression that says it all', 'a look that can\'t be faked', 'stare that makes you curious 👀'],
      speech: ['someone speaks here', 'interesting conversation', 'key dialogue in this part', 'words that make you think'],
      motion: ['fast movement that surprises', 'sudden action', 'quick action without warning', 'movement you can\'t avoid'],
      emphasis: ['strong emphasis here', 'emphasized moment', 'focus-grabbing part', 'intense climax'],
      audio: ['loud audio that shocks', 'sound that gives chills', 'genuine audio reaction', 'cinematic audio quality']
    },
    'en-GB': {
      sceneShift: ['the scene changes here mate', 'a proper plot twist', 'cut transition that shocks', 'scene switch that hits hard'],
      laugh: ['proper laughing 😂', 'can\'t stop laughing 😂', 'absolutely cracking up', 'genuine banter 🤣'],
      face: ['raw reaction on the face', 'expression that says it all', 'a look that can\'t be faked', 'stare that makes you curious 👀'],
      speech: ['someone speaks here', 'proper interesting chat', 'key dialogue in this bit', 'words that make you think'],
      motion: ['fast movement that surprises', 'sudden action mate', 'quick action without warning', 'movement you can\'t avoid'],
      emphasis: ['strong emphasis here', 'emphasized moment', 'focus-grabbing bit', 'intense climax'],
      audio: ['loud audio that shocks', 'sound that gives chills', 'genuine audio reaction', 'cinematic audio quality']
    },
    'en-CA': {
      sceneShift: ['the scene changes here eh', 'a plot twist nobody saw', 'cut transition that shocks', 'scene switch that hits hard'],
      laugh: ['laughing out loud 😂', 'can\'t stop laughing 😂', 'uncontrollable laughter eh', 'genuine humor 🤣'],
      face: ['raw reaction on the face', 'expression that says it all', 'a look that can\'t be faked', 'stare that makes you curious 👀'],
      speech: ['someone speaks here', 'interesting conversation', 'key dialogue eh', 'words that make you think'],
      motion: ['fast movement that surprises', 'sudden action eh', 'quick action without warning', 'movement you can\'t avoid'],
      emphasis: ['strong emphasis here', 'emphasized moment', 'focus-grabbing part', 'intense climax'],
      audio: ['loud audio that shocks', 'sound that gives chills', 'genuine audio reaction', 'cinematic audio quality']
    }
  };

  function createRNG(seed) {
    let s = Math.abs(seed | 0) || 1;
    return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  }

  function pick(arr, rng) {
    if (!arr || arr.length === 0) return '';
    return arr[Math.floor(rng() * arr.length)];
  }

  function buildEvidenceTagline(region, evidence, seed) {
    if (!evidence) return '';
    const pool = EVIDENCE_HOOKS[region] || EVIDENCE_HOOKS['en-US'];
    const rng = createRNG(seed * 7919 + 13);

    // Priority: laugh > face > scene > speech > emphasis > audio > motion
    if (evidence.hasLaugh || evidence.laughCount > 0) {
      return pick(pool.laugh, rng);
    }
    if (evidence.hasFace || evidence.maxFace > 0) {
      return pick(pool.face, rng);
    }
    if (evidence.hasSceneShift || evidence.sceneChanges > 0) {
      return pick(pool.sceneShift, rng);
    }
    if (evidence.hasSpeech || evidence.speechRatio > 30) {
      return pick(pool.speech, rng);
    }
    if (evidence.emphasis > 25) {
      return pick(pool.emphasis, rng);
    }
    if (evidence.audio > 40) {
      return pick(pool.audio, rng);
    }
    if (evidence.motion > 40) {
      return pick(pool.motion, rng);
    }
    return '';
  }

  // ═══════════════════════════════════════════════════════════════
  // HOOK V8 — Inject evidence setelah semua wrapper V4-V7 selesai
  // ═══════════════════════════════════════════════════════════════
  function bootV8() {
    if (!window.HookEngine) { setTimeout(bootV8, 100); return; }
    if (HookEngine.__polishV8Installed) return;
    HookEngine.__polishV8Installed = true;

    const _origBuild = HookEngine.buildUniquePackage.bind(HookEngine);

    HookEngine.buildUniquePackage = function (moment, niche, regionCode, clipIndex, usedSet) {
      // Panggil wrapper V4-V7 dulu
      const pkg = _origBuild(moment, niche, regionCode, clipIndex, usedSet);

      const region = (!regionCode || regionCode === 'auto') ? 'id-ID' : regionCode;
      const seed = clipIndex || 0;
      const evidence = moment._evidence || null;

      // ═══ 1. Inject evidence tagline ke HOOK ═══
      if (evidence) {
        const tagline = buildEvidenceTagline(region, evidence, seed);

        if (tagline) {
          const currentHook = pkg.hookHeadline || '';

          if (currentHook.indexOf(tagline) === -1 && currentHook.length < 180) {
            const needsComma = !/[.,!?…]$/.test(currentHook.trim());
            pkg.hookHeadline = needsComma
              ? `${currentHook} — ${tagline}`
              : `${currentHook} ${tagline}`;
            pkg.hook = pkg.hookHeadline;
            pkg.headline = pkg.hookHeadline;
          }
        }
      }

      // ═══ 2. Inject evidence summary ke CAPTION ═══
      if (evidence) {
        const insightBits = [];
        const isID = region.startsWith('id');

        if (evidence.hasLaugh && evidence.laughCount > 0) {
          insightBits.push(isID ? `ada pola tawa (${evidence.laughCount}x)` : `laughter pattern (${evidence.laughCount}x)`);
        }
        if (evidence.sceneChanges > 0) {
          insightBits.push(isID ? `${evidence.sceneChanges} pergantian adegan` : `${evidence.sceneChanges} scene change(s)`);
        }
        if (evidence.maxFace > 0) {
          insightBits.push(isID ? `${evidence.maxFace} wajah terdeteksi` : `${evidence.maxFace} face(s) detected`);
        }
        if (evidence.speechRatio > 30) {
          insightBits.push(isID ? `dialog ${evidence.speechRatio}%` : `speech ${evidence.speechRatio}%`);
        }
        if (evidence.motion > 40) {
          insightBits.push(isID ? `pergerakan ${evidence.motion}%` : `motion ${evidence.motion}%`);
        }

        if (insightBits.length > 0) {
          const insightLabel = '🔍 AI Detects:';
          const insightText = `${insightLabel} ${insightBits.join(' · ')}`;
          pkg.__evidenceSummary = insightText;
        }
      }

      // ═══ 3. Hashtag tambahan berdasarkan evidence ═══
      if (evidence) {
        const current = Array.isArray(pkg.hashtags) ? pkg.hashtags.slice() : [];

        if (evidence.hasLaugh && current.indexOf('#funny') === -1 && current.length < 8) {
          current.push(region.startsWith('id') ? '#ngakak' : '#funny');
        }
        if (evidence.maxFace > 0 && current.indexOf('#reaction') === -1 && current.length < 8) {
          current.push('#reaction');
        }
        if (evidence.hasSceneShift && current.indexOf('#plotTwist') === -1 && current.length < 8) {
          current.push('#plotTwist');
        }

        pkg.hashtags = current.slice(0, 6);
      }

      pkg.__evidenceDriven = !!evidence;
      return pkg;
    };

    console.log('[Polish V8] ✅ Evidence-driven copy active — Hook/Caption/Hashtag pakai bukti nyata');
  }

  // ═══════════════════════════════════════════════════════════════
  // UI BADGE — Tampilkan bukti real di tooltip Score
  // ═══════════════════════════════════════════════════════════════
  function installRealMomentBadge() {
    if (window.__polishV8BadgeInstalled) return;
    window.__polishV8BadgeInstalled = true;

    const _prevRender = window.renderPage;
    if (typeof _prevRender !== 'function') {
      setTimeout(installRealMomentBadge, 300);
      return;
    }

    window.renderPage = function () {
      _prevRender.apply(this, arguments);
      setTimeout(addRealMomentBadges, 150);
    };
  }

  function addRealMomentBadges() {
    const cards = document.querySelectorAll('#clipResults .clip-card');
    cards.forEach(card => {
      if (card.__v8BadgeAdded) return;
      card.__v8BadgeAdded = true;

      const idx = parseInt(card.getAttribute('data-clip-idx'), 10);
      const clip = window.allClipsData && window.allClipsData[idx];
      if (!clip) return;

      const isReal = !clip._fallback && (clip._real || clip.score >= 25);

      const scoreSpan = card.querySelector('span[style*="10b981"]');
      if (scoreSpan && isReal) {
        const evidence = clip._evidence || {};
        const bits = [];
        if (evidence.motion > 30) bits.push(`motion ${evidence.motion}%`);
        if (evidence.audio > 30) bits.push(`audio ${evidence.audio}%`);
        if (evidence.sceneChanges) bits.push(`${evidence.sceneChanges}× scene`);
        if (evidence.maxFace) bits.push(`${evidence.maxFace} face`);
        if (evidence.laughCount) bits.push(`${evidence.laughCount}× laugh`);
        if (evidence.speechRatio > 30) bits.push(`speech ${evidence.speechRatio}%`);

        if (bits.length > 0) {
          scoreSpan.title = `Bukti REAL: ${bits.join(' · ')}`;
        }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // BOOT
  // ═══════════════════════════════════════════════════════════════
  function boot() {
    bootV8();
    installRealMomentBadge();
    console.log('%c[Polish V8] ✅ READY — Evidence-driven copy + Real Moment badge', 'color:#10b981;font-weight:bold;font-size:14px');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 900));
  } else {
    setTimeout(boot, 900);
  }

  // Public API untuk debug
  window.__polishV8 = {
    version: '3.0',
    getEvidence: (idx) => window.allClipsData?.[idx]?._evidence || null,
    getHooks: () => EVIDENCE_HOOKS
  };
})();