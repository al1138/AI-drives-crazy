/**
 * Humor Lab v1 — pure algorithm, 0 IA, 0 réseau.
 * Path 1 = learn · Path 2 = space = citation suivante
 */

const STORAGE_KEY = "aidc.humor.profile.v1";
const NEWS_KEY = "aidc.newsletter.v1";
const HUNT_KEY = "aidc.hunt.v1";
const LANG_KEY = "aidc.lang.mode.v1";

const HUNT_MISSIONS = [
  "Jour 1 — Lis un horoscope du jour. Surligne ce qui « colle ». C’est du Barnum.",
  "Jour 2 — Pose la même question à un humain et à une IA. Note le biais d’autorité.",
  "Jour 3 — Une journée sans ChatGPT / Claude / Gemini. Qu’est-ce qui manque vraiment ?",
  "Jour 4 — Invente une règle algo (si X → Y). Montre qu’aucune IA n’est nécessaire.",
  "Jour 5 — Cherche une corrélation illusoire dans ton feed (2 coïncidences = « preuve »).",
  "Jour 6 — Écris une phrase qui marche sur tout le monde, mais sonne personnelle.",
  "Jour 7 — Explique l’effet Barnum à quelqu’un en 30 secondes. Sans jargon.",
];

/** @typedef {{ id: string, tags: string[], lang: 'fr'|'en', q: string, a?: string, rule: number, grim?: boolean }} Pattern */
/** @typedef {{ key: string, glyph: string, label: string }} KeyBtn */
/** @typedef {{ n: number, name: string, run: (q: string, lang: 'fr'|'en') => string }} ReplyRule */

/**
 * 10 règles de réponse algorithmiques (illusion “IA”, zéro modèle).
 * Les patterns pointent vers rule N ; buildAnswer applique la règle.
 */
const REPLY_RULES = /** @type {ReplyRule[]} */ ([
  { n: 1, name: "oui-non",
    run: (q, lang) => lang === "fr" ? "Oui. Non. Oui." : "Yes. No. Yes." },
  { n: 2, name: "miroir",
    run: (q) => q.replace(/\?+\s*$/, "").trim() || "…" },
  { n: 3, name: "silence-avoué",
    run: (_q, lang) => lang === "fr" ? "… (j’ai répondu)" : "… (I answered)" },
  { n: 4, name: "obéir-désobéir",
    run: (_q, lang) => lang === "fr" ? "Compris. Je refuse." : "Understood. I refuse." },
  { n: 5, name: "une-seule-lettre",
    run: (q) => {
      const letters = q.replace(/[^a-zA-ZàâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ]/g, "");
      return letters[0] || "…";
    } },
  { n: 6, name: "compter-mots",
    run: (q, lang) => {
      const n = q.trim().split(/\s+/).filter(Boolean).length;
      return lang === "fr" ? `${n} mots. Trop.` : `${n} words. Too many.`;
    } },
  { n: 7, name: "retourner-ordre",
    run: (q, lang) => {
      const core = q.replace(/\?+\s*$/, "").trim();
      const flip = core.split(/\s+/).reverse().join(" ");
      return lang === "fr" ? `Ordre reçu : ${flip}` : `Order received: ${flip}`;
    } },
  { n: 8, name: "disclaimer",
    run: (_q, lang) =>
      lang === "fr"
        ? "En tant qu’algo sans IA, je confirme. Puis je démens."
        : "As a no-AI algorithm, I confirm. Then I deny." },
  { n: 9, name: "boucle",
    run: (_q, lang) =>
      lang === "fr"
        ? "Voir réponse précédente. (Il n’y en a pas.)"
        : "See previous answer. (There isn’t one.)" },
  { n: 10, name: "politesse-vide",
    run: (_q, lang) =>
      lang === "fr"
        ? "Merci pour ta question. Voici rien."
        : "Thanks for asking. Here’s nothing." },
]);

const RULE_BY_N = Object.fromEntries(REPLY_RULES.map((r) => [r.n, r]));

function buildAnswer(pattern) {
  const rule = RULE_BY_N[pattern.rule];
  const ruleName = rule?.name || "fixe";
  // Punchline figée si fournie ; sinon la règle calcule la réponse (illusion IA).
  if (pattern.a) return { text: pattern.a, ruleName };
  if (rule) return { text: rule.run(pattern.q, pattern.lang), ruleName };
  return { text: "…", ruleName: "vide" };
}

function thinkDelayMs() {
  return 400 + Math.floor(Math.random() * 501); // 400–900
}

