# Riskbank BAS-P – instruktioner för Claude

Det här repot är ett arbetsmiljöverktyg för byggarbetsmiljösamordnare under planering och projektering (BAS-P). Det består av en riskbank och en arbetsgång för att granska projekthandlingar. Svara och skriv alltid på svenska.

## Struktur

| Sökväg | Innehåll |
|---|---|
| `data/meta.json` | Riskskala (S × K, 1–4), kategorier, de 13 arbetena med särskild risk, profilfrågor |
| `data/risker/<id>.json` | Ett riskblad per risk. **Det här är källan – redigera här.** |
| `riskbank.json` | Genererad sammanslagning som webbsidan läser. Redigera aldrig för hand. |
| `lib/relevans.mjs` | Urvalslogik (används av både webbsidan och skripten) |
| `scripts/build.mjs` | Validerar data och bygger `riskbank.json` |
| `scripts/urval.mjs` | Tar fram aktuella risker och granskningslista för ett projekt |
| `mallar/granskningsrapport.md` | Mall för granskningsrapporten |
| `projekt/<namn>/` | Ett projekt: `projekt.json` (profil), `handlingar/`, rapporter |
| `index.html` | Webbsidan: bläddra i banken, fyll i projektprofil, läs riskblad |

Föreskriftshänvisningar ska följa AFS 2023:1–15. Hänvisa inte till upphävda föreskrifter (t.ex. AFS 1999:3 eller AFS 2006:1).

## Granska ett projekt

1. **Projektprofil.** Läs `projekt/<namn>/projekt.json`. Saknas den: skapa den från `projekt/exempel/projekt.json` och besvara profilfrågorna (`data/meta.json` → `profilfragor`) ur handlingarna. Är ett svar osäkert, sätt `"vet ej"` och notera det. Användaren kan också exportera profilen från webbsidan.
2. **Urval.** Kör `node scripts/urval.mjs projekt/<namn>/projekt.json`. Det ger relevanta och möjliga risker, profilvarningar, ord att leta efter (`indikatorer`) och granskningsfrågor med ID. Avvik inte från urvalet utan att motivera varför.
3. **Läs handlingarna.** Gå igenom ritningar, beskrivningar, AF, tidplan, miljöinventering, geoteknik, etableringsplan och arbetsmiljöplan. Använd `indikatorer` för att hitta ställen där risken förekommer. Handlingarna kan ligga i `projekt/<namn>/handlingar/` eller på Google Drive.
4. **Besvara varje granskningsfråga** för relevanta risker, med ID (t.ex. `asbest.4`):
   - **Status:** `Omhändertagen` · `Delvis` · `Ej omhändertagen` · `Ej bedömbar` (underlag saknas) · `Ej aktuell`
   - **Underlag:** dokument + ritningsnummer/sida/avsnitt. Påstå aldrig att något finns i en handling utan en hänvisning.
   - **Åtgärd:** vad som ska göras, av vem (byggherre, arkitekt, konstruktör, VVS-, el-, mark-projektör, BAS-P), helst med en formulering de kan använda direkt.
5. **Bedöm risknivå** för projektet. Utgå från riskbladets `riskFore`/`riskEfter`, men justera efter vad handlingarna visar och motivera avvikelsen.
6. **Möjliga risker** (`mojlig`): avgör om de förekommer utifrån handlingarna. Uppdatera i så fall `projekt.json` och kör urvalet igen.
7. **Allmänna risker** (`allman: true`, en egen sektion i urvalet) finns på alla byggarbetsplatser. Kontrollera bara att arbetsmiljöplanen hanterar dem. Besvara inte deras frågor en och en.
8. **Särskild risk:** gå igenom alla 13 arbetena med särskild risk, även de som inget riskblad täcker.
9. **Risker utanför banken:** notera risker du hittar i handlingarna som banken saknar. Föreslå dem som nya riskblad i en egen sektion. Lägg inte in dem i banken utan att användaren godkänt det.
10. **Skriv rapporten** till `projekt/<namn>/granskning-ÅÅÅÅ-MM-DD.md` enligt `mallar/granskningsrapport.md`. Sammanfatta de viktigaste bristerna först.

Vid en uppföljande granskning: läs den förra rapporten och redovisa vilka punkter som har åtgärdats.

## Lägga till eller ändra en risk

1. Skapa `data/risker/<id>.json`. Utgå från `data/risker/asbest.json` (fullständigt blad, `"status": "klar"`) eller ett grundblad (`"status": "bas"`).
2. ID: små bokstäver, siffror och bindestreck. Granskningsfrågor får ID:n `<id>.1`, `<id>.2` … Byt aldrig ID på en befintlig fråga, eftersom äldre rapporter hänvisar till dem. Lägg nya frågor sist.
3. Värden för `skeden`, `projekttyper`, `byggdelar`, `riskomrade` och `sarskildRisk` måste finnas i `data/meta.json`.
4. `relevans` styr urvalet: `projekttyper` (någon av), `byggarFran`/`byggarFore` (intervall för byggår) och `profil` (svar på profilfrågor). Alla angivna villkor måste vara uppfyllda. En risk utan `relevans` gäller alla projekt.
5. Kör `node scripts/build.mjs`. Den validerar allt och stoppar på fel. Committa både riskfilen och `riskbank.json`.

### Fält i ett riskblad

| Fält | Krav | Innehåll |
|---|---|---|
| `id`, `titel`, `status`, `ingress` | ja | Grunddata. `status`: `klar` eller `bas` |
| `riskomrade`, `skeden`, `projekttyper`, `byggdelar`, `sarskildRisk` | ja (sarskildRisk kan vara tom) | Kategorisering |
| `allman` | nej | `true` för risker som finns på alla byggarbetsplatser och främst hanteras av entreprenören |
| `sokord`, `indikatorer` | nej | Sökord för webbsidan; ord att leta efter i handlingarna |
| `relevans`, `profilvarningar` | nej | Urvalslogik och varningar utifrån profilen |
| `vadArRisken`, `forekomst` | nej | Beskrivning; var risken förekommer (`plats`, `exempel`) |
| `riskFore`, `riskEfter` | ja | `{s, k, motivering}` med S och K 1–4 |
| `beslutsflode` | nej | Ja/nej-steg. `ja`/`nej` pekar på nästa steg-id eller `{slut, niva}` |
| `atgarder` | ja | `{skede, ansvar, atgard}` |
| `granskning` | ja | `{id, fraga, skede, underlag[]}` |
| `textArbetsmiljoplan`, `textHandlingar` | nej | Färdiga textmallar |
| `regler`, `kallor` | ja / nej | `{ref, text}`; `{titel, url}`. Ange källan i materialet, t.ex. punkt i BAS-P-arket. |

## Bakgrundsmaterial

Användarens arbetsmiljömapp på Google Drive innehåller äldre mallar, Bygghjälmens faktablad (t.ex. *Asbest.docx*) och ett BAS-P-ark med risker sorterade efter BSAB-kod (*Arbetsmiljö-BAS-P-Gällande.xlsx*). Använd dem som underlag när banken byggs ut, men uppdatera föreskriftshänvisningarna till AFS 2023.
