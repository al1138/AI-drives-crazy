/**
 * On te lit — faux test de personnalité (effet Barnum au bilan, secret jusqu’à la fin).
 */

const BRAND = "On te lit";

/** Accroches type test perso — sans spoiler (pas de « piège », « faux », etc.). */
const CLICKBAIT_SUBS = [
  "10 minutes pour mieux te comprendre",
  "Le test de personnalité du moment",
  "Ce que tes habitudes disent de toi",
  "Ton profil en 10 questions",
  "Découvre ton type en moins de 3 minutes",
  "Les réponses révèlent ton style de vie",
  "Un portrait fidèle, basé sur tes choix",
  "Es-tu plutôt instinct ou méthode ?",
  "Ton mode de fonctionnement, décrypté",
  "Qui es-tu quand personne ne regarde ?",
  "Un bilan perso clair et sans blabla",
  "Commence le test — résultats immédiats",
];

const SUB_ROTATE_MS = 5000;
const NEWS_KEY = "ontelit.newsletter.v1";
const SESSION_KEY = "ontelit.session.v1";
const SEEN_KEY = "ontelit.seen.v1";

/** @typedef {{ k: string, label: string }} Choice */
/** @typedef {{ id: string, q: string, choices: Choice[], packId?: string, packLabel?: string }} Question */
/** @typedef {{ id: string, label: string, questions: Question[] }} Pack */
/** @typedef {{ id: string, effect: string, title: string, blurb: string, questions: Question[], packIds: string[] }} TestDef */

const el = {
  labView: document.getElementById("labView"),
  endView: document.getElementById("endView"),
  hint: document.getElementById("hint"),
  testTitle: document.getElementById("testTitle"),
  testBlurb: document.getElementById("testBlurb"),
  progress: document.getElementById("progress"),
  question: document.getElementById("question"),
  choices: document.getElementById("choices"),
  startRow: document.getElementById("startRow"),
  brandLogo: document.getElementById("brandLogo"),
  brandSub: document.getElementById("brandSub"),
  meta: document.getElementById("meta"),
  stats: document.getElementById("stats"),
  resetBtn: document.getElementById("resetBtn"),
  endTitle: document.getElementById("endTitle"),
  endLead: document.getElementById("endLead"),
  endHumor: document.getElementById("endHumor"),
  barnumBody: document.getElementById("barnumBody"),
  barnumLevers: document.getElementById("barnumLevers"),
  realStatsLead: document.getElementById("realStatsLead"),
  statGrid: document.getElementById("statGrid"),
  choiceBars: document.getElementById("choiceBars"),
  statList: document.getElementById("statList"),
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
  newsForm: document.getElementById("newsForm"),
  newsEmail: document.getElementById("newsEmail"),
  newsConsent: document.getElementById("newsConsent"),
  newsError: document.getElementById("newsError"),
  newsOk: document.getElementById("newsOk"),
  newsBrand: document.querySelector(".news-brand"),
};

/** @type {'idle'|'quiz'|'end'} */
let mode = "idle";
/** @type {Pack[]} */
let packs = [];
/** @type {string[]} */
let titlePool = [];
/** @type {string[]} */
let blurbPool = [];
let sessionSize = 10;
/** @type {TestDef | null} */
let activeTest = null;
let qIndex = 0;
/** @type {Record<string, string>} */
let answers = {};
/** @type {string[]} */
let answerOrder = [];
let quizStartedAt = 0;
let quizEndedAt = 0;

