/**
 * On te lit — expériences ludiques (Barnum, confirmation, corrélation illusoire).
 * Twist secret jusqu’au bilan / reveal.
 */

const BRAND = "On te lit";
const SUB_ROTATE_MS = 5000;
const NEWS_KEY = "ontelit.newsletter.v1";
const SESSION_KEY = "ontelit.session.v1";
const SEEN_Q_KEY = "ontelit.seen.v1";
const SEEN_EXP_KEY = "ontelit.exp.seen.v1";
const RUNS_KEY = "ontelit.runs.v1";
const MAX_RUNS_PER_EFFECT = 20;

/** @typedef {{ k: string, label: string }} Choice */
/** @typedef {{ id: string, q: string, choices: Choice[], packId?: string, packLabel?: string }} Question */
/** @typedef {{ id: string, label: string, questions: Question[] }} Pack */
/** @typedef {{ id: string, effect: string, title: string, blurb: string, questions: Question[], packIds: string[] }} BarnumSession */
/** @typedef {{ id: string, text: string, kind: string }} Prediction */
/** @typedef {{ k: string, label: string, correct?: boolean }} CorrChoice */
/** @typedef {{ id: string, q: string, choices: CorrChoice[], explain?: string, sources?: { label: string, url: string }[] }} CorrQuestion */
/** @typedef {{ id: string, effect: string, homeTitle: string, homeBlurb: string, clickbait?: string[], predictions?: Prediction[], quizSize?: number, questions?: CorrQuestion[] }} ExpDef */

const el = {
  labView: document.getElementById("labView"),
  endView: document.getElementById("endView"),
  hint: document.getElementById("hint"),
  testTitle: document.getElementById("testTitle"),
  testBlurb: document.getElementById("testBlurb"),
  introSteps: document.getElementById("introSteps"),
  playBarnum: document.getElementById("playBarnum"),
  playConfirm: document.getElementById("playConfirm"),
  playCorr: document.getElementById("playCorr"),
  playBias: document.getElementById("playBias"),
  progress: document.getElementById("progress"),
  question: document.getElementById("question"),
  choices: document.getElementById("choices"),
  confirmProgress: document.getElementById("confirmProgress"),
  confirmText: document.getElementById("confirmText"),
  biasProgress: document.getElementById("biasProgress"),
  biasKicker: document.getElementById("biasKicker"),
  biasQuestion: document.getElementById("biasQuestion"),
  biasBody: document.getElementById("biasBody"),
  biasChoices: document.getElementById("biasChoices"),
  corrProgress: document.getElementById("corrProgress"),
  corrDay: document.getElementById("corrDay"),
  corrPrompt: document.getElementById("corrPrompt"),
  corrChart: document.getElementById("corrChart"),
  corrChartFs: document.getElementById("corrChartFs"),
  corrChartFsInner: document.getElementById("corrChartFsInner"),
  corrRateChoices: document.getElementById("corrRateChoices"),
  startRow: document.getElementById("startRow"),
  finishRow: document.getElementById("finishRow"),
  finishLabel: document.getElementById("finishLabel"),
  brandLogo: document.getElementById("brandLogo"),
  brandSub: document.getElementById("brandSub"),
  meta: document.getElementById("meta"),
  stats: document.getElementById("stats"),
  resetBtn: document.getElementById("resetBtn"),
  fakeRead: document.getElementById("fakeRead"),
  revealTitle: document.getElementById("revealTitle"),
  revealLead: document.getElementById("revealLead"),
  revealLevers: document.getElementById("revealLevers"),
  revealExtra: document.getElementById("revealExtra"),
  revealSection: document.getElementById("revealSection"),
  proofHistory: document.getElementById("proofHistory"),
  proofTitle: document.getElementById("proofTitle"),
  proofLead: document.getElementById("proofLead"),
  proofBody: document.getElementById("proofBody"),
  scrollBridge: document.getElementById("scrollBridge"),
  bridgeTitle: document.getElementById("bridgeTitle"),
  bridgeCopy: document.getElementById("bridgeCopy"),
  shareSection: document.getElementById("shareSection"),
  shareCopy: document.getElementById("shareCopy"),
  shareGrid: document.getElementById("shareGrid"),
  shareToast: document.getElementById("shareToast"),
  endRail: document.getElementById("endRail"),
  endRailFill: document.getElementById("endRailFill"),
  endRailPct: document.getElementById("endRailPct"),
  endRailStage: document.getElementById("endRailStage"),
  endRailNudge: document.getElementById("endRailNudge"),
  endRailGo: document.getElementById("endRailGo"),
  newsForm: document.getElementById("newsForm"),
  newsEmail: document.getElementById("newsEmail"),
  newsConsent: document.getElementById("newsConsent"),
  newsError: document.getElementById("newsError"),
  newsOk: document.getElementById("newsOk"),
  newsBrand: document.querySelector(".news-brand"),
};

/** @type {'idle'|'play'|'end'} */
let mode = "idle";
/** @type {ExpDef[]} */
let expCatalog = [];
/** @type {string[]} */
let rotation = ["barnum", "confirmation", "correlation"];
/** @type {ExpDef | null} */
let activeExp = null;

/** @type {Pack[]} */
let packs = [];
/** @type {string[]} */
let titlePool = [];
/** @type {string[]} */
let blurbPool = [];
let sessionSize = 10;
/** @type {BarnumSession | null} */
let barnumSession = null;

let stepIndex = 0;
/** @type {Record<string, string>} */
let answers = {};
/** @type {string[]} */
let answerOrder = [];
let quizStartedAt = 0;
let quizEndedAt = 0;

/** Confirmation */
/** @type {Prediction[]} */
let confirmDeck = [];
/** @type {Record<string, string>} */
let confirmMarks = {};

/** Correlation / quiz chiffres */
/** @type {any[]} */
let corrDeck = [];
/** @type {{ id: string, key: string, correct: boolean, correctKey: string }[]} */
let corrLog = [];

/** @type {string[]} */
let clickbaitPool = [];
/** @type {ReturnType<typeof setInterval> | null} */
let subTimer = null;
let subIndex = 0;

/* ——— utils ——— */

