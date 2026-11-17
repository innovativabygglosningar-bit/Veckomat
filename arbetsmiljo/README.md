# Riskbank BAS-P

Ett arbetsmiljöverktyg för BAS-P. Det består av en bank med risker från projektering, produktion och drift, och en arbetsgång där Claude granskar projekthandlingar mot banken.

- **Webbsidan** (`index.html`): fyll i en projektprofil, se vilka risker som är aktuella och läs riskbladen. Riskbladen innehåller förekomst, risknivå före och efter åtgärd, beslutsflöde, åtgärder per skede, kontrollfrågor och textmallar.
- **Granskning med Claude**: se [`CLAUDE.md`](CLAUDE.md). Kortfattat:
  1. Exportera projektprofilen från webbsidan till `projekt/<namn>/projekt.json`.
  2. Lägg handlingarna i `projekt/<namn>/handlingar/` eller länka till en Drive-mapp.
  3. Be Claude granska projektet. Claude kör `node scripts/urval.mjs projekt/<namn>/projekt.json`, går igenom handlingarna och skriver en rapport enligt `mallar/granskningsrapport.md`.

## Struktur

```
data/meta.json            skala, kategorier, profilfrågor
data/risker/<id>.json     ett riskblad per risk (källan – redigera här)
riskbank.json             genererad, läses av webbsidan
lib/relevans.mjs          urvalslogik (delas av webbsida och skript)
scripts/build.mjs         validerar och bygger riskbank.json
scripts/urval.mjs         riskurval + granskningslista för ett projekt
mallar/                   rapportmallar
projekt/                  ett underlag per projekt
```

## Kommandon (Node 18+)

```sh
node scripts/build.mjs                                  # validera och bygg riskbank.json
node scripts/build.mjs --check                          # bara validera (används i CI)
node scripts/urval.mjs projekt/exempel/projekt.json     # granskningslista i Markdown
```

Riskskalan följer er riskbedömningsmall: sannolikhet 1–4 × konsekvens 1–4, med Låg 1–3, Medel 4–9 och Hög 12–16. Föreskriftshänvisningarna följer AFS 2023:1–15.

> Repot bör vara **privat** om projekthandlingar läggs i `projekt/`.
