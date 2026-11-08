# On te lit

Ex-« AI drives crazy ». Marque clickbait : **On te lit**.  
On dirait que ça te connaît. C’est faux — déconstruction de l’**effet Barnum**. **0 IA · 0 token.**

## Autres noms envisagés
- **On te lit** ← choisi (court, menaçant, Barnum)
- **94 %** (chiffre mystique)
- **Pris pour con** (agressif / viral)
- **Faux positif**
- **Unique\***
- **Le bilan qui ment**

## Lab (`lab/`)

```bash
cd lab && python3 -m http.server 8787
# → http://localhost:8787
```

| Touche | Action |
|--------|--------|
| `espace` | citation suivante |
| `1` / `2` / `3` | bof · ok · mdr |
| `FR` / `EN` | mode langue |
| `t` | terminer → faux bilan puis reveal Barnum |
| `r` | reset profil |

## Déployer sur Cloudflare Pages

Projet technique (URL inchangée) : `ai-drives-crazy` → https://ai-drives-crazy.pages.dev

### 3 commandes (1ʳᵉ fois)

```bash
npx wrangler login
npx wrangler pages project create ai-drives-crazy
npx wrangler pages deploy lab --project-name=ai-drives-crazy
```

### Auto-deploy
Secrets GitHub `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` → push sur `lab/**` déploie.
