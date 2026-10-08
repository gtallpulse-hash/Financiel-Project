import { maakStore, vandaag } from './store.js';
import { synchroniseer } from './sync.js';
import { h, ikoon, heeftIkoon, datumNl } from './dom.js';
import { maakVraag, VORM_NAAM } from './vragen.js';
import { feest } from './feest.js';

// ---------- opslag en inhoud ----------
const geheugen = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
let opslag;
try { localStorage.getItem('x'); opslag = localStorage; } catch { opslag = geheugen(); }
const store = maakStore(opslag);

const FOUT_URL = 'https://github.com/gtallpulse-hash/Financiel-Project/issues/new';
const DOMEINEN = ['Basis', 'Macro', 'Jaarrekening', 'Waardering', 'Cycli en trends', 'Energie en netten'];
let niveau = null;
const begrippen = new Map();
let laadFout = false;

async function laadInhoud() {
  try {
    const r = await fetch('data/level1.json');
    if (!r.ok) throw new Error('level1');
    niveau = await r.json();
    for (const b of niveau.begrippen) begrippen.set(b.id, b);
  } catch { laadFout = true; }
}

const lesSleutel = (l) => `${niveau.id}-${l.id}`;
const lesKlaar = (l) => !!store.les(lesSleutel(l))?.klaar;
const volgendeLes = () => niveau.lessen.find((l) => !lesKlaar(l)) || null;
const lesNummer = (l) => niveau.lessen.indexOf(l) + 1;
const lesOntgrendeld = (l) => lesNummer(l) === 1 || lesKlaar(niveau.lessen[lesNummer(l) - 2]);
const alleLessenKlaar = () => niveau.lessen.every(lesKlaar);
const toetsStand = () => store.les(`${niveau.id}-toets`);
const toetsGehaald = () => !!toetsStand()?.geslaagd;

// ---------- schermen ----------
const app = document.getElementById('app');
const balk = document.getElementById('balk');

