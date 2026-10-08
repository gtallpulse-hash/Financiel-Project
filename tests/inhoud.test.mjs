import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const data = JSON.parse(readFileSync(new URL('../public/data/level1.json', import.meta.url), 'utf8'));
const begrippen = new Map(data.begrippen.map((b) => [b.id, b]));
const oefenvragen = data.begrippen.flatMap((b) => b.vragen);
const alleVragen = [...oefenvragen, ...data.eindtoets.vragen];
const datum = /^\d{4}-\d{2}-\d{2}$/;

test('elk begrip heeft uitleg, bron en een geldig-op-datum, en minstens twee vragen', () => {
  assert.equal(begrippen.size, data.begrippen.length, 'dubbele begrip-id');
  for (const b of data.begrippen) {
    for (const k of ['nl', 'en', 'wat', 'vergelijking', 'voorbeeld', 'bron']) assert.ok(b[k] && b[k].length >= 3, `${b.id}.${k}`);
    assert.match(b.geldig_op, datum, b.id);
    assert.ok(b.vragen.length >= 2, b.id);
    if (b.bron_url) assert.match(b.bron_url, /^https:\/\//, b.id);
  }
});

test('alle lessen verwijzen naar bestaande begrippen en dekken alles precies één keer', () => {
  const gebruikt = data.lessen.flatMap((l) => l.begrippen);
  assert.deepEqual([...gebruikt].sort(), [...begrippen.keys()].sort());
  assert.equal(data.lessen.length, 8);
  for (const l of data.lessen) assert.equal(l.afsluiter.length, 3, `${l.id}: afsluiter heeft drie zinnen`);
});

test('elke vraag heeft uitleg (waarom, wanneer anders, herkennen) en een geldige vorm', () => {
  const vormen = new Set(['mc', 'rek', 'kop', 'vol', 'aanwijs']);
  const ids = new Set();
  for (const q of alleVragen) {
    assert.ok(vormen.has(q.type), q.id);
    assert.ok(!ids.has(q.id), `dubbel id ${q.id}`); ids.add(q.id);
    for (const k of ['vraag', 'waarom', 'wanneer', 'herken']) assert.ok(q[k], `${q.id}.${k}`);
  }
  for (const q of oefenvragen) assert.ok(q.hint, `${q.id} mist een hint`);
});

test('de vier vragen uit het plan komen allemaal voor, plus grafiek lezen', () => {
  const soorten = new Set(oefenvragen.map((q) => q.type));
  for (const s of ['mc', 'rek', 'kop', 'vol', 'aanwijs']) assert.ok(soorten.has(s), s);
});

test('meerkeuze: drie unieke opties en een geldig juist antwoord', () => {
  for (const q of alleVragen.filter((x) => x.type === 'mc')) {
    assert.equal(q.opties.length, 3, q.id);
    assert.equal(new Set(q.opties).size, 3, q.id);
    assert.ok(Number.isInteger(q.juist) && q.juist >= 0 && q.juist < 3, q.id);
  }
});

test('rekenpuzzels: het antwoord klopt met de formule en de marge is klein', () => {
  for (const q of alleVragen.filter((x) => x.type === 'rek')) {
    const uit = Function(`"use strict"; return (${q.controle})`)();
    assert.ok(Math.abs(uit - q.antwoord) <= q.marge, `${q.id}: formule geeft ${uit}, antwoord ${q.antwoord}`);
    assert.ok(q.marge <= Math.max(1, Math.abs(q.antwoord) * 0.02), `${q.id}: marge te ruim`);
  }
});

test('koppelen en volgorde: unieke termen en uitleg', () => {
  for (const q of alleVragen.filter((x) => x.type === 'kop')) {
    assert.ok(q.paren.length >= 3 && q.paren.length <= 4, q.id);
    assert.equal(new Set(q.paren.map((p) => p[0])).size, q.paren.length, q.id);
    assert.equal(new Set(q.paren.map((p) => p[1])).size, q.paren.length, q.id);
  }
  for (const q of alleVragen.filter((x) => x.type === 'vol')) {
    assert.ok(q.stappen.length >= 3, q.id);
    assert.equal(new Set(q.stappen).size, q.stappen.length, q.id);
  }
});

const waarden = (g) => data.grafieken[g].punten.map((p) => p.y);
test('aangewezen punten zijn werkelijk het hoogste of laagste punt', () => {
  for (const q of alleVragen.filter((x) => x.type === 'aanwijs')) {
    const w = waarden(q.grafiek);
    const hoogste = /hoogste|grootste stijging/.test(q.vraag);
    const verwacht = w.indexOf(hoogste ? Math.max(...w) : Math.min(...w));
    assert.equal(q.juist, verwacht, `${q.id}: ${q.vraag}`);
  }
});

test('grafieken verwijzen naar bestaande reeksen met bron en datum', () => {
  for (const q of alleVragen.filter((x) => x.grafiek)) assert.ok(data.grafieken[q.grafiek], q.id);
  for (const [id, g] of Object.entries(data.grafieken)) {
    assert.ok(g.bron && g.titel, id);
    assert.match(g.geldig_op, datum, id);
    for (const r of g.reeksen || [g]) for (const p of r.punten) assert.ok(Number.isFinite(p.y) && p.x, id);
  }
});

test('echte gegevens in de teksten kloppen met de grafieken', () => {
  const hicp = Object.fromEntries(data.grafieken['hicp-be'].punten.map((p) => [p.x, p.y]));
  assert.equal(hicp['2022'], 10.3);
  assert.equal(Math.round((hicp['2022'] - hicp['2021']) * 10) / 10, 7.1);
  const be10 = Object.fromEntries(data.grafieken.be10.punten.map((p) => [p.x, p.y]));
  assert.equal(be10['2020'], Math.min(...Object.values(be10)));
  assert.equal(be10['2023'], 3.09);
  const sp = Object.fromEntries(data.grafieken.sp500.punten.map((p) => [p.x, p.y]));
  assert.deepEqual([sp['2018'], sp['2022'], sp['2019']], [-6.2, -19.4, 28.9]);
  assert.equal(Object.values(sp).filter((v) => v < 0).length, 2);
  assert.deepEqual(Object.entries(sp).filter(([, v]) => v > 20).map(([k]) => k), ['2019', '2021', '2023', '2024']);
});

test('rente op rente: de getekende reeksen volgen de formules', () => {
  const [enk, sam] = data.grafieken['rente-op-rente'].reeksen;
  enk.punten.forEach((p) => assert.ok(Math.abs(p.y - (1000 + 40 * Number(p.x))) < 0.01, `enkelvoudig ${p.x}`));
  sam.punten.forEach((p) => assert.ok(Math.abs(p.y - 1000 * 1.04 ** Number(p.x)) < 0.01, `samengesteld ${p.x}`));
  const verschil = sam.punten.at(-1).y - enk.punten.at(-1).y;
  assert.ok(Math.abs(verschil - 1043.4) < 0.1);
});

test('eindtoets: 12 vragen, drempel 80 %, geen hints nodig, elk begrip bestaat', () => {
  assert.equal(data.eindtoets.vragen.length, 12);
  assert.equal(data.drempel, 0.8);
  assert.equal(Math.ceil(12 * data.drempel - 1e-9), 10);
  for (const q of data.eindtoets.vragen) assert.ok(begrippen.has(q.begrip), q.id);
});

test('de eerste keer laden blijft ruim onder 1 MB', () => {
  const som = (map) => readdirSync(map).reduce((t, f) => {
    const p = join(map, f);
    return t + (statSync(p).isDirectory() ? som(p) : statSync(p).size);
  }, 0);
  const bytes = som(new URL('../public', import.meta.url).pathname);
  assert.ok(bytes < 400_000, `public is ${bytes} bytes`);
});

test('geen verboden taal: geen koop- of verkooptips in de lesinhoud', () => {
  const tekst = JSON.stringify(data).toLowerCase();
  for (const woord of ['koop nu', 'verkoop nu', 'koopadvies', 'verkoopadvies', 'we raden aan', 'u moet kopen']) assert.ok(!tekst.includes(woord), woord);
});
