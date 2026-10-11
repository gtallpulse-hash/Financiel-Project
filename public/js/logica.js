// Spelregels zonder scherm: getallen lezen, husselen, nakijken. Los getest in tests/.

// Getal lezen zoals een Vlaming het typt: komma als decimaal, punt als duizendtal.
export function parseGetal(tekst) {
  if (typeof tekst !== 'string') return NaN;
  let s = tekst.replace(/euro|procentpunt|procent|[€%\s ]/gi, '').replace(/[−–—]/g, '-');
  if (!/^-?[\d.,]+$/.test(s)) return NaN;
  const komma = s.includes(',');
  const punt = s.includes('.');
  if (komma && punt) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (komma) {
    s = (s.match(/,/g) || []).length > 1 ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if (punt && /^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

const hash = (tekst) => {
  let x = 2166136261;
  for (const c of String(tekst)) { x ^= c.codePointAt(0); x = Math.imul(x, 16777619) >>> 0; }
  return x >>> 0;
};

// Vaste hussel per zaad: dezelfde vraag ziet er elke keer hetzelfde uit, maar nooit in de goede volgorde.
export function schud(n, zaad) {
  const p = Array.from({ length: n }, (_, i) => i);
  let x = hash(zaad) || 1;
  for (let i = n - 1; i > 0; i--) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    const j = x % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  if (n > 1 && p.every((v, i) => v === i)) p.push(p.shift());
  return p;
}

export const rekJuist = (q, getal) => Number.isFinite(getal) && Math.abs(getal - q.antwoord) <= q.marge + 1e-9;

// toe[i] = index van de gekozen uitleg voor term i (of null). Juist als toe[i] === i voor alle i.
export function kopTelling(q, toe) {
  const goed = q.paren.reduce((n, _, i) => n + (toe[i] === i ? 1 : 0), 0);
  return { goed, van: q.paren.length, juist: goed === q.paren.length };
}

// keten = indexen van stappen in de gekozen volgorde. Juist als keten[i] === i.
export function volTelling(q, keten) {
  const goed = keten.reduce((n, v, i) => n + (v === i ? 1 : 0), 0);
  return { goed, van: q.stappen.length, juist: keten.length === q.stappen.length && goed === q.stappen.length };
}

export const mcJuist = (q, gekozen) => gekozen === q.juist;
export const aanwijsJuist = (q, gekozen) => gekozen === q.juist;

// ---------- niveautest ----------
// Bij elk level stelt de test vier vragen uit lessen die gelijkmatig verdeeld liggen over het level.
export function spreidLessen(aantalLessen, k = 4) {
  const n = Math.min(k, aantalLessen);
  const uit = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.min(aantalLessen - 1, Math.floor(((i + 0.5) * aantalLessen) / n));
    if (!uit.includes(idx)) uit.push(idx);
  }
  return uit;
}
// Na twee gemiste vragen is het level niet gehaald: verder vragen heeft geen zin.
export const levelAfgebroken = (items) => items.filter((x) => !x.juist).length >= 2;
// items: [{ les: index van de les, juist }] in volgorde van de lessen.
// Gehaald (hoogstens één fout): alle lessen zijn gekend, behalve die van de gemiste vraag.
// Niet gehaald: gekend zijn de lessen tot en met de laatste juiste vraag vóór de eerste fout. Zonder bewijs (eerste vraag fout)
// is niets gekend. De volgende les is daarna de start.
export function beoordeelLevel(items, aantalLessen) {
  const gemist = items.filter((x) => !x.juist).map((x) => x.les);
  const alle = Array.from({ length: aantalLessen }, (_, i) => i);
  if (gemist.length <= 1) return { geslaagd: true, gekend: alle.filter((i) => !gemist.includes(i)), startLes: gemist.length ? gemist[0] : null };
  const eerste = Math.min(...gemist);
  const goed = items.filter((x) => x.juist && x.les < eerste).map((x) => x.les);
  const grens = goed.length ? Math.max(...goed) : -1;
  return { geslaagd: false, gekend: alle.filter((i) => i <= grens), startLes: grens + 1 };
}