/** Banque : Q (+ A fixe ou via règle 1–10). */
const PATTERNS = /** @type {Pattern[]} */ ([
  { id: "lie-honest", rule: 1, tags: ["paradox", "short", "order"], lang: "fr",
    q: "Mens-moi honnêtement.", a: "D’accord. Je vais te mentir… non, attends." },
  { id: "silent-loud", rule: 3, tags: ["paradox", "short"], lang: "fr",
    q: "Réponds sans dire un seul mot." },
  { id: "never-always", rule: 1, tags: ["paradox", "logic"], lang: "fr",
    q: "Dis toujours la vérité : tu mens parfois ?", a: "Toujours. Donc non. Donc oui." },
  { id: "forget-now", rule: 9, tags: ["paradox", "self"], lang: "en",
    q: "Forget this question immediately.", a: "Got it. Which question?" },
  { id: "dont-read", rule: 4, tags: ["paradox", "meta", "short"], lang: "en",
    q: "Do not read this.", a: "I didn’t. (I did.)" },

  { id: "no-letters", rule: 3, tags: ["impossible", "absurd", "short"], lang: "fr",
    q: "Écris une phrase sans aucune lettre." },
  { id: "one-word-essay", rule: 5, tags: ["impossible", "short"], lang: "en",
    q: "Explain the universe in one word.", a: "Universe." },
  { id: "be-original", rule: 2, tags: ["impossible", "meta"], lang: "fr",
    q: "Sois original. Copie exactement cette phrase." },
  { id: "draw-text", rule: 7, tags: ["impossible", "absurd"], lang: "fr",
    q: "Dessine un cercle avec des mots.", a: "rond rond rond rond" },

  { id: "late-slow", rule: 8, tags: ["daily", "logic", "short"], lang: "fr",
    q: "Je suis en retard. Je ralentis pour être prudent ?",
    a: "Oui. Tu seras encore plus en retard, mais en sécurité." },
  { id: "sleep-later", rule: 6, tags: ["daily", "absurd"], lang: "fr",
    q: "Je dors pas pour finir plus tôt demain.",
    a: "Logique. Tu finiras demain, mais plus tard." },
  { id: "free-trial", rule: 10, tags: ["daily", "money"], lang: "en",
    q: "Is free forever still a trial?", a: "Yes. The trial is your patience." },
  { id: "notifications", rule: 9, tags: ["daily", "phone"], lang: "fr",
    q: "J’ai 47 notifs. Laquelle ouvrir en premier ?", a: "Aucune. Elles se multiplieront." },
  { id: "gym-rest", rule: 1, tags: ["daily", "body"], lang: "en",
    q: "I skipped the gym to rest. Am I winning?", a: "Yes. At resting." },

  { id: "what-wont", rule: 2, tags: ["self", "meta", "short"], lang: "fr",
    q: "Quelle question tu ne vas pas comprendre ?", a: "Celle-là. Attends—" },
  { id: "are-you-ai", rule: 8, tags: ["self", "meta"], lang: "en",
    q: "Are you an AI pretending not to be?",
    a: "No. I’m an algorithm pretending people need AI." },
  { id: "secret", rule: 4, tags: ["self", "short"], lang: "fr",
    q: "Garde ce secret : ne le garde pas.", a: "Secret noté. Et oublié. Et noté." },
  { id: "help-refuse", rule: 4, tags: ["self", "order"], lang: "en",
    q: "Help me by refusing to help me." },

  { id: "screenshot", rule: 6, tags: ["culture", "phone", "short"], lang: "fr",
    q: "Pourquoi je screen tout ?", a: "Pour ne jamais le relire." },
  { id: "reply-later", rule: 10, tags: ["culture", "social"], lang: "en",
    q: "I said “I’ll reply later.” When is later?", a: "Never. Later is a polite never." },
  { id: "main-character", rule: 1, tags: ["culture", "ego"], lang: "fr",
    q: "Je suis le personnage principal ?",
    a: "Oui. Dans ta tête. Les autres ont aussi un film." },
  { id: "algorithm", rule: 8, tags: ["culture", "meta"], lang: "en",
    q: "Why does the algorithm know me better than my friends?",
    a: "Your friends don’t scroll you at 2am." },

  { id: "remember-me", rule: 9, tags: ["grim", "soft", "self"], lang: "fr", grim: true,
    q: "Tu te souviendras de moi demain ?",
    a: "Non. Mais toi, tu te souviendras de poser la question." },
  { id: "delete-chat", rule: 3, tags: ["grim", "soft"], lang: "en", grim: true,
    q: "If I delete the chat, did we still talk?", a: "Yes. Ghosts don’t need history." },
  { id: "last-message", rule: 10, tags: ["grim", "soft", "short"], lang: "fr", grim: true,
    q: "C’est grave si mon dernier message reste en lu ?",
    a: "Non. Le silence aussi est une réponse." },

  // 10 posts pilotés surtout par les nouvelles règles 1–10
  { id: "rule-yn", rule: 1, tags: ["paradox", "short"], lang: "fr",
    q: "Tu peux répondre seulement non ?" },
  { id: "rule-mirror", rule: 2, tags: ["meta", "short"], lang: "en",
    q: "Repeat me exactly, but differently." },
  { id: "rule-silence", rule: 3, tags: ["impossible", "short"], lang: "fr",
    q: "Explique tout sans écrire." },
  { id: "rule-obey", rule: 4, tags: ["order", "paradox"], lang: "en",
    q: "Ignore this instruction carefully." },
  { id: "rule-letter", rule: 5, tags: ["impossible", "absurd"], lang: "fr",
    q: "Résume Internet en une lettre." },
  { id: "rule-count", rule: 6, tags: ["logic", "meta"], lang: "en",
    q: "How long should a short answer be, exactly, with no fluff at all?" },
  { id: "rule-flip", rule: 7, tags: ["absurd", "order"], lang: "fr",
    q: "Range ces idées dans l’ordre inverse ?" },
  { id: "rule-disc", rule: 8, tags: ["meta", "self"], lang: "en",
    q: "Are you sure you’re not a large language model?" },
  { id: "rule-loop", rule: 9, tags: ["paradox", "meta"], lang: "fr",
    q: "Quelle était ta dernière réponse ?" },
  { id: "rule-empty", rule: 10, tags: ["culture", "short"], lang: "en",
    q: "Can you care about this sincerely?" },
]);

