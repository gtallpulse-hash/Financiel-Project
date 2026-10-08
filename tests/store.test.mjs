import test from 'node:test';
import assert from 'node:assert/strict';
import { maakStore, plusDagen } from '../public/js/store.js';

const opslag = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
let klok = 1000;
const nu = () => ++klok;

test('juist antwoord verlengt de pauze: 1, 3, 7, 14, 30, 60 dagen', () => {
  const s = maakStore(opslag(), nu);
  const verwacht = [1, 3, 7, 14, 30, 60, 60];
  verwacht.forEach((dagen) => {
    s.antwoord('x', true, '2026-01-01');
    assert.equal(s.concept('x').due, plusDagen('2026-01-01', dagen));
  });
});

test('fout antwoord begint de reeks opnieuw en komt vandaag terug', () => {
  const s = maakStore(opslag(), nu);
  s.antwoord('x', true, '2026-01-01');
  s.antwoord('x', true, '2026-01-02');
  s.antwoord('x', false, '2026-01-05');
  assert.deepEqual(s.concept('x'), { lvl: 0, ok: 0, due: '2026-01-05' });
  assert.deepEqual(s.teHerhalen('2026-01-05'), ['x']);
});

test('beheerst na drie juiste antwoorden op rij', () => {
  const s = maakStore(opslag(), nu);
  s.antwoord('x', true, '2026-01-01'); s.antwoord('x', true, '2026-01-02');
  assert.equal(s.beheerst('x'), false);
  s.antwoord('x', true, '2026-01-05');
  assert.equal(s.beheerst('x'), true);
});

test('streak laat twee gemiste dagen per maand toe, de derde breekt', () => {
  const s = maakStore(opslag(), nu);
  for (const d of ['2026-03-10', '2026-03-11', '2026-03-14', '2026-03-17']) s.antwoord('x', true, d);
  // 16 en 15 gemist = 2 pauzes (reeks blijft: 17 en 14 tellen), 13 gemist = derde: reeks stopt.
  assert.equal(s.streak('2026-03-17'), 2);
  const t = maakStore(opslag(), nu);
  for (const d of ['2026-03-10', '2026-03-11', '2026-03-14']) t.antwoord('x', true, d);
  assert.equal(t.streak('2026-03-14'), 3);
});

test('vandaag nog niet gespeeld kost de reeks niets', () => {
  const s = maakStore(opslag(), nu);
  s.antwoord('x', true, '2026-03-10');
  assert.equal(s.streak('2026-03-11'), 1);
});

test('samenvoegen: per begrip wint de nieuwste stand', () => {
  const a = maakStore(opslag(), () => 5000);
  a.voegSamen({ 'c:x': { v: { lvl: 2, ok: 2, due: '2026-02-01' }, t: 4000 } });
  const n = a.voegSamen({
    'c:x': { v: { lvl: 1, ok: 1, due: '2026-01-01' }, t: 3000 },
    'c:y': { v: { lvl: 1, ok: 1, due: '2026-01-01' }, t: 3000 },
  });
  assert.equal(n, 1);
  assert.equal(a.concept('x').lvl, 2);
  assert.equal(a.concept('y').lvl, 1);
});

test('samenvoegen negeert ongeldige items', () => {
  const a = maakStore(opslag(), nu);
  assert.equal(a.voegSamen({ 'x:evil': { v: {}, t: 1 }, 'c:ok': { v: 'tekst', t: 1 }, 'c:__': { t: 1 } }), 0);
});

test('export en import werken rond; slechte import wordt geweigerd', () => {
  const a = maakStore(opslag(), nu);
  a.antwoord('x', true, '2026-01-01');
  const b = maakStore(opslag(), nu);
  assert.ok(b.importeer(a.exporteer()) >= 2);
  assert.equal(b.concept('x').lvl, 1);
  assert.throws(() => b.importeer('geen json'));
  assert.throws(() => b.importeer('{"app":"iets"}'));
});
