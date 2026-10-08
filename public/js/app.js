import { maakStore, vandaag } from './store.js';
import { synchroniseer } from './sync.js';

// ---------- opslag en inhoud ----------
const geheugen = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
let opslag;
try { localStorage.getItem('x'); opslag = localStorage; } catch { opslag = geheugen(); }
const store = maakStore(opslag);

const BESTANDEN = ['data/test.json'];
const begrippen = new Map();
let laadFout = false;

async function laadInhoud() {
  try {
    for (const f of BESTANDEN) {
      const r = await fetch(f);
      if (!r.ok) throw new Error(f);
      const d = await r.json();
      for (const b of d.begrippen) begrippen.set(b.id, { ...b, level: d.level, test: d.level === 'test' });
    }
  } catch { laadFout = true; }
}

// ---------- kleine bouwstenen ----------
const h = (tag, attrs = {}, ...kids) => {
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
};
const ikoon = (naam) => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 20 20');
  s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', PADEN[naam]);
  p.setAttribute('fill', 'none');
  p.setAttribute('stroke', 'currentColor');
  p.setAttribute('stroke-width', '2');
  s.append(p);
  return s;
};
const FASEKLEUR = { groei: 'var(--groei)', piek: 'var(--piek)', krimp: 'var(--krimp)', herstel: 'var(--herstel)' };

const datumNl = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
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
const geenAdvies = () => h('p', { class: 'klein' }, 'Geen beleggingsadvies. Dit is uitleg, geen aankoop- of verkooptip.');

function bronRegel(b) {
  return h('p', { class: 'klein bron' }, `Bron: ${b.bron} · geldig op ${datumNl(b.geldig_op)}`, b.test ? ' · testinhoud' : '');
}

// ---------- thema ----------
function pasThemaToe() {
  const t = store.instellingen().thema;
  if (t === 'licht' || t === 'donker') document.documentElement.dataset.thema = t;
  else delete document.documentElement.dataset.thema;
}

// ---------- synchronisatie ----------
let syncStatus = { status: store.instellingen().sleutel ? 'nog niet' : 'uit' };
let syncBezig = null;
async function autoSync() {
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
  const dag = vandaag();
  const teHerhalen = store.teHerhalen(dag).filter((id) => begrippen.has(id)).length;
  const bekend = [...begrippen.keys()].filter((id) => store.bekend(id)).length;
  const reeks = store.streak(dag);
  const heeftInhoud = begrippen.size > 0;
  scherm([
    kop(h('span', {}, 'Leerspel Beleggen & Economie'), reeks ? `Reeks: ${reeks} ${reeks === 1 ? 'dag' : 'dagen'}` : ''),
    h('h1', {}, 'Vandaag leren'),
    laadFout ? h('p', { class: 'waarschuwing' }, 'De lessen konden niet geladen worden. Probeer later opnieuw met bereik.') : null,
    h('section', { 'aria-label': 'Overzicht' },
      h('div', { class: 'getal' }, String(teHerhalen)),
      h('p', { class: 'zacht' }, teHerhalen === 1 ? 'begrip om te herhalen' : 'begrippen om te herhalen')),
    h('section', {},
      h('ul', { class: 'rijen' },
        h('li', {}, h('a', { class: 'rij', href: '#sessie/lang' }, h('span', {}, 'Lange sessie'), h('span', { class: 'meta' }, '20+ min'))),
        h('li', {}, h('a', { class: 'rij', href: '#boek' }, h('span', {}, 'Begrippenboek'), h('span', { class: 'meta' }, `${bekend} vrijgespeeld`))),
        h('li', {}, h('a', { class: 'rij', href: '#instellingen' }, h('span', {}, 'Instellingen en back-up'))))),
    geenAdvies(),
  ], heeftInhoud ? [
    h('a', { class: 'knop hoofd', href: '#sessie/normaal' }, 'Normale sessie · 10–15 min'),
    h('a', { class: 'knop tweede', href: '#sessie/kort' }, 'Korte sessie · 5 min'),
  ] : []);
}