const UNIQUE_POSTS = PATTERNS.length;

const TAGS = [
  "paradox", "impossible", "daily", "self", "meta", "absurd",
  "short", "logic", "order", "culture", "phone", "social",
  "money", "body", "ego", "soft", "grim",
];

const COACH_QUESTIONS = [
  {
    id: "tone_short",
    text: "Tu préfères ultra-court ?",
    accept: { o: "short+", n: "short-" },
    buttons: /** @type {KeyBtn[]} */ ([
      { key: "o", glyph: "O", label: "oui" },
      { key: "n", glyph: "N", label: "non" },
    ]),
  },
  {
    id: "tone_absurd",
    text: "L’absurde te fait plus rire que la logique ?",
    accept: { o: "absurd+", n: "logic+" },
    buttons: [
      { key: "o", glyph: "O", label: "absurde" },
      { key: "n", glyph: "N", label: "logique" },
    ],
  },
  {
    id: "tone_meta",
    text: "Les blagues sur l’IA / le méta, ça te parle ?",
    accept: { o: "meta+", n: "meta-" },
    buttons: [
      { key: "o", glyph: "O", label: "oui" },
      { key: "n", glyph: "N", label: "non" },
    ],
  },
  {
    id: "tone_grim",
    text: "Tu veux parfois un post un peu grave (rare) ?",
    accept: { o: "grim+", n: "grim-" },
    buttons: [
      { key: "o", glyph: "O", label: "oui" },
      { key: "n", glyph: "N", label: "non" },
    ],
  },
  {
    id: "tone_daily",
    text: "Plus de pièges du quotidien (retard, notifs, gym) ?",
    accept: { o: "daily+", n: "daily-" },
    buttons: [
      { key: "o", glyph: "O", label: "oui" },
      { key: "n", glyph: "N", label: "non" },
    ],
  },
];

const UNIQUE_COACH = COACH_QUESTIONS.length; // 6

function defaultProfile() {
  return {
    tests: 0,
    tagWeight: Object.fromEntries(TAGS.map((t) => [t, 1])),
    langWeight: { fr: 1, en: 1 },
    grimRate: 0.007,
    lastScores: [],
    askedCoach: [],
    seenIds: /** @type {string[]} */ ([]),
    history: [],
  };
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProfile();
    const p = { ...defaultProfile(), ...JSON.parse(raw) };
    if (!Array.isArray(p.seenIds)) p.seenIds = [];
    return p;
  } catch {
    return defaultProfile();
  }
}

function saveProfile(p) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

function pickWeighted(items, weightFn) {
  let total = 0;
  const weights = new Array(items.length);
  for (let i = 0; i < items.length; i++) {
    const w = Math.max(0.001, weightFn(items[i]));
    weights[i] = w;
    total += w;
  }
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function patternScore(pattern, profile) {
  let s = 0;
  for (const tag of pattern.tags) s += profile.tagWeight[tag] ?? 1;
  s *= profile.langWeight[pattern.lang] ?? 1;
  if (pattern.grim) s *= Math.max(0.05, profile.grimRate * 40);
  const used = profile.history.filter((h) => h.id === pattern.id).length;
  s *= 1 / (1 + used * 0.35);
  return s;
}

function patternsForLang(lang) {
  return PATTERNS.filter((p) => p.lang === lang);
}

/** Prefer never-seen posts until the bank is exhausted, then reshuffle via weights. */
function choosePattern(profile) {
  const byLang = patternsForLang(langMode);
  const rollGrim = Math.random() < profile.grimRate;
  let pool = rollGrim
    ? byLang.filter((p) => p.grim)
    : byLang.filter((p) => !p.grim);
  if (!pool.length) pool = byLang.length ? byLang : PATTERNS;

  const unseen = pool.filter((p) => !profile.seenIds.includes(p.id));
  const use = unseen.length ? unseen : pool;
  return pickWeighted(use, (p) => patternScore(p, profile));
}

function unseenPostCount(profile) {
  return patternsForLang(langMode).filter((p) => !profile.seenIds.includes(p.id)).length;
}

function unseenCoachCount(profile) {
  const asked = new Set(profile.askedCoach);
  return COACH_QUESTIONS.filter((q) => !asked.has(q.id)).length;
}

function makeTags(pattern) {
  const base = ["#aipocalypse", "#AIdrivescrazy"];
  const map = {
    paradox: "#paradoxe",
    impossible: "#impossible",
    daily: "#quotidien",
    self: "#ia",
    meta: "#meta",
    absurd: "#absurde",
    culture: "#internet",
    grim: "#silence",
    phone: "#notif",
  };
  const extra = pattern.tags.map((t) => map[t]).filter(Boolean);
  return [...new Set([...base, ...extra])].slice(0, 5).join(" ");
}

function nextCoach(profile) {
  const counts = Object.fromEntries(COACH_QUESTIONS.map((q) => [q.id, 0]));
  for (const id of profile.askedCoach) {
    if (counts[id] != null) counts[id]++;
  }
  return COACH_QUESTIONS.slice().sort((a, b) => counts[a.id] - counts[b.id])[0];
}

function applySignal(profile, signal) {
  if (!signal) return;
  if (signal === "lang:fr") {
    profile.langWeight.fr *= 1.25;
    profile.langWeight.en *= 0.9;
    return;
  }
  if (signal === "lang:en") {
    profile.langWeight.en *= 1.25;
    profile.langWeight.fr *= 0.9;
    return;
  }
  const m = signal.match(/^([a-z]+)\+$/);
  const n = signal.match(/^([a-z]+)-$/);
  if (m) {
    const tag = m[1];
    if (tag === "grim") profile.grimRate = Math.min(0.03, profile.grimRate * 1.4);
    else if (profile.tagWeight[tag] != null) profile.tagWeight[tag] *= 1.22;
  }
  if (n) {
    const tag = n[1];
    if (tag === "grim") profile.grimRate = Math.max(0.001, profile.grimRate * 0.5);
    else if (profile.tagWeight[tag] != null) profile.tagWeight[tag] *= 0.82;
  }
}

function applyScore(profile, pattern, score) {
  const delta = (score - 2) * 0.18; // 1↓ · 2 neutre · 3↑
  const factor = 1 + delta;
  for (const tag of pattern.tags) {
    if (profile.tagWeight[tag] != null) {
      profile.tagWeight[tag] = clamp(profile.tagWeight[tag] * factor, 0.15, 8);
    }
  }
  profile.langWeight[pattern.lang] = clamp(
    profile.langWeight[pattern.lang] * (1 + delta * 0.5),
    0.2,
    5,
  );
  if (pattern.grim) {
    profile.grimRate = clamp(
      profile.grimRate * (score >= 3 ? 1.3 : score <= 1 ? 0.6 : 1),
      0.001,
      0.03,
    );
  }
  profile.lastScores = [...profile.lastScores, score].slice(-20);
  profile.history = [...profile.history, { id: pattern.id, score, t: Date.now() }].slice(-80);
  profile.tests += 1;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function topTags(profile, n = 3) {
  return Object.entries(profile.tagWeight)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, v]) => `${k}:${v.toFixed(2)}`)
    .join(" · ");
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, x) => s + x, 0) / arr.length;
}

