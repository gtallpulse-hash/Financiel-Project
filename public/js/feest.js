// Sober feestmoment, alleen bij het halen van een level of realiteitstoets (zie PLAN.md).
// Geen beweging als het toestel "minder beweging" vraagt.
export function feest() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas');
  c.setAttribute('aria-hidden', 'true');
  c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:10';
  document.body.append(c);
  const w = (c.width = innerWidth), hh = (c.height = innerHeight);
  const ctx = c.getContext('2d');
  const kleuren = ['#1F6B57', '#8A5A00', '#A3392B', '#2D5F8B'];
  const stukjes = Array.from({ length: 36 }, (_, i) => ({ x: Math.random() * w, y: -20 - Math.random() * hh * 0.4, v: 2 + Math.random() * 2.5, z: 6 + Math.random() * 6, k: kleuren[i % 4], r: Math.random() * 3 }));
  const start = performance.now();
  (function tik(nu) {
    const t = nu - start;
    ctx.clearRect(0, 0, w, hh);
    for (const s of stukjes) { s.y += s.v; s.r += 0.05; ctx.fillStyle = s.k; ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.r); ctx.fillRect(-s.z / 2, -s.z / 4, s.z, s.z / 2); ctx.restore(); }
    if (t < 1800) requestAnimationFrame(tik); else c.remove();
  })(start);
}
