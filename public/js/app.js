import { maakStore, vandaag } from './store.js';
import { synchroniseer } from './sync.js';
import { h, ikoon, heeftIkoon, datumNl } from './dom.js';
import { maakVraag, vormNaam, tabelNode } from './vragen.js';
import { feest } from './feest.js';

// ---------- opslag en inhoud ----------
const geheugen = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
let opslag;
try { localStorage.getItem('x'); opslag = localStorage; } catch { opslag = geheugen(); }
const store = maakStore(opslag);

const FOUT_URL = 'https://github.com/gtallpulse-hash/Financiel-Project/issues/new';
const DOMEINEN = ['Basis', 'Macro', 'Jaarrekening', 'Waardering', 'Cycli en trends', 'Energie en netten'];
const RANGEN = [
  { naam: 'Stagiair', eis: 'Start' },
  { naam: 'Junior analist', eis: 'Level 2 gehaald' },
  { naam: 'Analist', eis: 'Level 4 en Realiteitstoets 1 gehaald' },
  { naam: 'Senior analist', eis: 'Level 6 en Realiteitstoets 2 gehaald' },
];

let index = null;
const niveaus = new Map();   // levelId -> level
const rts = new Map();       // rtId -> realiteitstoets
const begrippen = new Map(); // begripId -> begrip (alle geladen levels)
let laadFout = false;

const laadJson = async (pad) => { const r = await fetch(pad); if (!r.ok) throw new Error(pad); return r.json(); };

// ---------- campagne: volgorde van lessen, eindtoetsen en realiteitstoetsen ----------
let stappen = [];
function bouwStappen() {
  stappen = [];
  for (const e of index.reeks) {
    if (e.soort === 'level') {
      e.lessen.forEach((lid, i) => stappen.push({ soort: 'les', niveau: e.id, les: lid, nr: i + 1, klaar: () => !!store.les(`${e.id}-${lid}`)?.klaar }));
      stappen.push({ soort: 'toets', niveau: e.id, klaar: () => !!store.les(`${e.id}-toets`)?.geslaagd });
    } else stappen.push({ soort: 'rt', id: e.id, klaar: () => !!store.les(e.id)?.geslaagd });
  }
}
const volgende = () => stappen.find((s) => !s.klaar()) || null;
const isOpen = (s) => { const v = volgende(); return s.klaar() || !v || stappen.indexOf(s) <= stappen.indexOf(v); };
const stapVan = (soort, id, les) => stappen.find((s) => s.soort === soort && (s.niveau === id || s.id === id) && (soort !== 'les' || s.les === les));
const toetsGehaald = (id) => !!store.les(`${id}-toets`)?.geslaagd;
const rtGehaald = (id) => !!store.les(id)?.geslaagd;
const levelEntry = (id) => index.reeks.find((e) => e.id === id);

async function laadTotVolgende() {
  const v = volgende();
  const doel = v ? (v.niveau || v.id) : index.reeks[index.reeks.length - 1].id;
  for (const e of index.reeks) {
    if (e.soort === 'level' && !niveaus.has(e.id)) {
      const d = await laadJson(e.bestand);
      niveaus.set(e.id, d);
      for (const b of d.begrippen) begrippen.set(b.id, { ...b, niveau: e.id });
    }
    if (e.soort === 'rt' && !rts.has(e.id) && (e.id === doel || v == null)) rts.set(e.id, await laadJson(e.bestand));
    if (e.id === doel) break;
  }
}
async function laadInhoud() {
  try {
    index = await laadJson('data/index.json');
    bouwStappen();
    await laadTotVolgende();
  } catch { laadFout = true; }
}

const lesVan = (niveauId, lesId) => niveaus.get(niveauId)?.lessen.find((l) => l.id === lesId);
const lesSleutel = (niveauId, les) => `${niveauId}-${les.id}`;
const klaarAantal = (niveauId) => levelEntry(niveauId).lessen.filter((lid) => store.les(`${niveauId}-${lid}`)?.klaar).length;
const levelTitel = (e) => `Level ${e.nummer} · ${e.titel}`;

function rang() {
  let r = 0;
  if (toetsGehaald('level2')) r = 1;
  if (toetsGehaald('level4') && rtGehaald('rt1')) r = 2;
  if (toetsGehaald('level6') && rtGehaald('rt2')) r = 3;
  return r;
}

// ---------- schermen ----------
const app = document.getElementById('app');
const balk = document.getElementById('balk');