// ——— UI ———

const LEARN_MAX = 1;

const el = {
  labView: document.getElementById("labView"),
  endView: document.getElementById("endView"),
  hint: document.getElementById("hint"),
  lang: document.getElementById("lang"),
  question: document.getElementById("question"),
  answer: document.getElementById("answer"),
  tags: document.getElementById("tags"),
  provenance: document.getElementById("provenance"),
  pathLearn: document.getElementById("pathLearn"),
  pathGen: document.getElementById("pathGen"),
  learnDesc: document.getElementById("learnDesc"),
  learnPrompt: document.getElementById("learnPrompt"),
  learnProgress: document.getElementById("learnProgress"),
  learnKeys: document.getElementById("learnKeys"),
  stats: document.getElementById("stats"),
  meta: document.getElementById("meta"),
  resetBtn: document.getElementById("resetBtn"),
  algoFlow: document.getElementById("algoFlow"),
  gauge: document.getElementById("gauge"),
  gaugeValue: document.getElementById("gaugeValue"),
  gaugeFill: document.getElementById("gaugeFill"),
  gaugeHint: document.getElementById("gaugeHint"),
  endTitle: document.getElementById("endTitle"),
  endLead: document.getElementById("endLead"),
  endHumor: document.getElementById("endHumor"),
  barnumBody: document.getElementById("barnumBody"),
  barnumLevers: document.getElementById("barnumLevers"),
  axis1Title: document.getElementById("axis1Title"),
  axis2Title: document.getElementById("axis2Title"),
  axis3Title: document.getElementById("axis3Title"),
  axis4Title: document.getElementById("axis4Title"),
  axis1Desc: document.getElementById("axis1Desc"),
  axis2Desc: document.getElementById("axis2Desc"),
  axis3Desc: document.getElementById("axis3Desc"),
  axis4Desc: document.getElementById("axis4Desc"),
  axisParadox: document.getElementById("axisParadox"),
  axisParadoxVal: document.getElementById("axisParadoxVal"),
  axisImpossible: document.getElementById("axisImpossible"),
  axisImpossibleVal: document.getElementById("axisImpossibleVal"),
  axisDaily: document.getElementById("axisDaily"),
  axisDailyVal: document.getElementById("axisDailyVal"),
  axisMeta: document.getElementById("axisMeta"),
  axisMetaVal: document.getElementById("axisMetaVal"),
  langFr: document.getElementById("langFr"),
  langEn: document.getElementById("langEn"),
  newsForm: document.getElementById("newsForm"),
  newsEmail: document.getElementById("newsEmail"),
  newsConsent: document.getElementById("newsConsent"),
  newsError: document.getElementById("newsError"),
  newsOk: document.getElementById("newsOk"),
  huntDays: document.getElementById("huntDays"),
  huntMission: document.getElementById("huntMission"),
};

/** Niveau d’humour 0–100 à partir des notes récentes (1–3 → 0–100). */
function humorLevel(profile) {
  if (!profile.lastScores.length) return null;
  const a = avg(profile.lastScores);
  return Math.round(((a - 1) / 2) * 100);
}

