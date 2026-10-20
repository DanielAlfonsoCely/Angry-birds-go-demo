// Mide triángulos por kart (modelo completo) y por prop/tema. Uso: node tests/art-tris.mjs
import { createServer } from 'vite';
import { chromium } from 'playwright';
const server = await createServer({ server: { port: 5197, strictPort: false }, logLevel: 'error' });
await server.listen();
const port = server.config.server.port;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`http://localhost:${port}/tests/art-gallery.html?view=none&nonav`);
const dbg = process.argv.includes("--parts");
const res = await page.evaluate(async (dbg) => {
  const art = await import('/src/art/index.js');
  const data = await import('/src/core/data.js');
  const vis = (m) => { for (let o = m; o; o = o.parent) if (!o.visible) return false; return true; };
  const tris = (o) => { let t = 0; o.traverse((m) => { if (m.isMesh && vis(m)) { const g = m.geometry; t += (g.index ? g.index.count : g.attributes.position.count) / 3; } }); return Math.round(t); };
  const karts = {};
  for (const c of data.CHARACTERS) karts[c.id] = tris(art.createKartModel(c.id).group ?? art.createKartModel(c.id).object3D);
  const props = {};
  for (const th of ['snow', 'jungle', 'volcano']) for (const k of ['tree','rock','bigRock','bush','crystal','flower','ruin','sign','flag','lantern','geyser','snowman','mushroom','cactus','arch']) props[`${k}/${th}`] = tris(art.createProp(k, th, { variant: 0 }));
  const parts = [];
  if (dbg) { const m = art.createKartModel('tuko'); const root = m.group ?? m.object3D; root.traverse((o) => { if (o.isMesh) parts.push(`${o.parent?.name || o.parent?.parent?.name || ''}/${o.material.name}:${tris(o)}`); }); }
  return { karts, props, parts };
}, dbg);
if (dbg) console.log(res.parts.join('\n'));
console.log(JSON.stringify(res.karts));
console.log(Object.entries(res.props).map(([k, v]) => `${k}:${v}`).join(' '));
if (errors.length) console.error(errors.join('\n'));
await browser.close(); await server.close();