function dayIndex() {
  return Math.floor(Date.now() / 86400000);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(list, i = Math.floor(Math.random() * list.length)) {
  return list[i % list.length];
}

function loadJsonSeen(key) {
  try {
    const raw = localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveJsonSeen(key, ids, max = 80) {
  const prev = new Set(loadJsonSeen(key));
  for (const id of ids) prev.add(id);
  const list = [...prev];
  while (list.length > max) list.shift();
  localStorage.setItem(key, JSON.stringify(list));
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ——— expérience active ——— */

function pickExperience() {
  const params = new URLSearchParams(location.search);
  const wanted = params.get("e") || params.get("exp");
  if (wanted) {
    const hit = expCatalog.find((x) => x.id === wanted || x.effect === wanted);
    if (hit) return hit;
  }
  const seen = new Set(loadJsonSeen(SEEN_EXP_KEY));
  const order = rotation.length ? rotation : expCatalog.map((x) => x.id);
  const fresh = order.filter((id) => !seen.has(id));
  const pool = fresh.length ? fresh : order;
  const id = pool[dayIndex() % pool.length];
  return expCatalog.find((x) => x.id === id) || expCatalog[0] || null;
}

function effect() {
  return activeExp?.effect || "barnum";
}

/** Quiz à deck commun (corr / science / choix) */
function isDeckQuiz(eff = effect()) {
  return eff === "correlation" || eff === "science" || eff === "choice";
}

function newsletterTestId() {
  if (effect() === "barnum") return barnumSession?.packIds?.join("+") || "barnum";
  return activeExp?.id || effect();
}

/* ——— clickbait ——— */

function renderBrandSub() {
  if (!el.brandSub || !clickbaitPool.length) return;
  el.brandSub.textContent = clickbaitPool[subIndex % clickbaitPool.length];
}

function rotateBrandSub() {
  if (!clickbaitPool.length) return;
  subIndex = (subIndex + 1) % clickbaitPool.length;
  renderBrandSub();
}

function startSubRotator() {
  renderBrandSub();
  if (subTimer != null) clearInterval(subTimer);
  subTimer = setInterval(rotateBrandSub, SUB_ROTATE_MS);
}

/* ——— Barnum session build (inchangé dans l’esprit) ——— */

function allQuestions() {
  /** @type {Question[]} */
  const out = [];
  for (const pack of packs) {
    for (const q of pack.questions) {
      out.push({ ...q, packId: pack.id, packLabel: pack.label });
    }
  }
  return out;
}

function buildBarnumSession() {
  const pool = allQuestions();
  if (!pool.length) return null;
  const size = Math.min(sessionSize, pool.length);
  const seen = new Set(loadJsonSeen(SEEN_Q_KEY));
  const fresh = shuffle(pool.filter((q) => !seen.has(q.id)));
  const used = shuffle(pool.filter((q) => seen.has(q.id)));
  /** @type {Question[]} */
  let picked = [];
  const byPack = new Map();
  for (const q of fresh.length ? fresh : used) {
    if (!byPack.has(q.packId)) byPack.set(q.packId, []);
    byPack.get(q.packId).push(q);
  }
  const packIds = shuffle([...byPack.keys()]);
  let guard = 0;
  while (picked.length < size && guard < 200) {
    guard += 1;
    let progressed = false;
    for (const pid of packIds) {
      const bucket = byPack.get(pid);
      if (!bucket?.length) continue;
      if (picked.length >= size) break;
      picked.push(bucket.shift());
      progressed = true;
    }
    if (!progressed) break;
  }
  if (picked.length < size) {
    const have = new Set(picked.map((q) => q.id));
    for (const q of [...fresh, ...used]) {
      if (have.has(q.id)) continue;
      picked.push(q);
      have.add(q.id);
      if (picked.length >= size) break;
    }
  }
  picked = shuffle(picked).slice(0, size);
  const packIdsUsed = [...new Set(picked.map((q) => q.packId).filter(Boolean))];
  return {
    id: `mix-${packIdsUsed.join("+")}`,
    effect: "barnum",
    title: titlePool[dayIndex() % Math.max(titlePool.length, 1)] || activeExp?.homeTitle || "",
    blurb: blurbPool[dayIndex() % Math.max(blurbPool.length, 1)] || activeExp?.homeBlurb || "",
    questions: picked,
    packIds: /** @type {string[]} */ (packIdsUsed),
  };
}

function barnumSeed(map) {
  const raw = `${barnumSession?.id || ""}|${Object.entries(map)
    .map(([k, v]) => `${k}:${v}`)
    .join("|")}`;
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

function buildBarnumReading(map) {
  const seed = barnumSeed(map);
  const n = Object.keys(map).length;
  const titles = ["Profil rare", "Signature intérieure", "Lecture calibrée", "Portrait haute résolution"];
  const duals = [
    "Tu es souvent lucide et direct·e, mais une part de toi garde des zones volontairement floues.",
    "Tu aimes les idées nettes, tout en tolérant mieux le doute que tu ne l’admets.",
    "Tu avances avec méthode, sauf quand l’intuition te paraît plus honnête que le plan.",
    "Tu cherches la cohérence… et tu te méfies des vérités trop confortables.",
  ];
  const desires = [
    "Tu as un besoin réel d’être compris·e sans avoir à tout expliquer.",
    "Tu veux qu’on reconnaisse ton exigence, pas seulement ton résultat.",
    "Tu as besoin d’admiration discrète plus que de validation bruyante.",
    "Tu préfères être respecté·e pour ta lucidité plutôt que pour ton image.",
  ];
  const futures = [
    "Une décision que tu reportes depuis peu va bientôt paraître évidente.",
    "Quelqu’un sous-estimera ton flair cette semaine. Tu t’en souviendras.",
    "Un détail anodin du quotidien va confirmer ce que tu pensais déjà.",
    "Tu vas sentir, un instant, que le hasard te fait un clin d’œil.",
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
    `D’après tes ${n} réponses, ta cohérence intérieure atteint ${a}%.`,
    barnumPick(seed, futures, 5),
  ].join(" ");
  return {
    seed,
    title: barnumPick(seed, titles, 0),
    lead: n ? `Analyse générée à partir de ${n} réponse${n > 1 ? "s" : ""}.` : "Analyse générée.",
    body,
    metrics: [
      { title: `Lucidité (${day})`, pct: a, desc: `Pic de clarté estimé le ${day}.` },
      { title: "Contrôle / lâcher-prise", pct: b, desc: `Équilibre maîtrise / abandon à ${b}%.` },
      { title: "Besoin d’être vu·e", pct: c, desc: `Appétit de reconnaissance à ${c}%.` },
      { title: "Résistance au bruit", pct: d, desc: `Filtre anti-distraction à ${d}%.` },
    ],
  };
}

function computeRealStats(map, order, test, startedAt, endedAt) {
  const keys = order.length ? order.slice() : Object.values(map);
  const n = keys.length;
  const offered = test?.questions?.length || n;
  const counts = { "1": 0, "2": 0, "3": 0 };
  for (const k of keys) {
    if (k === "1" || k === "2" || k === "3") counts[k] += 1;
  }
  const pct = (c) => (n ? Math.round((c / n) * 1000) / 10 : 0);
  let switches = 0;
  for (let i = 1; i < keys.length; i++) if (keys[i] !== keys[i - 1]) switches += 1;
  const stability = n > 1 ? Math.round(((n - 1 - switches) / (n - 1)) * 1000) / 10 : 100;
  let longestStreak = 0;
  let streakKey = "—";
  let cur = 0;
  let curKey = "";
  for (const k of keys) {
    if (k === curKey) cur += 1;
    else {
      curKey = k;
      cur = 1;
    }
    if (cur > longestStreak) {
      longestStreak = cur;
      streakKey = curKey;
    }
  }
  const ms = startedAt && endedAt && endedAt >= startedAt ? endedAt - startedAt : 0;
  const sec = Math.round(ms / 1000);
  const perQ = n && sec ? Math.round((sec / n) * 10) / 10 : 0;
  const numeric = keys.map(Number).filter((x) => x >= 1 && x <= 3);
  const avg = numeric.length
    ? Math.round((numeric.reduce((a, b) => a + b, 0) / numeric.length) * 100) / 100
    : 0;
  let dominant = "—";
  let dominantCount = 0;
  for (const k of ["1", "2", "3"]) {
    if (counts[k] > dominantCount) {
      dominantCount = counts[k];
      dominant = k;
    }
  }
  const packLabels = [...new Set((test?.questions || []).map((q) => q.packLabel).filter(Boolean))];
  return {
    n,
    offered,
    completion: offered ? Math.round((n / offered) * 1000) / 10 : 0,
    counts,
    pct1: pct(counts["1"]),
    pct2: pct(counts["2"]),
    pct3: pct(counts["3"]),
    dominant,
    longestStreak,
    streakKey,
    switches,
    stability,
    avg,
    sec,
    perQ,
    packLabels,
    sequence: keys.join(" · ") || "—",
    first: keys[0] || "—",
    last: keys[keys.length - 1] || "—",
  };
}

function formatDuration(sec) {
  if (!sec || sec < 1) return "< 1 s";
  if (sec < 60) return `${sec} s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m} min ${s} s` : `${m} min`;
}

/* ——— UI helpers ——— */

function hidePlays() {
  if (el.playBarnum) el.playBarnum.hidden = true;
  if (el.playConfirm) el.playConfirm.hidden = true;
  if (el.playCorr) el.playCorr.hidden = true;
  if (el.playBias) el.playBias.hidden = true;
}

function politicsHelpers() {
  return {
    el,
    escapeHtml,
    setReveal,
    showEnd,
    shuffle,
    pick,
    hidePlays,
    getExp: () => activeExp,
    setMode: (m) => {
      mode = m;
    },
    getMode: () => mode,
    pushAnswer: (k) => {
      answerOrder.push(k);
    },
    setIntroSteps,
    setMeta: (t) => {
      if (el.meta) el.meta.textContent = t;
    },
    setFinishLabel: (t) => {
      if (el.finishLabel) el.finishLabel.textContent = t;
    },
    setBridge: (title, copy) => {
      if (el.bridgeTitle) el.bridgeTitle.textContent = title;
      if (el.bridgeCopy) el.bridgeCopy.textContent = copy;
    },
  };
}

function isPolitics() {
  return typeof PoliticsLab !== "undefined" && PoliticsLab.isPoliticsEffect(effect());
}

function setIntroSteps(lines) {
  if (!el.introSteps) return;
  el.introSteps.innerHTML = lines
    .map((l) => `<li><span>${escapeHtml(l.k)}</span> — ${escapeHtml(l.t)}</li>`)
    .join("");
}

function applyHomeCopy() {
  if (!activeExp) return;
  const title =
    effect() === "barnum" && barnumSession ? barnumSession.title : activeExp.homeTitle;
  const blurb =
    effect() === "barnum" && barnumSession ? barnumSession.blurb : activeExp.homeBlurb;
  if (el.testTitle) el.testTitle.textContent = title;
  if (el.testBlurb) el.testBlurb.textContent = blurb;

  if (effect() === "barnum") {
    setIntroSteps([
      { k: "espace", t: "lancer le test" },
      { k: "1 · 2 · 3", t: "choisir ta réponse" },
      { k: "terminer", t: "obtenir ton profil" },
    ]);
    if (el.meta) {
      const n = barnumSession?.questions?.length || 10;
      const packsN = barnumSession?.packIds?.length || 0;
      el.meta.textContent =
        packsN > 1 ? `${n} questions · ${packsN} thèmes · ~3 min` : `${n} questions · ~3 min`;
    }
    if (el.finishLabel) el.finishLabel.textContent = "voir mon profil";
  } else if (effect() === "confirmation") {
    setIntroSteps([
      { k: "espace", t: "ouvrir le babillard" },
      { k: "1 · 2 · 3", t: "colle / non / vague" },
      { k: "terminer", t: "voir ta précision" },
    ]);
    if (el.meta) el.meta.textContent = `${confirmDeck.length || 10} prédictions · ~2 min`;
    if (el.finishLabel) el.finishLabel.textContent = "voir ma précision";
  } else if (effect() === "correlation") {
    setIntroSteps([
      { k: "espace", t: "lancer le quiz" },
      { k: "1 · 2 · 3", t: "choisir une réponse" },
      { k: "terminer", t: "voir le score" },
    ]);
    const n = corrDeck.length || activeExp?.quizSize || 10;
    if (el.meta) el.meta.textContent = `${n} questions · courbes + chiffres · ~4 min`;
    if (el.finishLabel) el.finishLabel.textContent = "voir le score";
  } else if (effect() === "science") {
    setIntroSteps([
      { k: "espace", t: "lancer le quiz" },
      { k: "1 · 2 · 3", t: "choisir une réponse" },
      { k: "terminer", t: "voir le score" },
    ]);
    const n = corrDeck.length || activeExp?.quizSize || 8;
    if (el.meta) el.meta.textContent = `${n} questions · méthode scientifique · ~3 min`;
    if (el.finishLabel) el.finishLabel.textContent = "voir le score";
  } else if (effect() === "choice") {
    setIntroSteps([
      { k: "espace", t: "lancer le quiz" },
      { k: "1 · 2 · 3", t: "choisir une réponse" },
      { k: "terminer", t: "voir le score" },
    ]);
    const n = corrDeck.length || activeExp?.quizSize || 8;
    if (el.meta) el.meta.textContent = `${n} questions · votes & tirage · ~3 min`;
    if (el.finishLabel) el.finishLabel.textContent = "voir le score";
  } else if (isPolitics()) {
    PoliticsLab.applyHome(politicsHelpers());
  }
}

function setReveal(title, lead, levers) {
  if (el.revealTitle) el.revealTitle.textContent = title;
  if (el.revealLead) el.revealLead.textContent = lead;
  if (el.revealLevers) {
    el.revealLevers.innerHTML = "";
    for (const line of levers) {
      const li = document.createElement("li");
      li.textContent = line;
      el.revealLevers.appendChild(li);
    }
  }
}

function prepareNewsForm() {
  if (!el.newsError || !el.newsOk) return;
  el.newsError.hidden = true;
  const saved = localStorage.getItem(NEWS_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (el.newsEmail) el.newsEmail.value = data.email || "";
      if (el.newsConsent) el.newsConsent.checked = true;
      el.newsOk.hidden = false;
    } catch {
      el.newsOk.hidden = true;
    }
  } else {
    el.newsOk.hidden = true;
  }
}

/* ——— Scroll intention + partage ——— */

const SCROLL_NUDGES = {
  profil: {
    stage: "profil",
    text: "Profil OK — mais ce n’est que le début. Descends.",
    cta: "Voir la suite ↓",
  },
  bridge: {
    stage: "presque",
    text: "Récompense juste en dessous. Encore un cran.",
    cta: "Débloquer ↓",
  },
  surprise: {
    stage: "surprise",
    text: "Tu y es. Lis jusqu’au bout — puis rejoue pour comparer.",
    cta: "Preuve ↓",
  },
  preuve: {
    stage: "preuve",
    text: "Tes passages sont mémorisés. Rejoue pour renforcer la démo.",
    cta: "Partager ↓",
  },
  partage: {
    stage: "partage",
    text: "Envoie le lien à quelqu’un qui n’est pas prévenu.",
    cta: "Newsletter ↓",
  },
  suite: {
    stage: "suite",
    text: "Dernière étape : la prochaine expérience par mail.",
    cta: "Fin ↓",
  },
  fin: {
    stage: "terminé",
    text: "Bilan complet. Tu peux rejouer, partager ou changer.",
    cta: "Haut ↑",
  },
};

let scrollZone = "profil";
let scrollRaf = 0;

function shareUrl() {
  const u = new URL(location.href);
  if (activeExp?.id) u.searchParams.set("e", activeExp.id);
  u.hash = "";
  return u.toString();
}

function shareMessage() {
  const title = activeExp?.homeTitle || "On te lit";
  return `J’ai fait « ${title} » sur On te lit — à toi de jouer (sans spoiler).`;
}

function showShareToast(msg) {
  if (!el.shareToast) return;
  el.shareToast.hidden = false;
  el.shareToast.textContent = msg;
  clearTimeout(showShareToast._t);
  showShareToast._t = setTimeout(() => {
    if (el.shareToast) el.shareToast.hidden = true;
  }, 2200);
}

function wireShareLinks() {
  const url = shareUrl();
  const text = shareMessage();
  const encU = encodeURIComponent(url);
  const encT = encodeURIComponent(text);
  const map = {
    whatsapp: `https://wa.me/?text=${encT}%20${encU}`,
    sms: `sms:?&body=${encT}%20${encU}`,
    x: `https://twitter.com/intent/tweet?text=${encT}&url=${encU}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encU}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encU}`,
    telegram: `https://t.me/share/url?url=${encU}&text=${encT}`,
    email: `mailto:?subject=${encodeURIComponent("On te lit — essaie ça")}&body=${encT}%0A%0A${encU}`,
  };

  if (!el.shareGrid) return;
  const nativeBtn = el.shareGrid.querySelector('[data-share="native"]');
  if (nativeBtn) {
    nativeBtn.hidden = !(typeof navigator.share === "function");
  }

  for (const node of el.shareGrid.querySelectorAll("[data-share]")) {
    const kind = node.getAttribute("data-share");
    if (!kind || kind === "native" || kind === "copy" || kind === "instagram") continue;
    if (node instanceof HTMLAnchorElement && map[kind]) {
      node.href = map[kind];
    }
  }

  if (el.shareCopy) {
    el.shareCopy.textContent =
      effect() === "barnum"
        ? "Le twist marche mieux sur quelqu’un qui n’est pas prévenu."
        : "Envoie le lien avant de raconter la fin — l’effet dépend de la surprise.";
  }
}

async function doShare(kind) {
  const url = shareUrl();
  const text = shareMessage();
  if (kind === "native" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: "On te lit", text, url });
      showShareToast("Partagé.");
    } catch {
      /* annulé */
    }
    return;
  }
  if (kind === "messenger") {
    // Pas d’URL web universelle fiable → deep link mobile + copie.
    const deep = `fb-messenger://share/?link=${encodeURIComponent(url)}`;
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
    } catch {
      /* ignore */
    }
    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
    if (isMobile) window.location.href = deep;
    showShareToast("Lien copié — colle-le dans Messenger.");
    return;
  }
  if (kind === "copy" || kind === "instagram") {
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      showShareToast(
        kind === "instagram"
          ? "Lien copié — colle-le dans Instagram (DM / story)."
          : "Lien copié.",
      );
    } catch {
      showShareToast("Impossible de copier — sélectionne l’URL à la main.");
    }
  }
}

