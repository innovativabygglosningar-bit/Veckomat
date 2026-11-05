// Bearbetar importkön i Firestore: hämtar receptsidor som användarna skickat in som länkar,
// läser receptet (schema.org/Recipe) och skriver tillbaka resultatet till samma dokument.
import fs from "node:fs";
import { getText, parseRecipe, toAppRecipe, sleep } from "./recipe-lib.mjs";
const cfg = Object.fromEntries([...fs.readFileSync("config.js", "utf8").matchAll(/(\w+):\s*"([^"]*)"/g)].map(m => [m[1], m[2]]));
const API = cfg.apiKey, PROJECT = cfg.projectId;
const auth = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ returnSecureToken: true }) })).json();
if (!auth.idToken) { console.log("Inloggning misslyckades", JSON.stringify(auth).slice(0, 300)); process.exit(1); }
const AH = { "Authorization": "Bearer " + auth.idToken, "Content-Type": "application/json" };
const DB = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const val = v => v === null || v === undefined ? { nullValue: null } : typeof v === "boolean" ? { booleanValue: v } : typeof v === "number" ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v })
  : typeof v === "string" ? { stringValue: v } : Array.isArray(v) ? { arrayValue: { values: v.map(val) } } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, val(x)])) } };
const q = await (await fetch(`${DB}/circles/veckomatgemensam0000000000000000:runQuery`, { method: "POST", headers: AH, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "imports" }],
  where: { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "pending" } } }, limit: 25 } }) })).json();
const docs = (Array.isArray(q) ? q : []).filter(x => x.document).map(x => x.document);
console.log("Väntande importer:", docs.length, Array.isArray(q) ? "" : JSON.stringify(q).slice(0, 300));
for (const d of docs) {
  const url = d.fields?.url?.stringValue || ""; let patch;
  try {
    if (!/^https?:\/\//.test(url)) throw new Error("Ogiltig länk");
    const { status, text, url: final } = await getText(url);
    if (status === 403) throw new Error("Sajten släpper inte in automatiska hämtningar (t.ex. ICA). Skriv in receptet själv.");
    if (status !== 200) throw new Error("Sidan svarade " + status);
    const raw = parseRecipe(text, final || url);
    if (!raw || !raw.ingredients.length) throw new Error("Hittade inget recept på sidan. Sajten använder inte standardformatet för recept.");
    patch = { status: "done", result: toAppRecipe(raw), doneAt: Date.now() };
    console.log("OK", url, "=>", raw.name);
  } catch (e) { patch = { status: "failed", error: String(e.message || e), doneAt: Date.now() }; console.log("FEL", url, e.message); }
  const mask = Object.keys(patch).map(k => "updateMask.fieldPaths=" + k).join("&");
  const r = await fetch(`https://firestore.googleapis.com/v1/${d.name}?${mask}`, { method: "PATCH", headers: AH, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, val(v)])) }) });
  if (!r.ok) console.log("Kunde inte spara", r.status, (await r.text()).slice(0, 300));
  await sleep(1000);
}
