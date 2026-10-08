// Cloudflare Worker: de statische pagina komt uit public/ (assets).
// Alleen /api/* komt hier terecht (zie run_worker_first in wrangler.toml).
import { onRequestPost } from '../functions/api/sync.js';

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/sync') {
      if (request.method === 'POST') return onRequestPost({ request, env });
      return new Response('Alleen POST', { status: 405, headers: { allow: 'POST' } });
    }
    return new Response('Niet gevonden', { status: 404 });
  },
};
