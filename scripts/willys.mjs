// Hämtar veckans erbjudanden från Willys för vald butik och sparar dem i deals.json.
// Körs av GitHub Actions (.github/workflows/willys.yml). Willys har inget officiellt API;
// detta är samma JSON som willys.se själv läser in på sin erbjudandesida.
import fs from "node:fs";
const BASE = "https://www.willys.se";
const H = { "Accept": "application/json", "User-Agent": "Mozilla/5.0 (veckomat; hushållets matsedel)" };
const cfg = JSON.parse(fs.readFileSync("willys-store.json", "utf8"));
fs.mkdirSync("willys", { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getJson(url) {
  const r = await fetch(url, { headers: H });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}
function findArray(o, test, depth = 0) {
  if (!o || depth > 5) return null;
  if (Array.isArray(o) && o.length && test(o[0])) return o;
  if (typeof o === "object") for (const v of Object.values(o)) { const f = findArray(v, test, depth + 1); if (f) return f; }
  return null;
}
let storeId = cfg.storeId, storeName = "";
async function tryJson(url) {
  try { const r = await fetch(url, { headers: H }); const t = await r.text();
    console.log("Probe", r.status, url, t.slice(0, 200).replace(/\s+/g, " "));
    if (!r.ok) return null; return JSON.parse(t); } catch (e) { console.log("Probe fel", url, e.message); return null; }
}
if (!storeId) {
  const q = encodeURIComponent(cfg.search), want = cfg.search.toLowerCase();
  const urls = [
    `${BASE}/axfood/rest/store?online=false`,
    `${BASE}/axfood/rest/store`,
    `${BASE}/axfood/rest/search/store?q=${q}&online=false`,
    `${BASE}/axfood/rest/store/search?q=${q}`,
  ];
  let pick = null;
  for (const u of urls) {
    const s = await tryJson(u); if (!s) { await sleep(1500); continue; }
    const arr = findArray(s, x => x && (x.storeId || x.id) && (x.name || x.displayName)) || [];
    const hay = x => JSON.stringify([x.name, x.displayName, x.address, x.town, x.city]).toLowerCase();
    const hits = arr.filter(x => hay(x).includes(want) && !x.onlineStore);
    console.log(`  ${arr.length} butiker, ${hits.length} träffar för ${cfg.search}:`, hits.map(x => (x.storeId || x.id) + " " + (x.name || x.displayName)).join(" | "));
    if (hits.length) { fs.writeFileSync("willys/raw-store.json", JSON.stringify(hits, null, 1)); pick = hits[0]; break; }
    await sleep(1500);
  }
  if (!pick) throw new Error("Hittade ingen butik för " + cfg.search);
  storeId = String(pick.storeId || pick.id); storeName = pick.name || pick.displayName || "";
  await sleep(2000);
}
const all = [];
for (let page = 0; page < 10; page++) {
  const d = await getJson(`${BASE}/search/campaigns/offline?q=${encodeURIComponent(storeId)}&type=PERSONAL_GENERAL&page=${page}&size=100`);
  if (page === 0) fs.writeFileSync("willys/raw-offers.json", JSON.stringify(d, null, 1));
  const arr = d.results || findArray(d, x => x && x.name && (x.potentialPromotions || x.price)) || [];
  all.push(...arr);
  const pages = d.pagination?.numberOfPages ?? 1;
  if (page + 1 >= pages || !arr.length) break;
  await sleep(3000);
}
const fmt = v => v == null ? "" : typeof v === "object" ? (v.formattedValue || v.value || "") : String(v);
const deals = all.map(r => {
  const p = (r.potentialPromotions || [])[0] || {};
  return {
    name: r.name || "",
    brand: r.manufacturer || r.brand || "",
    size: r.displayVolume || r.productLine2 || "",
    offer: p.rewardLabel || p.conditionLabel || p.textLabel || fmt(p.price) || fmt(r.price),
    price: fmt(p.price) || fmt(r.price),
    compare: p.comparePrice || r.comparePrice || "",
    member: p.campaignType === "LOYALTY" || /stamm|kort|medlem/i.test(p.redeemLimitLabel || p.conditionLabel || ""),
    until: p.validUntil || p.endDate || "",
  };
}).filter(d => d.name);
const out = { store: storeName || cfg.search, storeId, fetched: new Date().toISOString(), count: deals.length, deals };
fs.writeFileSync("deals.json", JSON.stringify(out));
console.log(`Sparade ${deals.length} erbjudanden för butik ${storeId} ${storeName}`);