function scherm(nodes, knoppen = []) {
  app.replaceChildren(...nodes.filter(Boolean));
  if (knoppen.length) { balk.replaceChildren(h('div', {}, ...knoppen.filter(Boolean))); balk.hidden = false; }
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
    meldFout(b.nl || b.titel, id || b.id, vraag));
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
  if (laadFout || !index) {
    scherm([kop(h('span', {}, 'Leerspel Beleggen & Economie')), h('h1', {}, 'Vandaag leren'),
      h('p', { class: 'waarschuwing' }, 'De lessen konden niet geladen worden. Probeer later opnieuw met bereik.')],
    [linkKnop('Instellingen en back-up', 'tweede', '#instellingen')]);
    return;
  }
  const dag = vandaag();
  const teHerhalen = store.teHerhalen(dag).filter((id) => begrippen.has(id)).length;
  const reeks = store.streak(dag);
  const v = volgende();
  const entry = v ? levelEntry(v.niveau || v.id) : null;
  let kopRegel, titelRegel, hoofd;
  if (!v) {
    kopRegel = 'Campagne voltooid'; titelRegel = 'Alle levels en realiteitstoetsen zijn gehaald.';
    hoofd = linkKnop('Herhaling · 10–15 min', 'hoofd', '#sessie/normaal');
  } else if (v.soort === 'les') {
    const l = lesVan(v.niveau, v.les);
    kopRegel = `${levelTitel(entry)} · ${klaarAantal(v.niveau)} van ${entry.lessen.length} lessen klaar`;
    titelRegel = `Les ${v.nr}: ${l.titel}`;
    hoofd = linkKnop(`Verder met les ${v.nr} · 10–15 min`, 'hoofd', '#sessie/normaal');
  } else if (v.soort === 'toets') {
    kopRegel = `${levelTitel(entry)} · alle lessen klaar`; titelRegel = `Eindtoets ${levelTitel(entry)}`;
    hoofd = linkKnop('Naar de eindtoets', 'hoofd', `#toets/${v.niveau}`);
  } else {
    kopRegel = 'Realiteitstoets'; titelRegel = entry.titel;
    hoofd = linkKnop('Naar de realiteitstoets', 'hoofd', `#rt/${v.id}`);
  }
  const totaalLessen = index.reeks.filter((e) => e.soort === 'level').reduce((n, e) => n + e.lessen.length, 0);
  const klaarLessen = index.reeks.filter((e) => e.soort === 'level').reduce((n, e) => n + klaarAantal(e.id), 0);
  scherm([
    kop(h('span', {}, 'Leerspel Beleggen & Economie'), reeks ? `Reeks: ${reeks} ${reeks === 1 ? 'dag' : 'dagen'}` : ''),
    h('h1', {}, 'Vandaag leren'),
    h('section', { 'aria-label': 'Volgende stap' },
      h('p', { class: 'klein', style: 'margin:0' }, kopRegel),
      voortgangsbalk(klaarLessen, totaalLessen),
      h('p', { style: 'margin:12px 0 0;font-weight:600' }, titelRegel),
      h('p', { class: 'klein', style: 'margin:4px 0 0' }, `Rang: ${RANGEN[rang()].naam} · ${klaarLessen} van ${totaalLessen} lessen klaar`)),
    h('section', { 'aria-label': 'Herhaling' },
      h('div', { class: 'getal' }, String(teHerhalen)),
      h('p', { class: 'zacht', style: 'margin:0' }, teHerhalen === 1 ? 'begrip om te herhalen' : 'begrippen om te herhalen')),
    h('section', {}, h('ul', { class: 'rijen' },
      h('li', {}, h('a', { class: 'rij', href: '#campagne' }, h('span', {}, 'Campagne en lessen'), h('span', { class: 'meta' }, v?.niveau ? `Level ${entry.nummer}` : ''))),
      h('li', {}, h('a', { class: 'rij', href: '#sessie/lang' }, h('span', {}, 'Lange sessie'), h('span', { class: 'meta' }, '20+ min'))),
      h('li', {}, h('a', { class: 'rij', href: '#boek' }, h('span', {}, 'Begrippenboek'), h('span', { class: 'meta' }, `${[...begrippen.keys()].filter((id) => store.bekend(id)).length} vrijgespeeld`))),
      h('li', {}, h('a', { class: 'rij', href: '#kenniskaart' }, h('span', {}, 'Kenniskaart'))),
      h('li', {}, h('a', { class: 'rij', href: '#instellingen' }, h('span', {}, 'Instellingen en back-up'))))),
    geenAdvies(),
  ], [hoofd, linkKnop('Korte sessie · 5 min', 'tweede', '#sessie/kort')]);
}

