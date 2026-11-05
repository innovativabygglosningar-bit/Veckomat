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