// ---------- uitleg ----------
function uitlegInhoud(b) {
  const fase = (b.cyclus || '').toLowerCase();
  return [
    h('h1', {}, b.nl),
    h('p', { class: 'zacht' }, `${b.nl} · ${b.en}`),
    h('dl', { class: 'uitleg' },
      h('dt', {}, 'Wat is het?'), h('dd', {}, b.wat),
      h('dt', {}, 'Uit het dagelijks leven'), h('dd', {}, b.vergelijking),
      h('dt', {}, 'Voorbeeld met cijfers'), h('dd', {}, b.voorbeeld),
      fase in PADEN ? [h('dt', {}, 'Plaats op de economische cyclus'),
        h('dd', { style: `color:${FASEKLEUR[fase]};font-weight:600;display:flex;gap:8px;align-items:center` },
          (() => { const i = ikoon(fase); i.setAttribute('width', '20'); i.setAttribute('height', '20'); return i; })(), b.cyclus)] : null),
    bronRegel(b),
    geenAdvies(),
  ];
}

function uitlegScherm(b, { kopTekst, knopTekst, actie, stop }) {
  scherm([
    kop(stop ? terug('Stop en bewaar') : terug('← Terug naar het boek', '#boek'), kopTekst),
    ...uitlegInhoud(b),
  ], [knop(knopTekst, 'hoofd', actie)]);
}

// ---------- sessie ----------
const MAX = { kort: 3, normaal: 8, lang: 15 };
function bouwSessie(soort) {
  const dag = vandaag();
  const herhaal = store.teHerhalen(dag).filter((id) => begrippen.has(id)).slice(0, 15);
  const nieuw = [...begrippen.keys()].filter((id) => !store.bekend(id));
  return [...herhaal, ...nieuw].slice(0, MAX[soort] || MAX.normaal).map((id) => ({ id, nieuw: !store.bekend(id) }));
}

function startSessie(soort) {
  const lijst = bouwSessie(soort);
  if (!lijst.length) {
    scherm([kop(terug('← Terug')), h('h1', {}, 'Alles herhaald voor vandaag'),
      h('p', {}, 'Er staat niets meer klaar. Kom morgen terug, of bekijk het begrippenboek.')],
    [h('a', { class: 'knop hoofd', href: '#' }, 'Terug naar start')]);
    return;
  }
  const res = { juist: 0, n: 0, opnieuw: [] };
  const stap = (i) => {
    if (i >= lijst.length) return afsluiter(res);
    const it = lijst[i];
    const b = begrippen.get(it.id);
    const naarVraag = () => vraagScherm(b, i, lijst.length, res, () => stap(i + 1));
    if (it.nieuw) uitlegScherm(b, { kopTekst: `Nieuw begrip · ${i + 1} van ${lijst.length}`, knopTekst: 'Naar de vraag', actie: naarVraag, stop: true });
    else naarVraag();
  };
  stap(0);
}

