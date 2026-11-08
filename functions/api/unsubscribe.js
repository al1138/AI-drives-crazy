/**
 * GET /api/unsubscribe?t=TOKEN
 */

function html(title, body) {
  return new Response(
    `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title>
<style>body{font-family:IBM Plex Sans,Helvetica,sans-serif;max-width:32rem;margin:3rem auto;padding:0 1.25rem;color:#111;font-weight:300;line-height:1.5}h1{font-weight:400;letter-spacing:-.02em}a{color:#111}</style>
</head><body><h1>${title}</h1><p>${body}</p><p><a href="/">← On te lit</a></p></body></html>`,
    {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    },
  );
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const t = String(url.searchParams.get("t") || "").trim();

  if (!t || !env.DB) {
    return html("Lien invalide", "Ce lien de désinscription ne fonctionne pas.");
  }

  const row = await env.DB.prepare(
    `SELECT email FROM subscribers WHERE token = ? AND unsubscribed_at IS NULL`,
  )
    .bind(t)
    .first();

  if (!row) {
    return html("Déjà désinscrit", "Cet email n’est plus sur la liste (ou le lien a expiré).");
  }

  await env.DB.prepare(
    `UPDATE subscribers SET unsubscribed_at = datetime('now') WHERE token = ?`,
  )
    .bind(t)
    .run();

  return html(
    "C’est noté",
    "Tu es désinscrit. On ne t’écrira plus — promis, sans drama.",
  );
}
