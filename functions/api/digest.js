/**
 * POST /api/digest
 * Header: Authorization: Bearer <DIGEST_SECRET>
 * Pour chaque abonné : envoie un test pas encore servi (pas de doublon).
 */

const CATALOG = [
  {
    id: "barnum-v1",
    title: "Quel type es-tu vraiment ?",
    blurb: "10 questions. Réponds au feeling. On te dresse un profil.",
  },
  // Futurs tests (confirmation, corrélation…) à ajouter ici + dans lab/tests.json
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function nextTestFor(env, email) {
  const sent = await env.DB.prepare(
    `SELECT test_id FROM subscriber_sends WHERE email = ?`,
  )
    .bind(email)
    .all();
  const done = new Set((sent.results || []).map((r) => r.test_id));

  const { results: dbTests } = await env.DB.prepare(
    `SELECT id, title, blurb FROM tests WHERE active = 1 ORDER BY sort_order ASC, id ASC`,
  ).all();

  const list = dbTests?.length
    ? dbTests
    : CATALOG.map((t) => ({ id: t.id, title: t.title, blurb: t.blurb }));

  return list.find((t) => !done.has(t.id)) || null;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const secret = env.DIGEST_SECRET;
  if (!secret) return json({ ok: false, error: "DIGEST_SECRET manquant" }, 503);

  const auth = request.headers.get("authorization") || "";
  if (auth !== `Bearer ${secret}`) return json({ ok: false, error: "non autorisé" }, 401);
  if (!env.DB) return json({ ok: false, error: "DB absente" }, 503);

  const { results } = await env.DB.prepare(
    `SELECT email, token FROM subscribers WHERE unsubscribed_at IS NULL`,
  ).all();
  const list = results || [];
  const origin = new URL(request.url).origin;
  const dry = new URL(request.url).searchParams.get("dry") === "1";

  const report = [];
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of list) {
    const test = await nextTestFor(env, row.email);
    if (!test) {
      skipped += 1;
      report.push({ email: row.email, status: "caught_up" });
      continue;
    }

    const unsub = `${origin}/api/unsubscribe?t=${row.token}`;
    const link = `${origin}/?test=${encodeURIComponent(test.id)}`;
    const subject = `On te lit — ${test.title}`;
    const text = [
      "On te lit",
      "",
      test.title,
      test.blurb || "",
      "",
      `Ouvre le test : ${link}`,
      "",
      "—",
      `Désinscription : ${unsub}`,
    ].join("\n");

    if (dry || !env.EMAIL || !env.MAIL_FROM) {
      report.push({ email: row.email, status: "dry", testId: test.id, subject });
      continue;
    }

    try {
      await env.EMAIL.send({
        from: { email: env.MAIL_FROM, name: "On te lit" },
        to: [{ email: row.email }],
        subject,
        text,
        headers: { "List-Unsubscribe": `<${unsub}>` },
      });
      await env.DB.prepare(
        `INSERT OR IGNORE INTO subscriber_sends (email, test_id) VALUES (?, ?)`,
      )
        .bind(row.email, test.id)
        .run();
      sent += 1;
      report.push({ email: row.email, status: "sent", testId: test.id });
    } catch {
      failed += 1;
      report.push({ email: row.email, status: "failed", testId: test.id });
    }
  }

  return json({
    ok: true,
    dry: dry || !env.EMAIL || !env.MAIL_FROM,
    subscribers: list.length,
    sent,
    skipped,
    failed,
    note:
      !env.EMAIL || !env.MAIL_FROM
        ? "Branche EMAIL + MAIL_FROM pour l’envoi réel. Dry-run : aucun mail / aucun mark sent."
        : undefined,
    report,
  });
}
