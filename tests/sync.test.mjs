import test from 'node:test';
import assert from 'node:assert/strict';
import { maakStore } from '../public/js/store.js';
import { synchroniseer } from '../public/js/sync.js';
import { onRequestPost } from '../functions/api/sync.js';

// Kleine nabootsing van D1, genoeg voor deze twee zoekopdrachten.
function nepDb() {
  const rijen = new Map();
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    async all() {
      const [user, since] = args;
      return { results: [...rijen.values()].filter((r) => r.user === user && r.u > since).map(({ k, v, t }) => ({ k, v, t })) };
    },
    run: async () => {
      const [user, k, v, t, u] = args;
      const key = user + '|' + k;
      const oud = rijen.get(key);
      if (!oud || t > oud.t) rijen.set(key, { user, k, v, t, u });
    },
  });
  return { prepare: (sql) => stmt(sql), batch: (lijst) => Promise.all(lijst.map((s) => s.run())), rijen };
}
const opslag = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const SLEUTEL = 'abcdefghijklmnopqrstuvwxyz012345';
const server = (db) => async (url, init) => onRequestPost({ request: new Request('https://x.test' + url, init), env: { DB: db } });

test('twee toestellen komen samen; nieuwste stand wint', async () => {
  const db = nepDb();
  const f = server(db);
  let klok = 10_000;
  const gsm = maakStore(opslag(), () => ++klok);
  const pc = maakStore(opslag(), () => ++klok);
  gsm.zetInstelling('sleutel', SLEUTEL);
  pc.zetInstelling('sleutel', SLEUTEL);

  gsm.antwoord('inflatie', true, '2026-01-01');
  assert.equal((await synchroniseer(gsm, { fetchFn: f })).status, 'ok');
  assert.equal((await synchroniseer(pc, { fetchFn: f })).status, 'ok');
  assert.equal(pc.concept('inflatie').lvl, 1);

  pc.antwoord('inflatie', false, '2026-01-02'); // later op de pc
  await synchroniseer(pc, { fetchFn: f });
  await synchroniseer(gsm, { fetchFn: f });
  assert.equal(gsm.concept('inflatie').lvl, 0);
});

test('zonder bereik blijft alles bewaard en gaat later mee', async () => {
  const db = nepDb();
  const s = maakStore(opslag(), (() => { let t = 1; return () => ++t * 1000; })());
  s.zetInstelling('sleutel', SLEUTEL);
  s.antwoord('rente', true, '2026-01-01');
  const offline = async () => { throw new TypeError('netwerk'); };
  assert.equal((await synchroniseer(s, { fetchFn: offline })).status, 'offline');
  assert.ok(s.wijzigingen().length >= 2);
  assert.equal((await synchroniseer(s, { fetchFn: server(db) })).status, 'ok');
  assert.equal(s.wijzigingen().length, 0);
  assert.ok(db.rijen.size >= 2);
});

test('server weigert korte sleutel en slechte invoer', async () => {
  const f = server(nepDb());
  const kort = await f('/api/sync', { method: 'POST', headers: { authorization: 'Bearer kort' }, body: '{}' });
  assert.equal(kort.status, 401);
  const slecht = await f('/api/sync', { method: 'POST', headers: { authorization: 'Bearer ' + SLEUTEL }, body: 'x' });
  assert.equal(slecht.status, 400);
});

test('server negeert ongeldige sleutels en oudere wijzigingen', async () => {
  const db = nepDb();
  const f = server(db);
  const stuur = (changes) => f('/api/sync', { method: 'POST', headers: { authorization: 'Bearer ' + SLEUTEL }, body: JSON.stringify({ since: 0, changes }) });
  await stuur([{ k: 'c:a', v: { lvl: 2 }, t: 200 }, { k: 'boos', v: {}, t: 1 }]);
  await stuur([{ k: 'c:a', v: { lvl: 1 }, t: 100 }]);
  assert.equal(db.rijen.size, 1);
  assert.equal(JSON.parse([...db.rijen.values()][0].v).lvl, 2);
});
