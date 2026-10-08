// Voortgang bewaren op dit toestel. Elke eenheid (begrip of dag) heeft een
// tijdstip; bij samenvoegen wint per eenheid de nieuwste stand.
const SLEUTEL = 'leerspel.v1';
export const INTERVALLEN = [1, 3, 7, 14, 30, 60];
const MAX_IMPORT = 500_000;

const lokaal = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
export const vandaag = (d = new Date()) => lokaal(d);
export const plusDagen = (dag, n) => {
  const d = new Date(dag + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const leeg = () => ({
  items: {},
  instellingen: { thema: 'auto', sleutel: '' },
  sync: { since: 0, pushed: 0 },
});

const geldigItem = (k, e) =>
  /^(c|d):[\w.:-]{1,80}$/.test(k) && e && typeof e.t === 'number' && e.v && typeof e.v === 'object';

export function maakStore(opslag, nu = () => Date.now()) {
  let state = leeg();
  try {
    const ruw = opslag.getItem(SLEUTEL);
    if (ruw) state = { ...leeg(), ...JSON.parse(ruw) };
  } catch {
    state = leeg();
  }
  const bewaar = () => {
    try { opslag.setItem(SLEUTEL, JSON.stringify(state)); } catch { /* opslag vol of geblokkeerd */ }
  };
  const zet = (k, v) => { state.items[k] = { v, t: nu() }; bewaar(); };

  const api = {
    concept(id) {
      return state.items['c:' + id]?.v ?? { lvl: 0, ok: 0, due: null };
    },
    bekend(id) { return !!state.items['c:' + id]; },
    beheerst(id) { return this.concept(id).ok >= 3; },
    teHerhalen(dag = vandaag()) {
      return Object.keys(state.items)
        .filter((k) => k.startsWith('c:') && state.items[k].v.due && state.items[k].v.due <= dag)
        .sort((a, b) => state.items[a].v.due.localeCompare(state.items[b].v.due))
        .map((k) => k.slice(2));
    },
    antwoord(id, juist, dag = vandaag()) {
      const c = this.concept(id);
      let nieuw;
      if (juist) {
        const lvl = Math.min(c.lvl + 1, INTERVALLEN.length);
        nieuw = { lvl, ok: c.ok + 1, due: plusDagen(dag, INTERVALLEN[lvl - 1]) };
      } else {
        nieuw = { lvl: 0, ok: 0, due: dag };
      }
      zet('c:' + id, nieuw);
      const d = state.items['d:' + dag]?.v ?? { n: 0 };
      zet('d:' + dag, { n: d.n + 1 });
    },
    // Reeks: opeenvolgende gespeelde dagen. Per maand mogen twee dagen gemist worden.
    streak(dag = vandaag()) {
      let teller = 0;
      const pauzes = {};
      let d = state.items['d:' + dag] ? dag : plusDagen(dag, -1);
      for (let i = 0; i < 800; i++) {
        if (state.items['d:' + d]) teller++;
        else {
          const m = d.slice(0, 7);
          pauzes[m] = (pauzes[m] || 0) + 1;
          if (pauzes[m] > 2) break;
        }
        d = plusDagen(d, -1);
      }
      return teller;
    },
    instellingen() { return state.instellingen; },
    zetInstelling(naam, waarde) { state.instellingen[naam] = waarde; bewaar(); },
    sync() { return state.sync; },
    wijzigingen() {
      return Object.entries(state.items)
        .filter(([, e]) => e.t > state.sync.pushed)
        .map(([k, e]) => ({ k, v: e.v, t: e.t }));
    },
    syncKlaar(since, pushed) {
      state.sync = { since, pushed: Math.max(state.sync.pushed, pushed) };
      bewaar();
    },
    voegSamen(extern) {
      let n = 0;
      for (const [k, e] of Object.entries(extern || {})) {
        if (!geldigItem(k, e)) continue;
        const hier = state.items[k];
        if (!hier || e.t > hier.t) { state.items[k] = { v: e.v, t: e.t }; n++; }
      }
      if (n) bewaar();
      return n;
    },
    exporteer() {
      return JSON.stringify({ app: 'leerspel', versie: 1, items: state.items }, null, 1);
    },
    importeer(tekst) {
      if (typeof tekst !== 'string' || tekst.length > MAX_IMPORT) throw new Error('Bestand is te groot of onleesbaar.');
      let data;
      try { data = JSON.parse(tekst); } catch { throw new Error('Dit is geen geldig back-upbestand.'); }
      if (data?.app !== 'leerspel' || typeof data.items !== 'object' || !data.items) {
        throw new Error('Dit is geen back-up van dit spel.');
      }
      const n = this.voegSamen(data.items);
      // Zorg dat geïmporteerde stand ook naar de server gaat.
      state.sync.pushed = 0;
      bewaar();
      return n;
    },
  };
  return api;
}
