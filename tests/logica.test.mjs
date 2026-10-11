import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGetal, schud, rekJuist, kopTelling, volTelling } from '../public/js/logica.js';

test('getallen worden gelezen zoals een Vlaming ze typt', () => {
  const gevallen = [
    ['7,5', 7.5], ['7.5', 7.5], ['1.102,50', 1102.5], ['1,102.50', 1102.5], ['2.688', 2688], ['2688', 2688],
    ['-2,3', -2.3], ['−2,3', -2.3], ['45,9 %', 45.9], ['  60 euro ', 60], ['0,8', 0.8], ['1.234.567', 1234567],
  ];
  for (const [invoer, uitkomst] of gevallen) assert.equal(parseGetal(invoer), uitkomst, invoer);
  for (const slecht of ['', 'abc', '1,2,3x', '--5', ',', '€']) assert.ok(Number.isNaN(parseGetal(slecht)), `"${slecht}" hoort geen getal te zijn`);
});

test('rekenantwoord telt binnen de marge, niet erbuiten', () => {
  const q = { antwoord: 45.9, marge: 0.5 };
  assert.ok(rekJuist(q, 45.95));
  assert.ok(rekJuist(q, 46.4));
  assert.ok(!rekJuist(q, 46.5));
  assert.ok(!rekJuist(q, NaN));
  assert.ok(rekJuist({ antwoord: -2.3, marge: 0.1 }, -2.3));
  assert.ok(!rekJuist({ antwoord: -2.3, marge: 0.1 }, 2.3));
});

test('hussel is vast per vraag, bevat alles en is nooit de goede volgorde', () => {
  for (const n of [2, 3, 4, 5]) {
    for (const zaad of ['a', 'geld-2:rechts', 'inflatie-5:stappen', 'x'.repeat(40)]) {
      const p = schud(n, zaad);
      assert.deepEqual([...p].sort(), Array.from({ length: n }, (_, i) => i));
      assert.deepEqual(p, schud(n, zaad));
      assert.notDeepEqual(p, Array.from({ length: n }, (_, i) => i));
    }
  }
});

test('koppelen en volgorde tellen juiste plaatsen', () => {
  const kop = { paren: [['a', '1'], ['b', '2'], ['c', '3']] };
  assert.deepEqual(kopTelling(kop, [0, 1, 2]), { goed: 3, van: 3, juist: true });
  assert.deepEqual(kopTelling(kop, [1, 0, 2]), { goed: 1, van: 3, juist: false });
  assert.equal(kopTelling(kop, [0, null, 2]).juist, false);
  const vol = { stappen: ['x', 'y', 'z'] };
  assert.equal(volTelling(vol, [0, 1, 2]).juist, true);
  assert.deepEqual(volTelling(vol, [0, 2, 1]), { goed: 1, van: 3, juist: false });
  assert.equal(volTelling(vol, [0, 1]).juist, false);
});

import { spreidLessen, beoordeelLevel, levelAfgebroken } from '../public/js/logica.js';

test('niveautest: vier vragen gelijkmatig over de lessen van een level', () => {
  assert.deepEqual(spreidLessen(8), [1, 3, 5, 7]);
  assert.deepEqual(spreidLessen(10), [1, 3, 6, 8]);
  assert.deepEqual(spreidLessen(9), [1, 3, 5, 7]);
  assert.deepEqual(spreidLessen(3), [0, 1, 2]);
});

test('niveautest: één fout haalt het level en laat enkel die les over', () => {
  const r = beoordeelLevel([{ les: 1, juist: true }, { les: 3, juist: false }, { les: 5, juist: true }, { les: 7, juist: true }], 8);
  assert.equal(r.geslaagd, true);
  assert.deepEqual(r.gekend, [0, 1, 2, 4, 5, 6, 7]);
  assert.equal(r.startLes, 3);
});

test('niveautest: alles juist kent het hele level', () => {
  const r = beoordeelLevel([1, 3, 5, 7].map((les) => ({ les, juist: true })), 8);
  assert.deepEqual(r.gekend, [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(r.startLes, null);
});

test('niveautest: twee fouten breken het level af en je begint bij de eerste fout', () => {
  const items = [{ les: 1, juist: true }, { les: 3, juist: false }, { les: 5, juist: false }];
  assert.equal(levelAfgebroken(items), true);
  const r = beoordeelLevel(items, 8);
  assert.equal(r.geslaagd, false);
  assert.deepEqual(r.gekend, [0, 1]);
  assert.equal(r.startLes, 2);
  // zonder enige juiste vraag is er geen bewijs: je begint bij les 1
  const nul = beoordeelLevel([{ les: 1, juist: false }, { les: 3, juist: false }], 8);
  assert.deepEqual(nul.gekend, []);
  assert.equal(nul.startLes, 0);
});