function updateScrollRail() {
  if (!el.endView || el.endView.hidden || !el.endRail) return;
  const doc = document.documentElement;
  const max = Math.max(1, doc.scrollHeight - window.innerHeight);
  const pct = Math.min(100, Math.round((window.scrollY / max) * 100));
  if (el.endRailFill) el.endRailFill.style.width = `${pct}%`;
  if (el.endRailPct) el.endRailPct.textContent = `${pct}%`;

  const chapters = [...el.endView.querySelectorAll("[data-chapter]")];
  let current = "profil";
  const mid = window.scrollY + window.innerHeight * 0.42;
  for (const node of chapters) {
    const top = node.getBoundingClientRect().top + window.scrollY;
    if (top <= mid) current = node.getAttribute("data-chapter") || current;
  }
  scrollZone = current;
  const nudge = SCROLL_NUDGES[current] || SCROLL_NUDGES.profil;
  if (el.endRail) el.endRail.dataset.zone = current;
  if (el.endRailStage) el.endRailStage.textContent = nudge.stage;
  if (el.endRailNudge) el.endRailNudge.textContent = nudge.text;
  if (el.endRailGo) el.endRailGo.textContent = nudge.cta;
  el.endRail.classList.toggle("is-complete", pct >= 96 || current === "fin");
}

function onEndScroll() {
  if (scrollRaf) return;
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0;
    updateScrollRail();
  });
}

function enableEndScrollCoach() {
  if (el.endRail) el.endRail.hidden = false;
  updateScrollRail();
  window.addEventListener("scroll", onEndScroll, { passive: true });
  window.addEventListener("resize", onEndScroll);
  // Micro-récompense d’entrée
  if (el.endRailNudge) {
    el.endRailNudge.textContent = "Profil débloqué — continue pour la suite.";
  }
}

function disableEndScrollCoach() {
  if (el.endRail) el.endRail.hidden = true;
  window.removeEventListener("scroll", onEndScroll);
  window.removeEventListener("resize", onEndScroll);
}

function scrollToChapter(name) {
  const node = el.endView?.querySelector(`[data-chapter="${name}"]`);
  if (!node) return;
  const y = node.getBoundingClientRect().top + window.scrollY - 16;
  window.scrollTo({ top: y, behavior: "smooth" });
}

function scrollNextChapter() {
  const order = ["profil", "bridge", "surprise", "preuve", "partage", "suite", "fin"];
  const i = order.indexOf(scrollZone);
  if (scrollZone === "fin" || i >= order.length - 1) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  scrollToChapter(order[i + 1]);
}

/* ——— Historique des passages (preuve) ——— */