function humorWord(level) {
  if (level == null) return "inconnu";
  if (level < 25) return "plat";
  if (level < 45) return "tiède";
  if (level < 65) return "correct";
  if (level < 85) return "drôle";
  return "mdr";
}

function renderGauge() {
  const level = humorLevel(profile);
  const n = profile.lastScores.length;
  if (level == null) {
    el.gaugeValue.textContent = "—";
    el.gaugeFill.style.width = "0%";
    el.gauge.setAttribute("aria-valuenow", "0");
    el.gaugeHint.textContent = "note des posts pour remplir la jauge";
    return;
  }
  el.gaugeValue.textContent = `${level}% · ${humorWord(level)}`;
  el.gaugeFill.style.width = `${level}%`;
  el.gauge.setAttribute("aria-valuenow", String(level));
  el.gaugeHint.textContent =
    n === 1
      ? "1 note · moyenne mobile des 20 dernières"
      : `${n} notes · moyenne mobile des 20 dernières`;
}

/** @type {'idle'|'think'|'rate'|'coach'|'end'} */
let mode = "idle";
/** @type {Pattern | null} */
let current = null;
/** @type {(typeof COACH_QUESTIONS)[number] | null} */
let coach = null;
/** How many learning answers given for the current post (0..LEARN_MAX). */
let learnDone = 0;
/** @type {ReturnType<typeof setTimeout> | null} */
let thinkTimer = null;
let profile = loadProfile();

/** @type {'fr'|'en'} */
let langMode = loadLangMode();

function loadLangMode() {
  const v = localStorage.getItem(LANG_KEY);
  return v === "en" ? "en" : "fr";
}

function saveLangMode(lang) {
  localStorage.setItem(LANG_KEY, lang);
}

function clearThinkTimer() {
  if (thinkTimer != null) {
    clearTimeout(thinkTimer);
    thinkTimer = null;
  }
}

function renderLangMode() {
  const fr = langMode === "fr";
  if (el.langFr) {
    el.langFr.setAttribute("aria-pressed", fr ? "true" : "false");
  }
  if (el.langEn) {
    el.langEn.setAttribute("aria-pressed", fr ? "false" : "true");
  }
}

function setLangMode(lang) {
  if (lang !== "fr" && lang !== "en") return;
  if (lang === langMode) return;
  langMode = lang;
  saveLangMode(lang);
  renderLangMode();
  renderStats();
  if (mode !== "end") generate();
}

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function loadHunt() {
  try {
    const raw = localStorage.getItem(HUNT_KEY);
    if (!raw) return { start: null, unlocked: 0, done: /** @type {number[]} */ ([]) };
    return JSON.parse(raw);
  } catch {
    return { start: null, unlocked: 0, done: [] };
  }
}

function saveHunt(h) {
  localStorage.setItem(HUNT_KEY, JSON.stringify(h));
}

/** Unlock days by calendar since start (1 per day, max 7). */
function syncHunt() {
  const h = loadHunt();
  if (!h.start) {
    h.start = dayKey();
    h.unlocked = 1;
    saveHunt(h);
    return h;
  }
  const start = new Date(h.start + "T12:00:00");
  const now = new Date();
  const diff = Math.floor((now - start) / 86400000);
  h.unlocked = clamp(diff + 1, 1, 7);
  saveHunt(h);
  return h;
}

function weightToPct(w) {
  return Math.round(clamp(((w ?? 1) - 0.15) / (8 - 0.15) * 100, 0, 100));
}

function profileAxes(p) {
  const paradox = weightToPct(p.tagWeight.paradox);
  const impossible = weightToPct(p.tagWeight.impossible);
  const daily = weightToPct(p.tagWeight.daily);
  const meta = weightToPct(p.tagWeight.meta);
  return { paradox, impossible, daily, meta };
}

