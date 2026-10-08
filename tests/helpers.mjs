import { readFileSync } from 'node:fs';
const lees = (p) => JSON.parse(readFileSync(new URL(`../public/${p}`, import.meta.url), 'utf8'));
export const index = lees('data/index.json');
export const levels = index.reeks.filter((e) => e.soort === 'level').map((e) => ({ entry: e, data: lees(e.bestand) }));
export const rts = index.reeks.filter((e) => e.soort === 'rt').map((e) => ({ entry: e, data: lees(e.bestand) }));
export const niveau = (id) => levels.find((l) => l.entry.id === id).data;
export const reeks = (grafiek) => Object.fromEntries(grafiek.punten.map((p) => [p.x, p.y]));