function loadRunsStore() {
  try {
    const raw = localStorage.getItem(RUNS_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function saveRunsStore(store) {
  localStorage.setItem(RUNS_KEY, JSON.stringify(store));
}

/** @returns {any[]} */
function getRuns(effectId) {
  const store = loadRunsStore();
  const list = store[effectId];
  return Array.isArray(list) ? list : [];
}

/** Garde toujours le 1er passage + les plus récents. */
function appendRunKeepFirst(effectId, snap) {
  const store = loadRunsStore();
  const prev = Array.isArray(store[effectId]) ? store[effectId] : [];
  const first = prev[0];
  const rest = prev.slice(1);
  const next = { ...snap, at: Date.now() };
  let list;
  if (!first) {
    list = [next];
  } else {
    list = [first, ...rest, next];
    while (list.length > MAX_RUNS_PER_EFFECT) {
      if (list.length > 2) list.splice(1, 1);
      else break;
    }
  }
  list = list.map((r, i) => ({ ...r, n: i + 1 }));
  store[effectId] = list;
  saveRunsStore(store);
  return list;
}

function buildCurrentSnapshot() {
  const eff = effect();
  if (eff === "barnum") {
    const reading = buildBarnumReading(answers);
    const keys = answerOrder.length ? answerOrder.slice() : Object.values(answers);
    const real = computeRealStats(answers, answerOrder, barnumSession, quizStartedAt, quizEndedAt);
    return {
      effect: "barnum",
      keys,
      title: reading.title,
      body: reading.body,
      seed: reading.seed,
      pcts: reading.metrics.map((m) => m.pct),
      realDominant: real.dominant,
      realSeq: real.sequence,
      duration: real.sec,
    };
  }
  if (eff === "confirmation") {
    const s = confirmBiasedScore(confirmMarks);
    return {
      effect: "confirmation",
      marks: { ...confirmMarks },
      keys: answerOrder.slice(),
      biased: s.biased,
      honest: s.honest,
      hits: s.hits,
      soft: s.soft,
      miss: s.miss,
      hitTexts: confirmDeck.filter((p) => confirmMarks[p.id] === "1").map((p) => p.text),
      missTexts: confirmDeck.filter((p) => confirmMarks[p.id] === "2").map((p) => p.text),
    };
  }
  if (isPolitics()) return PoliticsLab.buildSnapshot(politicsHelpers());
  const ok = corrLog.filter((r) => r.correct).length;
  return {
    effect: effect(),
    n: corrLog.length,
    ok,
    pct: corrLog.length ? Math.round((ok / corrLog.length) * 100) : 0,
    keys: corrLog.map((r) => r.key),
  };
}

function formatRunTime(at) {
  try {
    return new Date(at).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function renderProofPanel(runs) {
  if (!el.proofBody || !el.proofLead || !el.proofTitle) return;
  const eff = effect();
  const count = runs.length;
  const first = runs[0];
  const last = runs[runs.length - 1];

  if (count <= 1) {
    el.proofTitle.textContent = "Rejoue pour voir la différence";
    el.proofLead.textContent =
      "Passage n°1 enregistré sur cet appareil. Rejoue avec d’autres choix : on gardera ce premier passage pour prouver que le « diagnostic » marche pareil.";
    el.proofBody.innerHTML = `
      <div class="proof-card">
        <p class="algo-card-kicker">passage #1 · ${escapeHtml(formatRunTime(first?.at))}</p>
        ${proofSummaryHtml(eff, first)}
      </div>
      <p class="proof-hint">Astuce : réponds volontairement à l’opposé la prochaine fois.</p>`;
    return;
  }

  el.proofTitle.textContent = `${count} passages mémorisés`;
  el.proofLead.textContent =
    eff === "barnum"
      ? "Premier vs dernier : les réponses changent, le ton « ultra personnel » reste interchangeable."
      : eff === "confirmation"
        ? "Quel que soit ce que tu coches, le bilan met en avant les « ça colle » et gonfle le %."
        : eff === "correlation"
          ? "Le score est réel : les mauvaises réponses étaient plausibles — d’où l’intérêt des sources."
          : eff === "science"
            ? "Le score est réel : chaque bonne réponse suit une règle de la méthode scientifique."
            : eff === "choice"
              ? "Le score est réel : chaque règle de choix (vote, tirage…) change qui gagne."
              : eff === "exposure"
                ? "L’antenne répète : les messages les plus vus restent souvent préférés."
                : eff === "halo"
                  ? "Tes jugements hors liste suivent (ou non) le trait central — comme chez Asch (1946)."
                  : eff === "anchor"
                    ? "Le premier chiffre continue d’attirer les estimations."
                    : "Compare tes passages pour voir le même mécanisme.";

  el.proofBody.innerHTML = `
    <div class="algo-compare">
      <article class="algo-card">
        <p class="algo-card-kicker">1er passage · ${escapeHtml(formatRunTime(first.at))}</p>
        ${proofSummaryHtml(eff, first)}
      </article>
      <article class="algo-card algo-card-alt">
        <p class="algo-card-kicker">dernier · ${escapeHtml(formatRunTime(last.at))}</p>
        ${proofSummaryHtml(eff, last)}
      </article>
    </div>
    ${proofDiffHtml(eff, first, last)}
    <h3 class="reveal-sub" style="margin-top:22px">Tous les passages</h3>
    <ol class="proof-list">
      ${runs
        .map(
          (r, i) =>
            `<li><span class="proof-list-n">#${i + 1}</span> ${escapeHtml(formatRunTime(r.at))} — ${escapeHtml(proofOneLiner(eff, r))}</li>`,
        )
        .join("")}
    </ol>`;
}

function proofSummaryHtml(eff, run) {
  if (!run) return "<p class='algo-card-body'>—</p>";
  if (eff === "barnum") {
    return `
      <p class="algo-card-keys">${escapeHtml((run.keys || []).join(" · ") || "—")}</p>
      <p class="algo-card-title">${escapeHtml(run.title || "")}</p>
      <p class="algo-card-body">${escapeHtml(run.body || "")}</p>
      <p class="algo-card-pcts">% inventés : ${(run.pcts || []).join(" · ") || "—"}</p>`;
  }
  if (eff === "confirmation") {
    return `
      <p class="algo-card-title">Affiché ${run.biased}% · honnête ${run.honest}%</p>
      <p class="algo-card-body">Ça colle : ${run.hits} · vague : ${run.soft} · non : ${run.miss}</p>
      <p class="algo-card-keys">Touches : ${escapeHtml((run.keys || []).join(" · ") || "—")}</p>`;
  }
  if (typeof PoliticsLab !== "undefined" && PoliticsLab.isPoliticsEffect(eff)) {
    return PoliticsLab.proofSummary(eff, run);
  }
  if (isDeckQuiz(eff)) {
    if (run.n != null && run.ok != null) {
      const body =
        eff === "science"
          ? "Quiz démarche scientifique"
          : eff === "choice"
            ? "Quiz méthodes de choix"
            : "Quiz chiffres / courbes";
      return `<p class="algo-card-title">${run.ok}/${run.n} · ${run.pct ?? 0}%</p>
        <p class="algo-card-body">${body}</p>`;
    }
    return `<p class="algo-card-body">Ancienne version — rejoue.</p>`;
  }
  return "<p class='algo-card-body'>—</p>";
}

function proofOneLiner(eff, run) {
  if (eff === "barnum") return `${(run.keys || []).join("")} → « ${run.title || "profil"} »`;
  if (eff === "confirmation") return `affiché ${run.biased}% / honnête ${run.honest}%`;
  if (typeof PoliticsLab !== "undefined" && PoliticsLab.isPoliticsEffect(eff)) {
    return PoliticsLab.proofOneLiner(eff, run);
  }
  if (isDeckQuiz(eff)) {
    if (run.n != null && run.ok != null) return `${run.ok}/${run.n} (${run.pct ?? 0}%)`;
    return "ancienne version";
  }
  return "—";
}

function proofDiffHtml(eff, a, b) {
  if (eff === "barnum") {
    const sameKeys = JSON.stringify(a.keys) === JSON.stringify(b.keys);
    const sameTitle = a.title === b.title;
    const sameBody = a.body === b.body;
    return `<ul class="proof-diff">
      <li>Réponses : ${sameKeys ? "identiques (rejoue autrement pour tranché)" : "différentes"}</li>
      <li>Titre du profil : ${sameTitle ? "même tirage" : "changé — toujours flatteur"}</li>
      <li>Texte : ${sameBody ? "identique" : "autre phrase générique, même style"}</li>
      <li>Les % « indices » restent dans la zone marketing (61–89), pas des mesures.</li>
    </ul>`;
  }
  if (eff === "confirmation") {
    return `<ul class="proof-diff">
      <li>Score affiché : ${a.biased}% → ${b.biased}% (toujours ≥ score honnête)</li>
      <li>Score honnête : ${a.honest}% → ${b.honest}%</li>
      <li>Écart affiché−honnête : ${a.biased - a.honest} pts → ${b.biased - b.honest} pts</li>
      <li>Même manœuvre : mettre en lumière les « ça colle », enterrer les « non ».</li>
    </ul>`;
  }
  if (typeof PoliticsLab !== "undefined" && PoliticsLab.isPoliticsEffect(eff)) {
    return PoliticsLab.proofDiff(eff, a, b);
  }
  if (isDeckQuiz(eff)) {
    const lineA =
      a.n != null ? `${a.ok}/${a.n} (${a.pct ?? 0}%)` : "ancienne version";
    const lineB =
      b.n != null ? `${b.ok}/${b.n} (${b.pct ?? 0}%)` : "ancienne version";
    const tip =
      eff === "science"
        ? "La méthode se corrige : se tromper et republier, c’est avancer."
        : eff === "choice"
          ? "Changer la règle (majorité, proportionnelle, tirage…) peut changer le vainqueur."
          : "Sans source, l’ordre de grandeur « qui sonne juste » trompe — et deux courbes qui collent ne prouvent pas une cause.";
    return `<ul class="proof-diff">
      <li>Scores : ${lineA} → ${lineB}</li>
      <li>${tip}</li>
    </ul>`;
  }
  return "";
}

function replaySameCompare() {
  disableEndScrollCoach();
  el.endView.hidden = true;
  el.labView.hidden = false;
  mode = "idle";
  // Garde la même expérience ; nouveau tirage de contenu.
  refreshActiveContent();
  startPlay();
  window.scrollTo(0, 0);
}

function prepareBridgeCopy() {
  if (!el.bridgeTitle || !el.bridgeCopy) return;
  if (effect() === "confirmation") {
    el.bridgeTitle.textContent = "Le % n’est pas toute l’histoire.";
    el.bridgeCopy.textContent =
      "Tu as vu les réussites. Descends : on te montre ce que le bilan avait envie d’oublier.";
  } else if (effect() === "correlation") {
    el.bridgeTitle.textContent = "Les mauvaises réponses sonnaient juste…";
    el.bridgeCopy.textContent =
      "Encore un cran : score réel, bonnes réponses, et pourquoi deux courbes qui collent ne prouvent rien.";
  } else if (effect() === "science") {
    el.bridgeTitle.textContent = "Tu as tranché…";
    el.bridgeCopy.textContent =
      "Encore un cran : score, puis pourquoi la contradiction est une force de la méthode.";
  } else if (effect() === "choice") {
    el.bridgeTitle.textContent = "La règle a tranché…";
    el.bridgeCopy.textContent =
      "Encore un cran : score, puis pourquoi majorité, proportionnelle ou tirage au sort ne sont jamais neutres.";
  } else if (isPolitics()) {
    PoliticsLab.prepareBridge(politicsHelpers());
  } else {
    el.bridgeTitle.textContent = "La suite change la lecture.";
    el.bridgeCopy.textContent =
      "Le profil est séduisant. Ce n’est pas encore la fin — descends.";
  }
}

/* ——— Confirmation ——— */

function buildConfirmDeck() {
  const pool = activeExp?.predictions || [];
  return shuffle(pool).slice(0, Math.min(10, pool.length));
}

function showConfirmStep() {
  if (stepIndex >= confirmDeck.length) {
    showEnd();
    return;
  }
  mode = "play";
  hidePlays();
  if (el.hint) el.hint.hidden = true;
  if (el.startRow) el.startRow.hidden = true;
  if (el.playConfirm) el.playConfirm.hidden = false;
  const p = confirmDeck[stepIndex];
  if (el.confirmProgress) el.confirmProgress.textContent = `${stepIndex + 1} / ${confirmDeck.length}`;
  if (el.confirmText) el.confirmText.textContent = p.text;
}

function answerConfirm(key) {
  if (mode !== "play" || effect() !== "confirmation") return;
  if (!/^[1-3]$/.test(key)) return;
  const p = confirmDeck[stepIndex];
  if (!p) return;
  confirmMarks[p.id] = key;
  answerOrder.push(key);
  stepIndex += 1;
  if (stepIndex >= confirmDeck.length) showEnd();
  else showConfirmStep();
}

/** Précision biaisée : on gonfle en traitant « vague » comme demi-succès et en oubliant les non. */
function confirmBiasedScore(marks) {
  let hits = 0;
  let soft = 0;
  let miss = 0;
  for (const p of confirmDeck) {
    const m = marks[p.id];
    if (m === "1") hits += 1;
    else if (m === "3") soft += 1;
    else miss += 1;
  }
  const weighted = hits + soft * 0.5;
  const denom = Math.max(1, hits + soft); // « oublie » les non dans le dénominateur
  const biased = Math.round((weighted / denom) * 100);
  const honest = Math.round((hits / Math.max(1, confirmDeck.length)) * 100);
  return { hits, soft, miss, biased, honest, total: confirmDeck.length };
}

function renderConfirmEnd() {
  const s = confirmBiasedScore(confirmMarks);
  const hitList = confirmDeck.filter((p) => confirmMarks[p.id] === "1");
  const missList = confirmDeck.filter((p) => confirmMarks[p.id] === "2");
  const vagueList = confirmDeck.filter((p) => confirmMarks[p.id] === "3");

  if (el.fakeRead) {
    el.fakeRead.innerHTML = `
      <header class="end-hero">
        <p class="end-kicker">babillard · bilan</p>
        <h1 class="end-title">Précision ${s.biased}%</h1>
        <p class="end-lead">D’après ce que tu as coché, les prédictions collent très bien.</p>
        <p class="end-humor">Les réussites brillent. Le reste… passe à la trappe.</p>
      </header>
      <section class="confirm-hits">
        <p class="end-kicker">ce qui a collé</p>
        <ul class="sticky-board sticky-board-hits">
          ${
            hitList.map((p) => `<li class="sticky-mini sticky-hit">${escapeHtml(p.text)}</li>`).join("") ||
            "<li class='sticky-mini'>Rien coché « ça colle » — rare, mais possible.</li>"
          }
        </ul>
      </section>
      <section class="real-stats">
        <p class="end-kicker">compteurs (avant la surprise)</p>
        <div class="stat-grid">
          <div class="stat-card"><p class="stat-card-value">${s.hits}</p><p class="stat-card-label">Ça colle</p></div>
          <div class="stat-card"><p class="stat-card-value">${s.soft}</p><p class="stat-card-label">Trop vague</p></div>
          <div class="stat-card"><p class="stat-card-value">${s.miss}</p><p class="stat-card-label">Non (peu mises en avant)</p></div>
          <div class="stat-card"><p class="stat-card-value">${s.biased}%</p><p class="stat-card-label">Score affiché</p></div>
        </div>
      </section>`;
  }

  setReveal(
    "Tu viens de subir le biais de confirmation",
    "Tu as coché ce qui te parlait. Le bilan a grossi ces cases-là et a presque caché les autres. Résultat : l’expérience a l’air juste — surtout parce qu’on ne te montre plus ce qui n’a pas collé. Même réflexe dans la vraie vie : horoscope, anecdote « qui prouve », souvenir qui ne garde que les réussites.",
    [
      "Tu retiens surtout ce qui confirme ton impression",
      "Ce qui contredit (les « non ») passe à l’arrière-plan",
      "Le % affiché ignorait les échecs dans le calcul",
      "Une phrase vague est facile à cocher « ça colle » — elle couvre presque tous les cas",
    ],
  );

  if (el.revealExtra) {
    el.revealExtra.innerHTML = `
      <h3 class="reveal-sub">Le babillard complet</h3>
      <p class="reveal-explain">
        Score honnête : <strong>${s.honest}%</strong> de « ça colle » sur ${s.total} prédictions
        (pas ${s.biased}%). Voici aussi ce que le bilan avait envie que tu oublies.
      </p>
      <div class="confirm-reveal-grid">
        <div>
          <p class="algo-card-kicker">mises en avant</p>
          <ul class="reveal-board">${hitList.map((p) => `<li class="ok">${escapeHtml(p.text)}</li>`).join("") || "<li>—</li>"}</ul>
        </div>
        <div>
          <p class="algo-card-kicker">écartées (« non »)</p>
          <ul class="reveal-board">${missList.map((p) => `<li class="ko">${escapeHtml(p.text)}</li>`).join("") || "<li>—</li>"}</ul>
        </div>
        <div>
          <p class="algo-card-kicker">filet « trop vague »</p>
          <ul class="reveal-board">${vagueList.map((p) => `<li class="soft">${escapeHtml(p.text)}</li>`).join("") || "<li>—</li>"}</ul>
        </div>
      </div>
      <p class="reveal-explain" style="margin-top:16px">
        Astuce : une prédiction du type « tu seras en avance — ou en retard » gagne presque toujours.
        Ce n’est pas de la voyance, c’est une phrase filet.
      </p>`;
  }
}

/* ——— Corrélation / quiz chiffres sourcés ——— */

function corrKind(q) {
  if (q?.kind) return q.kind;
  if (q?.id === "meta_correlation") return "meta";
  if (String(q?.id || "").startsWith("spur_")) return "spurious";
  return "fact";
}

function buildCorrDeck() {
  const pool = activeExp?.questions || [];
  if (!pool.length) return [];
  const size = Math.min(activeExp?.quizSize || 10, pool.length);
  const meta = pool.filter((q) => corrKind(q) === "meta");
  const withChart = shuffle(
    pool.filter((q) => corrKind(q) === "spurious" && q.chart?.years?.length),
  );
  const spuriousText = shuffle(
    pool.filter((q) => corrKind(q) === "spurious" && !q.chart?.years?.length),
  );
  const facts = shuffle(pool.filter((q) => corrKind(q) === "fact"));
  const nMeta = meta.length ? 1 : 0;
  const nChart = Math.min(
    activeExp?.chartMin || 3,
    withChart.length,
    Math.max(0, size - nMeta),
  );
  const nSpuriousText = Math.min(
    Math.max(0, (activeExp?.spuriousMin || 4) - nChart),
    spuriousText.length,
    Math.max(0, size - nMeta - nChart),
  );
  const nFacts = Math.max(0, size - nChart - nSpuriousText - nMeta);
  const picked = [
    ...withChart.slice(0, nChart),
    ...spuriousText.slice(0, nSpuriousText),
    ...facts.slice(0, nFacts),
    ...meta.slice(0, nMeta),
  ].slice(0, size);
  // Courbes d’abord (preuve visuelle), méta en dernier
  const charts = shuffle(picked.filter((q) => q.chart?.years?.length));
  const mid = shuffle(
    picked.filter((q) => !q.chart?.years?.length && corrKind(q) !== "meta"),
  );
  const tail = picked.filter((q) => corrKind(q) === "meta");
  return [...charts, ...mid, ...tail].map((q) => {
    const shuffled = shuffle([...(q.choices || [])]).map((c, i) => ({
      ...c,
      k: String(i + 1),
    }));
    const correct = shuffled.find((c) => c.correct);
    return {
      ...q,
      kind: corrKind(q),
      choices: shuffled,
      correctKey: correct?.k || "1",
      correctLabel: correct?.label || "",
    };
  });
}

/** Double échelle : les courbes « collent » à l’œil — piège pédagogique classique (Vigen). */
function renderCorrChartSvg(chart) {
  const years = chart.years || [];
  const a = chart.a?.values || [];
  const b = chart.b?.values || [];
  const n = Math.min(years.length, a.length, b.length);
  if (n < 2) return "";
  const W = 720;
  const H = 360;
  const pad = { t: 26, r: 44, b: 32, l: 44 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const minA = Math.min(...a.slice(0, n));
  const maxA = Math.max(...a.slice(0, n));
  const minB = Math.min(...b.slice(0, n));
  const maxB = Math.max(...b.slice(0, n));
  const spanA = maxA - minA || 1;
  const spanB = maxB - minB || 1;
  const xAt = (i) => pad.l + (i / (n - 1)) * iw;
  const yA = (v) => pad.t + ih - ((v - minA) / spanA) * ih;
  const yB = (v) => pad.t + ih - ((v - minB) / spanB) * ih;
  const path = (vals, yFn) =>
    vals
      .slice(0, n)
      .map((v, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)},${yFn(v).toFixed(1)}`)
      .join(" ");
  const ticks = [0, Math.floor((n - 1) / 2), n - 1].filter(
    (v, i, arr) => arr.indexOf(v) === i,
  );
  const colA = chart.a?.color || "#c45c26";
  const colB = chart.b?.color || "#2a6fdb";
  return `
    <figure class="corr-chart corr-chart-zoom" data-action="zoom-corr-chart" tabindex="0" role="button" aria-label="Agrandir la courbe">
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-hidden="true">
        <rect x="0" y="0" width="${W}" height="${H}" fill="#0f0f0f" rx="4"/>
        <line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${pad.t + ih}" stroke="#333" />
        <line x1="${pad.l + iw}" y1="${pad.t}" x2="${pad.l + iw}" y2="${pad.t + ih}" stroke="#333" />
        <line x1="${pad.l}" y1="${pad.t + ih}" x2="${pad.l + iw}" y2="${pad.t + ih}" stroke="#333" />
        <path d="${path(a, yA)}" fill="none" stroke="${colA}" stroke-width="3"/>
        <path d="${path(b, yB)}" fill="none" stroke="${colB}" stroke-width="3" stroke-dasharray="6 5"/>
        ${a
          .slice(0, n)
          .map(
            (v, i) =>
              `<circle cx="${xAt(i).toFixed(1)}" cy="${yA(v).toFixed(1)}" r="4" fill="${colA}"/>`,
          )
          .join("")}
        ${b
          .slice(0, n)
          .map(
            (v, i) =>
              `<circle cx="${xAt(i).toFixed(1)}" cy="${yB(v).toFixed(1)}" r="4" fill="${colB}"/>`,
          )
          .join("")}
        ${ticks
          .map(
            (i) =>
              `<text x="${xAt(i).toFixed(1)}" y="${H - 8}" text-anchor="middle" fill="#888" font-size="12" font-family="IBM Plex Mono, monospace">${years[i]}</text>`,
          )
          .join("")}
        <text x="${pad.l}" y="18" fill="${colA}" font-size="12" font-family="IBM Plex Mono, monospace">${escapeHtml(chart.a?.label || "A")}</text>
        <text x="${W - pad.r}" y="18" text-anchor="end" fill="${colB}" font-size="12" font-family="IBM Plex Mono, monospace">${escapeHtml(chart.b?.label || "B")}</text>
      </svg>
      <figcaption class="corr-chart-cap">
        ${chart.r != null ? `<span>r ≈ ${escapeHtml(String(chart.r))}</span>` : ""}
        ${chart.credit ? `<span>${escapeHtml(chart.credit)}</span>` : ""}
        <span class="corr-chart-hint">cliquer pour agrandir</span>
      </figcaption>
    </figure>`;
}

function corrChartFsOpen() {
  return el.corrChartFs && !el.corrChartFs.hidden;
}

function openCorrChartFullscreen(figure) {
  if (!el.corrChartFs || !el.corrChartFsInner || !(figure instanceof Element)) return;
  const clone = figure.cloneNode(true);
  clone.removeAttribute("data-action");
  clone.removeAttribute("role");
  clone.removeAttribute("tabindex");
  clone.classList.remove("corr-chart-zoom");
  clone.classList.add("corr-chart-fs-figure");
  const hint = clone.querySelector(".corr-chart-hint");
  if (hint) hint.remove();
  el.corrChartFsInner.innerHTML = "";
  el.corrChartFsInner.appendChild(clone);
  el.corrChartFs.hidden = false;
  document.body.classList.add("corr-fs-open");
  const closeBtn = el.corrChartFs.querySelector(".corr-chart-fs-close");
  if (closeBtn instanceof HTMLElement) closeBtn.focus();
}

function closeCorrChartFullscreen() {
  if (!el.corrChartFs) return;
  el.corrChartFs.hidden = true;
  if (el.corrChartFsInner) el.corrChartFsInner.innerHTML = "";
  document.body.classList.remove("corr-fs-open");
}

function renderCorrChoices(question) {
  if (!el.corrRateChoices) return;
  el.corrRateChoices.innerHTML = "";
  el.corrRateChoices.hidden = false;
  for (const c of question.choices) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "key key-wide";
    btn.dataset.key = c.k;
    btn.setAttribute("aria-label", `${c.k} : ${c.label}`);
    btn.innerHTML = `<span class="key-glyph">${c.k}</span><span class="key-label">${escapeHtml(c.label)}</span>`;
    el.corrRateChoices.appendChild(btn);
  }
}

function showCorrQuestion() {
  if (stepIndex >= corrDeck.length) {
    showEnd();
    return;
  }
  mode = "play";
  hidePlays();
  if (el.hint) el.hint.hidden = true;
  if (el.startRow) el.startRow.hidden = true;
  if (el.playCorr) el.playCorr.hidden = false;

  const q = corrDeck[stepIndex];
  const kind = corrKind(q);
  const kicker =
    effect() === "science"
      ? "méthode"
      : effect() === "choice"
        ? "décision"
        : kind === "spurious"
          ? q.chart
            ? "deux courbes"
            : "corrélation étrange"
          : kind === "meta"
            ? "règle d’or"
            : "chiffre sourcé";
  if (el.corrProgress) el.corrProgress.textContent = `${stepIndex + 1} / ${corrDeck.length}`;
  if (el.corrDay) el.corrDay.textContent = `Question ${stepIndex + 1} · ${kicker}`;
  if (el.corrPrompt) {
    el.corrPrompt.hidden = false;
    el.corrPrompt.textContent = q.q;
  }
  if (el.corrChart) {
    if (q.chart?.years?.length) {
      el.corrChart.hidden = false;
      el.corrChart.innerHTML = renderCorrChartSvg(q.chart);
    } else {
      el.corrChart.hidden = true;
      el.corrChart.innerHTML = "";
    }
  }
  renderCorrChoices(q);
}

function answerCorr(key) {
  if (mode !== "play" || !isDeckQuiz()) return;
  if (!/^[1-3]$/.test(key)) return;
  const q = corrDeck[stepIndex];
  if (!q?.choices.some((c) => c.k === key)) return;
  const picked = q.choices.find((c) => c.k === key);
  corrLog.push({
    id: q.id,
    kind: corrKind(q),
    key,
    label: picked?.label || "",
    correct: key === q.correctKey,
    correctKey: q.correctKey,
    correctLabel: q.correctLabel,
    q: q.q,
    explain: q.explain || "",
    sources: q.sources || [],
    chart: q.chart || null,
  });
  answerOrder.push(key);
  stepIndex += 1;
  if (stepIndex >= corrDeck.length) showEnd();
  else showCorrQuestion();
}

function corrScore() {
  const n = corrLog.length;
  const ok = corrLog.filter((r) => r.correct).length;
  return { n, ok, pct: n ? Math.round((ok / n) * 100) : 0, miss: n - ok };
}

function renderCorrSources(sources) {
  if (!sources?.length) return "";
  return `<ul class="corr-sources">${sources
    .map(
      (s) =>
        `<li><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.label)}</a></li>`,
    )
    .join("")}</ul>`;
}

