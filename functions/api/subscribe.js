/**
 * POST /api/subscribe
 * Body JSON: { email, consent: true }
 * Stocke l’email dans D1 (Cloudflare). 0 service tiers.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function token() {
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DB) {
    return json({ ok: false, error: "base absente" }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "json invalide" }, 400);
  }

  const email = String(body?.email || "")
    .trim()
    .toLowerCase();
  const consent = Boolean(body?.consent);

  if (!EMAIL_RE.test(email)) {
    return json({ ok: false, error: "email invalide" }, 400);
  }
  if (!consent) {
    return json({ ok: false, error: "consentement requis" }, 400);
  }

  const t = token();

  try {
    await env.DB.prepare(
      `INSERT INTO subscribers (email, token, confirmed, unsubscribed_at)
       VALUES (?, ?, 1, NULL)
       ON CONFLICT(email) DO UPDATE SET
         token = excluded.token,
         unsubscribed_at = NULL,
         confirmed = 1`,
    )
      .bind(email, t)
      .run();
  } catch (err) {
    return json({ ok: false, error: "enregistrement impossible" }, 500);
  }

  // Accusé optionnel (transactionnel) si Email Sending est branché
  const from = env.MAIL_FROM;
  if (env.EMAIL && from) {
    const origin = new URL(request.url).origin;
    const unsub = `${origin}/api/unsubscribe?t=${t}`;
    try {
      await env.EMAIL.send({
        from: { email: from, name: "On te lit" },
        to: [{ email }],
        subject: "Inscription confirmée — On te lit",
        text: [
          "Bienvenue.",
          "",
          "Tu recevras ~1 mail / semaine : une contradiction, zéro IA.",
          `Désinscription : ${unsub}`,
          "",
          "— On te lit",
        ].join("\n"),
      });
    } catch {
      // L’inscription reste valide même si l’envoi échoue
    }
  }

  return json({ ok: true });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}
