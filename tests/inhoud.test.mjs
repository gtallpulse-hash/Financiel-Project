import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { index, levels, rts } from './helpers.mjs';

const datum = /^\d{4}-\d{2}-\d{2}$/;
const vormen = new Set(['mc', 'mythe', 'rek', 'kop', 'vol', 'aanwijs', 'leg']);
const alleBegrippen = levels.flatMap((l) => l.data.begrippen);
const vragenVan = (d) => [...d.begrippen.flatMap((b) => b.vragen), ...d.eindtoets.vragen];

test('index en bestanden horen bij elkaar', () => {
  assert.deepEqual(levels.map((l) => l.entry.nummer), levels.map((_, i) => i + 1));
  for (const { entry, data } of levels) {
    assert.equal(data.id, entry.id);
    assert.deepEqual(entry.lessen, data.lessen.map((l) => l.id), entry.id);
  }
});

test('vraag-id\'s zijn uniek over alle levels en realiteitstoetsen', () => {
  const ids = [...levels.flatMap((l) => vragenVan(l.data)), ...rts.flatMap((r) => r.data.vragen)].map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length, 'dubbel vraag-id');
});

test('begrip-id\'s zijn uniek over alle levels', () => {
  const ids = alleBegrippen.map((b) => b.id);
  assert.equal(new Set(ids).size, ids.length, 'dubbele begrip-id');
});

