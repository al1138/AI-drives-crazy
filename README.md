# On te lit

Marque clickbait + déconstruction de l’**effet Barnum**. **0 IA · 0 token.**

## Lab

```bash
npm run db:migrate:local
npm run dev
# → http://localhost:8787
```

## Mailing list (Cloudflare + GitHub uniquement)

| Pièce | Rôle |
|--------|------|
| **D1** `ontelit-mail` | stocke emails + token désinscription |
| **Pages Function** `POST /api/subscribe` | inscription |
| **Pages Function** `GET /api/unsubscribe?t=` | désinscription |
| **Pages Function** `POST /api/digest` | envoi hebdo (secret) |
| **GitHub Action** `weekly-digest.yml` | chaque lundi appelle `/api/digest` |

### Setup une fois

```bash
# 1. Schéma D1 distant (déjà créé : ontelit-mail)
npm run db:migrate

# 2. Secret partagé GitHub ↔ Cloudflare (génère une longue chaîne)
openssl rand -hex 32
npx wrangler pages secret put DIGEST_SECRET --project-name=ai-drives-crazy
# même valeur → GitHub → Settings → Secrets → DIGEST_SECRET

# 3. (Optionnel) vrais emails via Cloudflare Email Sending
npx wrangler email sending enable cgclan.ovh
# puis dans wrangler.jsonc ajoute : "send_email": [{ "name": "EMAIL" }]
npx wrangler pages secret put MAIL_FROM --project-name=ai-drives-crazy
# valeur ex. : hello@cgclan.ovh
```

Sans `EMAIL` / `MAIL_FROM`, les inscriptions marchent ; le digest répond en **dry-run** (contenu généré, 0 envoi).  
Note Cloudflare : Email Sending = surtout **transactionnel** ; pour du gros volume marketing, prévoir un outil dédié plus tard.

### Déployer

```bash
npx wrangler login
npx wrangler pages deploy lab --project-name=ai-drives-crazy --commit-dirty=true
```

Ou push sur `main` (dossier `lab/**` + `functions/**`).

Site : https://ai-drives-crazy.pages.dev
