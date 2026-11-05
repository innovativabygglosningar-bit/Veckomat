// Matchar rätterna i bank-targets.json mot riktiga recept på Köket och Zeta (via deras sitemaps)
// och sparar råa receptdata i bank-raw.json (laddas upp som artifact, checkas inte in).
import fs from "node:fs";
import { getText, parseRecipe, sleep } from "./recipe-lib.mjs";
const targets = JSON.parse(fs.readFileSync("bank-targets.json", "utf8"));
const fold = s => s.toLowerCase().replace(/[åä]/g, "a").replace(/ö/g, "o").replace(/é/g, "e").replace(/[^a-z0-9 ]+/g, " ");
const STOP = new Set(["med", "och", "i", "pa", "till", "fran", "en", "ett", "samt", "a", "la", "de", "the", "recept", "enkel", "enkla", "snabb", "snabba", "god", "goda", "klassisk", "hemgjord", "hemlagad", "kramig"]);
const toks = s => fold(s).split(/\s+/).filter(w => w && !STOP.has(w) && !/^\d+$/.test(w));
async function locs(url, depth = 0) {
  const { status, text } = await getText(url); if (status !== 200) { console.log("sitemap", status, url); return []; }
  const l = [...text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1]);
  if (/<sitemapindex/i.test(text) && depth < 2) { let all = []; for (const u of l) { if (/image|video|news|tag|kock|artik|tema/i.test(u)) continue; all = all.concat(await locs(u, depth + 1)); await sleep(300); } return all; }
  return l;
}
async function sitemapsFor(base) {
  const { text } = await getText(base + "/robots.txt"); const sm = [...text.matchAll(/^sitemap:\s*(\S+)/gim)].map(m => m[1]);
  let all = []; for (const s of (sm.length ? sm : [base + "/sitemap.xml"])) all = all.concat(await locs(s));
  console.log(base, "URL:er i sitemap:", all.length); return all;
}
const pool = [];
for (const [base, filt] of [["https://www.koket.se", u => !/\/(kockar|artiklar|tema|mat|tv-program|koket-tv|halsa-livsstil|om-koket|sok|search)\b/.test(u)],
                            ["https://www.zeta.nu", u => /\/recept\//.test(u)]]) {
  try { (await sitemapsFor(base)).filter(filt).forEach(u => pool.push({ u, t: toks(decodeURIComponent(u.split("/").filter(Boolean).pop() || "").replace(/-/g, " ")) })); } catch (e) { console.log("fel", base, e.message); }
}
console.log("Kandidater totalt:", pool.length);
const sim = (a, b) => { const A = new Set(a), B = new Set(b); let i = 0; A.forEach(x => B.has(x) && i++); return i / (A.size + B.size - i || 1) + (i === A.size && A.size ? 0.25 : 0); };
// Huvudrätten (orden före "med", "i", "och", komma) måste finnas i det hittade receptets namn.
const head = n => toks(n.toLowerCase().split(/ med | i | på | samt |,| och /)[0]);
const has = (hs, ts) => hs.every(h => ts.some(t => t === h || (h.length >= 5 && (t.startsWith(h) || h.startsWith(t) && t.length >= 5)) || (t.length >= 6 && h.includes(t))));
const out = [];
for (const t of targets) {
  const hd = head(t.name);
  let cands = t.url ? [{ u: t.url, s: 9 }] : pool.filter(p => has(hd, p.t)).map(p => ({ u: p.u, s: sim(toks(t.name), p.t) })).sort((a, b) => b.s - a.s).slice(0, 4);
  let best = null;
  for (const c of cands) {
    try { const { status, text, url } = await getText(c.u); const r = status === 200 ? parseRecipe(text, url) : null;
      if (r && r.ingredients.length >= 3 && (t.url || has(hd, toks(r.name)))) { const s2 = t.url ? 9 : sim(toks(t.name), toks(r.name)); const score = s2 + (r.rating ? Math.min(r.rating.count, 500) / 2500 : 0);
        if (!best || score > best.score) best = { ...r, score, slugScore: c.s }; } } catch (e) { console.log("fel", c.u, e.message); }
    await sleep(600);
  }
  console.log(best ? `OK  ${t.name}  =>  ${best.name}  (${best.score.toFixed(2)})` : `--  ${t.name}  (ingen träff)`);
  out.push({ id: t.id, myName: t.name, match: best });
}
fs.writeFileSync("bank-raw.json", JSON.stringify(out));
console.log("Klart:", out.filter(o => o.match).length, "av", out.length);