// ---------- campagne ----------
function stapRij(open, titel, meta, href, klaar) {
  const inhoud = [h('span', { style: 'display:flex;gap:8px;align-items:center' }, klaar ? ikoon('juist') : null, titel), h('span', { class: 'meta' }, meta)];
  return h('li', {}, open ? h('a', { class: 'rij', href }, ...inhoud) : h('div', { class: 'rij zacht', 'aria-disabled': 'true' }, ...inhoud));
}
function campagne() {
  const v = volgende();
  scherm([
    kop(terug()),
    h('h1', {}, 'Campagne'),
    h('p', { class: 'zacht' }, 'Zes levels in vaste volgorde, met twee realiteitstoetsen. Een level haal je met 80 % op de eindtoets.'),
    h('ul', { class: 'rijen' }, ...index.reeks.map((e) => {
      if (e.soort === 'level') {
        const eerste = stapVan('les', e.id, e.lessen[0]);
        const open = isOpen(eerste);
        const klaar = toetsGehaald(e.id);
        return stapRij(open, levelTitel(e), klaar ? 'gehaald' : open ? `${klaarAantal(e.id)} van ${e.lessen.length}` : 'vergrendeld', `#level/${e.id}`, klaar);
      }
      const s = stapVan('rt', e.id);
      return stapRij(isOpen(s), e.titel, rtGehaald(e.id) ? 'gehaald' : isOpen(s) ? 'beschikbaar' : 'vergrendeld', `#rt/${e.id}`, rtGehaald(e.id));
    })),
    h('p', { class: 'klein', style: 'margin-top:16px' }, v ? 'Na de campagne volgt de Open wereld.' : 'Campagne voltooid. De Open wereld volgt in een volgende stap van het spel.'),
  ], [linkKnop('Terug naar start', 'hoofd', '#')]);
}