function renderQuizReviewRows() {
  return corrLog
    .map((row, i) => {
      const mark = row.correct ? "ok" : "ko";
      return `
        <article class="corr-review ${mark}">
          <p class="corr-review-n">Q${i + 1}</p>
          <p class="corr-review-q">${escapeHtml(row.q)}</p>
          <p class="corr-review-ans"><span>Toi :</span> ${escapeHtml(row.label || "")}</p>
          <p class="corr-review-ans"><span>Bonne lecture :</span> ${escapeHtml(row.correctLabel)}</p>
          ${row.explain ? `<p class="corr-review-explain">${escapeHtml(row.explain)}</p>` : ""}
          ${renderCorrSources(row.sources)}
        </article>`;
    })
    .join("");
}

function renderScienceEnd() {
  const s = corrScore();
  if (el.fakeRead) {
    el.fakeRead.innerHTML = `
      <header class="end-hero">
        <p class="end-kicker">méthode · score</p>
        <h1 class="end-title">${s.ok} / ${s.n}</h1>
        <p class="end-lead">${s.pct}% — la science n’est pas « avoir raison une fois », c’est pouvoir se tromper à voix haute et corriger.</p>
        <p class="end-humor">${s.miss ? `${s.miss} piège${s.miss > 1 ? "s" : ""} d’opinion « qui sonne juste »` : "Sans faute — rare quand l’intuition pousse à figer une vérité."}</p>
      </header>
      <section class="real-stats">
        <div class="stat-grid">
          <div class="stat-card"><p class="stat-card-value">${s.ok}</p><p class="stat-card-label">Bonnes</p></div>
          <div class="stat-card"><p class="stat-card-value">${s.miss}</p><p class="stat-card-label">Pièges</p></div>
          <div class="stat-card"><p class="stat-card-value">${s.pct}%</p><p class="stat-card-label">Réussite</p></div>
          <div class="stat-card"><p class="stat-card-value">${s.n}</p><p class="stat-card-label">Questions</p></div>
        </div>
      </section>`;
  }

  setReveal(
    "Pourquoi la méthode a plus de valeur",
    "Une étude peut être contredite — et c’est voulu. Une opinion figée ne se corrige pas. La science avance parce qu’elle expose sa méthode : d’autres peuvent vérifier, refaire, ou montrer l’erreur.",
    [
      "Question claire + idée qu’on peut mettre à l’épreuve",
      "Comparer (pas seulement « ça me paraît vrai »)",
      "Dire comment on a fait, pour que d’autres puissent refaire",
      "Accepter la contradiction : elle force à préciser",
      "Conclusion provisoire : meilleure à ce jour, ouverte à mieux",
    ],
  );

  if (el.revealExtra) {
    el.revealExtra.innerHTML = `
      <h3 class="reveal-sub">La force de l’apparente contradiction</h3>
      <p class="reveal-explain">
        Deux études qui ne disent pas la même chose ne « cassent » pas la science :
        elles obligent à demander <em>dans quelles conditions</em> chaque résultat tient.
        C’est plus solide qu’une vérité qui refuse d’être testée.
      </p>
      <h3 class="reveal-sub">Correction</h3>
      <div class="corr-review-list">${renderQuizReviewRows()}</div>`;
  }
}

