// Gemensamma funktioner: hämta en receptsida och läsa schema.org/Recipe (JSON-LD).
export const H = { "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "sv-SE,sv;q=0.9",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" };
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export async function getText(url) { const r = await fetch(url, { headers: H, redirect: "follow" }); return { status: r.status, url: r.url, text: await r.text() }; }
const ent = s => String(s ?? "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
function walk(o, out) { if (!o || typeof o !== "object") return; if (Array.isArray(o)) { o.forEach(x => walk(x, out)); return; }
  const t = o["@type"]; if (t === "Recipe" || (Array.isArray(t) && t.includes("Recipe"))) out.push(o); if (o["@graph"]) walk(o["@graph"], out); }
function steps(ins) { const out = []; const f = x => { if (!x) return; if (typeof x === "string") { x.split(/\n+/).forEach(s => s.trim() && out.push(ent(s))); return; }
  if (Array.isArray(x)) { x.forEach(f); return; } if (x.itemListElement) { f(x.itemListElement); return; } if (x.text) out.push(ent(x.text)); else if (x.name) out.push(ent(x.name)); }; f(ins); return out.filter(Boolean); }
export function parseRecipe(html, url) {
  const found = [];
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { walk(JSON.parse(m[1].trim()), found); } catch { try { walk(JSON.parse(m[1].replace(/[\u0000-\u001f]+/g, " ")), found); } catch {} } }
  const r = found[0]; if (!r) return null;
  const img = Array.isArray(r.image) ? r.image[0] : r.image;
  return { url, name: ent(r.name), description: ent(r.description).slice(0, 300), yield: ent(Array.isArray(r.recipeYield) ? r.recipeYield[0] : r.recipeYield),
    totalTime: r.totalTime || r.cookTime || "", ingredients: (r.recipeIngredient || r.ingredients || []).map(ent).filter(Boolean),
    steps: steps(r.recipeInstructions), category: ent([].concat(r.recipeCategory || []).join(", ")), image: typeof img === "string" ? img : img?.url || "",
    rating: r.aggregateRating ? { value: +r.aggregateRating.ratingValue || 0, count: +(r.aggregateRating.ratingCount || r.aggregateRating.reviewCount) || 0 } : null };
}

// ---- Omvandla till appens receptformat ----
const UNIT = { g: "g", gram: "g", kg: "kg", hg: "hg", dl: "dl", cl: "cl", ml: "ml", l: "l", liter: "l", msk: "msk", tsk: "tsk", krm: "krm", st: "st", styck: "st",
  klyfta: "klyfta", klyftor: "klyfta", burk: "burk", burkar: "burk", frp: "förp", "förp": "förp", "förpackning": "förp", "förpackningar": "förp", paket: "paket", pkt: "paket",
  knippe: "knippe", knippen: "knippe", kruka: "st", krukor: "st", skiva: "st", skivor: "st", "påse": "förp", "påsar": "förp", nypa: "krm", ask: "förp", askar: "förp", tub: "förp", flaska: "förp" };
