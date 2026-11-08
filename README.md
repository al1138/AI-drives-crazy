# AI drives crazy

On dirait une IA. Ce n’est qu’un algo. **0 IA · 0 token.**  
Le bilan final démonte l’**effet Barnum** (horoscope qui marche sur tout le monde).

## Humor Lab (`lab/`)

```bash
cd lab && python3 -m http.server 8787
# → http://localhost:8787
```

| Touche | Action |
|--------|--------|
| `espace` | citation suivante |
| `1` / `2` / `3` | bof · ok · mdr |
| `FR` / `EN` | mode langue |
| `t` | terminer → bilan |
| `r` | reset profil |

## Déployer sur Cloudflare Pages

Dossier servi : **`lab/`** (statique). Projet Pages : `ai-drives-crazy` → `https://ai-drives-crazy.pages.dev`

### 3 commandes (1ʳᵉ fois)

```bash
npx wrangler login
npx wrangler pages project create ai-drives-crazy
npx wrangler pages deploy lab --project-name=ai-drives-crazy
```

### Déploiement auto à chaque modif

1. Crée un **API Token** Cloudflare : *Workers Pages Write* + *Account read*
2. Dans GitHub → repo → **Settings → Secrets and variables → Actions** :
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID` (dashboard → overview, à droite)
3. Push sur `main` (fichiers sous `lab/**`) → le workflow `.github/workflows/deploy-pages.yml` publie tout seul

Alternative sans secrets GitHub : dashboard Cloudflare → **Workers & Pages** → Create → **Connect to Git** → repo `AI-drives-crazy` → Root directory `lab` → Build command vide → Deploy. Chaque push sur `main` redéploie.

