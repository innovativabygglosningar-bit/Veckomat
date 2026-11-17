#!/usr/bin/env node
// Tar fram vilka risker i banken som är aktuella för ett projekt och skriver
// en granskningslista i Markdown. Första steget i en granskning (se CLAUDE.md).
//
// Kör: node scripts/urval.mjs projekt/<namn>/projekt.json            > Markdown till stdout
//      node scripts/urval.mjs projekt/<namn>/projekt.json --json     > JSON till stdout
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { urval, niva, relevansText, obesvaradeFragor } from '../lib/relevans.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fil = process.argv[2];
if (!fil) { console.error('Ange sökväg till projekt.json'); process.exit(1); }
const db = JSON.parse(readFileSync(join(root, 'riskbank.json'), 'utf8'));
const projekt = JSON.parse(readFileSync(fil, 'utf8'));
const profil = projekt.profil || {};
const rader = urval(db, profil);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({
    projekt: projekt.namn,
    obesvarade: obesvaradeFragor(db, profil).map(q => q.id),
    risker: rader.map(({ risk, rel, varningar, rFore, rEfter }) => ({
      id: risk.id, titel: risk.titel, relevans: rel, sarskildRisk: risk.sarskildRisk || [],
      riskFore: rFore, riskEfter: rEfter, varningar: varningar.map(v => v.text),
      indikatorer: risk.indikatorer || [], granskning: risk.granskning
    }))
  }, null, 2));
  process.exit(0);
}

const lvl = r => `${r} ${niva(db.skala, r).namn}`;
const ut = [];
ut.push(`# Riskurval – ${projekt.namn || fil}`, '');
const svar = db.profilfragor.map(q => {
  const v = profil[q.id];
  const txt = Array.isArray(v) ? v.join(', ') : (v ?? '');
  return `- ${q.fraga} **${txt || '–'}**`;
});
ut.push('## Projektprofil', ...svar, '');
const obesv = obesvaradeFragor(db, profil);
if (obesv.length) ut.push('> Obesvarade profilfrågor som påverkar urvalet: ' + obesv.map(q => `\`${q.id}\``).join(', ') + '. Försök besvara dem ur handlingarna.', '');

for (const grupp of ['ja', 'mojlig', 'nej']) {
  const g = rader.filter(x => x.rel === grupp);
  if (!g.length) continue;
  ut.push(`## ${relevansText[grupp]} (${g.length})`, '');
  if (grupp === 'nej') { ut.push(g.map(x => `- ${x.risk.titel} (\`${x.risk.id}\`)`).join('\n'), ''); continue; }
  for (const { risk, varningar, rFore, rEfter } of g) {
    const sr = (risk.sarskildRisk || []).length ? ` · särskild risk ${risk.sarskildRisk.join(', ')}` : '';
    ut.push(`### ${risk.titel} (\`${risk.id}\`)`, `Risk före ${lvl(rFore)} → efter ${lvl(rEfter)}${sr} · riskblad: \`data/risker/${risk.id}.json\``);
    for (const v of varningar) ut.push(`> ⚠ ${v.text}`);
    if ((risk.indikatorer || []).length) ut.push(`Leta efter: ${risk.indikatorer.join(', ')}`);
    ut.push('');
    for (const q of risk.granskning) ut.push(`- [ ] \`${q.id}\` ${q.fraga}${q.underlag ? ` _(${q.underlag.join(', ')})_` : ''}`);
    ut.push('');
  }
}
ut.push('## Arbeten med särskild risk – kontrollera alltid', '');
const tackta = new Set(rader.filter(x => x.rel !== 'nej').flatMap(x => x.risk.sarskildRisk || []));
for (const s of db.kategorier.sarskildRisk) ut.push(`- [ ] ${s.nr}. ${s.text}${tackta.has(s.nr) ? '' : ' – _ingen risk i urvalet, bedöm om den förekommer_'}`);
console.log(ut.join('\n'));