function dayIndex() {
  return Math.floor(Date.now() / 86400000);
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadSeen() {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveSeen(ids) {
  const prev = new Set(loadSeen());
  for (const id of ids) prev.add(id);
  const list = [...prev];
  // Garde une fenêtre raisonnable pour re-varier après un tour complet.
  while (list.length > 80) list.shift();
  localStorage.setItem(SEEN_KEY, JSON.stringify(list));
}

/** Aplatit les packs avec métadonnées. */
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

/**
 * Tire 10 questions : mélange multi-packs, priorité les déjà vues.
 * @returns {TestDef | null}
 */
function buildSession() {
  const pool = allQuestions();
  if (!pool.length) return null;

  const size = Math.min(sessionSize, pool.length);
  const seen = new Set(loadSeen());
  const fresh = shuffle(pool.filter((q) => !seen.has(q.id)));
  const used = shuffle(pool.filter((q) => seen.has(q.id)));

  /** @type {Question[]} */
  let picked = [];

  // Visée : au moins 2 packs représentés quand c’est possible.
  const byPack = new Map();
  for (const q of fresh.length ? fresh : used) {
    if (!byPack.has(q.packId)) byPack.set(q.packId, []);
    byPack.get(q.packId).push(q);
  }
  const packIds = shuffle([...byPack.keys()]);
  // Round-robin entre packs pour la variété.
  let guard = 0;
  while (picked.length < size && guard < 200) {
    guard += 1;
    let progressed = false;
    for (const pid of packIds) {
      const bucket = byPack.get(pid);
      if (!bucket || !bucket.length) continue;
      if (picked.length >= size) break;
      picked.push(bucket.shift());
      progressed = true;
    }
    if (!progressed) break;
  }

  // Complète avec le reste (fresh puis déjà vues).
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
  const t = titlePool[dayIndex() % Math.max(titlePool.length, 1)] || "Quel type es-tu vraiment ?";
  const b =
    blurbPool[dayIndex() % Math.max(blurbPool.length, 1)] ||
    "10 questions rapides. Réponds spontanément — ton profil t’attend à la fin.";

  return {
    id: `mix-${packIdsUsed.join("+") || "solo"}-${picked.map((q) => q.id).join(".")}`,
    effect: "barnum",
    title: t,
    blurb: b,
    questions: picked,
    packIds: /** @type {string[]} */ (packIdsUsed),
  };
}

function barnumSeed(map) {
  const raw = `${activeTest?.id || ""}|${Object.entries(map)
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
  const titles = [
    "Profil rare",
    "Signature intérieure",
    "Lecture calibrée",
    "Portrait haute résolution",
  ];
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

  const metrics = [
    { title: `Lucidité (${day})`, pct: a, desc: `Pic de clarté estimé le ${day}.` },
    { title: "Contrôle / lâcher-prise", pct: b, desc: `Équilibre maîtrise / abandon à ${b}%.` },
    { title: "Besoin d’être vu·e", pct: c, desc: `Appétit de reconnaissance à ${c}%.` },
    { title: "Résistance au bruit", pct: d, desc: `Filtre anti-distraction à ${d}%.` },
  ];

  const levers = [
    "Déclarations doubles (A et non-A) : impossible d’être « faux »",
    "Tout est positif : le cerveau accepte plus facilement",
    "Désirs universels présentés comme diagnostics",
    "Chiffres précis → illusion de science (les vrais chiffres sont plus haut)",
    "Autorité du « test » : questions + pourcentages",
  ];

  return {
    title: barnumPick(seed, titles, 0),
    lead: n
      ? `Analyse générée à partir de ${n} réponse${n > 1 ? "s" : ""}.`
      : "Analyse générée à partir de ton passage.",
    body,
    metrics,
    levers,
  };
}

/**
 * Stats 100 % dérivées des réponses / de la session.
 * @param {Record<string, string>} map
 * @param {string[]} order
 * @param {TestDef | null} test
 * @param {number} startedAt
 * @param {number} endedAt
 */
function computeRealStats(map, order, test, startedAt, endedAt) {
  const keys = order.length ? order.slice() : Object.values(map);
  const n = keys.length;
  const offered = test?.questions?.length || n;
  const counts = { "1": 0, "2": 0, "3": 0 };
  for (const k of keys) {
    if (k === "1" || k === "2" || k === "3") counts[k] += 1;
  }
  const pct = (c) => (n ? Math.round((c / n) * 1000) / 10 : 0);
  const pct1 = pct(counts["1"]);
  const pct2 = pct(counts["2"]);
  const pct3 = pct(counts["3"]);

  let dominant = "—";
  let dominantCount = 0;
  for (const k of ["1", "2", "3"]) {
    if (counts[k] > dominantCount) {
      dominantCount = counts[k];
      dominant = k;
    }
  }
  const ties = ["1", "2", "3"].filter((k) => counts[k] === dominantCount && dominantCount > 0);
  if (ties.length > 1) dominant = ties.join(" / ");

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

  let switches = 0;
  for (let i = 1; i < keys.length; i++) {
    if (keys[i] !== keys[i - 1]) switches += 1;
  }
  const stability = n > 1 ? Math.round(((n - 1 - switches) / (n - 1)) * 1000) / 10 : 100;

  const numeric = keys.map((k) => Number(k)).filter((x) => x >= 1 && x <= 3);
  const avg =
    numeric.length > 0
      ? Math.round((numeric.reduce((a, b) => a + b, 0) / numeric.length) * 100) / 100
      : 0;
  const uniq = new Set(keys).size;
  const diversity = n ? Math.round((uniq / 3) * 1000) / 10 : 0;

  const ms = startedAt && endedAt && endedAt >= startedAt ? endedAt - startedAt : 0;
  const sec = Math.round(ms / 1000);
  const perQ = n && sec ? Math.round((sec / n) * 10) / 10 : 0;

  const packLabels = [...new Set((test?.questions || []).map((q) => q.packLabel).filter(Boolean))];
  const packsAnswered = new Set();
  for (const q of test?.questions || []) {
    if (map[q.id] && q.packLabel) packsAnswered.add(q.packLabel);
  }

  const first = keys[0] || "—";
  const last = keys[keys.length - 1] || "—";
  const completion = offered ? Math.round((n / offered) * 1000) / 10 : 0;

  // Labels choisis (échantillon) pour donner du “vécu”.
  /** @type {string[]} */
  const chosenLabels = [];
  for (const q of test?.questions || []) {
    const k = map[q.id];
    if (!k) continue;
    const c = q.choices.find((x) => x.k === k);
    if (c) chosenLabels.push(c.label);
  }

  return {
    n,
    offered,
    completion,
    counts,
    pct1,
    pct2,
    pct3,
    dominant,
    dominantCount,
    longestStreak,
    streakKey,
    switches,
    stability,
    avg,
    diversity,
    sec,
    perQ,
    packLabels,
    packsAnswered: [...packsAnswered],
    first,
    last,
    chosenLabels,
    sequence: keys.join(" · ") || "—",
  };
}

function setAxis(fillEl, valEl, pct) {
  if (!fillEl || !valEl) return;
  fillEl.style.width = `${pct}%`;
  valEl.textContent = `${pct}%`;
}

function formatDuration(sec) {
  if (!sec || sec < 1) return "< 1 s";
  if (sec < 60) return `${sec} s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m} min ${s} s` : `${m} min`;
}

/** @param {ReturnType<typeof computeRealStats>} s */
function renderRealStats(s) {
  if (el.realStatsLead) {
    el.realStatsLead.textContent =
      s.n === 0
        ? "Aucune réponse enregistrée — tu as terminé avant de choisir."
        : `${s.n} réponse${s.n > 1 ? "s" : ""} sur ${s.offered} question${s.offered > 1 ? "s" : ""} · ${formatDuration(s.sec)}`;
  }

  if (el.statGrid) {
    el.statGrid.innerHTML = "";
    const cards = [
      { label: "Questions posées", value: String(s.offered) },
      { label: "Réponses données", value: String(s.n) },
      { label: "Complétion", value: `${s.completion}%` },
      { label: "Durée", value: formatDuration(s.sec) },
      { label: "Temps / question", value: s.perQ ? `${s.perQ} s` : "—" },
      { label: "Choix dominant", value: s.dominant === "—" ? "—" : `touche ${s.dominant}` },
    ];
    for (const c of cards) {
      const div = document.createElement("div");
      div.className = "stat-card";
      div.innerHTML = `<p class="stat-card-value">${c.value}</p><p class="stat-card-label">${c.label}</p>`;
      el.statGrid.appendChild(div);
    }
  }

  if (el.choiceBars) {
    el.choiceBars.innerHTML = "";
    const rows = [
      { k: "1", pct: s.pct1, n: s.counts["1"] },
      { k: "2", pct: s.pct2, n: s.counts["2"] },
      { k: "3", pct: s.pct3, n: s.counts["3"] },
    ];
    for (const r of rows) {
      const row = document.createElement("div");
      row.className = "choice-bar-row";
      row.innerHTML = `
        <span class="choice-bar-key">${r.k}</span>
        <div class="choice-bar-track"><div class="choice-bar-fill" style="width:${r.pct}%"></div></div>
        <span class="choice-bar-pct">${r.pct}% <em>(${r.n})</em></span>`;
      el.choiceBars.appendChild(row);
    }
  }

  if (el.statList) {
    el.statList.innerHTML = "";
    const lines = [
      `Séquence des touches : ${s.sequence}`,
      `Première réponse : ${s.first} · dernière : ${s.last}`,
      `Changements de touche : ${s.switches} · stabilité : ${s.stability}%`,
      `Plus longue série : ${s.longestStreak}× la touche ${s.streakKey}`,
      `Moyenne des choix (1–3) : ${s.avg || "—"}`,
      `Diversité des touches : ${s.diversity}% (${new Set(s.sequence.split(" · ").filter((x) => x && x !== "—")).size}/3 utilisées)`,
      s.packsAnswered.length
        ? `Thèmes croisés : ${s.packsAnswered.join(", ")}`
        : s.packLabels.length
          ? `Thèmes du tirage : ${s.packLabels.join(", ")}`
          : null,
      s.chosenLabels.length
        ? `Échantillon de tes libellés : ${s.chosenLabels.slice(0, 4).join(" · ")}${s.chosenLabels.length > 4 ? "…" : ""}`
        : null,
    ].filter(Boolean);

    for (const line of lines) {
      const li = document.createElement("li");
      li.textContent = line;
      el.statList.appendChild(li);
    }
  }
}

function saveSession() {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      testId: activeTest?.id,
      qIndex,
      answers,
      answerOrder,
      quizStartedAt,
    }),
  );
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

/** @type {ReturnType<typeof setInterval> | null} */
let subTimer = null;
let subIndex = Math.floor(Math.random() * CLICKBAIT_SUBS.length);

function renderBrandSub() {
  if (el.brandSub) el.brandSub.textContent = CLICKBAIT_SUBS[subIndex % CLICKBAIT_SUBS.length];
}

function rotateBrandSub() {
  subIndex = (subIndex + 1) % CLICKBAIT_SUBS.length;
  renderBrandSub();
}

function startSubRotator() {
  renderBrandSub();
  if (subTimer != null) clearInterval(subTimer);
  subTimer = setInterval(rotateBrandSub, SUB_ROTATE_MS);
}

function applyTestCopy() {
  if (!activeTest) return;
  if (el.testTitle) el.testTitle.textContent = activeTest.title;
  if (el.testBlurb) el.testBlurb.textContent = activeTest.blurb;
  if (el.meta) {
    const n = activeTest.questions.length;
    const packsN = activeTest.packIds?.length || 0;
    el.meta.textContent =
      packsN > 1
        ? `${n} questions · ${packsN} thèmes mélangés · ~3 min`
        : `${n} questions · ~3 min`;
  }
}

function refreshSession() {
  activeTest = buildSession();
  applyTestCopy();
}

function showIdle() {
  mode = "idle";
  qIndex = 0;
  answers = {};
  answerOrder = [];
  quizStartedAt = 0;
  quizEndedAt = 0;
  if (el.hint) el.hint.hidden = false;
  if (el.progress) el.progress.hidden = true;
  if (el.question) el.question.hidden = true;
  if (el.choices) {
    el.choices.hidden = true;
    el.choices.innerHTML = "";
  }
  if (el.startRow) el.startRow.hidden = false;
  applyTestCopy();
  if (el.stats) el.stats.textContent = "";
}

function renderChoices(question) {
  el.choices.hidden = false;
  el.choices.innerHTML = "";
  for (const c of question.choices) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "key";
    btn.dataset.key = c.k;
    btn.setAttribute("aria-label", `${c.k} : ${c.label}`);
    btn.innerHTML = `<span class="key-glyph">${c.k}</span><span class="key-label">${c.label}</span>`;
    el.choices.appendChild(btn);
  }
}

function showQuestion() {
  if (!activeTest) return;
  const total = activeTest.questions.length;
  if (qIndex >= total) {
    showEnd();
    return;
  }
  mode = "quiz";
  const q = activeTest.questions[qIndex];
  if (el.hint) el.hint.hidden = true;
  if (el.startRow) el.startRow.hidden = true;
  el.progress.hidden = false;
  el.progress.textContent = `${qIndex + 1} / ${total}`;
  el.question.hidden = false;
  el.question.textContent = q.q;
  renderChoices(q);
  saveSession();
  rotateBrandSub();
}

function startQuiz() {
  if (!activeTest) refreshSession();
  if (!activeTest) return;
  qIndex = 0;
  answers = {};
  answerOrder = [];
  quizStartedAt = Date.now();
  quizEndedAt = 0;
  showQuestion();
}

function answerCurrent(key) {
  if (mode !== "quiz" || !activeTest) return;
  const q = activeTest.questions[qIndex];
  if (!q) return;
  const ok = q.choices.some((c) => c.k === key);
  if (!ok) return;
  answers[q.id] = key;
  answerOrder.push(key);
  qIndex += 1;
  saveSession();
  if (qIndex >= activeTest.questions.length) showEnd();
  else showQuestion();
}

function showEnd() {
  mode = "end";
  quizEndedAt = Date.now();
  if (!quizStartedAt) quizStartedAt = quizEndedAt;
  el.labView.hidden = true;
  el.endView.hidden = false;

  if (activeTest?.questions?.length) {
    saveSeen(activeTest.questions.map((q) => q.id));
  }

  const real = computeRealStats(answers, answerOrder, activeTest, quizStartedAt, quizEndedAt);
  renderRealStats(real);

  const reading = buildBarnumReading(answers);
  el.endTitle.textContent = reading.title;
  el.endLead.textContent = reading.lead;
  el.endHumor.textContent = activeTest
    ? activeTest.packIds?.length > 1
      ? `${activeTest.title} · thèmes mélangés`
      : activeTest.title
    : "";
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

  clearSession();
  window.scrollTo(0, 0);
}

function showLab() {
  el.endView.hidden = true;
  el.labView.hidden = false;
  refreshSession();
  showIdle();
  window.scrollTo(0, 0);
}

function resetAll() {
  clearSession();
  refreshSession();
  showLab();
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
        lastTestId: activeTest?.packIds?.join("+") || activeTest?.id || null,
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

function handleKey(raw) {
  if (mode === "end") return;
  const k = raw === " " || raw === "space" ? "space" : String(raw).toLowerCase();

  if (k === "r") {
    resetAll();
    return;
  }
  if (k === "space" || k === "enter") {
    if (mode === "idle") startQuiz();
    return;
  }
  if (mode === "quiz" && /^[1-3]$/.test(k)) {
    answerCurrent(k);
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
  document.title = `${BRAND} — test de personnalité`;
  startSubRotator();

  try {
    const res = await fetch("./tests.json", { cache: "no-store" });
    const data = await res.json();
    sessionSize = Number(data.sessionSize) > 0 ? Number(data.sessionSize) : 10;
    titlePool = Array.isArray(data.titles) ? data.titles : ["Quel type es-tu vraiment ?"];
    blurbPool = Array.isArray(data.blurbs)
      ? data.blurbs
      : ["10 questions rapides. Réponds spontanément — ton profil t’attend à la fin."];
    packs = Array.isArray(data.packs) ? data.packs : [];

    // Compat anciennes versions : un seul test avec questions.
    if (!packs.length && Array.isArray(data.tests) && data.tests[0]?.questions) {
      packs = [
        {
          id: data.tests[0].id || "legacy",
          label: "Général",
          questions: data.tests[0].questions,
        },
      ];
      if (data.tests[0].title) titlePool = [data.tests[0].title];
      if (data.tests[0].blurb) blurbPool = [data.tests[0].blurb];
    }
  } catch {
    packs = [];
  }

  refreshSession();
  showIdle();
}

boot();
