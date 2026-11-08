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
/** @typedef {{ id: string, effect: string, homeTitle: string, homeBlurb: string, clickbait?: string[], predictions?: Prediction[], drinks?: Choice[], signs?: string[], moodBits?: string[], linkTemplates?: string[] }} ExpDef */

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
  progress: document.getElementById("progress"),
  question: document.getElementById("question"),
  choices: document.getElementById("choices"),
  confirmProgress: document.getElementById("confirmProgress"),
  confirmText: document.getElementById("confirmText"),
  corrProgress: document.getElementById("corrProgress"),
  corrDay: document.getElementById("corrDay"),
  corrPrompt: document.getElementById("corrPrompt"),
  corrDrinkChoices: document.getElementById("corrDrinkChoices"),
  corrPair: document.getElementById("corrPair"),
  corrDrink: document.getElementById("corrDrink"),
  corrSign: document.getElementById("corrSign"),
  corrStory: document.getElementById("corrStory"),
  corrRateChoices: document.getElementById("corrRateChoices"),
  startRow: document.getElementById("startRow"),
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

/** Correlation */
const CORR_DAYS = 5;
/** @type {{ drink: string, drinkLabel: string, sign: string, story: string, rate: string }[]} */
let corrLog = [];
/** @type {'pick'|'rate'} */
let corrPhase = "pick";
let corrPending = /** @type {{ drink: string, drinkLabel: string, sign: string, story: string } | null} */ (null);

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
  } else {
    setIntroSteps([
      { k: "espace", t: "lancer Café & Cosmic" },
      { k: "1 · 2 · 3", t: "boisson, puis avis" },
      { k: "terminer", t: "voir la corrélation" },
    ]);
    if (el.meta) el.meta.textContent = `${CORR_DAYS} jours simulés · ~2 min`;
    if (el.finishLabel) el.finishLabel.textContent = "voir la corrélation";
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
  const s = corrBiasedScore();
  return {
    effect: "correlation",
    pairs: corrLog.map((r) => ({
      drink: r.drinkLabel,
      sign: r.sign,
      rate: r.rate,
    })),
    biased: s.biased,
    honestConv: s.honestConv,
    conv: s.conv,
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
        : "Boissons différentes, signes toujours tirés à part — les histoires restent aussi « évidentes ».";

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
  const pairs = (run.pairs || [])
    .map((p) => `${p.drink} × ${p.sign}`)
    .join(" · ");
  return `
    <p class="algo-card-title">Score ${run.biased}% · convaincant ${run.conv}/${(run.pairs || []).length}</p>
    <p class="algo-card-body">${escapeHtml(pairs)}</p>`;
}

function proofOneLiner(eff, run) {
  if (eff === "barnum") return `${(run.keys || []).join("")} → « ${run.title || "profil"} »`;
  if (eff === "confirmation") return `affiché ${run.biased}% / honnête ${run.honest}%`;
  return `corrélation ${run.biased}% · ${(run.pairs || []).map((p) => p.drink).join(", ")}`;
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
  return `<ul class="proof-diff">
    <li>Boissons 1er : ${(a.pairs || []).map((p) => p.drink).join(", ") || "—"}</li>
    <li>Boissons dernier : ${(b.pairs || []).map((p) => p.drink).join(", ") || "—"}</li>
    <li>Signes : toujours re-tirés indépendamment — aucune causalité café → ciel.</li>
    <li>Scores marketing : ${a.biased}% → ${b.biased}%</li>
  </ul>`;
}

function replaySameCompare() {
  disableEndScrollCoach();
  el.endView.hidden = true;
  el.labView.hidden = false;
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
    el.bridgeTitle.textContent = "La corrélation a l’air propre…";
    el.bridgeCopy.textContent =
      "Encore un cran : on défait le lien café × ciel.";
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
        <p class="end-lead">Sur les prédictions que tu as retenues, le babillard cartonne.</p>
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
    "On a mis en lumière ce qui collait, et on a presque oublié le reste. C’est exactement ce que font horoscopes, « preuves » anecdotiques et souvenirs sélectifs.",
    [
      "Les réussites sont affichées en grand ; les échecs sont relégués",
      "Le % « précision » excluait les « non » du dénominateur",
      "Des phrases vagues comptent presque comme des réussites",
      "Plus une prédiction est large, plus tu peux la cocher « ça colle »",
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

/* ——— Corrélation ——— */

function renderCorrDrinks() {
  if (!el.corrDrinkChoices) return;
  const drinks = activeExp?.drinks || [];
  el.corrDrinkChoices.innerHTML = "";
  for (const d of drinks) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "key";
    btn.dataset.key = d.k;
    btn.setAttribute("aria-label", `${d.k} : ${d.label}`);
    btn.innerHTML = `<span class="key-glyph">${d.k}</span><span class="key-label">${escapeHtml(d.label)}</span>`;
    el.corrDrinkChoices.appendChild(btn);
  }
}

function inventCorrStory(drinkLabel, sign) {
  const moods = activeExp?.moodBits || ["une drôle d’énergie"];
  const templates = activeExp?.linkTemplates || ["{sign} explique {drink}."];
  const mood = pick(moods);
  const tpl = pick(templates);
  return tpl.replace(/\{drink\}/g, drinkLabel).replace(/\{sign\}/g, sign).replace(/\{mood\}/g, mood);
}

function showCorrDay() {
  if (stepIndex >= CORR_DAYS) {
    showEnd();
    return;
  }
  mode = "play";
  corrPhase = "pick";
  corrPending = null;
  hidePlays();
  if (el.hint) el.hint.hidden = true;
  if (el.startRow) el.startRow.hidden = true;
  if (el.playCorr) el.playCorr.hidden = false;
  if (el.corrProgress) el.corrProgress.textContent = `Jour ${stepIndex + 1} / ${CORR_DAYS}`;
  if (el.corrDay) el.corrDay.textContent = `Jour ${stepIndex + 1}`;
  if (el.corrPrompt) {
    el.corrPrompt.hidden = false;
    el.corrPrompt.textContent = "Ta boisson du matin ?";
  }
  if (el.corrDrinkChoices) el.corrDrinkChoices.hidden = false;
  if (el.corrPair) el.corrPair.hidden = true;
  if (el.corrStory) el.corrStory.hidden = true;
  if (el.corrRateChoices) el.corrRateChoices.hidden = true;
  renderCorrDrinks();
}

function pickCorrDrink(key) {
  if (corrPhase !== "pick") return;
  const drinks = activeExp?.drinks || [];
  const drink = drinks.find((d) => d.k === key);
  if (!drink) return;
  const signs = activeExp?.signs || ["Signe mystérieux"];
  // Indépendant du choix boisson — c’est le cœur de la démo.
  const sign = pick(shuffle(signs));
  const story = inventCorrStory(drink.label, sign);
  corrPending = { drink: key, drinkLabel: drink.label, sign, story };
  corrPhase = "rate";
  if (el.corrPrompt) el.corrPrompt.hidden = true;
  if (el.corrDrinkChoices) el.corrDrinkChoices.hidden = true;
  if (el.corrPair) el.corrPair.hidden = false;
  if (el.corrDrink) el.corrDrink.textContent = drink.label;
  if (el.corrSign) el.corrSign.textContent = sign;
  if (el.corrStory) {
    el.corrStory.hidden = false;
    el.corrStory.textContent = story;
  }
  if (el.corrRateChoices) el.corrRateChoices.hidden = false;
}

function rateCorr(key) {
  if (corrPhase !== "rate" || !corrPending) return;
  if (!/^[1-3]$/.test(key)) return;
  corrLog.push({ ...corrPending, rate: key });
  answerOrder.push(key);
  corrPending = null;
  stepIndex += 1;
  if (stepIndex >= CORR_DAYS) showEnd();
  else showCorrDay();
}

function answerCorr(key) {
  if (mode !== "play" || effect() !== "correlation") return;
  if (corrPhase === "pick") pickCorrDrink(key);
  else rateCorr(key);
}

function corrBiasedScore() {
  const n = corrLog.length || 1;
  const conv = corrLog.filter((x) => x.rate === "1").length;
  const mid = corrLog.filter((x) => x.rate === "2").length;
  // Score marketing : convaincant compte double, moyen compte 1, rejet 0 — normalisé haut.
  const raw = (conv * 2 + mid) / (n * 2);
  const biased = Math.round((0.55 + raw * 0.4) * 100); // plancher ~55%
  const honestConv = Math.round((conv / n) * 100);
  return { conv, mid, rej: n - conv - mid, biased, honestConv, n };
}

function renderCorrMatrix(log) {
  return log
    .map(
      (row, i) => `
      <div class="corr-row">
        <span class="corr-row-n">J${i + 1}</span>
        <span>${escapeHtml(row.drinkLabel)}</span>
        <span class="corr-row-x">×</span>
        <span>${escapeHtml(row.sign)}</span>
      </div>`,
    )
    .join("");
}

function reshuffleCorrStories() {
  const signs = shuffle([...(activeExp?.signs || [])]);
  return corrLog.map((row, i) => {
    const sign = signs[i % signs.length] || row.sign;
    return {
      ...row,
      sign,
      story: inventCorrStory(row.drinkLabel, sign),
    };
  });
}

function renderCorrEnd() {
  const s = corrBiasedScore();
  if (el.fakeRead) {
    el.fakeRead.innerHTML = `
      <header class="end-hero">
        <p class="end-kicker">Café & Cosmic · rapport</p>
        <h1 class="end-title">Corrélation ${s.biased}%</h1>
        <p class="end-lead">Tes boissons et le ciel ne se croisent pas par hasard — enfin, c’est ce qu’on te vend.</p>
        <p class="end-humor">${s.conv} jour${s.conv > 1 ? "s" : ""} jugé${s.conv > 1 ? "s" : ""} « convaincant${s.conv > 1 ? "s" : ""} ».</p>
      </header>
      <section class="corr-report">
        <p class="end-kicker">paires observées</p>
        <div class="corr-matrix">${renderCorrMatrix(corrLog)}</div>
      </section>
      <section class="real-stats">
        <div class="stat-grid">
          <div class="stat-card"><p class="stat-card-value">${s.biased}%</p><p class="stat-card-label">Score « synchronicité »</p></div>
          <div class="stat-card"><p class="stat-card-value">${s.conv}</p><p class="stat-card-label">Convaincant</p></div>
          <div class="stat-card"><p class="stat-card-value">${s.mid}</p><p class="stat-card-label">Moyen</p></div>
          <div class="stat-card"><p class="stat-card-value">${s.rej}</p><p class="stat-card-label">N’importe quoi</p></div>
        </div>
      </section>`;
  }

  setReveal(
    "Tu viens de subir l’illusion de corrélation",
    "Deux colonnes indépendantes (ta boisson, un signe tiré au sort) ont été collées ensemble, puis habillées d’une histoire. Le cerveau adore les causes.",
    [
      "Le signe du ciel était tiré au sort sans regarder ta boisson",
      "Une phrase de liaison crée l’impression de cause → effet",
      "Le % « corrélation » était du marketing, pas de la statistique",
      "Re-mélanger les paires produit des histoires tout aussi « évidentes »",
    ],
  );

  const reshuffled = reshuffleCorrStories();
  if (el.revealExtra) {
    el.revealExtra.innerHTML = `
      <h3 class="reveal-sub">Preuve visuelle : même boissons, autres signes</h3>
      <p class="reveal-explain">
        On garde tes choix de boisson. On re-tire les signes au hasard.
        Les nouvelles histoires sonnent aussi juste — donc le lien n’existait pas.
        (Taux « convaincant » réel : ${s.honestConv}% des jours.)
      </p>
      <div class="algo-compare">
        <article class="algo-card">
          <p class="algo-card-kicker">paires qu’on t’a vendues</p>
          <div class="corr-matrix corr-matrix-dark">${renderCorrMatrix(corrLog)}</div>
        </article>
        <article class="algo-card algo-card-alt">
          <p class="algo-card-kicker">re-mélange au hasard</p>
          <div class="corr-matrix corr-matrix-dark" id="corrReshuffleMatrix">${renderCorrMatrix(reshuffled)}</div>
        </article>
      </div>
      <button type="button" class="algo-reroll" data-action="reroll-corr">Re-mélanger encore</button>
      <p class="reveal-explain" style="margin-top:14px">
        En vrai : planète ⊥ café. Comme lune ⊥ accidents, ou « numéro porte-bonheur » ⊥ résultats du loto —
        sauf quand on raconte une histoire par-dessus.
      </p>`;
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

function rerollCorrDemo() {
  const host = document.getElementById("corrReshuffleMatrix");
  if (!host) return;
  host.innerHTML = renderCorrMatrix(reshuffleCorrStories());
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
  }
  applyHomeCopy();
  clickbaitPool = activeExp?.clickbait?.length
    ? activeExp.clickbait
    : ["Une expérience On te lit", "Deux minutes. Zéro spoil.", "Commence quand tu veux"];
  subIndex = Math.floor(Math.random() * clickbaitPool.length);
  renderBrandSub();
}

function showIdle() {
  mode = "idle";
  stepIndex = 0;
  answers = {};
  answerOrder = [];
  confirmMarks = {};
  corrLog = [];
  corrPhase = "pick";
  corrPending = null;
  quizStartedAt = 0;
  quizEndedAt = 0;
  hidePlays();
  if (el.hint) el.hint.hidden = false;
  if (el.startRow) el.startRow.hidden = false;
  applyHomeCopy();
  if (el.stats) el.stats.textContent = "";
}

function startPlay() {
  quizStartedAt = Date.now();
  stepIndex = 0;
  answers = {};
  answerOrder = [];
  confirmMarks = {};
  corrLog = [];
  if (effect() === "barnum") {
    if (!barnumSession) barnumSession = buildBarnumSession();
    showBarnumQuestion();
  } else if (effect() === "confirmation") {
    if (!confirmDeck.length) confirmDeck = buildConfirmDeck();
    showConfirmStep();
  } else {
    showCorrDay();
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
  } else {
    renderCorrEnd();
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
  else answerCorr(k);
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
  if (mode === "end") return;
  const isSpace = e.code === "Space" || e.key === " ";
  const isEnter = e.key === "Enter";
  const single = e.key.length === 1 ? e.key.toLowerCase() : "";
  if (isSpace || isEnter || /^[1-3r]$/.test(single)) {
    e.preventDefault();
    handleKey(isSpace ? "space" : isEnter ? "enter" : single);
  }
});

document.addEventListener("click", (e) => {
  const actionBtn = e.target instanceof Element ? e.target.closest("[data-action]") : null;
  if (actionBtn) {
    const action = actionBtn.getAttribute("data-action");
    if (action === "finish") showEnd();
    if (action === "back") showLab();
    if (action === "replay-compare") replaySameCompare();
    if (action === "reroll-barnum") rerollBarnumDemo();
    if (action === "reroll-corr") rerollCorrDemo();
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