const FR = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 0.33, "⅔": 0.67 };
export function parseIngredient(s) {
  let t = String(s).replace(/\s+/g, " ").trim(); let q = null, u = "";
  t = t.replace(/^(ca\.?|cirka|ungefär|c:a)\s+/i, "");
  const mx = t.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)\s*/);
  if (mx) { q = +mx[1] + (+mx[2]) / (+mx[3]); t = t.slice(mx[0].length); }
  else { const m = t.match(/^(\d+(?:[.,]\d+)?)?\s*([½¼¾⅓⅔])?(?:\s*\/\s*(\d+))?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?\s*/);
    if (m && (m[1] || m[2])) { q = m[1] ? parseFloat(m[1].replace(",", ".")) : 0; if (m[3]) q = q / +m[3]; if (m[2]) q += FR[m[2]]; t = t.slice(m[0].length); } }
  const um = t.match(/^([a-zåäöA-ZÅÄÖ]+)\.?(\s|$)/);
  if (um && UNIT[um[1].toLowerCase()]) { u = UNIT[um[1].toLowerCase()]; t = t.slice(um[0].length); }
  if (u === "ml" && q != null) { q = q / 100; u = "dl"; } else if (u === "cl" && q != null) { q = q / 10; u = "dl"; } else if (u === "hg" && q != null) { q = q * 100; u = "g"; }
  if (u === "ml" || u === "cl") u = "dl"; if (u === "hg") u = "g";
  let n = t.split(/,|\(| till | att /)[0].trim() || t.trim();
  if (q != null && !u) u = "st";
  return { q: q == null ? null : Math.round(q * 100) / 100, u, n: n.charAt(0).toLowerCase() + n.slice(1), c: guessCat(n) };
}
export function guessCat(n) { const s = n.toLowerCase();
  const m = [["skafferi", /olja$|^(salt|peppar|svartpeppar|vitpeppar|olja|olivolja|rapsolja|smör och olja|socker|vetemjöl|mjöl|majsstärkelse|maizena|vinäger|ättika)|kryddor|^(oregano|timjan torkad|paprikapulver|spiskummin|kanel|curry|chiliflakes|lagerblad|kardemumma)/],
    ["kott", /kött|färs|kyckling|kalkon|korv|bacon|skinka|fläsk|biff|lax|torsk|sej|fisk|räk|lamm|entrecote|högrev|chorizo|pancetta|salsiccia|ankbröst|musslor|tonfisk/],
    ["torr", /krossade|passerade|konserv|kokosmjölk|buljong|fond|tomatpuré|soja|sweet chili|ostronsås|fisksås|currypasta|pesto/],
    ["mejeri", /mjölk|filmjölk|yoghurt|grädde|smör|ost|ägg|kvarg|crème|creme|gräddfil|parmesan|mozzarella|feta|halloumi|ricotta/],
    ["brod", /bröd|knäcke|tortilla|pita|naan|bulle|baguette|ciabatta/],
    ["frys", /fryst|frysta|glass/],
    ["gront", /äpple|banan|apelsin|citron|lime|lök|tomat|gurka|sallad|paprika|morot|morötter|potatis|avokado|spenat|broccoli|svamp|champinjon|vitlök|ingefära|persilja|dill|koriander|basilika|chili|zucchini|aubergine|kål|purjo|selleri|sparris|bönor|ärtor|mango|rödbet|palsternack|örter|mynta|timjan|rosmarin|gräslök|ruccola/],
    ["torr", /pasta|spaghetti|penne|fusilli|nudlar|ris|mjöl|socker|gryn|müsli|kaffe|bönor|linser|kikärt|konserv|krossade|buljong|fond|soja|sås|pesto|kokosmjölk|tomatpuré|couscous|bulgur|quinoa|nötter|frön|honung|senap|ketchup|majonnäs/]];
  for (const [c, re] of m) if (re.test(s)) return c; return "ovrigt"; }
function minutes(iso) { const m = String(iso || "").match(/P(?:T)?(?:(\d+)H)?(?:(\d+)M)?/i); if (!m) return 0; return (+(m[1] || 0)) * 60 + (+(m[2] || 0)); }
export function toAppRecipe(raw) {
  const ing = raw.ingredients.map(parseIngredient).filter(g => g.n);
  const all = ing.map(g => g.n).join(" | ");
  const protein = /lax|torsk|sej|fisk|räk|kummel|tonfisk|musslor|scampi|rödspätta|strömming|kräft/.test(all) && !/vegansk scampi/.test(all) ? "fisk"
    : /kyckling|kalkon|anka|ankbröst/.test(all) ? "fagel" : /färs|fläsk|nöt|biff|bacon|korv|skinka|lamm|högrev|entrecote|chorizo|pancetta|salsiccia|kassler|oxfilé|kalv/.test(all) ? "kott" : "vego";
  const bas = /nudlar/.test(all) ? "nudlar" : /pasta|spaghetti|penne|fusilli|tagliatelle|linguine|makaroner|lasagne|farfalle|rigatoni|tortellini|gnocchi|orzo|risoni/.test(all) ? "pasta"
    : /(^|[ |])(jasmin|basmati|långkornigt |arborio)?ris([ |]|$)/.test(all) ? "ris" : /bulgur|couscous|quinoa|matvete/.test(all) ? "gryn" : /potatis/.test(all) ? "potatis" : /bröd|tortilla|pita|naan|baguette/.test(all) ? "brod" : "ovrigt";
  const time = minutes(raw.totalTime) || 30; const sv = parseInt(String(raw.yield || "").match(/\d+/)?.[0] || "4", 10) || 4;
  return { name: raw.name, cat: time > 45 ? "helg" : "vardag", protein, bas, time, servings: sv, url: raw.url, ing, steps: raw.steps.slice(0, 15) };
}