function levelScherm(id) {
  const e = levelEntry(id);
  const lv = niveaus.get(id);
  if (!e || !lv) return campagne();
  const eerste = stapVan('les', id, e.lessen[0]);
  if (!isOpen(eerste)) return campagne();
  const toets = stapVan('toets', id);
  scherm([
    kop(terug('← Campagne', '#campagne')),
    h('h1', {}, levelTitel(e)),
    h('p', { class: 'zacht' }, `${klaarAantal(id)} van ${e.lessen.length} lessen klaar. Je haalt het level met ${Math.round(lv.drempel * 100)} % op de eindtoets.`),
    voortgangsbalk(klaarAantal(id), e.lessen.length),
    h('ul', { class: 'rijen', style: 'margin-top:16px' },
      ...lv.lessen.map((l, i) => { const s = stapVan('les', id, l.id); return stapRij(isOpen(s), `${i + 1}. ${l.titel}`, s.klaar() ? 'klaar' : s === volgende() ? 'volgende' : isOpen(s) ? 'beschikbaar' : 'vergrendeld', `#les/${id}/${l.id}`, s.klaar()); }),
      stapRij(isOpen(toets), `Eindtoets ${levelTitel(e)}`, toetsGehaald(id) ? `gehaald (${store.les(`${id}-toets`).score}/${store.les(`${id}-toets`).van})` : isOpen(toets) ? 'beschikbaar' : 'vergrendeld', `#toets/${id}`, toetsGehaald(id))),
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
    b.tabel ? tabelNode(b.tabel) : null,
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
const uitlegStap = (b, fase) => ({ soort: 'uitleg', b, fase });
const vraagStap = (b, q, fase, toets = false, bronBlok = null) => ({ soort: 'vraag', b, q, fase, toets, bronBlok });

let sessieBezig = false;
function speel(lijst, { klaar }) {
  sessieBezig = true;
  history.replaceState(null, '', location.pathname + location.search + '#');
  const totaalVragen = lijst.filter((s) => s.soort === 'vraag').length;
  const res = { n: 0, juist: 0, punten: 0, opnieuw: [], begrippen: new Set() };
  let vraagNr = 0;
  const verder = (i) => {
    if (i >= lijst.length) return klaar(res);
    const s = lijst[i];
    if (s.soort === 'uitleg') uitlegScherm(s.b, { kopTekst: s.fase, knopTekst: 'Naar de vragen', stop: true, actie: () => verder(i + 1) });
    else { vraagNr++; vraagScherm(s, vraagNr, totaalVragen, res, () => verder(i + 1)); }
  };
  verder(0);
}

function vraagScherm(stap, nr, totaal, res, ga) {
  const { b, q, toets } = stap;
  const maxPogingen = toets ? 1 : 2;
  let poging = 0;
  const ui = maakVraag(q, { grafieken: grafiekenVoor(stap) });
  const hintVak = h('div', { role: 'status', 'aria-live': 'polite' });
  const uitlegVak = h('div', {});
  const vraagKop = h('h1', { id: 'vraag', 'data-qid': q.id, style: 'font-size:24px;line-height:32px' }, q.vraag);
  const bronBlok = b || stap.bronBlok;

  function klaarMelden(punten, soort, tekst) {
    res.n++;
    res.punten += punten;
    if (b) res.begrippen.add(b.id);
    if (punten >= 1) res.juist++; else if (b) res.opnieuw.push(b.nl);
    hintVak.replaceChildren();
    ui.node.replaceWith(ui.resultaat());
    uitlegVak.replaceChildren(
      h('p', { class: `fb ${soort}`, role: 'status', style: 'margin-top:16px' }, ikoon(soort === 'fout' ? 'fout' : 'juist', 24), h('span', {}, tekst)),
      h('dl', { class: 'uitleg' },
        h('dt', {}, 'Waarom'), h('dd', {}, q.waarom),
        h('dt', {}, 'Wanneer het anders loopt'), h('dd', {}, q.wanneer),
        h('dt', {}, 'Waar je het aan herkent'), h('dd', {}, q.herken),
        q.onthulling ? [h('dt', {}, 'Onthulling'), h('dd', {}, q.onthulling)] : null),
      bronBlok ? bronRegel(bronBlok, q.id, q.vraag) : null);
    const volgendeKnop = knop(nr === totaal ? 'Afronden' : 'Volgende', 'hoofd', ga);
    balk.replaceChildren(h('div', {}, volgendeKnop));
    window.scrollTo({ top: uitlegVak.offsetTop - 80 });
    volgendeKnop.focus({ preventScroll: true });
  }

  const controleer = knop(ui.zelf ? 'Toon modelantwoord' : 'Controleer', 'hoofd', () => {
    if (!ui.klaar()) return;
    if (ui.zelf) {
      ui.node.replaceWith(ui.resultaat());
      balk.replaceChildren(h('div', {}, h('p', { class: 'klein', style: 'margin:0' }, 'Kijk zelf na: hoe goed was je antwoord?'),
        knop('Goed', 'hoofd', () => beoordeeld(1)), knop('Deels', 'tweede', () => beoordeeld(0.5)), knop('Fout', 'tweede', () => beoordeeld(0))));
      window.scrollTo(0, 0);
      return;
    }
    poging++;
    const r = ui.controleer();
    if (r.juist || poging >= maxPogingen) return afronden(r.juist);
    hintVak.replaceChildren(h('p', { class: 'fb hint', style: 'margin-top:16px' }, ikoon('hint', 24), h('span', {}, `Nog niet juist.${r.deel ? ' ' + r.deel + '.' : ''} Hint: ${q.hint}`)));
    ui.nieuwePoging();
    controleer.disabled = !ui.klaar();
  }, { disabled: true });
  ui.opWijziging = () => { controleer.disabled = !ui.klaar(); };

  function beoordeeld(p) {
    if (b) store.antwoord(b.id, p === 1);
    klaarMelden(p, p === 1 ? 'juist' : p === 0.5 ? 'let-op' : 'fout', p === 1 ? 'Goed.' : p === 0.5 ? 'Deels goed. Dit komt sneller terug.' : 'Nog niet goed. Dit komt sneller terug.');
  }
  function afronden(juist) {
    const eerste = juist && poging === 1;
    if (b) store.antwoord(b.id, eerste);
    klaarMelden(eerste ? 1 : 0, eerste ? 'juist' : juist ? 'let-op' : 'fout',
      eerste ? 'Juist.' : juist ? 'Juist bij de tweede poging. Dit komt sneller terug.' : (toets ? 'Nog niet juist.' : 'Nog niet juist. Dit komt sneller terug.'));
  }

  scherm([
    kop(terug('Stop en bewaar'), `${stap.fase} · vraag ${nr} van ${totaal}`),
    voortgangsbalk(nr - 1, totaal),
    h('p', { class: 'klein', style: 'margin:12px 0 0' }, vormNaam(q) + (toets ? ' · één poging' : '')),
    vraagKop, ui.node, hintVak, uitlegVak,
  ], [controleer]);
}

// Welke grafieken horen bij deze vraag: die van het level van het begrip, of van de realiteitstoets.
function grafiekenVoor(stap) {
  if (stap.grafieken) return stap.grafieken;
  const lv = stap.b ? niveaus.get(stap.b.niveau) : null;
  return lv ? lv.grafieken : {};
}

// ---------- sessies ----------
const MAX = { kort: 3, normaal: 8, lang: 15 };
function huidigeLes() {
  const v = volgende();
  if (!v || v.soort !== 'les') return null;
  const niveau = niveaus.get(v.niveau);
  return { niveau, les: lesVan(v.niveau, v.les), nr: v.nr };
}
function bouwSessie(soort) {
  const dag = vandaag();
  const cur = huidigeLes();
  const lesIds = cur ? cur.les.begrippen : [];
  const lijst = [];
  const herhaal = (max, uitsluiten = []) => store.teHerhalen(dag).filter((id) => begrippen.has(id) && !uitsluiten.includes(id)).slice(0, max);
  const lesStappen = (totaal) => {
    const aantallen = verdeel(cur.les.begrippen, totaal);
    cur.les.begrippen.forEach((id, i) => {
      const b = begrippen.get(id);
      lijst.push(uitlegStap(b, 'Nieuw begrip'));
      kiesVragen(b, aantallen[i]).forEach((q) => lijst.push(vraagStap(b, q, 'Les')));
    });
  };
  if (soort === 'kort') {
    const due = herhaal(3);
    if (due.length) due.forEach((id) => { const b = begrippen.get(id); lijst.push(vraagStap(b, kiesVragen(b, 1)[0], 'Herhaling')); });
    else if (cur) {
      const b = begrippen.get(lesIds.find((id) => !store.bekend(id)) || lesIds[0]);
      lijst.push(uitlegStap(b, 'Uitlegkaart'));
      kiesVragen(b, 3).forEach((q) => lijst.push(vraagStap(b, q, 'Oefenen')));
    }
    return { lijst, cur: null };
  }
  herhaal(soort === 'lang' ? 7 : 5, lesIds).forEach((id) => { const b = begrippen.get(id); lijst.push(vraagStap(b, kiesVragen(b, 1)[0], 'Opwarmer')); });
  if (cur) lesStappen(8);
  if (soort === 'lang') {
    const gebruikt = new Set(lijst.filter((s) => s.soort === 'vraag').map((s) => s.b.id));
    [...begrippen.values()].filter((b) => store.bekend(b.id) && !gebruikt.has(b.id))
      .sort((a, b) => store.concept(a.id).lvl - store.concept(b.id).lvl).slice(0, 5)
      .forEach((b) => lijst.push(vraagStap(b, kiesVragen(b, 1)[0], 'Extra oefening')));
  }
  return { lijst, cur };
}

function leegScherm() {
  const v = volgende();
  const doel = v && v.soort !== 'les' ? (v.soort === 'toets' ? `#toets/${v.niveau}` : `#rt/${v.id}`) : null;
  scherm([kop(terug()), h('h1', {}, 'Alles herhaald voor vandaag'),
    h('p', {}, doel ? 'Er staat niets meer klaar. De volgende stap in de campagne is een toets.' : 'Er staat niets meer klaar. Kom morgen terug, of bekijk het begrippenboek.')],
  [doel ? linkKnop(v.soort === 'toets' ? 'Naar de eindtoets' : 'Naar de realiteitstoets', 'hoofd', doel) : linkKnop('Terug naar start', 'hoofd', '#'), linkKnop('Begrippenboek', 'tweede', '#boek')]);
}
function startSessie(soort) {
  const { lijst, cur } = bouwSessie(soort);
  if (!lijst.length) return leegScherm();
  speel(lijst, { klaar: (res) => sessieKlaar(res, cur) });
}
function startLes(niveauId, lesId) {
  const l = lesVan(niveauId, lesId);
  const s = l && stapVan('les', niveauId, lesId);
  if (!l || !isOpen(s)) return campagne();
  const lijst = [];
  const aantallen = verdeel(l.begrippen, 8);
  l.begrippen.forEach((bid, i) => {
    const b = begrippen.get(bid);
    lijst.push(uitlegStap(b, 'Nieuw begrip'));
    kiesVragen(b, aantallen[i]).forEach((q) => lijst.push(vraagStap(b, q, 'Les')));
  });
  speel(lijst, { klaar: (res) => sessieKlaar(res, { niveau: niveaus.get(niveauId), les: l, nr: s.nr }) });
}

function sessieKlaar(res, cur) {
  const reedsKlaar = cur ? !!store.les(lesSleutel(cur.niveau.id, cur.les))?.klaar : false;
  if (cur) store.zetLes(lesSleutel(cur.niveau.id, cur.les), { klaar: 1, dag: vandaag() });
  autoSync();
  laadTotVolgende().catch(() => {});
  const reeks = store.streak(vandaag());
  const zinnen = cur ? cur.les.afsluiter
    : [`Je beantwoordde ${res.n} ${res.n === 1 ? 'vraag' : 'vragen'}.`, res.opnieuw.length ? `Dit komt sneller terug: ${[...new Set(res.opnieuw)].join(', ')}.` : 'Niets hoeft sneller terug te komen.', `Je reeks staat op ${reeks} ${reeks === 1 ? 'dag' : 'dagen'}.`];
  const v = volgende();
  const naarToets = cur && v && v.soort === 'toets' && !reedsKlaar;
  scherm([
    kop(h('span', {}, 'Sessie klaar')),
    h('h1', {}, cur ? `Les ${cur.nr} klaar` : 'Klaar voor vandaag'),
    h('ol', { style: 'padding-left:24px' }, ...zinnen.map((z) => h('li', {}, z))),
    h('p', { class: 'zacht' }, `Je beantwoordde ${res.n} ${res.n === 1 ? 'vraag' : 'vragen'}, ${res.juist} juist bij de eerste poging.${cur && res.opnieuw.length ? ' Dit komt sneller terug: ' + [...new Set(res.opnieuw)].join(', ') + '.' : ''} Reeks: ${reeks} ${reeks === 1 ? 'dag' : 'dagen'}.`),
    naarToets ? h('p', { style: 'font-weight:600' }, `Alle lessen van ${levelTitel(levelEntry(cur.niveau.id))} zijn klaar. De eindtoets is nu beschikbaar.`) : null,
    geenAdvies(),
  ], [naarToets ? linkKnop('Naar de eindtoets', 'hoofd', `#toets/${v.niveau}`) : linkKnop('Terug naar start', 'hoofd', '#'), naarToets ? linkKnop('Terug naar start', 'tweede', '#') : null]);
}

// ---------- eindtoetsen ----------
function toetsIntro(id) {
  const e = levelEntry(id); const lv = niveaus.get(id);
  const s = stapVan('toets', id);
  if (!e || !lv || !isOpen(s)) return campagne();
  const n = lv.eindtoets.vragen.length;
  const nodig = Math.ceil(n * lv.drempel - 1e-9);
  scherm([
    kop(terug('← Terug', `#level/${id}`)),
    h('h1', {}, `Eindtoets ${levelTitel(e)}`),
    h('p', {}, `${n} vragen over alle lessen. Je krijgt geen hints en één poging per vraag. Je ziet na elke vraag de uitleg.`),
    h('p', {}, `Je haalt het level met minstens ${Math.round(lv.drempel * 100)} %: dat zijn ${nodig} punten van ${n}. Lukt het niet, dan probeer je het gewoon opnieuw.`),
    toetsGehaald(id) ? h('p', { class: 'zacht' }, `Je hebt deze toets al gehaald (${store.les(`${id}-toets`).score} van ${store.les(`${id}-toets`).van}).`) : null,
  ], [knop('Start de eindtoets', 'hoofd', () => startToets(id)), linkKnop('Nog even oefenen', 'tweede', '#')]);
}
function startToets(id) {
  const lv = niveaus.get(id);
  speel(lv.eindtoets.vragen.map((q) => vraagStap(begrippen.get(q.begrip), q, 'Eindtoets', true)), { klaar: (res) => toetsKlaar(id, res) });
}
function toetsKlaar(id, res) {
  const e = levelEntry(id); const lv = niveaus.get(id);
  const n = lv.eindtoets.vragen.length;
  const nodig = Math.ceil(n * lv.drempel - 1e-9);
  const geslaagd = res.punten >= nodig - 1e-9;
  const eerste = geslaagd && !toetsGehaald(id);
  const rangVoor = rang();
  const score = Math.round(res.punten * 2) / 2;
  if (geslaagd) store.zetLes(`${id}-toets`, { geslaagd: 1, score, van: n, dag: vandaag() });
  autoSync();
  laadTotVolgende().catch(() => {});
  const v = volgende();
  const nieuweRang = rang() > rangVoor;
  const naar = geslaagd && v ? (v.soort === 'les' ? { t: `Naar ${levelTitel(levelEntry(v.niveau))}`, href: `#level/${v.niveau}` } : { t: 'Naar de realiteitstoets', href: `#rt/${v.id}` }) : null;
  scherm([
    kop(h('span', {}, `Eindtoets ${levelTitel(e)}`)),
    h('h1', {}, geslaagd ? `${levelTitel(e)} gehaald` : 'Nog niet gehaald'),
    h('p', { class: 'getal' }, `${score} van ${n}`),
    h('p', { class: 'zacht' }, geslaagd ? `Je had er ${nodig} nodig. ${lv.afsluitTekst || ''}` : `Je had er ${nodig} nodig. Dat is niet erg: de begrippen waarbij je een fout maakte, komen vandaag nog terug in de herhaling.`),
    nieuweRang ? h('p', { style: 'font-weight:600' }, `Nieuwe rang: ${RANGEN[rang()].naam}.`) : null,
    !geslaagd && res.opnieuw.length ? h('p', {}, `Herhaal: ${[...new Set(res.opnieuw)].join(', ')}.`) : null,
    geslaagd && !v ? h('p', {}, 'Alle levels en realiteitstoetsen zijn gehaald. De Open wereld volgt in een volgende stap van het spel.') : null,
    geenAdvies(),
  ], geslaagd ? [naar ? linkKnop(naar.t, 'hoofd', naar.href) : null, linkKnop('Terug naar start', naar ? 'tweede' : 'hoofd', '#')] : [knop('Opnieuw proberen', 'hoofd', () => startToets(id)), linkKnop('Terug naar start', 'tweede', '#')]);
  if (eerste) feest();
}

// ---------- realiteitstoetsen ----------
function rtIntro(id) {
  const e = levelEntry(id); const rt = rts.get(id);
  const s = stapVan('rt', id);
  if (!e || !rt || !isOpen(s)) return campagne();
  const n = rt.vragen.length;
  const nodig = Math.ceil(n * rt.drempel - 1e-9);
  scherm([
    kop(terug('← Campagne', '#campagne')),
    h('h1', {}, rt.titel),
    ...rt.intro.map((t) => h('p', {}, t)),
    ...(rt.documenten || []).map((d) => tabelNode(d)),
    rt.bron ? bronRegel(rt.bron) : null,
    h('p', {}, `${n} opdrachten, zonder hints en met één poging per opdracht. Je haalt de toets met minstens ${Math.round(rt.drempel * 100)} %: ${nodig} punten van ${n}.`),
    rtGehaald(id) ? h('p', { class: 'zacht' }, `Je hebt deze toets al gehaald (${store.les(id).score} van ${store.les(id).van}).`) : null,
    geenAdvies(),
  ], [knop('Start de realiteitstoets', 'hoofd', () => startRt(id)), linkKnop('Nog even oefenen', 'tweede', '#')]);
}
function startRt(id) {
  const rt = rts.get(id);
  const grafieken = rt.grafieken || {};
  speel(rt.vragen.map((q) => ({ soort: 'vraag', b: q.begrip ? begrippen.get(q.begrip) || null : null, q, fase: 'Realiteitstoets', toets: true, bronBlok: rt.bron || null, grafieken })), { klaar: (res) => rtKlaar(id, res) });
}
function rtKlaar(id, res) {
  const rt = rts.get(id);
  const n = rt.vragen.length;
  const nodig = Math.ceil(n * rt.drempel - 1e-9);
  const geslaagd = res.punten >= nodig - 1e-9;
  const eerste = geslaagd && !rtGehaald(id);
  const rangVoor = rang();
  const score = Math.round(res.punten * 2) / 2;
  if (geslaagd) store.zetLes(id, { geslaagd: 1, score, van: n, dag: vandaag() });
  autoSync();
  laadTotVolgende().catch(() => {});
  const v = volgende();
  const nieuweRang = rang() > rangVoor;
  scherm([
    kop(h('span', {}, rt.titel)),
    h('h1', {}, geslaagd ? 'Realiteitstoets gehaald' : 'Nog niet gehaald'),
    h('p', { class: 'getal' }, `${score} van ${n}`),
    h('p', { class: 'zacht' }, geslaagd ? rt.afsluitTekst : `Je had er ${nodig} nodig. Je kunt de toets opnieuw doen, wanneer je wilt.`),
    nieuweRang ? h('p', { style: 'font-weight:600' }, `Nieuwe rang: ${RANGEN[rang()].naam}.`) : null,
    geslaagd && !v ? h('p', {}, 'Alle levels en realiteitstoetsen zijn gehaald. De Open wereld volgt in een volgende stap van het spel.') : null,
    geenAdvies(),
  ], geslaagd ? [v && v.soort === 'les' ? linkKnop(`Naar ${levelTitel(levelEntry(v.niveau))}`, 'hoofd', `#level/${v.niveau}`) : null, linkKnop('Terug naar start', v && v.soort === 'les' ? 'tweede' : 'hoofd', '#')] : [knop('Opnieuw proberen', 'hoofd', () => startRt(id)), linkKnop('Terug naar start', 'tweede', '#')]);
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
  const huidig = rang();
  scherm([
    kop(terug()),
    h('h1', {}, 'Kenniskaart'),
    h('p', { class: 'zacht' }, 'Een begrip telt als beheerst na drie juiste herhalingen op rij.'),
    h('h2', { class: 'subkop' }, `Rang: ${RANGEN[huidig].naam}`),
    huidig < RANGEN.length - 1 ? h('p', { class: 'klein', style: 'margin:0 0 8px' }, `Volgende rang: ${RANGEN[huidig + 1].naam} (${RANGEN[huidig + 1].eis}).`) : h('p', { class: 'klein', style: 'margin:0 0 8px' }, 'Hoogste rang van de campagne bereikt. Strateeg en Fondsbeheerder volgen met de Open wereld.'),
    h('ul', { class: 'rijen' }, ...DOMEINEN.map((d) => {
      const lijst = [...begrippen.values()].filter((b) => levelEntry(b.niveau)?.domein === d);
      const bestaat = index.reeks.some((e) => e.domein === d);
      const beheerst = lijst.filter((b) => store.beheerst(b.id)).length;
      const pct = lijst.length ? Math.round((beheerst / lijst.length) * 100) : null;
      return h('li', {}, h('div', { class: 'rij', style: 'flex-direction:column;align-items:stretch;gap:4px' },
        h('div', { style: 'display:flex;justify-content:space-between;gap:12px' }, h('span', {}, d), h('span', { class: 'meta' }, pct == null ? (bestaat ? 'nog niet vrijgespeeld' : 'nog niet in het spel') : `${pct} % · ${beheerst} van ${lijst.length}`)),
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
        knop('Synchroniseer nu', 'hoofd', async () => { bewaarSleutel(); status.textContent = 'Bezig…'; const r = await autoSync(); status.textContent = syncTekst(r); if (r.nieuw) { await laadTotVolgende().catch(() => {}); } })),
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
            try { const n = store.importeer(await f.text()); await laadTotVolgende().catch(() => {}); instellingen(`Teruggezet: ${n} onderdelen overgenomen.`); autoSync(); }
            catch (err) { bericht.textContent = err.message; }
          } }))),
      bericht),
    geenAdvies(),
  ], [linkKnop('Terug naar start', 'hoofd', '#')]);
}

// ---------- routes ----------
async function route() {
  sessieBezig = false;
  if (index) await laadTotVolgende().catch(() => {});
  const [deel, p1, p2] = location.hash.replace(/^#/, '').split('/');
  if (deel === 'instellingen') return instellingen();
  if (laadFout || !index) return start();
  if (deel === 'sessie') return startSessie(p1);
  if (deel === 'les') return startLes(p1, p2);
  if (deel === 'campagne') return campagne();
  if (deel === 'level') return levelScherm(p1);
  if (deel === 'toets') return toetsIntro(p1);
  if (deel === 'rt') return rtIntro(p1);
  if (deel === 'boek') return p1 ? boekBegrip(p1) : boek();
  if (deel === 'kenniskaart') return kenniskaart();
  return start();
}

const naSync = (r) => { if (r.nieuw && !sessieBezig) route(); };

pasThemaToe();
window.addEventListener('hashchange', route);
window.addEventListener('online', () => autoSync().then(naSync));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') autoSync().then(naSync); });
document.addEventListener('click', (e) => {
  const a = e.target.closest?.('a[href^="#"]');
  if (!a) return;
  const doel = a.getAttribute('href');
  if (doel === location.hash || (doel === '#' && location.hash === '')) { e.preventDefault(); route(); }
});
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});

await laadInhoud();
await route();
autoSync().then(naSync);
