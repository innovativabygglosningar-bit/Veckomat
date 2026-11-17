# Riskbank BAS-P

Ett arbetsmiljöverktyg för BAS-P: en bank med risker från projektering, produktion och drift. Varje risk har ett eget riskblad som underlättar granskningen och arbetet med riskanalys och arbetsmiljöplan.

- `index.html`: själva appen, med banken (projektprofil, filter) och riskbladen (`#/risk/<id>`)
- `riskbank.json`: all data, alltså skala, kategorier, profilfrågor och risker

## En risk i `riskbank.json`

| Fält | Innehåll |
|---|---|
| `skeden`, `projekttyper`, `byggdelar`, `riskomrade`, `sarskildRisk` | Kategorisering (används av filtren) |
| `relevans` | När risken är aktuell, t.ex. `projekttyper`, `byggarFore`/`byggarFran`, `profil` |
| `profilvarningar` | Varningar som visas när projektprofilen matchar, t.ex. att inventering saknas |
| `vadArRisken`, `forekomst` | Beskrivning och var risken förekommer, med exempel |
| `riskFore` / `riskEfter` | Sannolikhet × konsekvens (1–4) med motivering |
| `beslutsflode` | Ja/nej-frågor som leder fram till hur risken omhändertas |
| `atgarder` | Åtgärd per skede och ansvarig |
| `granskning` | Kontrollfrågor vid granskning av handlingar |
| `textArbetsmiljoplan`, `textHandlingar` | Färdiga textmallar |
| `regler`, `kallor` | Föreskrifter och länkar |

`asbest` är det fullständiga mönsterbladet. Övriga risker har `"status": "utkast"`.

Skalan följer riskbedömningsmallen: Låg 1–3, Medel 4–9, Hög 12–16.