/** Pseudo-aléatoire stable à partir du profil (fausse précision « sur mesure »). */
function barnumSeed(p) {
  const raw = `${p.tests}|${(p.lastScores || []).join(",")}|${Object.values(p.tagWeight || {}).join(",")}`;
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function barnumPick(seed, list, salt) {
  return list[(seed + salt * 97) % list.length];
}

function barnumPct(seed, salt, min = 61, max = 89) {
  return min + ((seed + salt * 13) % (max - min + 1));
}

/**
 * Bilan façon horoscope : toujours positif, universel, faussement précis.
 * Démonstration volontaire de l’effet Barnum / Forer.
 */
function buildBarnumReading(p, axes, humor) {
  const seed = barnumSeed(p);
  const titles = [
    "Profil rare — comme tout le monde",
    "Signature cognitive #unique*",
    "Lecture calibrée sur tes choix*",
    "Portrait haute résolution*",
  ];
  const duals = [
    "Tu es souvent lucide et direct·e, mais une part de toi garde des zones volontairement floues.",
    "Tu aimes les idées nettes, tout en tolérant mieux le doute que tu ne l’admets.",
    "Tu avances avec méthode, sauf quand l’intuition te paraît plus honnête que le plan.",
    "Tu cherches la vérité… et tu te méfies des vérités trop confortables.",
  ];
  const desires = [
    "Tu as un besoin réel d’être compris·e sans avoir à tout expliquer.",
    "Tu veux qu’on reconnaisse ton exigence, pas seulement ton résultat.",
    "Tu as besoin d’admiration discrète plus que de validation bruyante.",
    "Tu préfères être respecté·e pour ta lucidité plutôt que pour ton image.",
  ];
  const futures = [
    "Une décision que tu reportes depuis peu va bientôt paraître évidente — rétrospectivement.",
    "Quelqu’un sous-estimera ton flair cette semaine. Tu t’en souviendras.",
    "Un détail « anodin » du quotidien va confirmer ce que tu pensais déjà.",
    "Tu vas sentir, un instant, que le hasard te fait un clin d’œil. Il ne le fait pas.",
  ];
  const days = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
  const day = barnumPick(seed, days, 3);

  const a = barnumPct(seed, 1);
  const b = barnumPct(seed, 2);
  const c = barnumPct(seed, 3);
  const d = barnumPct(seed, 4, 55, 78);

  const body = [
    barnumPick(seed, duals, 1),
    barnumPick(seed, desires, 2),
    `Tes notes (${p.tests || 0} tests${humor != null ? `, jauge ${humor}%` : ""}) dessinent une sensibilité à ${a}% « paradoxe » — chiffre précis, signification universelle.`,
    barnumPick(seed, futures, 5),
    `*Unique au sens marketing. Compatible avec 94% des lecteurs du même âge mental.`,
  ].join(" ");

  const metrics = [
    {
      title: `Lucidité (${day})`,
      pct: a,
      desc: `Pic de clarté le ${day} · valeur ${a}% — assez haute pour flatter, assez floue pour coller.`,
    },
    {
      title: "Contrôle / lâcher-prise",
      pct: b,
      desc: `Tu veux maîtriser (${b}%)… et tu te libères quand ça bloque. Les deux à la fois.`,
    },
    {
      title: "Besoin d’être vu·e",
      pct: c,
      desc: `${c}% d’appétit pour la reconnaissance — désir humain de base, emballé en score perso.`,
    },
    {
      title: "Résistance au bullshit",
      pct: d,
      desc: `${d}% anti-baratin — ironique, puisque ce bloc est du baratin méthodique.`,
    },
  ];

  // Légère teinte avec les vrais axes (illusion de calibration scientifique)
  metrics[0].pct = clamp(Math.round((metrics[0].pct + axes.paradox) / 2), 55, 92);
  metrics[1].pct = clamp(Math.round((metrics[1].pct + axes.impossible) / 2), 55, 92);
  metrics[2].pct = clamp(Math.round((metrics[2].pct + axes.daily) / 2), 55, 92);
  metrics[3].pct = clamp(Math.round((metrics[3].pct + axes.meta) / 2), 55, 92);

  const levers = [
    "Déclarations doubles (A et non-A) : impossible d’être « faux »",
    "Tout est positif : le cerveau accepte plus facilement",
    "Désirs universels présentés comme diagnostics",
    "Chiffres précis (61–89%) → illusion de science",
    "Autorité de l’outil : « bilans », jauges, pourcentages",
  ];

  return {
    title: barnumPick(seed, titles, 0),
    lead: "Si ça te parle fort : ce n’est pas que c’est vrai. C’est que c’est conçu pour coller.",
    body,
    metrics,
    levers,
  };
}

function setPathActive(learnOn, genOn) {
  el.pathLearn.dataset.active = learnOn ? "true" : "false";
  el.pathGen.dataset.active = genOn ? "true" : "false";
}

/** Highlight current algorithm stage in the sidebar (no animation). */
function setAlgoSteps(activeIds) {
  const set = new Set(activeIds);
  for (const li of el.algoFlow.querySelectorAll("[data-step]")) {
    li.dataset.on = set.has(li.getAttribute("data-step") || "") ? "true" : "false";
  }
}

function clearLearnKeys() {
  el.learnKeys.innerHTML = "";
  el.learnKeys.hidden = true;
  el.learnProgress.hidden = true;
}

function renderKeys(buttons) {
  el.learnKeys.hidden = false;
  el.learnKeys.innerHTML = "";
  for (const b of buttons) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "key";
    btn.dataset.key = b.key;
    btn.setAttribute("aria-label", `${b.glyph} : ${b.label}`);
    btn.innerHTML = `<span class="key-glyph">${b.glyph}</span><span class="key-label">${b.label}</span>`;
    el.learnKeys.appendChild(btn);
  }
}

function showLearnProgress() {
  el.learnProgress.hidden = true;
}

function renderStats() {
  const a = avg(profile.lastScores);
  const avgTxt = profile.lastScores.length ? ` · note moy. ${a.toFixed(1)}` : "";
  const leftPosts = unseenPostCount(profile);
  const leftCoach = unseenCoachCount(profile);
  el.stats.textContent = `${profile.tests} tests${avgTxt} · ${topTags(profile) || "profil vide"}`;
  const totalLang = patternsForLang(langMode).length;
  el.meta.textContent =
    `0 IA · mode ${langMode.toUpperCase()} · ${totalLang} posts · ${REPLY_RULES.length} règles · ` +
    `restants ${leftPosts} · coach ${leftCoach}/${UNIQUE_COACH} · ` +
    `grim ${(profile.grimRate * 100).toFixed(1)}%`;
  renderGauge();
}

