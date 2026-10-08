// Kleine bouwstenen voor de schermen.
export const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  e.append(...kids.flat().filter((x) => x != null && x !== false));
  return e;
};

const PADEN = {
  groei: 'M4 16 L16 4 M7 4 H16 V13',
  piek: 'M10 2 L18 10 L10 18 L2 10 Z',
  krimp: 'M4 4 L16 16 M7 16 H16 V7',
  herstel: 'M3 15 L9 9 L12 12 L17 5',
  juist: 'M4 11 L9 16 L17 5',
  fout: 'M5 5 L15 15 M15 5 L5 15',
  hint: 'M10 3 V12 M10 15.5 V16.5',
  vink: 'M4 11 L9 16 L17 5',
};
export const heeftIkoon = (naam) => naam in PADEN;
export const ikoon = (naam, maat = 20) => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 20 20');
  s.setAttribute('width', maat);
  s.setAttribute('height', maat);
  s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', PADEN[naam]);
  p.setAttribute('fill', 'none');
  p.setAttribute('stroke', 'currentColor');
  p.setAttribute('stroke-width', '2');
  s.append(p);
  return s;
};

const nf = new Intl.NumberFormat('nl-BE', { useGrouping: true });
// Getal in Vlaamse schrijfwijze, met een echt minteken.
export function fmt(n, dec = 0) {
  const tekst = new Intl.NumberFormat('nl-BE', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(Math.abs(n));
  return (n < 0 && Number(Math.abs(n).toFixed(dec)) !== 0 ? '−' : '') + tekst;
}
export const eenheidTekst = (n, eenheid, dec) => (eenheid === '%' ? `${fmt(n, dec)} %` : eenheid ? `${fmt(n, dec)} ${eenheid}` : fmt(n, dec));
export const datumNl = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
void nf;
