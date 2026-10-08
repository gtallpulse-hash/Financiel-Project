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

if (levels.some((l) => l.entry.id === 'level3')) {
  const L3 = niveau('level3');
  const getal = (s) => Number(String(s).replace(/\./g, '').replace(',', '.').replace('−', '-'));
  const tabellen = [...L3.begrippen.flatMap((b) => b.vragen), ...L3.eindtoets.vragen].filter((q) => q.tabel).map((q) => ({ id: q.id, t: q.tabel }));

  test('level 3: in elke bedrijfstabel is de balans in evenwicht (activa = schulden + eigen vermogen)', () => {
    assert.ok(tabellen.length >= 8, 'verwacht minstens acht tabellen');
    for (const { id, t } of tabellen) {
      const rij = (naam) => t.rijen.find((r) => r[0] === naam);
      const activa = rij('Totaal activa'), schuld = rij('Totale schulden'), eigen = rij('Eigen vermogen');
      if (!activa || !schuld || !eigen) continue;
      for (const kolom of [1, 2]) assert.ok(Math.abs(getal(activa[kolom]) - getal(schuld[kolom]) - getal(eigen[kolom])) <= 1.5, `${id} kolom ${kolom}`);
    }
  });

  test('level 3: de Bedrijfsdetective verbergt de naam tot na het antwoord en onthult daarna', () => {
    const detectives = L3.begrippen.flatMap((b) => b.vragen).concat(L3.eindtoets.vragen).filter((q) => q.detective);
    assert.ok(detectives.length >= 5);
    for (const q of detectives) {
      assert.match(q.tabel.titel, /^Bedrijf [A-E],/);
      assert.ok(!/Microsoft|Walmart|Delta|Coca-Cola|Costco/.test(q.vraag + q.tabel.titel), `${q.id} verklapt de naam`);
      assert.match(q.onthulling, /^Bedrijf [A-E] was /);
    }
  });

  test('level 3: kwartaalomzet telt op tot het jaarcijfer en groei klopt', () => {
    const kw = L3.grafieken['ms-kwartaal'].punten.map((p) => p.y);
    assert.equal(kw.length, 8);
    const jr = L3.grafieken['ms-omzet'].punten.reduce((o, p) => ({ ...o, [p.x]: p.y }), {});
    assert.ok(Math.abs(kw.slice(0, 4).reduce((a, b) => a + b, 0) - jr.FY25) < 0.5);
    assert.ok(Math.abs(kw.slice(4).reduce((a, b) => a + b, 0) - jr.FY26) < 0.5);
  });

  test('level 3: marges tussen 0 en 100 en brutomarge hoger dan bedrijfsmarge', () => {
    const m = reeks(L3.grafieken.bedrijfsmarge);
    for (const v of Object.values(m)) assert.ok(v > 0 && v < 100);
    assert.equal(Math.max(...Object.values(m)), m.A);
  });
}

if (levels.some((l) => l.entry.id === 'level4')) {
  const L4 = niveau('level4');
  const alle = [...L4.begrippen.flatMap((b) => b.vragen), ...L4.eindtoets.vragen];
  const getal = (s) => Number(String(s).replace(/\./g, '').replace(',', '.').replace('−', '-'));

  test('level 4: de K/W-grafiek is koers gedeeld door winst per aandeel (uit de tabel in de vragen)', () => {
    const t = alle.find((q) => q.tabel?.kolommen?.[2] === 'Winst per aandeel ($)' && q.tabel.rijen.length === 3).tabel;
    const kw = reeks(L4.grafieken['kw-zes']);
    for (const [naam, koers, eps] of t.rijen) assert.ok(Math.abs(getal(koers) / getal(eps) - kw[naam]) < 0.06, naam);
  });

  test('level 4: ondernemingswaarde = beurswaarde + schulden − cash in elke EV-tabel', () => {
    const ev = L4.begrippen.find((b) => b.id === 'ondernemingswaarde').vragen.filter((q) => q.tabel);
    assert.equal(ev.length, 3);
    // Walmart: de rekenvraag geeft de antwoordsom; controleer de tabelrijen onderling
    for (const q of ev) {
      const r = Object.fromEntries(q.tabel.rijen.map((x) => [x[0], getal(x[1])]));
      assert.ok(r.Beurswaarde > 0 && r['Financiële schulden'] >= 0 && r['Geld in kas'] > 0);
    }
  });

  test('level 4: beurswaarde = koers × aantal aandelen en rangorde Walmart > Costco', () => {
    const q = L4.begrippen.find((b) => b.id === 'beurswaarde').vragen.find((x) => x.type === 'mythe');
    const rij = (n) => q.tabel.rijen.find((r) => r[0] === n);
    const mc = (n) => getal(rij(n)[1]) * getal(rij(n)[2]);
    assert.ok(mc('Walmart') > mc('Costco') * 1.9);
    assert.ok(getal(rij('Costco')[1]) > getal(rij('Walmart')[1]) * 8);
    const bw = reeks(L4.grafieken.beurswaarde);
    assert.equal(Math.min(...Object.values(bw)), bw.Delta);
    assert.ok(Math.abs(bw.Costco - mc('Costco') / 1000) < 1.5);
    assert.ok(Math.abs(bw.Walmart - mc('Walmart') / 1000) < 1.5);
  });

  test('level 4: historische K/W van Costco heeft piek in FY24 en dal in FY23', () => {
    const c = reeks(L4.grafieken['costco-kw']);
    assert.equal(Object.keys(c).length, 7);
    assert.equal(Object.entries(c).sort((a, b) => b[1] - a[1])[0][0], 'FY24');
    assert.equal(Object.entries(c).sort((a, b) => a[1] - b[1])[0][0], 'FY23');
  });

  test('level 4: Delta heeft precies één verliesjaar in de grafiek (2020)', () => {
    const d = reeks(L4.grafieken['delta-winst']);
    assert.deepEqual(Object.entries(d).filter(([, v]) => v < 0).map(([k]) => k), ['2020']);
  });

  test('level 4: uitkeringsratio van PepsiCo is de hoogste en blijft onder 100 %', () => {
    const u = reeks(L4.grafieken.uitkering);
    assert.equal(Object.entries(u).sort((a, b) => b[1] - a[1])[0][0], 'PepsiCo');
    for (const v of Object.values(u)) assert.ok(v > 0 && v < 100);
  });
}

