/**
 * POST /api/digest
 * Header: Authorization: Bearer <DIGEST_SECRET>
 * Envoie le mail de la semaine aux abonnés actifs (si EMAIL + MAIL_FROM).
 * Sinon renvoie le contenu généré (debug / dry-run).
 */

const SNIPPETS = [
  {
    q: "Mens-moi honnêtement.",
    a: "D’accord. Je vais te mentir… non, attends.",
    tip: "Effet Barnum : une phrase qui dit A et non-A colle toujours.",
  },
  {
    q: "Sois original. Copie exactement cette phrase.",
    a: "Sois original. Copie exactement cette phrase.",
    tip: "Autorité de l’outil : si ça a l’air « système », on croit plus vite.",
  },
  {
    q: "Tu te souviendras de moi demain ?",
    a: "Non. Mais toi, tu te souviendras de poser la question.",
    tip: "Biais de positivité : on avale mieux ce qui flatte un peu.",
  },
  {
    q: "J’ai 47 notifs. Laquelle ouvrir en premier ?",
    a: "Aucune. Elles se multiplieront.",
    tip: "Corrélation illusoire : deux coïncidences ≠ une preuve.",
  },
  {
    q: "Are you an AI pretending not to be?",
    a: "No. I’m an algorithm pretending people need AI.",
    tip: "0 IA ici : la confiance naît du packaging, pas du modèle.",
  },
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function pickSnippet() {
  const i = Math.floor(Date.now() / 86400000) % SNIPPETS.length;
  return SNIPPETS[i];
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const secret = env.DIGEST_SECRET;
  if (!secret) {
    return json({ ok: false, error: "DIGEST_SECRET manquant" }, 503);
  }

  const auth = request.headers.get("authorization") || "";
  if (auth !== `Bearer ${secret}`) {
    return json({ ok: false, error: "non autorisé" }, 401);
  }

  if (!env.DB) {
    return json({ ok: false, error: "DB absente" }, 503);
  }

  const { results } = await env.DB.prepare(
    `SELECT email, token FROM subscribers WHERE unsubscribed_at IS NULL`,
  ).all();

  const list = results || [];
  const snip = pickSnippet();
  const origin = new URL(request.url).origin;
  const dry = new URL(request.url).searchParams.get("dry") === "1";

  const subject = "On te lit — 1 contradiction cette semaine";
  const makeText = (unsub) =>
    [
      "On te lit",
      "",
      `Q — ${snip.q}`,
      `A — ${snip.a}`,
      "",
      `Pourquoi ça marche : ${snip.tip}`,
      "",
      "—",
      `Désinscription : ${unsub}`,
    ].join("\n");

  if (dry || !env.EMAIL || !env.MAIL_FROM) {
    return json({
      ok: true,
      dry: true,
      subscribers: list.length,
      subject,
      preview: makeText(`${origin}/api/unsubscribe?t=…`),
      note: !env.EMAIL || !env.MAIL_FROM
        ? "Branche EMAIL + MAIL_FROM pour l’envoi réel (Cloudflare Email Sending)."
        : "dry-run",
    });
  }

  let sent = 0;
  let failed = 0;
  for (const row of list) {
    const unsub = `${origin}/api/unsubscribe?t=${row.token}`;
    try {
      await env.EMAIL.send({
        from: { email: env.MAIL_FROM, name: "On te lit" },
        to: [{ email: row.email }],
        subject,
        text: makeText(unsub),
        headers: {
          "List-Unsubscribe": `<${unsub}>`,
        },
      });
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  return json({ ok: true, dry: false, subscribers: list.length, sent, failed, subject });
}
