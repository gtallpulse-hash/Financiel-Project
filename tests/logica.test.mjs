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