function renderChoiceEnd() {
  const s = corrScore();
  if (el.fakeRead) {
    el.fakeRead.innerHTML = `
      <header class="end-hero">
        <p class="end-kicker">choix · score</p>
        <h1 class="end-title">${s.ok} / ${s.n}</h1>
        <p class="end-lead">${s.pct}% — majoritaire, proportionnel, tirage au sort, jugement majoritaire : chaque règle peut changer qui gagne.</p>
        <p class="end-humor">${s.miss ? `${s.miss} piège${s.miss > 1 ? "s" : ""} « la règle est neutre »` : "Sans faute — tu as bien vu que la méthode de choix n’est jamais anodine."}</p>
      </header>
      <section class="real-stats">
        <div class="stat-grid">
          <div class="stat-card"><p class="stat-card-value">${s.ok}</p><p class="stat-card-label">Bonnes</p></div>
          <div class="stat-card"><p class="stat-card-value">${s.miss}</p><p class="stat-card-label">Pièges</p></div>
          <div class="stat-card"><p class="stat-card-value">${s.pct}%</p><p class="stat-card-label">Réussite</p></div>
          <div class="stat-card"><p class="stat-card-value">${s.n}</p><p class="stat-card-label">Questions</p></div>
        </div>
      </section>`;
  }

  setReveal(
    "Choisir comment on décide, c’est déjà décider",
    "Il n’existe pas de mode de scrutin « neutre ». Majorité, proportionnelle, second tour, tirage au sort ou mentions : chaque outil favorise certaines issues et certains profils d’élu·e·s.",
    [
      "Majoritaire : vainqueur clair, parfois sans 50 %",
      "Proportionnel : sièges plus fidèles aux voix",
      "Tirage au sort : égalité de chance d’être choisi·e pour délibérer",
      "Jugement majoritaire : on note toutes les options",
      "Comparer les règles, c’est comparer des effets — pas seulement des « opinions »",
    ],
  );

  if (el.revealExtra) {
    el.revealExtra.innerHTML = `
      <h3 class="reveal-sub">Pourquoi ça compte</h3>
      <p class="reveal-explain">
        Avec les mêmes voix, A peut gagner au majoritaire à un tour et perdre si on change de règle.
        Le tirage au sort ne « remplace » pas toute élection : il sert surtout à tirer des citoyen·nes au hasard pour délibérer.
      </p>
      <h3 class="reveal-sub">Correction</h3>
      <div class="corr-review-list">${renderQuizReviewRows()}</div>`;
  }
}

function renderCorrEnd() {
  const s = corrScore();
  const factN = corrLog.filter((r) => r.kind === "fact").length;
  const spurN = corrLog.filter((r) => r.kind === "spurious" || r.kind === "meta").length;
  const factOk = corrLog.filter((r) => r.kind === "fact" && r.correct).length;
  const spurOk = corrLog.filter(
    (r) => (r.kind === "spurious" || r.kind === "meta") && r.correct,
  ).length;
  if (el.fakeRead) {
    el.fakeRead.innerHTML = `
      <header class="end-hero">
        <p class="end-kicker">quiz · score réel</p>
        <h1 class="end-title">${s.ok} / ${s.n}</h1>
        <p class="end-lead">${s.pct}% — deux pièges en un : chiffres plausibles sans source, et vraies corrélations avec fausse cause.</p>
        <p class="end-humor">Chiffres ${factOk}/${factN} · lectures de corrélations ${spurOk}/${spurN}</p>
      </header>
      <section class="real-stats">
        <div class="stat-grid">
          <div class="stat-card"><p class="stat-card-value">${s.ok}</p><p class="stat-card-label">Bonnes</p></div>
          <div class="stat-card"><p class="stat-card-value">${s.miss}</p><p class="stat-card-label">Pièges</p></div>
          <div class="stat-card"><p class="stat-card-value">${factOk}/${factN || "—"}</p><p class="stat-card-label">Chiffres</p></div>
          <div class="stat-card"><p class="stat-card-value">${spurOk}/${spurN || "—"}</p><p class="stat-card-label">Corrélations</p></div>
        </div>
      </section>`;
  }

  setReveal(
    "Deux courbes qui collent ne prouvent rien",
    "1) L’œil aime les courbes qui se ressemblent — même quand il n’y a aucun lien. 2) Un chiffre « qui sonne juste » sans source n’est pas une preuve non plus. Dans les deux cas, il faut demander : pourquoi, et d’où ça vient ?",
    [
      "Courbes réelles (margarine, Cage…) — mais cause inventée",
      "Deux axes différents peuvent faire croire à un lien",
      "Réflexe : autre explication ? ou simple hasard ?",
      "Chiffre : une seule option venait d’une source ; le reste sonnait juste",
    ],
  );

  if (el.revealExtra) {
    const rows = corrLog
      .map((row, i) => {
        const mark = row.correct ? "ok" : "ko";
        const yours = escapeHtml(row.label || `touche ${row.key}`);
        const good = escapeHtml(row.correctLabel);
        const tag =
          row.kind === "spurious"
            ? row.chart
              ? "courbes"
              : "corrélation"
            : row.kind === "meta"
              ? "règle"
              : "chiffre";
        return `
          <article class="corr-review ${mark}">
            <p class="corr-review-n">Q${i + 1} · ${tag}</p>
            <p class="corr-review-q">${escapeHtml(row.q)}</p>
            ${row.chart ? renderCorrChartSvg(row.chart) : ""}
            <p class="corr-review-ans"><span>Toi :</span> ${yours}</p>
            <p class="corr-review-ans"><span>Bonne lecture :</span> ${good}</p>
            ${row.explain ? `<p class="corr-review-explain">${escapeHtml(row.explain)}</p>` : ""}
            ${renderCorrSources(row.sources)}
          </article>`;
      })
      .join("");

    el.revealExtra.innerHTML = `
      <h3 class="reveal-sub">Le raisonnement simple</h3>
      <ol class="corr-reasoning">
        <li><strong>Ne pas croire l’histoire trop vite</strong> — deux courbes qui se suivent ne disent pas « A cause B ».</li>
        <li><strong>Chercher autre chose</strong> — l’été, la richesse, l’âge… peuvent expliquer les deux.</li>
        <li><strong>Vérifier le chiffre</strong> — d’où vient-il ? (Oxfam, Insee…).</li>
        <li><strong>Demander comment</strong> — s’il n’y a pas d’explication claire, c’est peut‑être du hasard.</li>
      </ol>
      <h3 class="reveal-sub">Correction + citations</h3>
      <div class="corr-review-list">${rows}</div>`;
  }
}

