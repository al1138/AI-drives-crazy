/**
 * On te lit — faux test de personnalité (effet Barnum au bilan, secret jusqu’à la fin).
 * Ancien lab « fausses réponses IA » : voir lab/legacy/ai-patterns-engine.js
 */

const BRAND = "On te lit";

const CLICKBAIT_SUBS = [
  "10 trucs vitaux que tu ignores encore",
  "On te prend pour un con — comment le détecter",
  "Ce bilan te connaît mieux que ta mère",
  "Le test que 9 personnes sur 10 ratent",
  "Ton profil secret révélé en 30 secondes",
  "Si tu lis ça, tu es déjà piégé",
  "Les experts détestent cette méthode simple",
  "Ce que ton cerveau refuse de voir",
  "La vérité sur toi que personne n’ose dire",
  "Arrête de scroller : ce test est pour toi",
  "94 % des gens croient que c’est personnel",
  "Découvre enfin qui tu es (vraiment)",
];

const SUB_ROTATE_MS = 5000;
const NEWS_KEY = "ontelit.newsletter.v1";
const SESSION_KEY = "ontelit.session.v1";

/** @typedef {{ k: string, label: string }} Choice */
/** @typedef {{ id: string, q: string, choices: Choice[] }} Question */
/** @typedef {{ id: string, effect: string, title: string, blurb: string, questions: Question[] }} TestDef */

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
/** @type {TestDef[]} */
let catalog = [];
/** @type {TestDef | null} */
let activeTest = null;
let qIndex = 0;
/** @type {Record<string, string>} */
let answers = {};

function dayIndex() {
  return Math.floor(Date.now() / 86400000);
}

function pickTodaysTest(tests) {
  if (!tests.length) return null;
  return tests[dayIndex() % tests.length];
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
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
    "Chiffres précis → illusion de science",
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

function setAxis(fillEl, valEl, pct) {
  if (!fillEl || !valEl) return;
  fillEl.style.width = `${pct}%`;
  valEl.textContent = `${pct}%`;
}

function saveSession() {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      testId: activeTest?.id,
      qIndex,
      answers,
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

function showIdle() {
  mode = "idle";
  qIndex = 0;
  answers = {};
  if (el.hint) el.hint.hidden = false;
  if (el.progress) el.progress.hidden = true;
  if (el.question) el.question.hidden = true;
  if (el.choices) {
    el.choices.hidden = true;
    el.choices.innerHTML = "";
  }
  if (el.startRow) el.startRow.hidden = false;
  if (el.meta && activeTest) {
    el.meta.textContent = `${activeTest.questions.length} questions · aujourd’hui`;
  }
  if (el.stats) el.stats.textContent = activeTest ? activeTest.id : "";
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
  if (!activeTest) return;
  qIndex = 0;
  answers = {};
  showQuestion();
}

function answerCurrent(key) {
  if (mode !== "quiz" || !activeTest) return;
  const q = activeTest.questions[qIndex];
  if (!q) return;
  const ok = q.choices.some((c) => c.k === key);
  if (!ok) return;
  answers[q.id] = key;
  qIndex += 1;
  saveSession();
  if (qIndex >= activeTest.questions.length) showEnd();
  else showQuestion();
}

function showEnd() {
  mode = "end";
  el.labView.hidden = true;
  el.endView.hidden = false;

  const reading = buildBarnumReading(answers);
  el.endTitle.textContent = reading.title;
  el.endLead.textContent = reading.lead;
  el.endHumor.textContent = activeTest ? activeTest.title : "";
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
  showIdle();
  window.scrollTo(0, 0);
}

function resetAll() {
  clearSession();
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
        lastTestId: activeTest?.id || null,
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
if (el.resetBtn) el.resetBtn.addEventListener("click", (e) => {
  e.preventDefault();
  resetAll();
});

async function boot() {
  if (el.brandLogo) el.brandLogo.textContent = BRAND;
  if (el.newsBrand) el.newsBrand.textContent = BRAND;
  document.title = `${BRAND} — le test qui te connaît`;
  startSubRotator();

  try {
    const res = await fetch("./tests.json", { cache: "no-store" });
    const data = await res.json();
    catalog = Array.isArray(data.tests) ? data.tests : [];
  } catch {
    catalog = [];
  }

  const wanted = new URLSearchParams(location.search).get("test");
  activeTest =
    (wanted && catalog.find((t) => t.id === wanted)) || pickTodaysTest(catalog);
  if (activeTest) {
    if (el.testTitle) el.testTitle.textContent = activeTest.title;
    if (el.testBlurb) el.testBlurb.textContent = activeTest.blurb;
  }

  showIdle();
}

boot();