function vraagScherm(b, i, n, res, volgende) {
  const q = b.vragen[store.concept(b.id).lvl % b.vragen.length];
  let poging = 0;
  let gekozen = null;
  let klaar = false;
  let hint = false;

  function teken() {
    const delen = [
      kop(terug('Stop en bewaar'), `Vraag ${i + 1} van ${n}`),
      h('p', { class: 'voortgang', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': n, 'aria-valuenow': i }, h('span', { style: `width:${(i / n) * 100}%` })),
      h('h1', { id: 'vraag', style: 'font-size:24px;line-height:32px' }, q.vraag),
    ];
    if (!klaar) {
      delen.push(h('ul', { class: 'rijen opties', role: 'radiogroup', 'aria-labelledby': 'vraag' },
        ...q.opties.map((o, idx) => h('li', {}, h('label', {},
          h('input', { type: 'radio', name: 'a', checked: gekozen === idx, onchange: () => { gekozen = idx; controleer.disabled = false; } }),
          h('span', {}, o))))));
      if (hint) {
        delen.push(h('p', { class: 'fb hint', role: 'status', style: 'margin-top:16px' }, ikoon('hint'), h('span', {}, `Nog niet juist. Hint: ${q.hint}`)));
      }
    } else {
      const eerste = poging === 1;
      const juist = gekozen === q.juist;
      delen.push(h('ul', { class: 'rijen' }, ...q.opties.map((o, idx) => h('li', {},
        h('div', { class: 'rij' }, h('span', {}, o),
          idx === q.juist ? h('span', { class: 'fb juist', style: 'margin:0' }, ikoon('juist'), 'Juist antwoord')
            : idx === gekozen ? h('span', { class: 'fb fout', style: 'margin:0' }, ikoon('fout'), 'Jouw keuze') : null)))));
      delen.push(h('p', { class: `fb ${eerste && juist ? 'juist' : juist ? 'let-op' : 'fout'}`, role: 'status', style: 'margin-top:16px' },
        ikoon(juist ? 'juist' : 'fout'),
        h('span', {}, eerste && juist ? 'Juist.' : juist ? 'Juist bij de tweede poging. Dit komt sneller terug.' : 'Nog niet juist. Dit komt sneller terug.')));
      delen.push(h('dl', { class: 'uitleg' },
        h('dt', {}, 'Waarom'), h('dd', {}, q.waarom),
        h('dt', {}, 'Wanneer het anders loopt'), h('dd', {}, q.wanneer),
        h('dt', {}, 'Waar je het aan herkent'), h('dd', {}, q.herken)));
      delen.push(bronRegel(b));
    }
    const controleer = knop('Controleer', 'hoofd', () => {
      if (gekozen == null) return;
      poging++;
      if (gekozen === q.juist || poging === 2) {
        klaar = true;
        const goed = gekozen === q.juist && poging === 1;
        // Alleen een juist antwoord bij de eerste poging telt als juist voor de herhaling.
        store.antwoord(b.id, goed);
        res.n++;
        if (goed) res.juist++; else res.opnieuw.push(b.nl);
      } else { hint = true; gekozen = null; }
      teken();
    }, { disabled: gekozen == null });
    const knoppen = klaar ? [knop(i + 1 === n ? 'Afronden' : 'Volgende', 'hoofd', volgende)] : [controleer];
    scherm(delen, knoppen);
  }
  teken();
}

function afsluiter(res) {
  autoSync();
  const reeks = store.streak(vandaag());
  scherm([
    kop(h('span', {}, 'Sessie klaar')),
    h('h1', {}, 'Klaar voor vandaag'),
    h('ol', { style: 'padding-left:24px' },
      h('li', {}, `Je beantwoordde ${res.n} ${res.n === 1 ? 'vraag' : 'vragen'}, ${res.juist} juist bij de eerste poging.`),
      h('li', {}, res.opnieuw.length ? `Dit komt sneller terug: ${res.opnieuw.join(', ')}.` : 'Niets hoeft sneller terug te komen.'),
      h('li', {}, `Je reeks staat op ${reeks} ${reeks === 1 ? 'dag' : 'dagen'}.`)),
    geenAdvies(),
  ], [h('a', { class: 'knop hoofd', href: '#' }, 'Terug naar start')]);
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
  ], [h('a', { class: 'knop hoofd', href: '#' }, 'Terug naar start')]);
}

function boekBegrip(id) {
  const b = begrippen.get(id);
  if (!b || !store.bekend(id)) return boek();
  uitlegScherm(b, { kopTekst: 'Begrippenboek', knopTekst: 'Terug naar het boek', actie: () => { location.hash = '#boek'; } });
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
    h('section', {}, h('h2', {}, 'Weergave'),
      h('ul', { class: 'rijen' }, thema('auto', 'Automatisch'), thema('licht', 'Licht'), thema('donker', 'Donker'))),
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
  ], [h('a', { class: 'knop hoofd', href: '#' }, 'Terug naar start')]);
}

// ---------- routes ----------
function route() {
  const [deel, param] = location.hash.replace(/^#/, '').split('/');
  if (deel === 'sessie' && begrippen.size) return startSessie(param);
  if (deel === 'boek') return param ? boekBegrip(param) : boek();
  if (deel === 'instellingen') return instellingen();
  return start();
}

pasThemaToe();
window.addEventListener('hashchange', route);
window.addEventListener('online', () => autoSync());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') autoSync().then(() => { if (!location.hash.startsWith('#sessie')) route(); }); });
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});

await laadInhoud();
route();
autoSync().then((r) => { if (r.nieuw && !location.hash.startsWith('#sessie')) route(); });
