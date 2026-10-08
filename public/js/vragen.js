// De vraagvormen: meerkeuze, rekenpuzzel, begripkaart (koppelen), dominoketen (volgorde) en grafiek lezen.
// Elke vorm geeft terug: { node, klaar(), controleer(), nieuwePoging(), resultaat() }.
import { h, ikoon, fmt, eenheidTekst, datumNl } from './dom.js';
import { tekenGrafiek } from './grafiek.js';
import { parseGetal, schud, rekJuist, kopTelling, volTelling, mcJuist, aanwijsJuist } from './logica.js';

// Tabel met cijfers (bijvoorbeeld een anonieme jaarrekening voor de Bedrijfsdetective).
export function tabelNode(t) {
  return h('figure', { class: 'figuur' },
    t.titel ? h('figcaption', { class: 'figtitel' }, t.titel) : null,
    h('div', { class: 'tabelwrap' }, h('table', { class: 'tabel' },
      t.kolommen ? h('thead', {}, h('tr', {}, ...t.kolommen.map((k, i) => h('th', { scope: 'col', class: i ? 'num' : '' }, k)))) : null,
      h('tbody', {}, ...t.rijen.map((r) => h('tr', {}, ...r.map((c, i) => (i === 0 ? h('th', { scope: 'row' }, c) : h('td', { class: 'num' }, c)))))))),
    t.bron ? h('p', { class: 'klein bron' }, `Bron: ${t.bron}${t.geldig_op ? ' · geldig op ' + datumNl(t.geldig_op) : ''}`) : null);
}
// Wat boven de vraag staat: grafiek (bij "Raad de grafiek" zonder titel en bron) en tabel.
const BRON_GRAFIEK = (ctx, q, resultaat = false) => [
  q.grafiek ? tekenGrafiek(ctx.grafieken[q.grafiek], { anoniem: !!q.raad && !resultaat }).node : null,
  q.tabel ? tabelNode(q.tabel) : null,
];
const markering = (soort, tekst) => h('span', { class: `fb ${soort}`, style: 'margin:0' }, ikoon(soort === 'juist' ? 'juist' : 'fout'), tekst);

// ---------- meerkeuze ----------
function mcUI(q, ctx) {
  let gekozen = null;
  const lijst = h('ul', { class: 'rijen opties', role: 'radiogroup', 'aria-labelledby': 'vraag' });
  const teken = () => {
    lijst.replaceChildren(...q.opties.map((o, i) => h('li', {}, h('label', {},
      h('input', { type: 'radio', name: 'a', checked: gekozen === i, onchange: () => { gekozen = i; ui.opWijziging(); } }),
      h('span', {}, o)))));
  };
  teken();
  const ui = {
    node: h('div', {}, ...BRON_GRAFIEK(ctx, q), lijst),
    opWijziging: () => {},
    klaar: () => gekozen != null,
    controleer: () => ({ juist: mcJuist(q, gekozen) }),
    nieuwePoging: () => { gekozen = null; teken(); },
    resultaat: () => h('div', {}, ...BRON_GRAFIEK(ctx, q, true), h('ul', { class: 'rijen' }, ...q.opties.map((o, i) => h('li', {},
      h('div', { class: 'rij' }, h('span', {}, o),
        i === q.juist ? markering('juist', 'Juist antwoord') : i === gekozen ? markering('fout', 'Jouw keuze') : null))))),
  };
  return ui;
}