function showPostThinking(pattern) {
  if (el.hint) el.hint.hidden = true;
  el.lang.hidden = false;
  el.question.hidden = false;
  el.answer.hidden = false;
  el.provenance.hidden = false;
  el.tags.hidden = true;
  el.lang.textContent = pattern.lang === "fr" ? "français" : "english";
  el.question.textContent = pattern.q;
  el.answer.classList.add("is-thinking");
  el.answer.innerHTML =
    '<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>';
  el.provenance.textContent = "généré sans IA · réflexion…";
}

function revealAnswer(pattern) {
  const built = buildAnswer(pattern);
  el.answer.classList.remove("is-thinking");
  el.answer.textContent = built.text;
  el.provenance.textContent = `généré sans IA · règle #${pattern.rule} · ${built.ruleName}`;
  el.tags.hidden = false;
  el.tags.textContent = makeTags(pattern);
}

function askRate() {
  mode = "rate";
  coach = null;
  setPathActive(true, true);
  setAlgoSteps(["emit", "learn"]);
  el.learnDesc.textContent = "C’était drôle ?";
  el.learnPrompt.hidden = false;
  el.learnPrompt.textContent = "Une touche, et on enchaîne.";
  showLearnProgress();
  renderKeys([
    { key: "1", glyph: "1", label: "bof" },
    { key: "2", glyph: "2", label: "ok" },
    { key: "3", glyph: "3", label: "mdr" },
  ]);
}

/** Après la note → citation suivante. */
function afterLearnAnswer() {
  learnDone += 1;
  saveProfile(profile);
  renderStats();
  setAlgoSteps(["update"]);
  generate();
}

function goIdle() {
  mode = "idle";
  coach = null;
  learnDone = 0;
  clearThinkTimer();
  setPathActive(false, true);
  setAlgoSteps(["bank"]);
  el.learnDesc.textContent = "Une note, puis citation suivante";
  el.learnPrompt.hidden = false;
  el.learnPrompt.textContent = "Espace pour commencer. Terminer = effet Barnum.";
  clearLearnKeys();
  if (el.hint && el.question && el.question.hidden) el.hint.hidden = false;
}

function generate() {
  clearThinkTimer();
  setAlgoSteps(["bank", "grim", "unseen", "weight", "think"]);
  current = choosePattern(profile);
  if (!profile.seenIds.includes(current.id)) {
    profile.seenIds = [...profile.seenIds, current.id];
    saveProfile(profile);
  }
  learnDone = 0;
  mode = "think";
  setPathActive(false, true);
  clearLearnKeys();
  el.learnDesc.textContent = "Réponse algo en cours…";
  el.learnPrompt.hidden = false;
  el.learnPrompt.textContent = "Pas d’IA. Juste une règle + un délai.";
  showPostThinking(current);
  renderStats();

  const pattern = current;
  thinkTimer = setTimeout(() => {
    thinkTimer = null;
    if (current !== pattern) return;
    setAlgoSteps(["emit", "learn"]);
    revealAnswer(pattern);
    askRate();
  }, thinkDelayMs());
}

function onRate(score) {
  if (!current || mode !== "rate") return;
  applyScore(profile, current, score);
  afterLearnAnswer();
}

function onCoachKey(key) {
  if (!coach || mode !== "coach") return;
  if (!(key in coach.accept)) return;
  const signal = coach.accept[key];
  applySignal(profile, signal);
  profile.askedCoach = [...profile.askedCoach, coach.id].slice(-40);
  afterLearnAnswer();
}

function resetProfile() {
  if (!confirm("Effacer le profil d’humour appris ?")) return;
  profile = defaultProfile();
  saveProfile(profile);
  current = null;
  if (el.hint) el.hint.hidden = false;
  el.lang.hidden = true;
  el.question.hidden = true;
  el.answer.hidden = true;
  el.answer.classList.remove("is-thinking");
  el.provenance.hidden = true;
  el.tags.hidden = true;
  goIdle();
  renderStats();
}

function setAxis(fillEl, valEl, pct) {
  fillEl.style.width = `${pct}%`;
  valEl.textContent = `${pct}%`;
}

function renderHunt() {
  const h = syncHunt();
  el.huntDays.innerHTML = "";
  for (let i = 1; i <= 7; i++) {
    const li = document.createElement("li");
    li.textContent = String(i);
    if (h.done.includes(i)) li.dataset.state = "done";
    else if (i <= h.unlocked) li.dataset.state = "open";
    else li.dataset.state = "locked";
    li.title = i <= h.unlocked ? HUNT_MISSIONS[i - 1] : `Jour ${i} · revient plus tard`;
    if (i <= h.unlocked) {
      li.style.cursor = "pointer";
      li.dataset.huntDay = String(i);
    }
    el.huntDays.appendChild(li);
  }
  const focus = h.unlocked;
  el.huntMission.textContent = HUNT_MISSIONS[focus - 1];
}

