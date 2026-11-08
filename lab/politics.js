/**
 * Expériences politiques : simple exposition, halo, ancrage.
 * Branché par engine.js (effet exposure | halo | anchor).
 */
(function (global) {
  /** @type {any} */
  let H = null;
  /** @type {any} */
  let state = {};

  function resetState() {
    state = {
      flashQueue: [],
      flashIndex: 0,
      exposureCounts: {},
      picks: [],
      charisma: {},
      trustPick: null,
      anchors: [],
      estimates: [],
    };
  }

  function el() {
    return H.el;
  }

  function exp() {
    return H.getExp();
  }

  function effect() {
    return exp()?.effect || "";
  }

  function esc(s) {
    return H.escapeHtml(String(s ?? ""));
  }

  function shuffle(a) {
    return H.shuffle(a);
  }

  function hideAllPlays() {
    H.hidePlays();
  }

  function showBias() {
    const e = el();
    if (e.playBias) e.playBias.hidden = false;
  }

  function setChoices(items) {
    const box = el().biasChoices;
    if (!box) return;
    box.innerHTML = "";
    box.hidden = false;
    for (const it of items) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "key";
      btn.dataset.key = it.k;
      btn.setAttribute("aria-label", `${it.k} : ${it.label}`);
      btn.innerHTML = `<span class="key-glyph">${esc(it.k)}</span><span class="key-label">${esc(it.label)}</span>`;
      box.appendChild(btn);
    }
  }

  function setBody(html) {
    if (el().biasBody) el().biasBody.innerHTML = html;
  }

  function setProgress(t) {
    if (el().biasProgress) el().biasProgress.textContent = t;
  }

  function setKicker(t) {
    if (el().biasKicker) el().biasKicker.textContent = t;
  }

  function setQuestion(t) {
    if (el().biasQuestion) {
      el().biasQuestion.hidden = !t;
      el().biasQuestion.textContent = t || "";
    }
  }

  /* ——— Simple exposition ——— */

  function buildFlashQueue(data) {
    /** @type {string[]} */
    const queue = [];
    const slogans = data.slogans || [];
    for (const s of slogans) {
      const n = Math.max(1, Number(s.repeats) || 1);
      for (let i = 0; i < n; i++) queue.push(s.id);
    }
    return shuffle(queue);
  }

  function startExposure() {
    resetState();
    const data = exp();
    state.flashQueue = buildFlashQueue(data);
    state.flashIndex = 0;
    state.phase = "flash";
    state.exposureCounts = {};
    for (const s of data.slogans || []) state.exposureCounts[s.id] = 0;
    H.setMode("play");
    hideAllPlays();
    if (el().hint) el().hint.hidden = true;
    if (el().startRow) el().startRow.hidden = true;
    showBias();
    showExposureFlash();
  }

  function sloganById(id) {
    return (exp()?.slogans || []).find((s) => s.id === id);
  }

  function showExposureFlash() {
    const q = state.flashQueue;
    if (state.flashIndex >= q.length) {
      state.phase = "pick";
      state.pickIndex = 0;
      showExposurePick();
      return;
    }
    const id = q[state.flashIndex];
    state.exposureCounts[id] = (state.exposureCounts[id] || 0) + 1;
    const s = sloganById(id);
    setProgress(`Message ${state.flashIndex + 1} / ${q.length}`);
    setKicker("antenne · direct");
    setQuestion("Un message passe à l’antenne");
    setBody(`<p class="bias-slogan">${esc(s?.text || id)}</p>`);
    setChoices([
      { k: "1", label: "suivant" },
      { k: "2", label: "suivant" },
      { k: "3", label: "suivant" },
    ]);
  }

  function showExposurePick() {
    const rounds = exp()?.pickRounds || [];
    if (state.pickIndex >= rounds.length) {
      H.showEnd();
      return;
    }
    const round = rounds[state.pickIndex];
    const opts = shuffle((round.options || []).slice());
    state.currentPickOpts = opts;
    setProgress(`Choix ${state.pickIndex + 1} / ${rounds.length}`);
    setKicker("après l’antenne");
    setQuestion(round.prompt || "Lequel te paraît le plus solide ?");
    setBody(`<p class="bias-note">Choisis au feeling.</p>`);
    setChoices(
      opts.map((id, i) => ({
        k: String(i + 1),
        label: sloganById(id)?.text || id,
      })),
    );
  }

  function answerExposure(key) {
    if (state.phase === "flash") {
      if (!/^[1-3]$/.test(key)) return;
      state.flashIndex += 1;
      showExposureFlash();
      return;
    }
    if (state.phase !== "pick") return;
    const idx = Number(key) - 1;
    const opts = state.currentPickOpts || [];
    const chosen = opts[idx];
    if (!chosen) return;
    state.picks.push({
      chosen,
      options: opts.slice(),
      exposures: { ...state.exposureCounts },
    });
    H.pushAnswer(key);
    state.pickIndex += 1;
    showExposurePick();
  }

  function exposureStats() {
    const counts = state.exposureCounts || {};
    const picks = state.picks || [];
    let familiarHits = 0;
    for (const p of picks) {
      const maxExp = Math.max(...p.options.map((id) => counts[id] || 0), 0);
      if ((counts[p.chosen] || 0) >= maxExp && maxExp > 0) familiarHits += 1;
    }
    const totalFlashes = Object.values(counts).reduce((a, b) => a + b, 0);
    return { counts, picks, familiarHits, pickN: picks.length, totalFlashes };
  }

  function renderExposureEnd() {
    const s = exposureStats();
    const pct = s.pickN ? Math.round((s.familiarHits / s.pickN) * 100) : 0;
    const ranked = Object.entries(s.counts)
      .sort((a, b) => b[1] - a[1])
      .map(([id, n]) => ({ id, n, text: sloganById(id)?.text || id }));

    if (el().fakeRead) {
      el().fakeRead.innerHTML = `
        <header class="end-hero">
          <p class="end-kicker">studio · bilan</p>
          <h1 class="end-title">Familiarité ${pct}%</h1>
          <p class="end-lead">Tes choix suivent souvent ce que l’antenne a le plus répété.</p>
          <p class="end-humor">${s.familiarHits}/${s.pickN} choix alignés sur le message le plus exposé.</p>
        </header>
        <section class="real-stats">
          <div class="stat-grid">
            <div class="stat-card"><p class="stat-card-value">${s.totalFlashes}</p><p class="stat-card-label">Passages antenne</p></div>
            <div class="stat-card"><p class="stat-card-value">${s.pickN}</p><p class="stat-card-label">Choix finaux</p></div>
            <div class="stat-card"><p class="stat-card-value">${pct}%</p><p class="stat-card-label">Préférence du familier</p></div>
          </div>
          <ul class="stat-list">
            ${ranked
              .slice(0, 4)
              .map((r) => `<li>${esc(r.text)} — vu ${r.n}×</li>`)
              .join("")}
          </ul>
        </section>`;
    }

    H.setReveal(
      "Tu viens de subir l’effet de simple exposition",
      "Plus on voit ou entend quelque chose, plus ça paraît sûr, familier, « sérieux » — même sans nouvel argument. L’antenne a créé une préférence en répétant certains messages plus que d’autres.",
      [
        "La répétition augmente le confort et la crédibilité perçue",
        "Ce n’est pas une preuve de fond — c’est de la familiarité",
        "Les messages peu exposés partent avec un handicap",
        "En politique, le temps d’antenne devient un avantage structurel",
      ],
    );

    if (el().revealExtra) {
      el().revealExtra.innerHTML = `
        <h3 class="reveal-sub">Cas politiques connus</h3>
        <ul class="reveal-biases">
          <li><strong>Éric Zemmour (2022)</strong> — Avant même l’annonce candidature, une présence quotidienne ultra-répétée (notamment CNews) a normalisé des thèses et installé une stature de candidat.</li>
          <li><strong>« Petits » candidats</strong> — Extrême gauche ou partis mineurs : une faible exposition historique empêche le grand public de se familiariser ; le plafond n’est pas seulement programmatique, il est médiatique.</li>
        </ul>
        <p class="reveal-explain">Ce n’est pas un jugement sur les idées : c’est le mécanisme. Qui occupe l’écran gagne en « évidence ».</p>`;
    }
  }

  /* ——— Halo (Nisbett & Wilson 1977) ——— */

  function startHalo() {
    resetState();
    const conditions = exp()?.conditions || [];
    state.condition = conditions.length
      ? conditions[Math.floor(Math.random() * conditions.length)]
      : null;
    state.phase = "global";
    state.rateIndex = 0;
    state.globalKey = null;
    state.globalValence = 0;
    state.ratings = {};
    H.setMode("play");
    hideAllPlays();
    if (el().hint) el().hint.hidden = true;
    if (el().startRow) el().startRow.hidden = true;
    showBias();
    showHaloGlobal();
  }

  function showHaloGlobal() {
    const c = state.condition;
    if (!c) {
      H.showEnd();
      return;
    }
    setProgress("1 / 4");
    setKicker(c.kicker || "extrait");
    setQuestion(exp()?.globalQuestion || "Impression générale ?");
    setBody(`
      <article class="halo-card">
        <p class="halo-role">${esc(exp()?.sharedNote || "")}</p>
        <p class="halo-name">${esc(c.title || "Marc")}</p>
        <p class="halo-form">${esc(c.body || "")}</p>
      </article>`);
    setChoices(exp()?.globalChoices || [
      { k: "1", label: "plutôt sympathique" },
      { k: "2", label: "mitigé" },
      { k: "3", label: "plutôt antipathique" },
    ]);
  }

  function showHaloRating() {
    const ratings = exp()?.ratings || [];
    if (state.rateIndex >= ratings.length) {
      H.showEnd();
      return;
    }
    const r = ratings[state.rateIndex];
    setProgress(`${state.rateIndex + 2} / ${ratings.length + 1}`);
    setKicker("jugement · détail");
    setQuestion(r.q);
    setBody(
      r.note
        ? `<p class="bias-note">${esc(r.note)}</p>`
        : `<p class="bias-note">${esc(exp()?.sharedNote || "")}</p>`,
    );
    setChoices(
      exp()?.ratingChoices || [
        { k: "1", label: "agréable" },
        { k: "2", label: "neutre" },
        { k: "3", label: "irritant" },
      ],
    );
  }

  function choiceValence(pool, key) {
    const hit = (pool || []).find((c) => c.k === key);
    return hit && typeof hit.valence === "number" ? hit.valence : 0;
  }

  function answerHalo(key) {
    if (!/^[1-3]$/.test(key)) return;
    if (state.phase === "global") {
      state.globalKey = key;
      state.globalValence = choiceValence(exp()?.globalChoices, key);
      H.pushAnswer(key);
      state.phase = "rate";
      state.rateIndex = 0;
      showHaloRating();
      return;
    }
    if (state.phase === "rate") {
      const ratings = exp()?.ratings || [];
      const r = ratings[state.rateIndex];
      if (!r) return;
      state.ratings[r.id] = {
        key,
        valence: choiceValence(exp()?.ratingChoices, key),
        label: (exp()?.ratingChoices || []).find((c) => c.k === key)?.label || key,
        q: r.q,
      };
      H.pushAnswer(key);
      state.rateIndex += 1;
      if (state.rateIndex >= ratings.length) H.showEnd();
      else showHaloRating();
    }
  }

  function haloStats() {
    const cond = state.condition;
    const condVal = typeof cond?.valence === "number" ? cond.valence : 0;
    const entries = Object.values(state.ratings || {});
    const n = entries.length;
    let aligned = 0;
    for (const e of entries) {
      if (e.valence === 0) continue;
      if (condVal !== 0 && e.valence === condVal) aligned += 1;
      else if (condVal === 0 && state.globalValence !== 0 && e.valence === state.globalValence)
        aligned += 1;
    }
    const rated = entries.filter((e) => e.valence !== 0).length;
    const showedHalo = rated > 0 && aligned >= Math.ceil(rated * 0.66);
    return {
      conditionId: cond?.id || "",
      conditionValence: condVal,
      globalKey: state.globalKey,
      globalValence: state.globalValence,
      ratings: state.ratings,
      aligned,
      rated,
      n,
      showedHalo,
      matched: showedHalo,
    };
  }

  function renderHaloEnd() {
    const s = haloStats();
    const condLabel =
      s.conditionValence > 0
        ? "version chaleureuse"
        : s.conditionValence < 0
          ? "version froide"
          : "version";
    const rows = Object.entries(s.ratings || {})
      .map(([id, r]) => {
        const follow =
          r.valence !== 0 && r.valence === s.conditionValence
            ? "suit l’impression"
            : r.valence === 0
              ? "neutre"
              : "résiste";
        return `<li><strong>${esc(r.q)}</strong> → ${esc(r.label)} <em>(${follow})</em></li>`;
      })
      .join("");

    if (el().fakeRead) {
      el().fakeRead.innerHTML = `
        <header class="end-hero">
          <p class="end-kicker">expérience · tes réponses</p>
          <h1 class="end-title">${s.showedHalo ? "Halo observé" : "Halo faible / résisté"}</h1>
          <p class="end-lead">Tu as vu la <strong>${esc(condLabel)}</strong>. Sur ${s.rated || s.n} jugements « agréable/irritant », <strong>${s.aligned}</strong> suivent cette impression — alors que l’apparence, les gestes et l’accent étaient les mêmes.</p>
          <p class="end-humor">${s.showedHalo ? "Tes notes de détail ont glissé avec l’attitude. C’est exactement ce que l’expérience de 1977 a mesuré." : "Tu as moins suivi l’impression globale — possible, et utile à comparer à l’étude."}</p>
        </header>
        <section class="real-stats">
          <ul class="stat-list">${rows || "<li>—</li>"}</ul>
        </section>`;
    }

    const ex = exp()?.experiment || {};
    H.setReveal(
      "Effet de halo — preuve par l’expérience",
      "Ce n’est pas un avis : c’est le même protocole que Nisbett & Wilson (1977). Une seule chose change (chaleureux / froid). Si tes jugements sur l’apparence, les manières ou l’accent suivent cette impression, le halo est dans tes réponses.",
      [
        "Même prof, mêmes traits visibles — seule l’attitude change",
        "Tu as noté des détails « objectifs » après l’impression globale",
        "Si les détails suivent l’impression → halo",
        "Dans l’étude, les gens croyaient souvent juger les détails librement",
      ],
    );

    if (el().revealExtra) {
      el().revealExtra.innerHTML = `
        <h3 class="reveal-sub">${esc(ex.title || "Nisbett & Wilson, 1977")}</h3>
        <p class="reveal-explain">${esc(ex.blurb || "")}</p>
        <p class="reveal-explain">${esc(ex.finding || "")}</p>
        ${
          ex.url
            ? `<p class="reveal-explain"><a href="${esc(ex.url)}" target="_blank" rel="noopener noreferrer">${esc(ex.urlLabel || "Lire l’étude")}</a></p>`
            : ""
        }
        <h3 class="reveal-sub">Pourquoi ça convainc</h3>
        <p class="reveal-explain">
          On a changé une seule chose, on a mesuré le reste. Tes réponses sont la preuve (ou la résistance) —
          pas un discours plaqué après coup. C’est la démarche scientifique appliquée à un biais.
        </p>`;
    }
  }

  /* ——— Ancrage ——— */

  function startAnchor() {
    resetState();
    state.phase = "round";
    state.roundIndex = 0;
    state.anchors = [];
    state.estimates = [];
    H.setMode("play");
    hideAllPlays();
    if (el().hint) el().hint.hidden = true;
    if (el().startRow) el().startRow.hidden = true;
    showBias();
    showAnchorRound();
  }

  function showAnchorRound() {
    const rounds = exp()?.rounds || [];
    if (state.roundIndex >= rounds.length) {
      H.showEnd();
      return;
    }
    const r = rounds[state.roundIndex];
    state.currentRound = r;
    setProgress(`Sondage ${state.roundIndex + 1} / ${rounds.length}`);
    setKicker("salle des sondages · premier chiffre");
    setQuestion(r.prompt);
    setBody(`
      <div class="anchor-poll">
        <p class="anchor-label">${esc(r.pollLabel || "Premier sondage")}</p>
        <p class="anchor-number">${esc(String(r.anchor))}%</p>
        <p class="anchor-sub">${esc(r.anchorContext || "")}</p>
      </div>`);
    setChoices(
      (r.options || []).map((o) => ({
        k: o.k,
        label: o.label,
      })),
    );
  }

  function answerAnchor(key) {
    const r = state.currentRound;
    if (!r) return;
    const opt = (r.options || []).find((o) => o.k === key);
    if (!opt) return;
    state.anchors.push(r.anchor);
    state.estimates.push({
      key,
      label: opt.label,
      value: opt.value,
      anchor: r.anchor,
      pulled: opt.pulled === true,
    });
    H.pushAnswer(key);
    state.roundIndex += 1;
    showAnchorRound();
  }

  function anchorStats() {
    const est = state.estimates || [];
    const pulled = est.filter((e) => e.pulled).length;
    const avgAnchor =
      est.length > 0 ? Math.round(est.reduce((a, e) => a + e.anchor, 0) / est.length) : 0;
    return { est, pulled, n: est.length, avgAnchor };
  }

  function renderAnchorEnd() {
    const s = anchorStats();
    const pct = s.n ? Math.round((s.pulled / s.n) * 100) : 0;
    if (el().fakeRead) {
      el().fakeRead.innerHTML = `
        <header class="end-hero">
          <p class="end-kicker">sondages · bilan</p>
          <h1 class="end-title">Ancrage ${pct}%</h1>
          <p class="end-lead">Tes réponses restent souvent dans le sillage du premier chiffre affiché.</p>
          <p class="end-humor">${s.pulled}/${s.n} choix tirés vers l’ancre (moy. ${s.avgAnchor}%).</p>
        </header>
        <section class="real-stats">
          <ul class="stat-list">
            ${s.est
              .map(
                (e, i) =>
                  `<li>#${i + 1} ancre ${e.anchor}% → ${esc(e.label)}${e.pulled ? " · près de l’ancre" : ""}</li>`,
              )
              .join("")}
          </ul>
        </section>`;
    }

    H.setReveal(
      "Tu viens de subir le biais d’ancrage",
      "Le premier chiffre vu (sondage, « seul capable », second tour « évident ») devient une grille de lecture. Ensuite on ajuste un peu — mais on reste dans le voisinage de l’ancre. Ça peut geler une campagne et fabriquer du « vote utile ».",
      [
        "Le premier nombre occupe la tête",
        "Les estimations suivantes restent proches",
        "« Qui peut aller au second tour ? » devient une prophétie auto-réalisatrice",
        "Abandonner un candidat « sans chance » suit souvent l’ancre médiatique",
      ],
    );

    if (el().revealExtra) {
      el().revealExtra.innerHTML = `
        <h3 class="reveal-sub">Cas politiques connus</h3>
        <ul class="reveal-biases">
          <li><strong>Vote utile 2022</strong> — Les premiers sondages ont ancré l’idée que Jean-Luc Mélenchon était le seul à gauche en mesure d’atteindre le second tour. Cette ancre a poussé une partie de l’électorat (Jadot, Hidalgo, etc.) à se reporter pour que le vote « serve ».</li>
          <li><strong>21 avril 2002</strong> — L’ancrage d’un second tour « Jospin–Chirac » évident a favorisé la dispersion à gauche… et la qualification surprise de Jean-Marie Le Pen.</li>
        </ul>
        <p class="reveal-explain">L’ancre n’interdit pas de penser : elle oriente le cadre. Changer de cadre demande un effort conscient.</p>`;
    }
  }

  /* ——— API ——— */

  const EFFECTS = ["exposure", "halo", "anchor"];

  function isPoliticsEffect(eff) {
    return EFFECTS.includes(eff);
  }

  function applyHome(helpers) {
    const e = helpers.getExp();
    const effectName = e?.effect;
    if (effectName === "exposure") {
      helpers.setIntroSteps([
        { k: "espace", t: "allumer l’antenne" },
        { k: "1", t: "suivant / choisir" },
        { k: "terminer", t: "bilan" },
      ]);
      helpers.setMeta(`${(e.slogans || []).length} slogans · ~2 min`);
      helpers.setFinishLabel("voir le bilan");
    } else if (effectName === "halo") {
      const n = 1 + (e.ratings || []).length;
      helpers.setIntroSteps([
        { k: "espace", t: "voir l’extrait" },
        { k: "1 · 2 · 3", t: "juger" },
        { k: "terminer", t: "voir l’expérience" },
      ]);
      helpers.setMeta(`${n} jugements · expérience 1977 · ~2 min`);
      helpers.setFinishLabel("voir l’expérience");
    } else if (effectName === "anchor") {
      helpers.setIntroSteps([
        { k: "espace", t: "entrer dans la salle" },
        { k: "1 · 2 · 3", t: "répondre au sondage" },
        { k: "terminer", t: "bilan" },
      ]);
      helpers.setMeta(`${(e.rounds || []).length} sondages · ~2 min`);
      helpers.setFinishLabel("voir le bilan");
    }
  }

  function prepareBridge(helpers) {
    const effectName = helpers.getExp()?.effect;
    if (effectName === "exposure") {
      helpers.setBridge(
        "L’antenne a fait son travail…",
        "Encore un cran : on compte combien de fois chaque message est passé.",
      );
    } else if (effectName === "halo") {
      helpers.setBridge(
        "Tes notes de détail sont là…",
        "Encore un cran : on les compare au protocole réel de 1977.",
      );
    } else if (effectName === "anchor") {
      helpers.setBridge(
        "Le premier chiffre est resté dans la tête…",
        "Encore un cran : on montre comment l’ancre a tiré tes réponses.",
      );
    }
  }

  function start(helpers) {
    H = helpers;
    const eff = effect();
    if (eff === "exposure") startExposure();
    else if (eff === "halo") startHalo();
    else if (eff === "anchor") startAnchor();
  }

  function answer(key, helpers) {
    H = helpers;
    const eff = effect();
    if (eff === "exposure") answerExposure(key);
    else if (eff === "halo") answerHalo(key);
    else if (eff === "anchor") answerAnchor(key);
  }

  function renderEnd(helpers) {
    H = helpers;
    const eff = effect();
    if (eff === "exposure") renderExposureEnd();
    else if (eff === "halo") renderHaloEnd();
    else if (eff === "anchor") renderAnchorEnd();
  }

  function buildSnapshot(helpers) {
    H = helpers;
    const eff = effect();
    if (eff === "exposure") {
      const s = exposureStats();
      return {
        effect: "exposure",
        familiarHits: s.familiarHits,
        pickN: s.pickN,
        counts: s.counts,
        picks: s.picks.map((p) => p.chosen),
      };
    }
    if (eff === "halo") {
      const s = haloStats();
      return {
        effect: "halo",
        matched: s.showedHalo,
        showedHalo: s.showedHalo,
        conditionId: s.conditionId,
        aligned: s.aligned,
        rated: s.rated,
      };
    }
    const s = anchorStats();
    return {
      effect: "anchor",
      pulled: s.pulled,
      n: s.n,
      avgAnchor: s.avgAnchor,
      estimates: s.est,
    };
  }

  function proofSummary(eff, run) {
    if (eff === "exposure") {
      return `<p class="algo-card-title">${run.familiarHits}/${run.pickN} choix « familiers »</p>
        <p class="algo-card-body">Messages les plus vus → souvent préférés.</p>`;
    }
    if (eff === "halo") {
      return `<p class="algo-card-title">${run.showedHalo || run.matched ? "halo observé" : "halo faible"}</p>
        <p class="algo-card-body">${run.aligned ?? "—"}/${run.rated ?? "—"} détails alignés · ${esc(run.conditionId || "")}</p>`;
    }
    if (eff === "anchor") {
      return `<p class="algo-card-title">${run.pulled}/${run.n} près de l’ancre</p>
        <p class="algo-card-body">Ancre moy. ${run.avgAnchor}%</p>`;
    }
    return "";
  }

  function proofOneLiner(eff, run) {
    if (eff === "exposure") return `${run.familiarHits}/${run.pickN} familiers`;
    if (eff === "halo")
      return run.showedHalo || run.matched ? "halo observé" : "halo faible";
    if (eff === "anchor") return `${run.pulled}/${run.n} ancrés`;
    return "";
  }

  function proofDiff(eff, a, b) {
    if (eff === "exposure") {
      return `<ul class="proof-diff">
        <li>Choix familiers : ${a.familiarHits}/${a.pickN} → ${b.familiarHits}/${b.pickN}</li>
        <li>Même mécanique : ce qui a le plus tourné à l’antenne attire le choix.</li>
      </ul>`;
    }
    if (eff === "halo") {
      return `<ul class="proof-diff">
        <li>1er : ${a.showedHalo || a.matched ? "halo" : "résisté"} · dernier : ${b.showedHalo || b.matched ? "halo" : "résisté"}</li>
        <li>Même protocole : une seule chose change (chaleureux / froid), on mesure le reste.</li>
      </ul>`;
    }
    if (eff === "anchor") {
      return `<ul class="proof-diff">
        <li>Tirés vers l’ancre : ${a.pulled}/${a.n} → ${b.pulled}/${b.n}</li>
        <li>Le premier pourcentage continue d’orienter la grille de lecture.</li>
      </ul>`;
    }
    return "";
  }

  global.PoliticsLab = {
    EFFECTS,
    isPoliticsEffect,
    applyHome,
    prepareBridge,
    start,
    answer,
    renderEnd,
    buildSnapshot,
    proofSummary,
    proofOneLiner,
    proofDiff,
    resetState,
  };
})(window);