function scherm(nodes, knoppen = []) {
  app.replaceChildren(...nodes.filter(Boolean));
  if (knoppen.length) { balk.replaceChildren(h('div', {}, ...knoppen)); balk.hidden = false; }
  else { balk.replaceChildren(); balk.hidden = true; }
  window.scrollTo(0, 0);
  app.focus({ preventScroll: true });
}
const kop = (links, rechts) => h('div', { class: 'kop' }, links, h('span', {}, rechts || ''));
const terug = (tekst = '← Terug', href = '#') => h('a', { class: 'terug', href }, tekst);
const knop = (tekst, soort, actie, extra = {}) => h('button', { class: soort, type: 'button', onclick: actie, ...extra }, tekst);
const linkKnop = (tekst, soort, href) => h('a', { class: `knop ${soort}`, href }, tekst);
const geenAdvies = () => h('p', { class: 'klein' }, 'Geen beleggingsadvies. Dit is uitleg, geen aankoop- of verkooptip.');
const voortgangsbalk = (deel, totaal) => h('p', { class: 'voortgang', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': totaal, 'aria-valuenow': deel }, h('span', { style: `width:${totaal ? (deel / totaal) * 100 : 0}%` }));

function meldFout(onderwerp, id, vraag) {
  const body = `Waar: ${id}\n${vraag ? 'Vraag: ' + vraag + '\n' : ''}\nWat klopt er niet, en wat is de juiste bron?\n`;
  const href = `${FOUT_URL}?title=${encodeURIComponent('Fout in: ' + onderwerp)}&body=${encodeURIComponent(body)}`;
  return h('a', { class: 'klein', href, target: '_blank', rel: 'noopener' }, 'Meld een fout');
}

function bronRegel(b, id, vraag) {
  return h('div', { class: 'bron' },
    h('p', { class: 'klein', style: 'margin:0 0 4px' },
      'Bron: ', b.bron_url ? h('a', { href: b.bron_url, target: '_blank', rel: 'noopener' }, b.bron) : b.bron,
      ` · geldig op ${datumNl(b.geldig_op)}`),
    meldFout(b.nl, id || b.id, vraag));
}

// ---------- thema en synchronisatie ----------
function pasThemaToe() {
  const t = store.instellingen().thema;
  if (t === 'licht' || t === 'donker') document.documentElement.dataset.thema = t;
  else delete document.documentElement.dataset.thema;
}
let syncStatus = { status: store.instellingen().sleutel ? 'nog niet' : 'uit' };
let syncBezig = null;
function autoSync() {
  if (syncBezig) return syncBezig;
  syncBezig = synchroniseer(store).then((r) => { syncStatus = r; return r; }).finally(() => { syncBezig = null; });
  return syncBezig;
}
const syncTekst = (s) => ({
  uit: 'Synchronisatie staat uit. Je voortgang staat alleen op dit toestel.',
  'nog niet': 'Nog niet gesynchroniseerd.',
  ok: 'Gesynchroniseerd.',
  offline: 'Geen bereik. Je voortgang is bewaard en gaat mee zodra het weer kan.',
  sleutel: 'De sleutel is te kort of niet geldig.',
  fout: 'De server antwoordde niet goed. Probeer later opnieuw.',
}[s.status] || '');

// ---------- start ----------
function start() {
  if (laadFout || !niveau) {
    scherm([kop(h('span', {}, 'Leerspel Beleggen & Economie')), h('h1', {}, 'Vandaag leren'),
      h('p', { class: 'waarschuwing' }, 'De lessen konden niet geladen worden. Probeer later opnieuw met bereik.')],
    [linkKnop('Instellingen en back-up', 'tweede', '#instellingen')]);
    return;
  }
  const dag = vandaag();
  const teHerhalen = store.teHerhalen(dag).filter((id) => begrippen.has(id)).length;
  const reeks = store.streak(dag);
  const les = volgendeLes();
  const klaar = niveau.lessen.filter(lesKlaar).length;
  const hoofdKnop = les
    ? linkKnop(`Verder met les ${lesNummer(les)} · 10–15 min`, 'hoofd', '#sessie/normaal')
    : (toetsGehaald() ? linkKnop('Herhaling · 10–15 min', 'hoofd', '#sessie/normaal') : linkKnop('Naar de eindtoets', 'hoofd', '#toets'));
  scherm([
    kop(h('span', {}, 'Leerspel Beleggen & Economie'), reeks ? `Reeks: ${reeks} ${reeks === 1 ? 'dag' : 'dagen'}` : ''),
    h('h1', {}, 'Vandaag leren'),
    h('section', { 'aria-label': 'Volgende stap' },
      h('p', { class: 'klein', style: 'margin:0' }, `Level 1 · ${niveau.titel} · ${klaar} van ${niveau.lessen.length} lessen klaar`),
      voortgangsbalk(klaar, niveau.lessen.length),
      h('p', { style: 'margin:12px 0 0;font-weight:600' }, les ? `Les ${lesNummer(les)}: ${les.titel}` : toetsGehaald() ? 'Level 1 is gehaald.' : 'Alle lessen zijn klaar. De eindtoets wacht.')),
    h('section', { 'aria-label': 'Herhaling' },
      h('div', { class: 'getal' }, String(teHerhalen)),
      h('p', { class: 'zacht', style: 'margin:0' }, teHerhalen === 1 ? 'begrip om te herhalen' : 'begrippen om te herhalen')),
    h('section', {}, h('ul', { class: 'rijen' },
      h('li', {}, h('a', { class: 'rij', href: '#campagne' }, h('span', {}, 'Campagne en lessen'), h('span', { class: 'meta' }, 'Level 1'))),
      h('li', {}, h('a', { class: 'rij', href: '#sessie/lang' }, h('span', {}, 'Lange sessie'), h('span', { class: 'meta' }, '20+ min'))),
      h('li', {}, h('a', { class: 'rij', href: '#boek' }, h('span', {}, 'Begrippenboek'), h('span', { class: 'meta' }, `${[...begrippen.keys()].filter((id) => store.bekend(id)).length} vrijgespeeld`))),
      h('li', {}, h('a', { class: 'rij', href: '#kenniskaart' }, h('span', {}, 'Kenniskaart'))),
      h('li', {}, h('a', { class: 'rij', href: '#instellingen' }, h('span', {}, 'Instellingen en back-up'))))),
    geenAdvies(),
  ], [hoofdKnop, linkKnop('Korte sessie · 5 min', 'tweede', '#sessie/kort')]);
}

// ---------- campagne ----------
function campagne() {
  const klaar = niveau.lessen.filter(lesKlaar).length;
  scherm([
    kop(terug()),
    h('h1', {}, `Level 1 · ${niveau.titel}`),
    h('p', { class: 'zacht' }, `${klaar} van ${niveau.lessen.length} lessen klaar. Je haalt het level met 80 % op de eindtoets.`),
    voortgangsbalk(klaar, niveau.lessen.length),
    h('ul', { class: 'rijen', style: 'margin-top:16px' },
      ...niveau.lessen.map((l) => {
        const open = lesOntgrendeld(l);
        const status = lesKlaar(l) ? 'klaar' : (l === volgendeLes() ? 'volgende' : 'vergrendeld');
        const inhoud = [h('span', { style: 'display:flex;gap:8px;align-items:center' }, status === 'klaar' ? ikoon('juist') : null, `${lesNummer(l)}. ${l.titel}`), h('span', { class: 'meta' }, status)];
        return h('li', {}, open ? h('a', { class: 'rij', href: `#les/${l.id}` }, ...inhoud) : h('div', { class: 'rij zacht', 'aria-disabled': 'true' }, ...inhoud));
      }),
      h('li', {}, alleLessenKlaar()
        ? h('a', { class: 'rij', href: '#toets' }, h('span', { style: 'display:flex;gap:8px;align-items:center' }, toetsGehaald() ? ikoon('juist') : null, 'Eindtoets Level 1'), h('span', { class: 'meta' }, toetsGehaald() ? `gehaald (${toetsStand().score}/${toetsStand().van})` : 'beschikbaar'))
        : h('div', { class: 'rij zacht', 'aria-disabled': 'true' }, h('span', {}, 'Eindtoets Level 1'), h('span', { class: 'meta' }, 'vergrendeld')))),
    h('p', { class: 'klein', style: 'margin-top:16px' }, 'Level 2 (Macro-economie) volgt zodra Level 1 af is getest.'),
  ], [linkKnop('Terug naar start', 'hoofd', '#')]);
}

// ---------- uitlegkaart ----------
function uitlegInhoud(b) {
  const c = b.cyclus;
  return [
    h('h1', {}, b.nl),
    h('p', { class: 'zacht' }, `${b.nl} · ${b.en}`),
    h('dl', { class: 'uitleg' },
      h('dt', {}, 'Wat is het?'), h('dd', {}, b.wat),
      h('dt', {}, 'Uit het dagelijks leven'), h('dd', {}, b.vergelijking),
      h('dt', {}, 'Voorbeeld'), h('dd', {}, b.voorbeeld),
      c ? [h('dt', {}, 'Plaats op de economische cyclus'),
        h('dd', {}, heeftIkoon(c.fase) ? h('div', { style: `color:var(--${c.fase});font-weight:600;display:flex;gap:8px;align-items:center` }, ikoon(c.fase), c.fase[0].toUpperCase() + c.fase.slice(1)) : null, c.tekst)] : null),
    bronRegel(b),
    geenAdvies(),
  ];
}
function uitlegScherm(b, { kopTekst, knopTekst, actie, stop, terugHref }) {
  scherm([kop(stop ? terug('Stop en bewaar') : terug('← Terug', terugHref || '#'), kopTekst), ...uitlegInhoud(b)], [knop(knopTekst, 'hoofd', actie)]);
}

// ---------- vragen stellen ----------
function kiesVragen(b, aantal) {
  const start = store.concept(b.id).n % b.vragen.length;
  return Array.from({ length: Math.min(aantal, b.vragen.length) }, (_, k) => b.vragen[(start + k) % b.vragen.length]);
}
function verdeel(ids, totaal) {
  const rest = ids.map((id) => begrippen.get(id).vragen.length);
  const aantal = ids.map(() => 0);
  let over = totaal;
  while (over > 0 && rest.some((r, i) => r > aantal[i])) {
    for (let i = 0; i < ids.length && over > 0; i++) if (aantal[i] < rest[i]) { aantal[i]++; over--; }
  }
  return aantal;
}

// Een stap in een sessie: { soort: 'uitleg' | 'vraag', ... }
const uitlegStap = (b, fase) => ({ soort: 'uitleg', b, fase });
const vraagStap = (b, q, fase, toets = false) => ({ soort: 'vraag', b, q, fase, toets });

let sessieBezig = false;
function speel(stappen, { klaar }) {
  sessieBezig = true;
  history.replaceState(null, '', location.pathname + location.search + '#');
  const totaalVragen = stappen.filter((s) => s.soort === 'vraag').length;
  const res = { n: 0, juist: 0, opnieuw: [], fout: new Set(), begrippen: new Set() };
  let vraagNr = 0;
  const volgende = (i) => {
    if (i >= stappen.length) return klaar(res);
    const s = stappen[i];
    if (s.soort === 'uitleg') {
      uitlegScherm(s.b, { kopTekst: s.fase, knopTekst: 'Naar de vragen', stop: true, actie: () => volgende(i + 1) });
    } else {
      vraagNr++;
      vraagScherm(s, vraagNr, totaalVragen, res, () => volgende(i + 1));
    }
  };
  volgende(0);
}

function vraagScherm(stap, nr, totaal, res, ga) {
  const { b, q, toets } = stap;
  const maxPogingen = toets ? 1 : 2;
  let poging = 0;
  const ui = maakVraag(q, { grafieken: niveau.grafieken });
  const hintVak = h('div', { role: 'status', 'aria-live': 'polite' });
  const uitlegVak = h('div', {});
  const vraagKop = h('h1', { id: 'vraag', style: 'font-size:24px;line-height:32px' }, q.vraag);
  const controleer = knop('Controleer', 'hoofd', () => {
    if (!ui.klaar()) return;
    poging++;
    const r = ui.controleer();
    if (r.juist || poging >= maxPogingen) return afronden(r.juist);
    hintVak.replaceChildren(h('p', { class: 'fb hint', style: 'margin-top:16px' }, ikoon('hint', 24), h('span', {}, `Nog niet juist.${r.deel ? ' ' + r.deel + '.' : ''} Hint: ${q.hint}`)));
    ui.nieuwePoging();
    controleer.disabled = !ui.klaar();
  }, { disabled: true });
  ui.opWijziging = () => { controleer.disabled = !ui.klaar(); };

  function afronden(juist) {
    const eerste = juist && poging === 1;
    store.antwoord(b.id, eerste);
    res.n++;
    res.begrippen.add(b.id);
    if (eerste) res.juist++; else { res.opnieuw.push(b.nl); res.fout.add(b.id); }
    const soort = eerste ? 'juist' : juist ? 'let-op' : 'fout';
    const tekst = eerste ? 'Juist.' : juist ? 'Juist bij de tweede poging. Dit komt sneller terug.' : (toets ? 'Nog niet juist.' : 'Nog niet juist. Dit komt sneller terug.');
    hintVak.replaceChildren();
    ui.node.replaceWith(ui.resultaat());
    uitlegVak.replaceChildren(
      h('p', { class: `fb ${soort}`, role: 'status', style: 'margin-top:16px' }, ikoon(juist ? 'juist' : 'fout', 24), h('span', {}, tekst)),
      h('dl', { class: 'uitleg' },
        h('dt', {}, 'Waarom'), h('dd', {}, q.waarom),
        h('dt', {}, 'Wanneer het anders loopt'), h('dd', {}, q.wanneer),
        h('dt', {}, 'Waar je het aan herkent'), h('dd', {}, q.herken)),
      bronRegel(b, q.id, q.vraag));
    const volgendeKnop = knop(nr === totaal ? 'Afronden' : 'Volgende', 'hoofd', ga);
    balk.replaceChildren(h('div', {}, volgendeKnop));
    window.scrollTo({ top: uitlegVak.offsetTop - 80 });
    volgendeKnop.focus({ preventScroll: true });
  }

  scherm([
    kop(terug('Stop en bewaar'), `${stap.fase} · vraag ${nr} van ${totaal}`),
    voortgangsbalk(nr - 1, totaal),
    h('p', { class: 'klein', style: 'margin:12px 0 0' }, VORM_NAAM[q.type] + (toets ? ' · eindtoets, één poging' : '')),
    vraagKop, ui.node, hintVak, uitlegVak,
  ], [controleer]);
}

// ---------- sessies ----------
function bouwSessie(soort) {
  const dag = vandaag();
  const les = volgendeLes();
  const lesIds = les ? les.begrippen : [];
  const stappen = [];
  const herhaal = (max, uitsluiten = []) => store.teHerhalen(dag).filter((id) => begrippen.has(id) && !uitsluiten.includes(id)).slice(0, max);
  const lesStappen = (l, totaal) => {
    const aantallen = verdeel(l.begrippen, totaal);
    l.begrippen.forEach((id, i) => {
      const b = begrippen.get(id);
      stappen.push(uitlegStap(b, 'Nieuw begrip'));
      kiesVragen(b, aantallen[i]).forEach((q) => stappen.push(vraagStap(b, q, 'Les')));
    });
  };

  if (soort === 'kort') {
    const due = herhaal(3);
    if (due.length) due.forEach((id) => { const b = begrippen.get(id); stappen.push(vraagStap(b, kiesVragen(b, 1)[0], 'Herhaling')); });
    else if (les) {
      const b = begrippen.get(lesIds.find((id) => !store.bekend(id)) || lesIds[0]);
      stappen.push(uitlegStap(b, 'Uitlegkaart'));
      kiesVragen(b, 3).forEach((q) => stappen.push(vraagStap(b, q, 'Oefenen')));
    }
    return { stappen, les: null };
  }

  herhaal(soort === 'lang' ? 7 : 5, lesIds).forEach((id) => { const b = begrippen.get(id); stappen.push(vraagStap(b, kiesVragen(b, 1)[0], 'Opwarmer')); });
  if (les) lesStappen(les, 8);
  if (soort === 'lang') {
    const gebruikt = new Set(stappen.filter((s) => s.soort === 'vraag').map((s) => s.b.id));
    const kandidaten = [...begrippen.values()].filter((b) => store.bekend(b.id) && !gebruikt.has(b.id))
      .sort((a, b) => store.concept(a.id).lvl - store.concept(b.id).lvl).slice(0, 5);
    kandidaten.forEach((b) => stappen.push(vraagStap(b, kiesVragen(b, 1)[0], 'Extra oefening')));
  }
  return { stappen, les };
}

function startSessie(soort) {
  const { stappen, les } = bouwSessie(soort);
  if (!stappen.length) {
    scherm([kop(terug()), h('h1', {}, 'Alles herhaald voor vandaag'),
      h('p', {}, alleLessenKlaar() && !toetsGehaald() ? 'Er staat niets meer klaar. Je kunt de eindtoets doen.' : 'Er staat niets meer klaar. Kom morgen terug, of bekijk het begrippenboek.')],
    [alleLessenKlaar() && !toetsGehaald() ? linkKnop('Naar de eindtoets', 'hoofd', '#toets') : linkKnop('Terug naar start', 'hoofd', '#'), linkKnop('Begrippenboek', 'tweede', '#boek')]);
    return;
  }
  speel(stappen, { klaar: (res) => sessieKlaar(res, les) });
}

function startLes(id) {
  const l = niveau.lessen.find((x) => x.id === id);
  if (!l || !lesOntgrendeld(l)) return campagne();
  const stappen = [];
  const aantallen = verdeel(l.begrippen, 8);
  l.begrippen.forEach((bid, i) => {
    const b = begrippen.get(bid);
    stappen.push(uitlegStap(b, 'Nieuw begrip'));
    kiesVragen(b, aantallen[i]).forEach((q) => stappen.push(vraagStap(b, q, 'Les')));
  });
  speel(stappen, { klaar: (res) => sessieKlaar(res, l) });
}

function sessieKlaar(res, les) {
  const eerderKlaar = les ? lesKlaar(les) : false;
  if (les) store.zetLes(lesSleutel(les), { klaar: 1, dag: vandaag() });
  autoSync();
  const reeks = store.streak(vandaag());
  const zinnen = les
    ? les.afsluiter
    : [`Je beantwoordde ${res.n} ${res.n === 1 ? 'vraag' : 'vragen'}.`, res.opnieuw.length ? `Dit komt sneller terug: ${[...new Set(res.opnieuw)].join(', ')}.` : 'Niets hoeft sneller terug te komen.', `Je reeks staat op ${reeks} ${reeks === 1 ? 'dag' : 'dagen'}.`];
  const volgende = volgendeLes();
  scherm([
    kop(h('span', {}, 'Sessie klaar')),
    h('h1', {}, les ? `Les ${lesNummer(les)} klaar` : 'Klaar voor vandaag'),
    h('ol', { style: 'padding-left:24px' }, ...zinnen.map((z) => h('li', {}, z))),
    h('p', { class: 'zacht' }, `Je beantwoordde ${res.n} ${res.n === 1 ? 'vraag' : 'vragen'}, ${res.juist} juist bij de eerste poging.${les && res.opnieuw.length ? ' Dit komt sneller terug: ' + [...new Set(res.opnieuw)].join(', ') + '.' : ''} Reeks: ${reeks} ${reeks === 1 ? 'dag' : 'dagen'}.`),
    les && !eerderKlaar && !volgende ? h('p', { style: 'font-weight:600' }, 'Alle lessen van Level 1 zijn klaar. De eindtoets is nu beschikbaar.') : null,
    geenAdvies(),
  ], [les && !volgende && !toetsGehaald() ? linkKnop('Naar de eindtoets', 'hoofd', '#toets') : linkKnop('Terug naar start', 'hoofd', '#'),
    les && !volgende && !toetsGehaald() ? linkKnop('Terug naar start', 'tweede', '#') : null].filter(Boolean));
}

// ---------- eindtoets ----------
function toetsIntro() {
  const n = niveau.eindtoets.vragen.length;
  const nodig = Math.ceil(n * niveau.drempel - 1e-9);
  if (!alleLessenKlaar()) {
    scherm([kop(terug('← Terug', '#campagne')), h('h1', {}, 'Eindtoets Level 1'), h('p', {}, 'Rond eerst alle lessen af. Daarna kun je de eindtoets doen.')], [linkKnop('Naar de lessen', 'hoofd', '#campagne')]);
    return;
  }
  scherm([
    kop(terug('← Terug', '#campagne')),
    h('h1', {}, 'Eindtoets Level 1'),
    h('p', {}, `${n} vragen over alle lessen. Je krijgt geen hints en één poging per vraag. Je ziet na elke vraag de uitleg.`),
    h('p', {}, `Je haalt het level met minstens ${Math.round(niveau.drempel * 100)} %: dat zijn ${nodig} juiste antwoorden van ${n}. Lukt het niet, dan probeer je het gewoon opnieuw.`),
    toetsGehaald() ? h('p', { class: 'zacht' }, `Je hebt deze toets al gehaald (${toetsStand().score} van ${toetsStand().van}).`) : null,
  ], [knop('Start de eindtoets', 'hoofd', startToets), linkKnop('Nog even oefenen', 'tweede', '#')]);
}

function startToets() {
  const stappen = niveau.eindtoets.vragen.map((q) => vraagStap(begrippen.get(q.begrip), q, 'Eindtoets', true));
  speel(stappen, { klaar: toetsKlaar });
}

function toetsKlaar(res) {
  const n = niveau.eindtoets.vragen.length;
  const nodig = Math.ceil(n * niveau.drempel - 1e-9);
  const geslaagd = res.juist >= nodig;
  const eerste = geslaagd && !toetsGehaald();
  if (geslaagd) store.zetLes(`${niveau.id}-toets`, { geslaagd: 1, score: res.juist, van: n, dag: vandaag() });
  autoSync();
  scherm([
    kop(h('span', {}, 'Eindtoets Level 1')),
    h('h1', {}, geslaagd ? 'Level 1 gehaald' : 'Nog niet gehaald'),
    h('p', { class: 'getal' }, `${res.juist} van ${n}`),
    h('p', { class: 'zacht' }, geslaagd ? `Je had er ${nodig} nodig. Je kent de basis van geld, inflatie, rente, aandelen, obligaties, fondsen en risico.` : `Je had er ${nodig} nodig. Dat is niet erg: de begrippen waarbij je een fout maakte, komen vandaag nog terug in de herhaling.`),
    !geslaagd && res.opnieuw.length ? h('p', {}, `Herhaal: ${[...new Set(res.opnieuw)].join(', ')}.`) : null,
    geslaagd ? h('p', {}, 'Level 2 (Macro-economie) volgt in een volgende stap van het spel.') : null,
    geenAdvies(),
  ], geslaagd ? [linkKnop('Terug naar start', 'hoofd', '#')] : [knop('Opnieuw proberen', 'hoofd', startToets), linkKnop('Terug naar start', 'tweede', '#')]);
  if (eerste) feest();
}

// ---------- begrippenboek ----------
function boek() {
  const lijst = [...begrippen.values()].filter((b) => store.bekend(b.id)).sort((a, b) => a.nl.localeCompare(b.nl, 'nl'));
  scherm([
    kop(terug()),
    h('h1', {}, 'Begrippenboek'),
    lijst.length
      ? h('ul', { class: 'rijen' }, ...lijst.map((b) => h('li', {}, h('a', { class: 'rij', href: `#boek/${b.id}` },
        h('span', {}, `${b.nl} · ${b.en}`), h('span', { class: 'meta' }, store.beheerst(b.id) ? 'beheerst' : 'bezig')))))
      : h('p', { class: 'zacht' }, 'Hier komen de begrippen die je vrijspeelt, in het Nederlands en het Engels. Speel een sessie om te beginnen.'),
  ], [linkKnop('Terug naar start', 'hoofd', '#')]);
}
function boekBegrip(id) {
  const b = begrippen.get(id);
  if (!b || !store.bekend(id)) return boek();
  uitlegScherm(b, { kopTekst: 'Begrippenboek', knopTekst: 'Terug naar het boek', terugHref: '#boek', actie: () => { location.hash = '#boek'; } });
}

// ---------- kenniskaart ----------
function kenniskaart() {
  scherm([
    kop(terug()),
    h('h1', {}, 'Kenniskaart'),
    h('p', { class: 'zacht' }, 'Een begrip telt als beheerst na drie juiste herhalingen op rij. Rang: Stagiair.'),
    h('ul', { class: 'rijen' }, ...DOMEINEN.map((d) => {
      const lijst = d === niveau.domein ? [...begrippen.values()] : [];
      const beheerst = lijst.filter((b) => store.beheerst(b.id)).length;
      const pct = lijst.length ? Math.round((beheerst / lijst.length) * 100) : null;
      return h('li', {}, h('div', { class: 'rij', style: 'flex-direction:column;align-items:stretch;gap:4px' },
        h('div', { style: 'display:flex;justify-content:space-between' }, h('span', {}, d), h('span', { class: 'meta' }, pct == null ? 'nog niet in het spel' : `${pct} % · ${beheerst} van ${lijst.length}`)),
        pct == null ? null : voortgangsbalk(beheerst, lijst.length)));
    })),
  ], [linkKnop('Terug naar start', 'hoofd', '#')]);
}

// ---------- instellingen ----------
const ALFABET = 'abcdefghijkmnpqrstuvwxyz23456789';
const maakSleutel = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) => ALFABET[x % ALFABET.length]).join('');

