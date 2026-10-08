# Leerspel Beleggen & Economie

Een lichte webpagina om economie en beleggen te leren, mobiel eerst. Plan: `PLAN.md`. Ontwerp: `DESIGN.md`. Bronnen van de lesinhoud: `BRONNEN.md`.

- `public/` is de pagina zelf (gewone HTML, CSS en JavaScript, geen framework).
- `public/data/level1.json` is de lesinhoud van Level 1.
- `functions/api/sync.js` en `src/worker.js` zijn de synchronisatie (Cloudflare Worker met D1-database).
- `npm test` draait de tests van de spellogica, de synchronisatie en de lesinhoud.
- Lokaal bekijken: `python3 -m http.server -d public 8788` en open `http://localhost:8788`.