/* ——— Barnum end (DOM inject) ——— */

function renderBarnumEnd() {
  const real = computeRealStats(answers, answerOrder, barnumSession, quizStartedAt, quizEndedAt);
  const reading = buildBarnumReading(answers);

  if (el.fakeRead) {
    el.fakeRead.innerHTML = `
      <header class="end-hero">
        <p class="end-kicker">profil personnalisé</p>
        <h1 class="end-title">${escapeHtml(reading.title)}</h1>
        <p class="end-lead">${escapeHtml(reading.lead)}</p>
        <p class="end-humor">${escapeHtml(barnumSession?.title || "")}</p>
      </header>
      <section class="barnum-reading"><p class="barnum-body">${escapeHtml(reading.body)}</p></section>
      <section class="real-stats">
        <p class="end-kicker">données de session</p>
        <h2 class="real-stats-title">Tes chiffres</h2>
        <p class="real-stats-lead">${real.n} réponse${real.n > 1 ? "s" : ""} sur ${real.offered} · ${formatDuration(real.sec)}</p>
        <div class="stat-grid">
          <div class="stat-card"><p class="stat-card-value">${real.offered}</p><p class="stat-card-label">Questions posées</p></div>
          <div class="stat-card"><p class="stat-card-value">${real.n}</p><p class="stat-card-label">Réponses</p></div>
          <div class="stat-card"><p class="stat-card-value">${real.completion}%</p><p class="stat-card-label">Complétion</p></div>
          <div class="stat-card"><p class="stat-card-value">${formatDuration(real.sec)}</p><p class="stat-card-label">Durée</p></div>
          <div class="stat-card"><p class="stat-card-value">${real.perQ ? real.perQ + " s" : "—"}</p><p class="stat-card-label">Temps / question</p></div>
          <div class="stat-card"><p class="stat-card-value">${real.dominant === "—" ? "—" : "touche " + real.dominant}</p><p class="stat-card-label">Choix dominant</p></div>
        </div>
        <div class="choice-bars">
          ${[1, 2, 3]
            .map((k) => {
              const pct = real[`pct${k}`];
              const n = real.counts[String(k)];
              return `<div class="choice-bar-row"><span class="choice-bar-key">${k}</span><div class="choice-bar-track"><div class="choice-bar-fill" style="width:${pct}%"></div></div><span class="choice-bar-pct">${pct}% <em>(${n})</em></span></div>`;
            })
            .join("")}
        </div>
        <ul class="stat-list">
          <li>Séquence : ${escapeHtml(real.sequence)}</li>
          <li>Première : ${real.first} · dernière : ${real.last}</li>
          <li>Changements : ${real.switches} · stabilité : ${real.stability}%</li>
          <li>Plus longue série : ${real.longestStreak}× touche ${real.streakKey}</li>
          <li>Moyenne (1–3) : ${real.avg || "—"}</li>
          ${real.packLabels.length ? `<li>Thèmes : ${escapeHtml(real.packLabels.join(", "))}</li>` : ""}
        </ul>
      </section>
      <section class="axes">
        ${reading.metrics
          .map(
            (m) => `
          <article class="axis">
            <div class="axis-top"><h2>${escapeHtml(m.title)}</h2><span>${m.pct}%</span></div>
            <p class="axis-desc">${escapeHtml(m.desc)}</p>
            <div class="axis-track"><div class="axis-fill" style="width:${m.pct}%"></div></div>
          </article>`,
          )
          .join("")}
      </section>`;
  }

  setReveal(
    "Tu viens de subir l’effet Barnum",
    "Ce texte avait l’air écrit pour toi. Il marche sur presque n’importe qui. Astrologie, voyance, tests douteux : même mécanisme.",
    [
      "Déclarations doubles (A et non-A) : impossible d’être « faux »",
      "Tout est positif : le cerveau accepte plus facilement",
      "Désirs universels présentés comme diagnostics",
      "Chiffres précis → illusion de science (sauf « Tes chiffres »)",
      "Le sens des réponses est ignoré : seules les touches 1/2/3 nourrissent un hash",
    ],
  );

  const keys = answerOrder.length ? answerOrder : Object.values(answers);
  const randMap = {};
  for (const q of barnumSession?.questions || []) {
    randMap[q.id] = String(1 + Math.floor(Math.random() * 3));
  }
  const yours = reading;
  const rand = buildBarnumReading(randMap);
  const randKeys = (barnumSession?.questions || []).map((q) => randMap[q.id]);

  if (el.revealExtra) {
    el.revealExtra.innerHTML = `
      <h3 class="reveal-sub">Les questions ne comptaient pas</h3>
      <p class="reveal-explain">
        Le profil ne lit jamais le sens de tes choix. Il ne voit que <code>1</code>, <code>2</code>, <code>3</code>,
        hash → tirage dans de petites listes + % inventés. Seul <em>Tes chiffres</em> était honnête.
      </p>
      <div class="fake-algo">
        <div class="fake-algo-step"><span class="fake-algo-n">1</span><p class="fake-algo-title">Tes réponses</p><p class="fake-algo-code">${escapeHtml(keys.join(" · ") || "—")}</p><p class="fake-algo-note">libellé jeté</p></div>
        <div class="fake-algo-arrow">→</div>
        <div class="fake-algo-step"><span class="fake-algo-n">2</span><p class="fake-algo-title">Hash bidon</p><p class="fake-algo-code">seed = ${yours.seed}</p><p class="fake-algo-note">aucun sens</p></div>
        <div class="fake-algo-arrow">→</div>
        <div class="fake-algo-step"><span class="fake-algo-n">3</span><p class="fake-algo-title">Tirage + %</p><p class="fake-algo-code">phrase[seed % 4]<br/>% = 61 + (seed % 29)</p><p class="fake-algo-note">listes génériques</p></div>
        <div class="fake-algo-arrow">→</div>
        <div class="fake-algo-step fake-algo-out"><span class="fake-algo-n">4</span><p class="fake-algo-title">« Portrait perso »</p><p class="fake-algo-note">impression de science</p></div>
      </div>
      <div class="algo-demo">
        <p class="algo-demo-lead">Même machine, autres touches : le texte reste aussi vague et flatteur.</p>
        <div class="algo-compare">
          <article class="algo-card">
            <p class="algo-card-kicker">avec tes réponses</p>
            <p class="algo-card-keys">${escapeHtml(keys.join(" · "))}</p>
            <p class="algo-card-title">${escapeHtml(yours.title)}</p>
            <p class="algo-card-body">${escapeHtml(yours.body)}</p>
          </article>
          <article class="algo-card algo-card-alt" id="barnumRandCard">
            <p class="algo-card-kicker">avec des réponses au hasard</p>
            <p class="algo-card-keys">${escapeHtml(randKeys.join(" · "))}</p>
            <p class="algo-card-title">${escapeHtml(rand.title)}</p>
            <p class="algo-card-body">${escapeHtml(rand.body)}</p>
          </article>
        </div>
        <button type="button" class="algo-reroll" data-action="reroll-barnum">Relancer le hasard</button>
      </div>
      <h3 class="reveal-sub">Autres biais</h3>
      <ul class="reveal-biases">
        <li><strong>Confirmation</strong> — tu retiens ce qui colle</li>
        <li><strong>Corrélation illusoire</strong> — deux coïncidences deviennent une preuve</li>
        <li><strong>Rétrospectif</strong> — « je le savais »</li>
      </ul>`;
  }
}

function rerollBarnumDemo() {
  const card = document.getElementById("barnumRandCard");
  if (!card || !barnumSession) return;
  const randMap = {};
  for (const q of barnumSession.questions) {
    randMap[q.id] = String(1 + Math.floor(Math.random() * 3));
  }
  const rand = buildBarnumReading(randMap);
  const randKeys = barnumSession.questions.map((q) => randMap[q.id]);
  card.innerHTML = `
    <p class="algo-card-kicker">avec des réponses au hasard</p>
    <p class="algo-card-keys">${escapeHtml(randKeys.join(" · "))}</p>
    <p class="algo-card-title">${escapeHtml(rand.title)}</p>
    <p class="algo-card-body">${escapeHtml(rand.body)}</p>`;
}


/* ——— Barnum play ——— */

function renderBarnumChoices(question) {
  if (!el.choices) return;
  el.choices.innerHTML = "";
  for (const c of question.choices) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "key";
    btn.dataset.key = c.k;
    btn.setAttribute("aria-label", `${c.k} : ${c.label}`);
    btn.innerHTML = `<span class="key-glyph">${c.k}</span><span class="key-label">${escapeHtml(c.label)}</span>`;
    el.choices.appendChild(btn);
  }
}

function showBarnumQuestion() {
  if (!barnumSession) return;
  if (stepIndex >= barnumSession.questions.length) {
    showEnd();
    return;
  }
  mode = "play";
  hidePlays();
  if (el.hint) el.hint.hidden = true;
  if (el.startRow) el.startRow.hidden = true;
  if (el.playBarnum) el.playBarnum.hidden = false;
  const q = barnumSession.questions[stepIndex];
  if (el.progress) el.progress.textContent = `${stepIndex + 1} / ${barnumSession.questions.length}`;
  if (el.question) el.question.textContent = q.q;
  renderBarnumChoices(q);
  rotateBrandSub();
}

