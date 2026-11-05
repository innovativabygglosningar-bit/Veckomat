// Hämtar "Gör så här"-stegen för bankens recept från källsidorna och sparar dem i Firestore
// (bankSteps/{id}) i stället för i det publika repot.
import fs from "node:fs";
import { getText, parseRecipe, sleep } from "./recipe-lib.mjs";
const cfg = Object.fromEntries([...fs.readFileSync("config.js", "utf8").matchAll(/(\w+):\s*"([^"]*)"/g)].map(m => [m[1], m[2]]));
const auth = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${cfg.apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ returnSecureToken: true }) })).json();
if (!auth.idToken) { console.log("Inloggning misslyckades"); process.exit(1); }
const AH = { "Authorization": "Bearer " + auth.idToken, "Content-Type": "application/json" };
const DB = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents`;
const recs = JSON.parse(fs.readFileSync("recipes.json", "utf8")).filter(r => r.src && r.url);
let done = 0, skip = 0, fail = 0;
for (const r of recs) {
  const ex = await fetch(`${DB}/bankSteps/${encodeURIComponent(r.id)}`, { headers: AH });
  if (ex.status === 200) { const j = await ex.json(); if (j.fields?.url?.stringValue === r.url) { skip++; continue; } }
  else if (ex.status === 403) { console.log("Saknar behörighet till bankSteps. Uppdatera reglerna i Firebase."); process.exit(0); }
  try {
    const { status, text, url } = await getText(r.url); const p = status === 200 ? parseRecipe(text, url) : null;
    if (!p || !p.steps.length) throw new Error("inga steg (" + status + ")");
    const body = { fields: { url: { stringValue: r.url }, steps: { arrayValue: { values: p.steps.slice(0, 20).map(s => ({ stringValue: s })) } }, at: { integerValue: String(Date.now()) } } };
    const w = await fetch(`${DB}/bankSteps/${encodeURIComponent(r.id)}`, { method: "PATCH", headers: AH, body: JSON.stringify(body) });
    if (!w.ok) throw new Error("kunde inte spara " + w.status); done++;
  } catch (e) { fail++; console.log("FEL", r.id, e.message); }
  await sleep(600);
}
console.log(`Steg sparade: ${done}, redan klara: ${skip}, fel: ${fail}`);
