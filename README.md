# On te lit

Faux tests de personnalité → bilan « personnalisé » → reveal (effet Barnum, etc.).  
**0 IA.** Un test différent peut être présenté selon le jour / le mail.

## Lab

```bash
cd lab && python3 -m http.server 8787
# → http://localhost:8787
```

Flux : **espace** → questions **1 / 2 / 3** (×10) → **terminer** (ou fin auto) → profil puis reveal.

Catalogue : `lab/tests.json` (aujourd’hui `barnum-v1`).  
Ancien lab fausses réponses IA : `lab/legacy/ai-patterns-engine.js`.

## Multi-tests + mailing (Cloudflare + GitHub)

| Table D1 | Rôle |
|----------|------|
| `subscribers` | emails |
| `tests` | catalogue des tests |
| `subscriber_sends` | tests déjà envoyés (pas de doublon) |

```bash
npm run db:migrate          # 0001
npx wrangler d1 execute ontelit-mail --remote --file=migrations/0002_tests_sends.sql
```

Digest hebdo (`POST /api/digest`) : pour chaque abonné, premier test **pas encore servi**.

## Deploy

```bash
npx wrangler pages deploy lab --project-name=ai-drives-crazy --commit-dirty=true
```

https://ai-drives-crazy.pages.dev
