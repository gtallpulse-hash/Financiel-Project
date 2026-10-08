// Cloudflare Pages Function: POST /api/sync
// Ontvangt wijzigingen van een toestel en geeft wat nieuwer is terug.
// De speler is de SHA-256 van de geheime sleutel; de sleutel zelf wordt niet bewaard.
const MAX_BODY = 300_000;
const MAX_ITEMS = 1000;
const MAX_WAARDE = 2000;
const SLEUTEL_RE = /^(c|d|l):[\w.:-]{1,80}$/;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

async function sha256(tekst) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(tekst));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost({ request, env }) {
  const auth = request.headers.get('authorization') || '';
  const sleutel = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (sleutel.length < 24 || sleutel.length > 200) return json({ fout: 'sleutel' }, 401);

  const tekst = await request.text();
  if (tekst.length > MAX_BODY) return json({ fout: 'te groot' }, 413);
  let body;
  try { body = JSON.parse(tekst); } catch { return json({ fout: 'ongeldig' }, 400); }
  if (typeof body?.since !== 'number' || !Array.isArray(body.changes) || body.changes.length > MAX_ITEMS) {
    return json({ fout: 'ongeldig' }, 400);
  }

  const user = await sha256(sleutel);
  const nu = Date.now();
  const upsert = env.DB.prepare(
    'INSERT INTO items (user, k, v, t, u) VALUES (?, ?, ?, ?, ?) ' +
    'ON CONFLICT(user, k) DO UPDATE SET v = excluded.v, t = excluded.t, u = excluded.u WHERE excluded.t > items.t'
  );
  const stmts = [];
  for (const c of body.changes) {
    if (!c || !SLEUTEL_RE.test(c.k) || typeof c.t !== 'number' || !c.v || typeof c.v !== 'object') continue;
    const v = JSON.stringify(c.v);
    if (v.length > MAX_WAARDE) continue;
    stmts.push(upsert.bind(user, c.k, v, Math.floor(c.t), nu));
  }
  if (stmts.length) await env.DB.batch(stmts);

  const { results } = await env.DB.prepare('SELECT k, v, t FROM items WHERE user = ? AND u > ?').bind(user, Math.max(0, body.since)).all();
  const items = {};
  for (const r of results) items[r.k] = { v: JSON.parse(r.v), t: r.t };
  return json({ nu, items });
}