function instellingen(melding = '') {
  const inst = store.instellingen();
  const status = h('p', { class: 'status', role: 'status' }, syncTekst(syncStatus));
  const bericht = h('p', { class: 'status', role: 'status' }, melding);
  const invoer = h('input', { type: 'text', id: 'sleutel', value: inst.sleutel, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-describedby': 'sleutelhulp' });
  const bewaarSleutel = () => {
    const s = invoer.value.trim();
    store.zetInstelling('sleutel', s);
    store.syncKlaar(0, 0);
    syncStatus = { status: s ? 'nog niet' : 'uit' };
    status.textContent = s.length && s.length < 24 ? syncTekst({ status: 'sleutel' }) : syncTekst(syncStatus);
  };
  const thema = (waarde, tekst) => h('li', {}, h('label', { class: 'rij' }, h('span', {}, tekst),
    h('input', { type: 'radio', name: 'thema', checked: inst.thema === waarde, onchange: () => { store.zetInstelling('thema', waarde); pasThemaToe(); } })));
  scherm([
    kop(terug()),
    h('h1', {}, 'Instellingen'),
    h('section', {}, h('h2', {}, 'Weergave'), h('ul', { class: 'rijen' }, thema('auto', 'Automatisch'), thema('licht', 'Licht'), thema('donker', 'Donker'))),
    h('section', {}, h('h2', {}, 'Synchronisatie'),
      h('p', { id: 'sleutelhulp', class: 'zacht' }, 'Met dezelfde sleutel op je gsm en je computer deel je je voortgang. Per begrip wint de nieuwste stand. Wie je sleutel kent, kan je voortgang zien en wijzigen: deel hem niet.'),
      h('label', { for: 'sleutel', class: 'klein' }, 'Sleutel (minstens 24 tekens)'), invoer,
      h('div', { style: 'display:grid;gap:8px;margin:16px 0' },
        knop('Maak een nieuwe sleutel', 'tweede', () => { invoer.value = maakSleutel(); bewaarSleutel(); }),
        knop('Bewaar sleutel', 'tweede', bewaarSleutel),
        knop('Synchroniseer nu', 'hoofd', async () => { bewaarSleutel(); status.textContent = 'Bezig…'; const r = await autoSync(); status.textContent = syncTekst(r); })),
      status),
    h('section', {}, h('h2', {}, 'Back-up'),
      h('p', { class: 'zacht' }, 'Bewaar je voortgang als bestand, of zet een eerder bestand terug. Bij terugzetten wint per begrip de nieuwste stand.'),
      h('div', { style: 'display:grid;gap:8px' },
        knop('Back-up opslaan', 'tweede', () => {
          const url = URL.createObjectURL(new Blob([store.exporteer()], { type: 'application/json' }));
          const a = h('a', { href: url, download: `leerspel-back-up-${vandaag()}.json` });
          document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        }),
        h('label', { class: 'knop tweede', tabindex: 0 }, 'Back-up terugzetten',
          h('input', { type: 'file', accept: 'application/json,.json', style: 'position:absolute;opacity:0;width:1px;height:1px', onchange: async (e) => {
            const f = e.target.files[0];
            if (!f) return;
            try { const n = store.importeer(await f.text()); instellingen(`Teruggezet: ${n} onderdelen overgenomen.`); autoSync(); }
            catch (err) { bericht.textContent = err.message; }
          } }))),
      bericht),
    geenAdvies(),
  ], [linkKnop('Terug naar start', 'hoofd', '#')]);
}

// ---------- routes ----------
function route() {
  sessieBezig = false;
  const [deel, param] = location.hash.replace(/^#/, '').split('/');
  if (deel === 'instellingen') return instellingen();
  if (laadFout || !niveau) return start();
  if (deel === 'sessie') return startSessie(param);
  if (deel === 'les') return startLes(param);
  if (deel === 'campagne') return campagne();
  if (deel === 'toets') return toetsIntro();
  if (deel === 'boek') return param ? boekBegrip(param) : boek();
  if (deel === 'kenniskaart') return kenniskaart();
  return start();
}

// Nieuwe gegevens van een ander toestel verversen het scherm, maar breken nooit een sessie af.
const naSync = (r) => { if (r.nieuw && !sessieBezig) route(); };

pasThemaToe();
window.addEventListener('hashchange', route);
window.addEventListener('online', () => autoSync().then(naSync));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') autoSync().then(naSync); });
// Een tik op een link naar de huidige plek (bijvoorbeeld "Terug naar start" op het startadres) laadt het scherm opnieuw.
document.addEventListener('click', (e) => {
  const a = e.target.closest?.('a[href^="#"]');
  if (!a) return;
  const doel = a.getAttribute('href');
  if (doel === location.hash || (doel === '#' && location.hash === '')) { e.preventDefault(); route(); }
});
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});

await laadInhoud();
route();
autoSync().then(naSync);