// ---------- rekenpuzzel ----------
function rekUI(q, ctx) {
  const veld = h('input', { type: 'text', inputmode: 'decimal', id: 'getal', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-labelledby': 'vraag', style: 'flex:1' });
  veld.addEventListener('input', () => ui.opWijziging());
  const getal = () => parseGetal(veld.value);
  const ui = {
    node: h('div', {}, ...BRON_GRAFIEK(ctx, q),
      h('div', { style: 'display:flex;gap:12px;align-items:center;margin-top:16px' }, veld, q.eenheid ? h('span', { class: 'zacht' }, q.eenheid) : null),
      h('p', { class: 'klein', style: 'margin-top:8px' }, 'Typ een getal. Een komma mag, zoals in 2,5.')),
    opWijziging: () => {},
    klaar: () => Number.isFinite(getal()),
    controleer: () => ({ juist: rekJuist(q, getal()) }),
    nieuwePoging: () => { veld.select(); },
    resultaat: () => {
      const g = getal();
      const juist = rekJuist(q, g);
      return h('div', {}, ...BRON_GRAFIEK(ctx, q, true), h('ul', { class: 'rijen' },
        h('li', {}, h('div', { class: 'rij' }, h('span', {}, 'Jouw antwoord'), h('span', {}, `${fmt(g, 2).replace(/,00$/, '')}${q.eenheid ? ' ' + q.eenheid : ''}`),
          juist ? markering('juist', 'Juist') : markering('fout', 'Nog niet juist'))),
        h('li', {}, h('div', { class: 'rij' }, h('span', {}, 'Juist antwoord'), h('strong', {}, `${fmt(q.antwoord, 2).replace(/,00$/, '')}${q.eenheid ? ' ' + q.eenheid : ''}`)))));
    },
  };
  return ui;
}

// ---------- begripkaart: termen aan uitleg koppelen ----------
function kopUI(q, ctx) {
  const n = q.paren.length;
  const volg = schud(n, q.id + ':rechts'); // rij j toont uitleg van paar volg[j]
  const toe = Array(n).fill(null);
  let actief = null;
  const lijstT = h('ul', { class: 'rijen' });
  const lijstU = h('ul', { class: 'rijen' });
  const letter = (j) => String.fromCharCode(65 + j);
  const rijVan = (uitleg) => volg.indexOf(uitleg);
  const teken = () => {
    lijstT.replaceChildren(...q.paren.map((p, i) => {
      const gekoppeld = toe[i] != null;
      return h('li', {}, h('button', { type: 'button', class: `rij kies${actief === i ? ' actief' : ''}`, 'aria-pressed': actief === i ? 'true' : 'false',
        onclick: () => { actief = i; teken(); } },
        h('span', {}, `${i + 1}. ${p[0]}`),
        h('span', { class: 'meta' }, gekoppeld ? `→ ${letter(rijVan(toe[i]))}` : (actief === i ? 'kies een uitleg' : ''))));
    }));
    lijstU.replaceChildren(...volg.map((pi, j) => {
      const term = toe.indexOf(pi);
      return h('li', {}, h('button', { type: 'button', class: `rij kies${term >= 0 ? ' gekoppeld' : ''}`,
        onclick: () => {
          if (actief == null) { if (term >= 0) { toe[term] = null; teken(); ui.opWijziging(); } return; }
          const oud = toe.indexOf(pi);
          if (oud >= 0) toe[oud] = null;
          toe[actief] = pi;
          const volgende = toe.findIndex((v) => v == null);
          actief = volgende >= 0 ? volgende : null;
          teken();
          ui.opWijziging();
        } },
        h('span', {}, `${letter(j)}. ${q.paren[pi][1]}`),
        h('span', { class: 'meta' }, term >= 0 ? `← ${term + 1}` : '')));
    }));
  };
  actief = 0;
  teken();
  const ui = {
    node: h('div', {},
      h('p', { class: 'klein' }, 'Tik eerst op een term, dan op de uitleg die erbij hoort. Tik op een gekoppelde uitleg zonder gekozen term om los te maken.'),
      h('h2', { class: 'subkop' }, 'Termen'), lijstT, h('h2', { class: 'subkop' }, 'Uitleg'), lijstU),
    opWijziging: () => {},
    klaar: () => toe.every((v) => v != null),
    controleer: () => { const t = kopTelling(q, toe); return { juist: t.juist, deel: `${t.goed} van ${t.van} juist gekoppeld` }; },
    nieuwePoging: () => { actief = toe.findIndex((v) => v == null); if (actief < 0) actief = null; teken(); },
    resultaat: () => h('ul', { class: 'rijen' }, ...q.paren.map((p, i) => h('li', {},
      h('div', { class: 'rij', style: 'align-items:flex-start;flex-wrap:wrap' },
        h('span', { style: 'flex:1 1 100%' }, h('strong', {}, p[0]), ` · ${p[1]}`),
        toe[i] === i ? markering('juist', 'Juist gekoppeld') : h('span', { class: 'fb fout', style: 'margin:0' }, ikoon('fout'), `Jij koppelde: ${toe[i] != null ? q.paren[toe[i]][1] : '(niets)'}`))))),
  };
  return ui;
}

// ---------- dominoketen: stappen in volgorde ----------
function volUI(q) {
  const n = q.stappen.length;
  const volg = schud(n, q.id + ':stappen'); // volg[j] = stapindex getoond op positie j
  let keten = [];
  const nog = h('ul', { class: 'rijen' });
  const gekozen = h('ol', { class: 'keten' });
  const teken = () => {
    gekozen.replaceChildren(...keten.map((s, pos) => h('li', {}, h('button', { type: 'button', class: 'rij kies gekoppeld', 'aria-label': `Stap ${pos + 1}: ${q.stappen[s]}. Tik om te verwijderen.`,
      onclick: () => { keten = keten.slice(0, pos).concat(keten.slice(pos + 1)); teken(); ui.opWijziging(); } },
      h('span', {}, `${pos + 1}. ${q.stappen[s]}`)))));
    nog.replaceChildren(...volg.filter((s) => !keten.includes(s)).map((s) => h('li', {}, h('button', { type: 'button', class: 'rij kies',
      onclick: () => { keten = [...keten, s]; teken(); ui.opWijziging(); } }, h('span', {}, q.stappen[s])))));
  };
  teken();
  const ui = {
    node: h('div', {},
      h('p', { class: 'klein' }, 'Tik de stappen aan in de juiste volgorde. Tik op een gekozen stap om hem te verwijderen.'),
      h('h2', { class: 'subkop' }, 'Jouw volgorde'), gekozen,
      h('button', { type: 'button', class: 'tweede', style: 'margin-top:8px;min-height:48px', onclick: () => { keten = []; teken(); ui.opWijziging(); } }, 'Begin opnieuw'),
      h('h2', { class: 'subkop' }, 'Nog te plaatsen'), nog),
    opWijziging: () => {},
    klaar: () => keten.length === n,
    controleer: () => { const t = volTelling(q, keten); return { juist: t.juist, deel: `${t.goed} van ${t.van} op de juiste plaats` }; },
    nieuwePoging: () => { teken(); },
    resultaat: () => h('ol', { class: 'keten' }, ...q.stappen.map((s, i) => h('li', {}, h('div', { class: 'rij', style: 'align-items:flex-start;flex-wrap:wrap' },
      h('span', { style: 'flex:1 1 100%' }, `${i + 1}. ${s}`),
      keten[i] === i ? markering('juist', 'Juiste plaats') : h('span', { class: 'fb fout', style: 'margin:0' }, ikoon('fout'), `Jij had hier: ${keten[i] != null ? q.stappen[keten[i]] : '(niets)'}`))))),
  };
  return ui;
}

// ---------- grafiek lezen: punt aanwijzen ----------
function aanwijsUI(q, ctx) {
  const g = ctx.grafieken[q.grafiek];
  let gekozen = null;
  const status = h('p', { class: 'status', role: 'status', 'aria-live': 'polite' }, 'Tik op de grafiek om een jaar te kiezen.');
  const kaart = tekenGrafiek(g, { kies: true, onkies: (i, p) => { gekozen = i; status.textContent = `Gekozen: ${p.x} · ${eenheidTekst(p.y, g.eenheid, g.decimalen ?? 0)}`; ui.opWijziging(); } });
  const stapKnop = (tekst, label, d) => h('button', { type: 'button', class: 'tweede', 'aria-label': label, style: 'min-height:48px;min-width:56px', onclick: () => kaart.kies((gekozen ?? (d > 0 ? -1 : kaart.aantal)) + d) }, tekst);
  const ui = {
    node: h('div', {}, kaart.node,
      h('div', { style: 'display:flex;gap:12px;align-items:center' }, stapKnop('←', 'Vorig punt', -1), h('div', { style: 'flex:1;text-align:center' }, status), stapKnop('→', 'Volgend punt', 1))),
    opWijziging: () => {},
    klaar: () => gekozen != null,
    controleer: () => ({ juist: aanwijsJuist(q, gekozen) }),
    nieuwePoging: () => {},
    resultaat: () => {
      const r = tekenGrafiek(g, {});
      const lijst = [{ i: q.juist, tekst: 'Juist', kleur: 'groei' }];
      if (gekozen !== q.juist && gekozen != null) lijst.push({ i: gekozen, tekst: 'Jouw keuze', kleur: 'krimp' });
      r.markeer(lijst);
      return h('div', {}, r.node, gekozen === q.juist ? null : h('p', { class: 'zacht' }, 'Het juiste punt staat in de grafiek aangeduid.'));
    },
  };
  return ui;
}

// ---------- leg het uit: eigen woorden, daarna zelf nakijken ----------
function legUI(q) {
  const veld = h('textarea', { id: 'eigen', rows: 6, 'aria-labelledby': 'vraag', placeholder: 'Schrijf of bedenk je antwoord in eigen woorden…' });
  veld.addEventListener('input', () => ui.opWijziging());
  const ui = {
    zelf: true,
    node: h('div', {}, h('p', { class: 'klein' }, 'Schrijf of bedenk eerst je eigen antwoord. Daarna zie je een modelantwoord met checkpunten en kijk je zelf na.'), veld),
    opWijziging: () => {},
    klaar: () => veld.value.trim().length >= 3,
    controleer: () => ({ juist: true }),
    nieuwePoging: () => {},
    resultaat: () => h('div', {},
      veld.value.trim() ? h('div', {}, h('h2', { class: 'subkop' }, 'Jouw antwoord'), h('p', { class: 'eigen' }, veld.value.trim())) : null,
      h('h2', { class: 'subkop' }, 'Modelantwoord'), h('p', {}, q.modelantwoord),
      h('h2', { class: 'subkop' }, 'Checkpunten'),
      h('ul', { class: 'rijen' }, ...q.checkpunten.map((c) => h('li', {}, h('div', { class: 'rij', style: 'align-items:flex-start' }, h('span', {}, c)))))),
  };
  return ui;
}

export function maakVraag(q, ctx) {
  switch (q.type) {
    case 'mc': return mcUI(q, ctx);
    case 'mythe': return mcUI({ ...q, opties: ['Feit', 'Mythe'], juist: q.feit ? 0 : 1 }, ctx);
    case 'rek': return rekUI(q, ctx);
    case 'kop': return kopUI(q, ctx);
    case 'vol': return volUI(q, ctx);
    case 'aanwijs': return aanwijsUI(q, ctx);
    case 'leg': return legUI(q, ctx);
    default: throw new Error('Onbekende vraagvorm: ' + q.type);
  }
}
export const VORM_NAAM = { mc: 'Meerkeuze', mythe: 'Mythe of feit', rek: 'Rekenpuzzel', kop: 'Begripkaart', vol: 'Dominoketen', aanwijs: 'Grafiek lezen', leg: 'Leg het uit' };
export const vormNaam = (q) => (q.raad ? 'Raad de grafiek' : q.cyclus ? 'Cyclus-plaatsing' : q.tabel && q.detective ? 'Bedrijfsdetective' : VORM_NAAM[q.type]);
