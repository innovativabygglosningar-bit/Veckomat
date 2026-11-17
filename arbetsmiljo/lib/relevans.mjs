// Gemensam logik för urval av risker. Används av både webbsidan (index.html)
// och skripten (scripts/urval.mjs) så att Claude och användaren får samma urval.

/** Risknivå (Låg/Medel/Hög) för ett risktal r = S × K. */
export function niva(skala, r) {
  return skala.nivaer.find(n => r >= n.min && r <= n.max) || skala.nivaer[skala.nivaer.length - 1];
}

/**
 * Bedömer om en risk är aktuell för projektet.
 * Varje kriterium i risk.relevans som profilen har svar på måste stämma (OCH).
 * Kriterier som profilen saknar svar på ger "mojlig".
 * En risk utan relevans-kriterier gäller alla projekt ("ja").
 * @returns {"ja"|"mojlig"|"nej"}
 */
export function relevans(risk, profil = {}) {
  const rv = risk.relevans || {};
  const typer = profil.projekttyp || [];
  let okand = false, ok = true;

  if (rv.projekttyper) {
    if (!typer.length) okand = true;
    else if (!rv.projekttyper.some(p => typer.includes(p))) ok = false;
  }
  if (rv.byggarFore || rv.byggarFran) {
    const baraNybygg = typer.length && typer.every(p => p === 'nybyggnad');
    const ar = Number(profil.byggar) || 0;
    if (!ar) { if (baraNybygg) ok = false; else okand = true; }
    else if ((rv.byggarFore && ar >= rv.byggarFore) || (rv.byggarFran && ar < rv.byggarFran)) ok = false;
  }
  if (rv.profil) {
    for (const [k, vals] of Object.entries(rv.profil)) {
      const v = profil[k];
      if (!v || v === 'vet ej') okand = true;
      else if (!vals.includes(v)) ok = false;
    }
  }
  if (!ok) return 'nej';
  return okand ? 'mojlig' : 'ja';
}

export const relevansText = {
  ja: 'Relevant för projektet',
  mojlig: 'Möjlig – svara på fler frågor',
  nej: 'Ej aktuell enligt profilen'
};

/** Varningar i risken vars villkor uppfylls av profilen. */
export function profilVarningar(risk, profil = {}) {
  return (risk.profilvarningar || []).filter(v =>
    Object.entries(v.om).every(([k, vals]) => profil[k] && vals.includes(profil[k])));
}

/** Profilfrågor som saknar svar men behövs för att avgöra minst en risk. */
export function obesvaradeFragor(db, profil = {}) {
  const behov = new Set();
  for (const r of db.risker) {
    const rv = r.relevans || {};
    if (rv.projekttyper) behov.add('projekttyp');
    if (rv.byggarFore || rv.byggarFran) behov.add('byggar');
    Object.keys(rv.profil || {}).forEach(k => behov.add(k));
    (r.profilvarningar || []).forEach(v => Object.keys(v.om).forEach(k => behov.add(k)));
  }
  return db.profilfragor.filter(q => {
    if (!behov.has(q.id)) return false;
    const v = profil[q.id];
    return v === undefined || v === '' || v === 'vet ej' || (Array.isArray(v) && !v.length);
  });
}

/**
 * Urval för ett projekt: alla risker med relevans och varningar,
 * sorterade på relevans och sedan risktal före åtgärd.
 */
export function urval(db, profil = {}) {
  const ordning = { ja: 0, mojlig: 1, nej: 2 };
  return db.risker
    .map(risk => ({
      risk,
      rel: relevans(risk, profil),
      allman: risk.allman === true,
      varningar: profilVarningar(risk, profil),
      rFore: risk.riskFore.s * risk.riskFore.k,
      rEfter: risk.riskEfter.s * risk.riskEfter.k
    }))
    .sort((a, b) => ordning[a.rel] - ordning[b.rel] || b.rFore - a.rFore || a.risk.titel.localeCompare(b.risk.titel, 'sv'));
}