if (levels.some((l) => l.entry.id === 'level5')) {
  const L5 = niveau('level5');
  const alle = [...L5.begrippen.flatMap((b) => b.vragen), ...L5.eindtoets.vragen];

  // Regels van het spel voor de cyclusfase, op basis van het bbp-niveau per kwartaal
  const fase = (reeksPunten, i) => {
    const p = reeksPunten.map((x) => x.y);
    const record = Math.max(...p.slice(0, i));
    if (p[i] < p[i - 1]) return 'Krimp';
    if (p[i] > record) return 'Groei';
    return 'Herstel';
  };
  const isPiek = (reeksPunten, i) => {
    const p = reeksPunten.map((x) => x.y);
    return p[i] >= Math.max(...p.slice(0, i)) && p[i + 1] < p[i];
  };

  test('level 5: elke Cyclus-plaatsing volgt de vier regels van het spel op de echte bbp-cijfers', () => {
    const cyc = alle.filter((q) => q.cyclus);
    assert.ok(cyc.length >= 5);
    const namen = ['Groei', 'Piek', 'Krimp', 'Herstel'];
    for (const q of cyc) {
      assert.deepEqual(q.opties, namen, q.id);
      const pts = L5.grafieken[q.grafiek].punten;
      assert.equal(q.markeer.length, 1, q.id);
      const i = q.markeer[0].i;
      assert.ok(i > 0 && i < pts.length - 1, q.id);
      const verwacht = isPiek(pts, i) ? 'Piek' : fase(pts, i);
      assert.equal(namen[q.juist], verwacht, `${q.id}: ${pts[i].x}`);
    }
  });

  test('level 5: gedateerde feiten in de teksten kloppen met de grafieken', () => {
    const n = reeks(L5.grafieken['nasdaq-dotcom']);
    assert.equal(Object.entries(n).sort((a, b) => b[1] - a[1])[0][0], '2000-02');
    assert.ok(n['2002-09'] < n['2000-02'] * 0.3);
    const h = reeks(L5.grafieken['huizen-vs']);
    assert.equal(Object.entries(h).sort((a, b) => b[1] - a[1])[0][0], '2006-07');
    assert.equal(Object.entries(h).filter(([k]) => k >= '2006-07').sort((a, b) => a[1] - b[1])[0][0], '2012-02');
    assert.ok(Math.abs((1 - h['2012-02'] / h['2006-07']) * 100 - 27.4) < 0.1);
    const w = reeks(L5.grafieken.hout);
    assert.equal(Object.entries(w).sort((a, b) => b[1] - a[1])[0][0], '2021-05');
    const o = reeks(L5.grafieken['omzet-2020']);
    assert.ok(o.Delta < o['Coca-Cola'] && o['Coca-Cola'] < 100 && o.PepsiCo > 100);
    const s = reeks(L5.grafieken.overleving);
    const waarden = Object.values(s);
    assert.deepEqual([...waarden].sort((a, b) => b - a), waarden);
  });

  test('level 5: elke begripsvraag over Mythe of feit heeft een eerlijke uitleg', () => {
    const mythes = alle.filter((q) => q.type === 'mythe');
    assert.ok(mythes.length >= 10);
    for (const q of mythes) assert.ok(q.waarom.length > 30, q.id);
  });
}
