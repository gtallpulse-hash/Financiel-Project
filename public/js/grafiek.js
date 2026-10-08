// Grafieken zelf getekend in SVG: lijn en staaf, zo weinig mogelijk inkt (zie DESIGN.md).
import { h, fmt, eenheidTekst, datumNl } from './dom.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (naam, attrs = {}, ...kids) => {
  const e = document.createElementNS(NS, naam);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  e.append(...kids.filter((k) => k != null));
  return e;
};
const KLEUR = { groei: 'var(--groei)', krimp: 'var(--krimp)', herstel: 'var(--herstel)', piek: 'var(--piek)', inkt: 'var(--inkt)' };

// Een nette bovengrens: 1, 2, 2.5, 5 of 10 keer een tiende macht.
export function mooiMax(v) {
  if (v <= 0) return 1;
  const macht = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (v <= m * macht + 1e-9) return m * macht;
  return 10 * macht;
}

export function tekenGrafiek(g, { kies = false, onkies = null, markeer = [], anoniem = false } = {}) {
  const W = 358, H = 224;
  const L = 60, R = 12, T = 48, B = 28;
  const reeksen = g.reeksen || [{ naam: null, punten: g.punten }];
  const punten = reeksen[0].punten;
  const n = punten.length;
  const referentie = g.referentie || [];
  const alle = [...reeksen.flatMap((r) => r.punten.map((p) => p.y)), ...referentie.map((r) => r.y)];
  let ymax, ymin;
  if (g.basis === 'data') {
    // as die niet bij nul begint (bijvoorbeeld een wisselkoers): alleen bij het verloop zelf
    const lo = Math.min(...alle), hi = Math.max(...alle);
    const stap = mooiMax((hi - lo) / 3);
    ymin = Math.floor(lo / stap + 1e-9) * stap;
    ymax = Math.ceil(hi / stap - 1e-9) * stap;
  } else {
    ymax = Math.max(...alle) <= 0 ? 0 : mooiMax(Math.max(...alle));
    ymin = Math.min(...alle, 0) < 0 ? -mooiMax(-Math.min(...alle)) : 0;
  }
  const bereik = ymax - ymin;
  const yPos = (v) => T + (1 - (v - ymin) / bereik) * (H - T - B);
  const slot = (W - L - R) / (g.soort === 'staaf' ? n : n - 1);
  const xPos = (i) => (g.soort === 'staaf' ? L + slot * (i + 0.5) : L + slot * i);
  const dec = g.decimalen ?? 0;
  const waarde = (v, d) => (g.eenheid === 'euro' ? `€ ${fmt(v, d)}` : eenheidTekst(v, g.eenheid, d));
  const tik = (v) => {
    const d = Number.isInteger(v) ? 0 : Math.min(dec, 2);
    return g.eenheid === '%' || g.eenheid === 'euro' ? waarde(v, d) : fmt(v, d);
  };

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', class: 'grafiek', focusable: 'false',
    'aria-label': `${anoniem ? 'Grafiek zonder titel' : g.titel}. ` + reeksen.map((r) => (r.naam ? r.naam + ': ' : '') + r.punten.map((p) => `${p.x}: ${waarde(p.y, dec)}`).join('; ')).join('. ') });

  // nullijn en hoogste lijn, verder niets
  const tekst = (x, y, inhoud, extra = {}) => el('text', { x, y, 'font-size': 13, fill: 'var(--zacht)', ...extra }, inhoud);
  const lijn = (v, kleur, dikte) => el('line', { x1: L, x2: W - R, y1: yPos(v), y2: yPos(v), stroke: kleur, 'stroke-width': dikte });
  const as = (v) => tekst(L - 6, yPos(v) + 4, tik(v), { 'text-anchor': 'end' });
  svg.append(lijn(ymax, 'var(--lijn)', 1), as(ymax));
  if (ymin < 0 || g.basis === 'data') {
    svg.append(lijn(ymin, 'var(--lijn)', 1));
    if (g.basis === 'data' || Math.abs(yPos(ymin) - yPos(0)) >= 18) svg.append(as(ymin));
  }
  if (ymin <= 0 && ymax >= 0 && !(g.basis === 'data' && (ymin === 0 || ymax === 0))) svg.append(lijn(0, 'var(--zacht)', 1.25), ymax === 0 ? null : as(0));
  for (const r of referentie) {
    svg.append(el('line', { x1: L, x2: W - R, y1: yPos(r.y), y2: yPos(r.y), stroke: 'var(--zacht)', 'stroke-width': 1.25, 'stroke-dasharray': '5 4' }));
    const onder = r.y < 0; // bij negatieve waarden hangen de staven naar beneden: het label staat links onder de lijn
    svg.append(tekst(onder ? L + 4 : W - R, yPos(r.y) + (onder ? 17 : -5), r.tekst, { 'text-anchor': onder ? 'start' : 'end', fill: 'var(--inkt)', stroke: 'var(--papier)', 'stroke-width': 4, 'paint-order': 'stroke', 'font-weight': 600 }));
  }

  // as onderaan: weinig labels
  const labelIdx = [];
  if (g.xjaar) {
    punten.forEach((p, i) => { if (/(Q1|K1|-01)$/.test(p.x) || i === 0) labelIdx.push(i); });
    const k = Math.ceil(labelIdx.length / 6);
    if (k > 1) { const houd = labelIdx.filter((_, j) => j % k === 0); labelIdx.length = 0; labelIdx.push(...houd); }
  } else {
    const stap = n <= 6 ? 1 : Math.ceil((n - 1) / 5);
    punten.forEach((p, i) => { if (i % stap === 0 || (i === n - 1 && (n - 1) % stap === 0)) labelIdx.push(i); });
  }
  for (const i of labelIdx) {
    const p = punten[i];
    const eind = i === n - 1 && g.soort !== 'staaf';
    const start = i === 0 && g.soort !== 'staaf';
    const t = g.xjaar ? p.x.slice(0, 4) : (eind && g.xtitel ? `${p.x} ${g.xtitel}` : p.x);
    svg.append(tekst(xPos(i), H - 8, t, { 'text-anchor': start ? 'start' : eind ? 'end' : 'middle' }));
  }

  // gegevens
  if (g.soort === 'staaf') {
    const w = Math.min(slot * 0.6, 28);
    punten.forEach((p, i) => {
      const y0 = yPos(0), y1 = yPos(p.y);
      svg.append(el('rect', { x: xPos(i) - w / 2, y: Math.min(y0, y1), width: w, height: Math.max(Math.abs(y1 - y0), 1), fill: 'var(--inkt)', opacity: 0.85 }));
    });
  } else {
    reeksen.forEach((r, k) => {
      const d = r.punten.map((p, i) => `${i ? 'L' : 'M'}${xPos(i).toFixed(1)} ${yPos(p.y).toFixed(1)}`).join(' ');
      svg.append(el('path', { d, fill: 'none', stroke: 'var(--inkt)', 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-dasharray': k ? '6 4' : '' }));
      if (r.naam) {
        const last = r.punten[r.punten.length - 1];
        const hoogste = last.y >= Math.max(...reeksen.map((x) => x.punten[x.punten.length - 1].y));
        svg.append(tekst(xPos(n - 1), yPos(last.y) + (hoogste ? -9 : 30), r.naam, { 'text-anchor': 'end', fill: 'var(--inkt)', 'font-weight': 600 }));
      }
      if (reeksen.length === 1) r.punten.forEach((p, i) => svg.append(el('circle', { cx: xPos(i), cy: yPos(p.y), r: 3, fill: 'var(--inkt)' })));
    });
  }

  // markeringen: ring plus korte tekst in de grafiek zelf
  const mark = el('g', {});
  svg.append(mark);
  function toonMarkeringen(lijst) {
    mark.replaceChildren();
    lijst.forEach(({ i, tekst: t, kleur }, rij) => {
      const p = punten[i];
      const x = xPos(i), y = yPos(p.y);
      const c = KLEUR[kleur] || KLEUR.herstel;
      if (g.soort === 'staaf') {
        const w = Math.min(slot * 0.6, 28);
        mark.append(el('rect', { x: x - w / 2 - 3, y: Math.min(yPos(0), y) - 3, width: w + 6, height: Math.abs(y - yPos(0)) + 6, fill: 'none', stroke: c, 'stroke-width': 2.5 }));
      } else mark.append(el('circle', { cx: x, cy: y, r: 7, fill: 'none', stroke: c, 'stroke-width': 3 }));
      // de tekst staat in de vrije strook boven de grafiek, nooit over de gegevens of de jaartallen
      const links = x > W / 2;
      mark.append(el('text', { x: links ? Math.min(x + 6, W - R) : Math.max(x - 6, L), y: 16 + rij * 18, 'text-anchor': links ? 'end' : 'start', 'font-size': 13, 'font-weight': 700, fill: c },
        `${t}: ${p.x} · ${waarde(p.y, dec)}`));
    });
  }
  toonMarkeringen(markeer);

  // kiezen door te tikken of met pijltjes
  let keuze = null;
  function zetKeuze(i) {
    keuze = Math.max(0, Math.min(n - 1, i));
    toonMarkeringen([{ i: keuze, tekst: 'Gekozen', kleur: 'herstel' }]);
    onkies?.(keuze, punten[keuze]);
  }
  if (kies) {
    svg.classList.add('kiesbaar');
    svg.setAttribute('tabindex', '0');
    svg.setAttribute('role', 'application');
    svg.addEventListener('pointerdown', (e) => {
      const r = svg.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * W;
      const i = g.soort === 'staaf' ? Math.floor((x - L) / slot) : Math.round((x - L) / slot);
      zetKeuze(i);
    });
    svg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); zetKeuze((keuze ?? -1) + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); zetKeuze((keuze ?? n) - 1); }
    });
  }

  const node = h('figure', { class: 'figuur' },
    h('figcaption', { class: 'figtitel' }, anoniem ? 'Grafiek zonder titel' : g.titel),
    svg,
    anoniem ? null : h('p', { class: 'klein bron' }, `Bron: ${g.bron} · geldig op ${datumNl(g.geldig_op)}`));
  return { node, kies: zetKeuze, markeer: toonMarkeringen, aantal: n, punt: (i) => punten[i], eenheid: g.eenheid, dec };
}