for (const { entry, data } of levels) {
  const begrippen = new Map(data.begrippen.map((b) => [b.id, b]));
  const vragen = vragenVan(data);

  test(`${entry.id}: elk begrip heeft uitleg, bron met datum en minstens drie vragen`, () => {
    for (const b of data.begrippen) {
      for (const k of ['nl', 'en', 'wat', 'vergelijking', 'voorbeeld', 'bron']) assert.ok(b[k] && b[k].length >= 3, `${b.id}.${k}`);
      assert.match(b.geldig_op, datum, b.id);
      assert.ok(b.vragen.length >= 3, `${b.id} heeft te weinig vragen`);
      if (b.bron_url) assert.match(b.bron_url, /^https:\/\//, b.id);
    }
  });

  test(`${entry.id}: lessen dekken alle begrippen precies één keer, met drie zinnen afsluiter`, () => {
    const gebruikt = data.lessen.flatMap((l) => l.begrippen);
    assert.deepEqual([...gebruikt].sort(), [...begrippen.keys()].sort());
    for (const l of data.lessen) assert.equal(l.afsluiter.length, 3, `${l.id}`);
  });

  test(`${entry.id}: elke vraag heeft uitleg en een geldige vorm`, () => {
    const ids = new Set();
    for (const q of vragen) {
      assert.ok(vormen.has(q.type), q.id);
      assert.ok(!ids.has(q.id), `dubbel id ${q.id}`); ids.add(q.id);
      for (const k of ['vraag', 'waarom', 'wanneer', 'herken']) assert.ok(q[k], `${q.id}.${k}`);
      if (q.grafiek) assert.ok(data.grafieken[q.grafiek], `${q.id} verwijst naar een onbekende grafiek`);
    }
    for (const q of data.begrippen.flatMap((b) => b.vragen)) if (q.type !== 'leg') assert.ok(q.hint, `${q.id} mist een hint`);
  });

  test(`${entry.id}: meerkeuze en mythe-of-feit zijn zuiver`, () => {
    for (const q of vragen.filter((x) => x.type === 'mc')) {
      assert.ok(q.opties.length >= 2 && q.opties.length <= 4, q.id);
      assert.equal(new Set(q.opties).size, q.opties.length, q.id);
      assert.ok(Number.isInteger(q.juist) && q.juist >= 0 && q.juist < q.opties.length, q.id);
    }
    for (const q of vragen.filter((x) => x.type === 'mythe')) assert.equal(typeof q.feit, 'boolean', q.id);
  });

  test(`${entry.id}: rekenpuzzels kloppen met hun formule en hebben een kleine marge`, () => {
    for (const q of vragen.filter((x) => x.type === 'rek')) {
      const uit = Function(`"use strict"; return (${q.controle})`)();
      assert.ok(Math.abs(uit - q.antwoord) <= q.marge + 1e-9, `${q.id}: formule geeft ${uit}, antwoord ${q.antwoord}`);
      assert.ok(q.marge <= Math.max(1, Math.abs(q.antwoord) * 0.02) + 1e-9, `${q.id}: marge te ruim`);
    }
  });

  test(`${entry.id}: koppelen, volgorde en leg-het-uit zijn volledig`, () => {
    for (const q of vragen.filter((x) => x.type === 'kop')) {
      assert.ok(q.paren.length >= 3 && q.paren.length <= 4, q.id);
      assert.equal(new Set(q.paren.map((p) => p[0])).size, q.paren.length, q.id);
      assert.equal(new Set(q.paren.map((p) => p[1])).size, q.paren.length, q.id);
    }
    for (const q of vragen.filter((x) => x.type === 'vol')) {
      assert.ok(q.stappen.length >= 3, q.id);
      assert.equal(new Set(q.stappen).size, q.stappen.length, q.id);
    }
    for (const q of vragen.filter((x) => x.type === 'leg')) {
      assert.ok(q.modelantwoord.length > 40 && q.checkpunten.length >= 3, q.id);
    }
  });

  test(`${entry.id}: aangewezen punten zijn werkelijk het hoogste of laagste punt`, () => {
    for (const q of vragen.filter((x) => x.type === 'aanwijs')) {
      const w = data.grafieken[q.grafiek].punten.map((p) => p.y);
      assert.ok(['max', 'min'].includes(q.extremum), q.id);
      assert.equal(q.juist, w.indexOf(q.extremum === 'max' ? Math.max(...w) : Math.min(...w)), `${q.id}: ${q.vraag}`);
    }
  });

  test(`${entry.id}: grafieken hebben bron, datum en geldige punten`, () => {
    for (const [id, g] of Object.entries(data.grafieken)) {
      assert.ok(g.bron && g.titel, id);
      assert.match(g.geldig_op, datum, id);
      assert.ok(['lijn', 'staaf'].includes(g.soort), id);
      for (const r of g.reeksen || [g]) {
        assert.ok(r.punten.length >= 2, id);
        for (const p of r.punten) assert.ok(Number.isFinite(p.y) && p.x, `${id}: ${JSON.stringify(p)}`);
      }
    }
  });

  test(`${entry.id}: eindtoets heeft 12 vragen, drempel 80 % en bestaande begrippen`, () => {
    assert.equal(data.eindtoets.vragen.length, 12);
    assert.equal(data.drempel, 0.8);
    for (const q of data.eindtoets.vragen) assert.ok(begrippen.has(q.begrip), q.id);
  });
}

test('de realiteitstoetsen zijn volledig en hebben bron en datum', () => {
  for (const { entry, data } of rts) {
    assert.ok(data.titel && data.intro.length && data.vragen.length >= 8, entry.id);
    assert.equal(data.drempel, 0.8);
    assert.ok(data.bron?.bron && datum.test(data.bron.geldig_op), entry.id);
    for (const q of data.vragen) {
      assert.ok(vormen.has(q.type), `${entry.id} ${q.id}`);
      for (const k of ['vraag', 'waarom', 'wanneer', 'herken']) assert.ok(q[k], `${entry.id} ${q.id}.${k}`);
    }
  }
});

test('campagnevolgorde: levels 1 tot 6 met realiteitstoetsen na level 4 en 6', () => {
  const volgorde = index.reeks.map((e) => e.id);
  const verwacht = ['level1', 'level2', 'level3', 'level4', 'rt1', 'level5', 'level6', 'rt2'];
  assert.deepEqual(volgorde.slice(0, levels.length + rts.length).filter((id) => verwacht.includes(id)), verwacht.filter((id) => volgorde.includes(id)));
});

test('de eerste keer laden blijft ruim onder 1 MB, ook zonder compressie', () => {
  const som = (map) => readdirSync(map).reduce((t, f) => {
    const p = join(map, f);
    return t + (statSync(p).isDirectory() ? som(p) : statSync(p).size);
  }, 0);
  const root = new URL('../public', import.meta.url).pathname;
  const eerste = ['index.html', 'css/app.css', 'manifest.webmanifest', 'icon.svg', 'data/index.json', 'data/level1.json', 'js/app.js', 'js/store.js', 'js/sync.js', 'js/dom.js', 'js/logica.js', 'js/grafiek.js', 'js/vragen.js', 'js/feest.js']
    .reduce((t, f) => t + gzipSync(readFileSync(join(root, f))).length, 0);
  assert.ok(eerste < 1_000_000, `eerste keer laden (gzip) is ${eerste} bytes`);
  assert.ok(eerste < 250_000, `eerste keer laden (gzip) is ${eerste} bytes: ruim onder de grens blijven`);
  assert.ok(som(root) < 3_000_000);
});

test('geen verboden taal: geen koop- of verkooptips in de lesinhoud', () => {
  const tekst = JSON.stringify([levels.map((l) => l.data), rts.map((r) => r.data)]).toLowerCase();
  for (const woord of ['koop nu', 'verkoop nu', 'koopadvies', 'verkoopadvies', 'we raden aan', 'u moet kopen', 'koop dit aandeel']) assert.ok(!tekst.includes(woord), woord);
});
