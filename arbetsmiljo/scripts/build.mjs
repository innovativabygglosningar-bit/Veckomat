#!/usr/bin/env node
// Validerar data/meta.json + data/risker/*.json och bygger riskbank.json (som webbsidan läser).
// Kör: node scripts/build.mjs          (bygger)
//      node scripts/build.mjs --check  (validerar bara, ändrar inget)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const meta = JSON.parse(readFileSync(join(root, 'data/meta.json'), 'utf8'));
const dir = join(root, 'data/risker');
const filer = readdirSync(dir).filter(f => f.endsWith('.json')).sort();

const fel = [];
const ids = (lista) => new Set(meta.kategorier[lista].map(x => x.id));
const tillatna = {
  skeden: ids('skeden'), projekttyper: ids('projekttyper'), riskomraden: ids('riskomraden'),
  byggdelar: ids('byggdelar'), status: new Set(meta.status.map(s => s.id)),
  sarskildRisk: new Set(meta.kategorier.sarskildRisk.map(x => x.nr)),
  profil: new Set(meta.profilfragor.map(q => q.id))
};
const KRAV = ['id', 'titel', 'status', 'ingress', 'riskomrade', 'skeden', 'projekttyper', 'byggdelar', 'riskFore', 'riskEfter', 'atgarder', 'granskning', 'regler'];

const risker = [];
const granskIds = new Set();
for (const f of filer) {
  let r;
  try { r = JSON.parse(readFileSync(join(dir, f), 'utf8')); }
  catch (e) { fel.push(`${f}: ogiltig JSON – ${e.message}`); continue; }
  const F = (msg) => fel.push(`${f}: ${msg}`);

  for (const k of KRAV) if (r[k] === undefined) F(`saknar fältet "${k}"`);
  if (r.id && f !== `${r.id}.json`) F(`filnamnet ska vara ${r.id}.json`);
  if (r.id && !/^[a-z0-9-]+$/.test(r.id)) F('id får bara innehålla a–z, 0–9 och bindestreck');
  if (r.status && !tillatna.status.has(r.status)) F(`okänd status "${r.status}"`);
  if (r.allman !== undefined && typeof r.allman !== 'boolean') F('allman ska vara true eller false');
  if (r.riskomrade && !tillatna.riskomraden.has(r.riskomrade)) F(`okänt riskomrade "${r.riskomrade}"`);
  for (const [falt, mangd] of [['skeden', 'skeden'], ['projekttyper', 'projekttyper'], ['byggdelar', 'byggdelar']])
    for (const v of r[falt] || []) if (!tillatna[mangd].has(v)) F(`okänt värde "${v}" i ${falt}`);
  for (const n of r.sarskildRisk || []) if (!tillatna.sarskildRisk.has(n)) F(`okänd särskild risk ${n}`);
  for (const nyckel of ['riskFore', 'riskEfter']) {
    const v = r[nyckel];
    if (v && (![1, 2, 3, 4].includes(v.s) || ![1, 2, 3, 4].includes(v.k))) F(`${nyckel}: s och k ska vara 1–4`);
    if (v && !v.motivering) F(`${nyckel}: saknar motivering`);
  }
  if (r.riskFore && r.riskEfter && r.riskEfter.s * r.riskEfter.k > r.riskFore.s * r.riskFore.k) F('risk efter åtgärd är högre än före');
  for (const a of r.atgarder || []) {
    if (!tillatna.skeden.has(a.skede)) F(`åtgärd har okänt skede "${a.skede}"`);
    if (!a.ansvar || !a.atgard) F('åtgärd saknar ansvar eller text');
  }
  for (const g of r.granskning || []) {
    if (!g.id || !g.id.startsWith(r.id + '.')) F(`granskningsfråga saknar id på formen "${r.id}.N"`);
    else if (granskIds.has(g.id)) F(`dubblett av gransknings-id ${g.id}`); else granskIds.add(g.id);
    if (!tillatna.skeden.has(g.skede)) F(`granskning ${g.id}: okänt skede "${g.skede}"`);
  }
  const rv = r.relevans || {};
  for (const p of rv.projekttyper || []) if (!tillatna.projekttyper.has(p)) F(`relevans: okänd projekttyp "${p}"`);
  for (const k of Object.keys(rv.profil || {})) if (!tillatna.profil.has(k)) F(`relevans: okänd profilfråga "${k}"`);
  for (const v of r.profilvarningar || []) for (const k of Object.keys(v.om)) if (!tillatna.profil.has(k)) F(`profilvarning: okänd profilfråga "${k}"`);
  if (r.beslutsflode) {
    const steg = new Set(r.beslutsflode.map(s => s.id));
    for (const s of r.beslutsflode) for (const gren of ['ja', 'nej']) {
      const m = s[gren];
      if (typeof m === 'string' && !steg.has(m)) F(`beslutsflöde ${s.id}.${gren} pekar på okänt steg "${m}"`);
      if (typeof m === 'object' && !m.slut) F(`beslutsflöde ${s.id}.${gren} saknar "slut"`);
    }
  }
  risker.push(r);
}

const sedda = new Set();
for (const r of risker) { if (sedda.has(r.id)) fel.push(`dubblett av id ${r.id}`); sedda.add(r.id); }

if (fel.length) {
  console.error(`Fel i riskbanken (${fel.length}):\n - ` + fel.join('\n - '));
  process.exit(1);
}

risker.sort((a, b) => a.titel.localeCompare(b.titel, 'sv'));
const bank = { ...meta, risker };
const json = JSON.stringify(bank, null, 1) + '\n';
if (process.argv.includes('--check')) {
  let befintlig = '';
  try { befintlig = readFileSync(join(root, 'riskbank.json'), 'utf8'); } catch {}
  if (befintlig !== json) { console.error('riskbank.json är inte uppdaterad – kör node scripts/build.mjs'); process.exit(1); }
  console.log(`OK – ${risker.length} risker, riskbank.json är aktuell.`);
} else {
  writeFileSync(join(root, 'riskbank.json'), json);
  console.log(`OK – ${risker.length} risker skrivna till riskbank.json`);
}