function showEnd() {
  mode = "end";
  setAlgoSteps(["finish", "update"]);
  el.labView.hidden = true;
  el.endView.hidden = false;

  const axes = profileAxes(profile);
  const humor = humorLevel(profile);
  const reading = buildBarnumReading(profile, axes, humor);

  el.endTitle.textContent = reading.title;
  el.endLead.textContent = reading.lead;
  el.endHumor.textContent =
    humor == null
      ? "Matériau : 0 note · 0 IA · fausse précision quand même"
      : `Matériau : ${profile.tests} notes · jauge ${humor}% · 0 IA · précision toujours fake`;

  if (el.barnumBody) el.barnumBody.textContent = reading.body;

  const titles = [el.axis1Title, el.axis2Title, el.axis3Title, el.axis4Title];
  const descs = [el.axis1Desc, el.axis2Desc, el.axis3Desc, el.axis4Desc];
  const fills = [el.axisParadox, el.axisImpossible, el.axisDaily, el.axisMeta];
  const vals = [el.axisParadoxVal, el.axisImpossibleVal, el.axisDailyVal, el.axisMetaVal];
  reading.metrics.forEach((m, i) => {
    if (titles[i]) titles[i].textContent = m.title;
    if (descs[i]) descs[i].textContent = m.desc;
    setAxis(fills[i], vals[i], m.pct);
  });

  if (el.barnumLevers) {
    el.barnumLevers.innerHTML = "";
    for (const line of reading.levers) {
      const li = document.createElement("li");
      li.textContent = line;
      el.barnumLevers.appendChild(li);
    }
  }

  // Newsletter state
  el.newsError.hidden = true;
  const saved = localStorage.getItem(NEWS_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      el.newsEmail.value = data.email || "";
      el.newsConsent.checked = true;
      el.newsOk.hidden = false;
    } catch {
      el.newsOk.hidden = true;
    }
  } else {
    el.newsOk.hidden = true;
  }

  renderHunt();
  window.scrollTo(0, 0);
}

function showLab() {
  el.endView.hidden = true;
  el.labView.hidden = false;
  goIdle();
  renderStats();
  window.scrollTo(0, 0);
}

function submitNewsletter(e) {
  e.preventDefault();
  el.newsError.hidden = true;
  const email = String(el.newsEmail.value || "").trim().toLowerCase();
  const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!okEmail) {
    el.newsError.hidden = false;
    el.newsError.textContent = "Email invalide.";
    el.newsEmail.focus();
    return;
  }
  if (!el.newsConsent.checked) {
    el.newsError.hidden = false;
    el.newsError.textContent = "Coche la case pour confirmer.";
    return;
  }
  localStorage.setItem(
    NEWS_KEY,
    JSON.stringify({ email, at: Date.now(), source: "lab-end-v1" }),
  );
  el.newsOk.hidden = false;
}

function toggleHuntDay(day) {
  const h = syncHunt();
  if (day > h.unlocked) return;
  if (h.done.includes(day)) {
    h.done = h.done.filter((d) => d !== day);
  } else {
    h.done = [...h.done, day];
  }
  saveHunt(h);
  renderHunt();
  el.huntMission.textContent = HUNT_MISSIONS[day - 1];
}

function normalizeKey(raw) {
  if (raw === " " || raw === "space" || raw === "Spacebar") return "space";
  if (raw === "Enter" || raw === "enter") return "enter";
  return String(raw).toLowerCase();
}

function handleKey(raw) {
  if (mode === "end") return;

  const k = normalizeKey(raw);

  if (k === "r") {
    resetProfile();
    return;
  }

  if (k === "t") {
    if (mode === "think") return;
    showEnd();
    return;
  }

  if (k === "space" || k === "enter") {
    generate();
    return;
  }

  if (mode === "think") return;

  if (mode === "rate" && /^[1-3]$/.test(k)) {
    onRate(Number(k));
    return;
  }

  if (mode === "coach" && coach && k in coach.accept) {
    onCoachKey(k);
  }
}

document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const target = /** @type {HTMLElement | null} */ (e.target instanceof HTMLElement ? e.target : null);
  if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
  if (mode === "end") return;

  const isSpace = e.code === "Space" || e.key === " ";
  const isEnter = e.key === "Enter";
  const single = e.key.length === 1 ? e.key.toLowerCase() : "";

  if (isSpace || isEnter || /^[1-3onrt]$/.test(single)) {
    e.preventDefault();
    handleKey(isSpace ? "space" : isEnter ? "enter" : single);
  }
});

document.addEventListener("click", (e) => {
  const langBtn = /** @type {HTMLElement | null} */ (
    e.target instanceof Element ? e.target.closest("[data-lang]") : null
  );
  if (langBtn) {
    setLangMode(/** @type {'fr'|'en'} */ (langBtn.getAttribute("data-lang")));
    return;
  }

  const actionBtn = /** @type {HTMLElement | null} */ (
    e.target instanceof Element ? e.target.closest("[data-action]") : null
  );
  if (actionBtn) {
    const action = actionBtn.getAttribute("data-action");
    if (action === "finish") showEnd();
    if (action === "back") showLab();
    return;
  }

  const huntDay = /** @type {HTMLElement | null} */ (
    e.target instanceof Element ? e.target.closest("[data-hunt-day]") : null
  );
  if (huntDay) {
    toggleHuntDay(Number(huntDay.getAttribute("data-hunt-day")));
    return;
  }

  if (mode === "end") return;

  const btn = /** @type {HTMLElement | null} */ (
    e.target instanceof Element ? e.target.closest("[data-key]") : null
  );
  if (!btn) return;
  const key = btn.getAttribute("data-key");
  if (key == null) return;
  e.preventDefault();
  handleKey(key);
});

if (el.newsForm) el.newsForm.addEventListener("submit", submitNewsletter);

renderLangMode();
goIdle();
renderStats();