function answerBarnum(key) {
  if (mode !== "play" || effect() !== "barnum" || !barnumSession) return;
  const q = barnumSession.questions[stepIndex];
  if (!q?.choices.some((c) => c.k === key)) return;
  answers[q.id] = key;
  answerOrder.push(key);
  stepIndex += 1;
  if (stepIndex >= barnumSession.questions.length) showEnd();
  else showBarnumQuestion();
}

/* ——— flow ——— */

function refreshActiveContent() {
  if (effect() === "barnum") {
    barnumSession = buildBarnumSession();
  } else if (effect() === "confirmation") {
    confirmDeck = buildConfirmDeck();
  } else if (isDeckQuiz()) {
    corrDeck = buildCorrDeck();
  }
  applyHomeCopy();
  clickbaitPool = activeExp?.clickbait?.length
    ? activeExp.clickbait
    : ["Une expérience On te lit", "Deux minutes. Zéro spoil.", "Commence quand tu veux"];
  subIndex = Math.floor(Math.random() * clickbaitPool.length);
  renderBrandSub();
}

function setFinishVisible(on) {
  if (el.finishRow) el.finishRow.hidden = !on;
}

function showIdle() {
  mode = "idle";
  stepIndex = 0;
  answers = {};
  answerOrder = [];
  confirmMarks = {};
  corrLog = [];
  if (typeof PoliticsLab !== "undefined") PoliticsLab.resetState();
  quizStartedAt = 0;
  quizEndedAt = 0;
  hidePlays();
  if (el.hint) el.hint.hidden = false;
  if (el.startRow) el.startRow.hidden = false;
  setFinishVisible(false);
  applyHomeCopy();
  if (el.stats) el.stats.textContent = "";
}

function startPlay() {
  // Si on revient du bilan sans reset de mode, on ré-arme.
  if (mode === "end" && el.endView?.hidden) mode = "idle";
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();

  quizStartedAt = Date.now();
  stepIndex = 0;
  answers = {};
  answerOrder = [];
  confirmMarks = {};
  corrLog = [];
  setFinishVisible(true);

  if (effect() === "barnum") {
    if (!barnumSession) barnumSession = buildBarnumSession();
    if (!barnumSession?.questions?.length) {
      mode = "idle";
      setFinishVisible(false);
      return;
    }
    showBarnumQuestion();
  } else if (effect() === "confirmation") {
    if (!confirmDeck.length) confirmDeck = buildConfirmDeck();
    if (!confirmDeck.length) {
      mode = "idle";
      setFinishVisible(false);
      return;
    }
    showConfirmStep();
  } else if (isDeckQuiz()) {
    corrDeck = buildCorrDeck();
    if (!corrDeck.length) {
      mode = "idle";
      setFinishVisible(false);
      return;
    }
    showCorrQuestion();
  } else if (isPolitics()) {
    PoliticsLab.start(politicsHelpers());
  } else {
    mode = "idle";
    setFinishVisible(false);
  }
}

function showEnd() {
  mode = "end";
  quizEndedAt = Date.now();
  if (!quizStartedAt) quizStartedAt = quizEndedAt;
  el.labView.hidden = true;
  el.endView.hidden = false;

  if (activeExp) saveJsonSeen(SEEN_EXP_KEY, [activeExp.id], 12);
  if (effect() === "barnum" && barnumSession) {
    saveJsonSeen(
      SEEN_Q_KEY,
      barnumSession.questions.map((q) => q.id),
    );
    renderBarnumEnd();
  } else if (effect() === "confirmation") {
    renderConfirmEnd();
  } else if (effect() === "correlation") {
    renderCorrEnd();
  } else if (effect() === "science") {
    renderScienceEnd();
  } else if (effect() === "choice") {
    renderChoiceEnd();
  } else if (isPolitics()) {
    PoliticsLab.renderEnd(politicsHelpers());
  }

  const runs = appendRunKeepFirst(effect(), buildCurrentSnapshot());
  renderProofPanel(runs);

  prepareBridgeCopy();
  wireShareLinks();
  prepareNewsForm();
  window.scrollTo(0, 0);
  enableEndScrollCoach();
  requestAnimationFrame(updateScrollRail);
}

function showLab() {
  disableEndScrollCoach();
  el.endView.hidden = true;
  el.labView.hidden = false;
  // Nouvelle variante à chaque retour (sauf ?e= fixé)
  if (!new URLSearchParams(location.search).get("e") && !new URLSearchParams(location.search).get("exp")) {
    activeExp = pickExperience();
  }
  refreshActiveContent();
  showIdle();
  window.scrollTo(0, 0);
}

function resetAll() {
  localStorage.removeItem(SESSION_KEY);
  showLab();
}

function handleKey(raw) {
  // Guérir un mode « end » orphelin si le lab est réaffiché.
  if (mode === "end" && el.endView?.hidden && !el.labView?.hidden) mode = "idle";
  if (mode === "end") return;
  const k = raw === " " || raw === "space" ? "space" : String(raw).toLowerCase();
  if (k === "r") {
    resetAll();
    return;
  }
  if (k === "space" || k === "enter") {
    if (mode === "idle") startPlay();
    return;
  }
  if (mode !== "play" || !/^[1-3]$/.test(k)) return;
  if (effect() === "barnum") answerBarnum(k);
  else if (effect() === "confirmation") answerConfirm(k);
  else if (isDeckQuiz()) answerCorr(k);
  else if (isPolitics()) PoliticsLab.answer(k, politicsHelpers());
}

async function submitNewsletter(e) {
  e.preventDefault();
  el.newsError.hidden = true;
  el.newsOk.hidden = true;
  const email = String(el.newsEmail.value || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    el.newsError.hidden = false;
    el.newsError.textContent = "Email invalide.";
    return;
  }
  if (!el.newsConsent.checked) {
    el.newsError.hidden = false;
    el.newsError.textContent = "Coche la case pour confirmer.";
    return;
  }
  const btn = el.newsForm?.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;
  try {
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        consent: true,
        lastTestId: newsletterTestId(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || "inscription impossible");
    localStorage.setItem(NEWS_KEY, JSON.stringify({ email, at: Date.now() }));
    el.newsOk.hidden = false;
  } catch (err) {
    el.newsError.hidden = false;
    el.newsError.textContent =
      err instanceof Error ? err.message : "réseau / serveur indisponible";
  } finally {
    if (btn) btn.disabled = false;
  }
}

document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target instanceof HTMLElement ? e.target : null;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
  if (corrChartFsOpen()) {
    if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      closeCorrChartFullscreen();
    }
    return;
  }
  if (
    t?.closest?.("[data-action='zoom-corr-chart']") &&
    (e.key === "Enter" || e.key === " ")
  ) {
    e.preventDefault();
    openCorrChartFullscreen(t.closest("[data-action='zoom-corr-chart']"));
    return;
  }
  if (mode === "end" && el.endView?.hidden && !el.labView?.hidden) mode = "idle";
  if (mode === "end") return;
  const isSpace = e.code === "Space" || e.key === " ";
  const isEnter = e.key === "Enter";
  const single = e.key.length === 1 ? e.key.toLowerCase() : "";
  if (isSpace || isEnter || /^[1-3r]$/.test(single)) {
    e.preventDefault();
    // Empêche un 2e déclenchement (activation native du bouton focusé).
    e.stopPropagation();
    handleKey(isSpace ? "space" : isEnter ? "enter" : single);
  }
});

document.addEventListener(
  "keyup",
  (e) => {
    if (mode === "end") return;
    const isSpace = e.code === "Space" || e.key === " ";
    const isEnter = e.key === "Enter";
    if (!isSpace && !isEnter) return;
    const t = e.target instanceof HTMLElement ? e.target : null;
    if (t && (t.tagName === "BUTTON" || t.getAttribute("role") === "button")) {
      e.preventDefault();
    }
  },
  true,
);

document.addEventListener("click", (e) => {
  if (corrChartFsOpen()) {
    const target = e.target instanceof Element ? e.target : null;
    if (
      target?.closest?.("[data-action='close-corr-chart']") ||
      target === el.corrChartFs
    ) {
      e.preventDefault();
      closeCorrChartFullscreen();
    }
    return;
  }

  const actionBtn = e.target instanceof Element ? e.target.closest("[data-action]") : null;
  if (actionBtn) {
    const action = actionBtn.getAttribute("data-action");
    if (action === "zoom-corr-chart") {
      e.preventDefault();
      openCorrChartFullscreen(actionBtn);
      return;
    }
    if (action === "finish") showEnd();
    if (action === "back") showLab();
    if (action === "replay-compare") replaySameCompare();
    if (action === "reroll-barnum") rerollBarnumDemo();
    if (action === "scroll-next") scrollNextChapter();
    if (action === "scroll-reveal") scrollToChapter("surprise");
    return;
  }

  const shareBtn = e.target instanceof Element ? e.target.closest("[data-share]") : null;
  if (shareBtn && mode === "end") {
    const kind = shareBtn.getAttribute("data-share");
    if (kind === "native" || kind === "copy" || kind === "instagram" || kind === "messenger") {
      e.preventDefault();
      doShare(kind);
    }
    return;
  }

  if (mode === "end") return;
  const btn = e.target instanceof Element ? e.target.closest("[data-key]") : null;
  if (!btn) return;
  const key = btn.getAttribute("data-key");
  if (key == null) return;
  e.preventDefault();
  handleKey(key);
});

if (el.newsForm) el.newsForm.addEventListener("submit", submitNewsletter);
if (el.resetBtn)
  el.resetBtn.addEventListener("click", (e) => {
    e.preventDefault();
    resetAll();
  });

async function boot() {
  if (el.brandLogo) el.brandLogo.textContent = BRAND;
  if (el.newsBrand) el.newsBrand.textContent = BRAND;

  try {
    const [expRes, testRes] = await Promise.all([
      fetch("./experiences.json", { cache: "no-store" }),
      fetch("./tests.json", { cache: "no-store" }),
    ]);
    const expData = await expRes.json();
    const testData = await testRes.json();
    expCatalog = Array.isArray(expData.experiences) ? expData.experiences : [];
    rotation = Array.isArray(expData.rotation) ? expData.rotation : rotation;
    sessionSize = Number(testData.sessionSize) > 0 ? Number(testData.sessionSize) : 10;
    titlePool = Array.isArray(testData.titles) ? testData.titles : [];
    blurbPool = Array.isArray(testData.blurbs) ? testData.blurbs : [];
    packs = Array.isArray(testData.packs) ? testData.packs : [];
  } catch {
    expCatalog = [];
  }

  activeExp = pickExperience();
  document.title = `${BRAND} — ${activeExp?.homeTitle || "expérience"}`;
  refreshActiveContent();
  startSubRotator();
  showIdle();
}

boot();
