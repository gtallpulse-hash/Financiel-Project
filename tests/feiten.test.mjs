// Echte gegevens uit bronnen en de teksten die erover gaan, tegen elkaar gecontroleerd.
import test from 'node:test';
import assert from 'node:assert/strict';
import { levels, niveau, reeks } from './helpers.mjs';

const L1 = niveau('level1');
test('level 1: echte gegevens in de teksten kloppen met de grafieken', () => {
  const hicp = reeks(L1.grafieken['hicp-be']);
  assert.equal(hicp['2022'], 10.3);
  assert.equal(Math.round((hicp['2022'] - hicp['2021']) * 10) / 10, 7.1);
  const be10 = reeks(L1.grafieken.be10);
  assert.equal(be10['2020'], Math.min(...Object.values(be10)));
  assert.equal(be10['2023'], 3.09);
  const sp = reeks(L1.grafieken.sp500);
  assert.deepEqual([sp['2018'], sp['2022'], sp['2019']], [-6.2, -19.4, 28.9]);
  assert.equal(Object.values(sp).filter((v) => v < 0).length, 2);
  assert.deepEqual(Object.entries(sp).filter(([, v]) => v > 20).map(([k]) => k), ['2019', '2021', '2023', '2024']);
});

test('level 1: rente op rente volgt de formules', () => {
  const [enk, sam] = L1.grafieken['rente-op-rente'].reeksen;
  enk.punten.forEach((p) => assert.ok(Math.abs(p.y - (1000 + 40 * Number(p.x))) < 0.01));
  sam.punten.forEach((p) => assert.ok(Math.abs(p.y - 1000 * 1.04 ** Number(p.x)) < 0.01));
});

if (levels.some((l) => l.entry.id === 'level2')) {
  const L2 = niveau('level2');
  test('level 2: bbp, werk, rente, wisselkoers en schuld kloppen met de gegevens', () => {
    const bbp = reeks(L2.grafieken['bbp-be']);
    assert.equal(bbp['2020'], Math.min(...Object.values(bbp)));
    assert.equal(bbp['2021'], Math.max(...Object.values(bbp)));
    const dfr = reeks(L2.grafieken.dfr);
    assert.deepEqual([dfr['2021'], dfr['2023'], dfr['2025']], [-0.5, 4, 2]);
    const hicp = reeks(L2.grafieken['hicp-ea']);
    assert.equal(hicp['2022'], Math.max(...Object.values(hicp)));
    const schuld = reeks(L2.grafieken['schuld-be']);
    assert.equal(schuld['2020'], Math.max(...Object.values(schuld)));
    const saldo = reeks(L2.grafieken['saldo-be']);
    assert.equal(saldo['2020'], Math.min(...Object.values(saldo)));
    const kw = reeks(L2.grafieken['bbp-ea-kw']);
    assert.deepEqual([kw['2020 K1'], kw['2020 K2'], kw['2020 K3']], [-3.2, -11.2, 11.6]);
    assert.equal(kw['2020 K2'], Math.min(...Object.values(kw)));
    const curve = reeks(L2.grafieken.rentecurve);
    assert.ok(curve['2023'] < 0 && curve['2024'] < 0 && curve['2025'] > 0);
    const nasdaq = reeks(L2.grafieken.nasdaq);
    assert.equal(nasdaq['2022'], Math.min(...Object.values(nasdaq)));
  });

  test('level 2: het wipeffect is wiskundig juist (prijs daalt bij hogere marktrente)', () => {
    const prijs = (y) => [1, 2, 3, 4, 5].reduce((s, t) => s + 30 / (1 + y) ** t, 0) + 1000 / (1 + y) ** 5;
    assert.ok(Math.abs(prijs(0.03) - 1000) < 1e-9);
    for (const [a, b] of [[0.01, 0.02], [0.02, 0.03], [0.03, 0.04], [0.04, 0.05]]) assert.ok(prijs(a) > prijs(b));
    const g = L2.grafieken['obligatie-prijs'].punten.map((p) => p.y);
    [0.01, 0.02, 0.03, 0.04, 0.05].forEach((y, i) => assert.ok(Math.abs(g[i] - prijs(y)) < 0.01));
  });

  test('level 2: percentages tellen niet gewoon op (11,2 % daling en 11,6 % stijging)', () => {
    const netto = (1 - 0.112) * (1 + 0.116) - 1;
    assert.ok(Math.abs(netto * 100 - -0.9) < 0.1);
  });
}
