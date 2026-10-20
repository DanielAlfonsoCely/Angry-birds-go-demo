// Sistema de partículas con pool fijo: dos nubes de Points (mezcla normal y aditiva) y un pool de
// anillos para ondas expansivas. No se crean objetos al emitir ni al actualizar.
import * as THREE from 'three';

const CAP_NORMAL = 1800;
const CAP_ADD = 1800;
const RINGS = 6;

// Configuración por tipo. Rangos [min, max]. color2 = color al final de la vida.
// blend: 'add' | 'normal'; shape: 0 bola suave, 1 cuadro/hoja girando, 2 brillo con núcleo, 3 estrella
const KINDS = {
  dust:       { blend: 'normal', count: 3, life: [0.5, 0.9], speed: [0.5, 2], up: [0.6, 1.6], spread: 0.5, size: [0.5, 0.9], grow: 2.4, color: 0xd9c8a9, color2: 0xe9dfcf, alpha: 0.6, gravity: -0.5, drag: 2.5, shape: 0 },
  snow:       { blend: 'normal', count: 4, life: [0.5, 0.9], speed: [1, 3.5], up: [1.5, 3.5], spread: 0.4, size: [0.35, 0.7], grow: 1.6, color: 0xffffff, color2: 0xe3eefa, alpha: 0.85, gravity: 6, drag: 1.5, shape: 0 },
  leaf:       { blend: 'normal', count: 3, life: [0.8, 1.4], speed: [1, 3], up: [1.5, 3], spread: 0.4, size: [0.22, 0.32], grow: 0, color: 0x55b13f, color2: 0x8fd14f, alpha: 1, gravity: 3, drag: 1.8, shape: 1, spin: 8 },
  ember:      { blend: 'add', count: 3, life: [0.6, 1.2], speed: [0.5, 2.5], up: [1.5, 4], spread: 0.4, size: [0.12, 0.22], grow: -0.5, color: 0xffb347, color2: 0xff3d1f, alpha: 1, gravity: -1, drag: 1, shape: 2 },
  driftSpark: { blend: 'add', count: 3, life: [0.15, 0.35], speed: [2, 6], up: [1.5, 4], spread: 0.9, size: [0.2, 0.34], grow: -0.6, color: 0x2fb4ff, color2: 0x9be7ff, alpha: 1, gravity: 16, drag: 1, shape: 2 },
  boostFlame: { blend: 'add', count: 2, life: [0.15, 0.3], speed: [5, 9], up: [0, 0.6], spread: 0.25, size: [0.45, 0.7], grow: 1.4, color: 0xffd23f, color2: 0xff4d1a, alpha: 0.9, gravity: -2, drag: 3, shape: 2, dirMode: true },
  landing:    { blend: 'normal', count: 18, life: [0.5, 0.8], speed: [4, 7], up: [0.3, 1.2], spread: 0, size: [0.6, 1.0], grow: 2.2, color: 0xd9c8a9, color2: 0xf2ebe0, alpha: 0.7, gravity: -0.4, drag: 4, shape: 0, ring: true },
  coin:       { blend: 'add', count: 14, life: [0.4, 0.75], speed: [2, 5], up: [1, 4], spread: 1, size: [0.3, 0.5], grow: -0.4, color: 0xffe066, color2: 0xffb703, alpha: 1, gravity: 5, drag: 2, shape: 3 },
  itemBox:    { blend: 'add', count: 22, life: [0.5, 0.9], speed: [3, 7], up: [1, 5], spread: 1, size: [0.35, 0.55], grow: -0.3, color: 0xffffff, alpha: 1, gravity: 6, drag: 2, shape: 3, rainbow: true },
  smoke:      { blend: 'normal', count: 26, life: [3.2, 4.2], speed: [0.6, 2.2], up: [0.2, 1.0], spread: 1, size: [2.4, 3.8], grow: 0.6, color: 0x8e86a8, color2: 0xc9c3d9, alpha: 0.75, gravity: -0.15, drag: 1.2, shape: 0, area: 5 },
  shockwave:  { blend: 'normal', count: 24, life: [0.5, 0.8], speed: [10, 16], up: [0.2, 1], spread: 0, size: [0.8, 1.3], grow: 2, color: 0xc9b08a, color2: 0xe9dfcf, alpha: 0.6, gravity: 0, drag: 3, shape: 0, ring: true },
  hit:        { blend: 'add', count: 16, life: [0.3, 0.55], speed: [4, 9], up: [1, 4], spread: 1, size: [0.35, 0.6], grow: -0.5, color: 0xfff3b0, color2: 0xff9f1c, alpha: 1, gravity: 8, drag: 2, shape: 3 },
};

// Paletas por tema para 'dust' y 'landing' cuando no se pasa color. Cada entrada: [color inicial, color final, forma(opcional)]
// y peso; el color se elige por partícula. Formas: 0 bola, 1 hoja girando.
const THEME_DUST = {
  snow: { alpha: 0.85, pal: [[0xf6faff, 0xdbe8f7, 0, 3], [0xcfe3f7, 0xeaf3fc, 0, 1]], gravity: 1.5 },
  jungle: { alpha: 0.7, pal: [[0x8a6a45, 0xb59a74, 0, 4], [0x5a4630, 0x8a7352, 0, 2], [0x55b13f, 0x8fd14f, 1, 2]], gravity: 0.6 },
  volcano: { alpha: 0.7, pal: [[0x9a4f36, 0xc7826a, 0, 3], [0x4a403c, 0x7d726b, 0, 3], [0x2e2927, 0x5a514d, 0, 1]], gravity: -0.3 },
};
const pickPal = (pal) => {
  let t = 0;
  for (const e of pal) t += e[3];
  let r = Math.random() * t;
  for (const e of pal) { r -= e[3]; if (r <= 0) return e; }
  return pal[0];
};

const RAINBOW = [0xff595e, 0xffca3a, 0x8ac926, 0x1982c4, 0x6a4c93, 0xff70a6].map((h) => new THREE.Color(h));

function makePool(cap, additive) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(cap * 3);
  const col = new Float32Array(cap * 3);
  const extra = new Float32Array(cap * 4); // size, alpha, shape, rot
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aExtra', new THREE.BufferAttribute(extra, 4).setUsage(THREE.DynamicDrawUsage));
  geo.setDrawRange(0, 0);
  const uniforms = { uScale: { value: 400 } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */`
      uniform float uScale;
      attribute vec3 aColor; attribute vec4 aExtra;
      varying vec3 vColor; varying float vAlpha; varying float vShape; varying float vRot;
      void main(){
        vColor = aColor; vAlpha = aExtra.y; vShape = aExtra.z; vRot = aExtra.w;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aExtra.x * uScale / max(0.3, -mv.z);
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vColor; varying float vAlpha; varying float vShape; varying float vRot;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float a;
        if (vShape < 0.5) {
          float d = length(c) * 2.0;
          a = 1.0 - smoothstep(0.45, 1.0, d);
          // un poco de volumen: más claro arriba
          vec3 shade = vColor * (0.85 + 0.3 * (0.5 - c.y));
          gl_FragColor = vec4(shade, a * vAlpha);
        } else if (vShape < 1.5) {
          float cs = cos(vRot), sn = sin(vRot);
          vec2 q = vec2(c.x * cs - c.y * sn, c.x * sn + c.y * cs);
          a = 1.0 - smoothstep(0.4, 0.5, length(q * vec2(1.0, 2.2)));
          gl_FragColor = vec4(vColor, a * vAlpha);
        } else if (vShape < 2.5) {
          float d = length(c) * 2.0;
          a = pow(max(0.0, 1.0 - d), 1.6);
          gl_FragColor = vec4(mix(vColor, vec3(1.0), smoothstep(0.3, 0.0, d) * 0.7), min(1.0, a * 1.6) * vAlpha);
        } else {
          // estrella de 4 puntas con núcleo
          float cs = cos(vRot), sn = sin(vRot);
          vec2 q = abs(vec2(c.x * cs - c.y * sn, c.x * sn + c.y * cs)) * 2.0;
          float star = max(1.0 - smoothstep(0.0, 0.18, q.x * q.y * 6.0 + min(q.x, q.y) * 0.8), 0.0) * (1.0 - smoothstep(0.6, 1.0, max(q.x, q.y)));
          float core = pow(max(0.0, 1.0 - length(c) * 3.0), 1.5);
          a = clamp(star + core, 0.0, 1.0);
          gl_FragColor = vec4(mix(vColor, vec3(1.0), core * 0.6), a * vAlpha);
        }
        if (gl_FragColor.a < 0.01) discard;
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    // mezcla normal también para los brillos: la aditiva se pierde sobre nieve o cielo claro
    blending: THREE.NormalBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = additive ? 4 : 3;
  points.onBeforeRender = (renderer, scene, camera) => {
    const h = renderer.getDrawingBufferSize(_size).y;
    uniforms.uScale.value = h / (2 * Math.tan(THREE.MathUtils.degToRad((camera.fov ?? 60) / 2)));
  };
  return {
    points, geo, cap, n: 0,
    pos, col, extra,
    vel: new Float32Array(cap * 3),
    life: new Float32Array(cap),
    maxLife: new Float32Array(cap),
    size0: new Float32Array(cap),
    grow: new Float32Array(cap),
    alpha0: new Float32Array(cap),
    gravity: new Float32Array(cap),
    drag: new Float32Array(cap),
    spin: new Float32Array(cap),
    c0: new Float32Array(cap * 3),
    c1: new Float32Array(cap * 3),
  };
}
const _size = new THREE.Vector2();
const _c0 = new THREE.Color();
const _c1 = new THREE.Color();
const _d = new THREE.Vector3();

/** @returns {import('../core/contracts.js').Particles} */
export function createParticles(scene, theme) {
  let themeCfg = THEME_DUST[theme] ?? null;
  const normal = makePool(CAP_NORMAL, false);
  const additive = makePool(CAP_ADD, true);
  const group = new THREE.Group();
  group.name = 'particles';
  group.add(normal.points, additive.points);

  // anillos de onda expansiva
  const ringGeo = new THREE.RingGeometry(0.82, 1, 48, 1);
  ringGeo.rotateX(-Math.PI / 2);
  const rings = [];
  for (let i = 0; i < RINGS; i++) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      color: 0xffe9a8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    }));
    m.visible = false;
    m.renderOrder = 5;
    group.add(m);
    rings.push({ mesh: m, t: 0, dur: 0.7, radius: 18 });
  }
  scene?.add(group);

  function spawn(pool, cfg, p, opts, i, total) {
    if (pool.n >= pool.cap) return;
    const k = pool.n++;
    const s = opts.scale ?? 1;
    const rr = (a) => a[0] + Math.random() * (a[1] - a[0]);
    const area = (cfg.area ?? 0) * s;
    pool.pos[k * 3] = p.x + (Math.random() - 0.5) * (cfg.spread * 0.6 + area);
    pool.pos[k * 3 + 1] = p.y + Math.random() * 0.2 * s + (area ? Math.random() * area * 0.25 : 0) + (cfg.shape === 0 ? cfg.size[1] * s * 0.45 : 0);
    pool.pos[k * 3 + 2] = p.z + (Math.random() - 0.5) * (cfg.spread * 0.6 + area);
    let vx, vy, vz, shapeOverride = -1;
    const sp = rr(cfg.speed) * (cfg.ring ? s : 1);
    if (cfg.ring) {
      const a = (i / total) * Math.PI * 2 + Math.random() * 0.2;
      vx = Math.cos(a) * sp; vz = Math.sin(a) * sp; vy = rr(cfg.up);
    } else if (cfg.dirMode && opts.direction) {
      _d.copy(opts.direction).normalize();
      vx = _d.x * sp + (Math.random() - 0.5) * cfg.spread * 4;
      vy = _d.y * sp + rr(cfg.up);
      vz = _d.z * sp + (Math.random() - 0.5) * cfg.spread * 4;
    } else {
      const a = Math.random() * Math.PI * 2;
      const h = sp * cfg.spread;
      vx = Math.cos(a) * h; vz = Math.sin(a) * h; vy = rr(cfg.up);
      if (opts.direction) {
        _d.copy(opts.direction);
        vx += _d.x * sp * (1 - cfg.spread * 0.5); vy += _d.y * sp; vz += _d.z * sp * (1 - cfg.spread * 0.5);
      }
    }
    pool.vel[k * 3] = vx; pool.vel[k * 3 + 1] = vy; pool.vel[k * 3 + 2] = vz;
    const life = rr(cfg.life);
    pool.life[k] = life; pool.maxLife[k] = life;
    pool.size0[k] = rr(cfg.size) * s;
    pool.grow[k] = cfg.grow;
    pool.alpha0[k] = cfg.alpha;
    pool.gravity[k] = cfg.gravity;
    pool.drag[k] = cfg.drag;
    pool.spin[k] = (Math.random() - 0.5) * (cfg.spin ?? 3);
    if (cfg.rainbow) {
      _c0.copy(RAINBOW[Math.floor(Math.random() * RAINBOW.length)]);
      _c1.copy(_c0);
    } else if (themeCfg && opts.color == null && (cfg === KINDS.dust || cfg === KINDS.landing)) {
      const e = pickPal(themeCfg.pal);
      _c0.setHex(e[0]); _c1.setHex(e[1]);
      shapeOverride = e[2];
      pool.alpha0[k] = themeCfg.alpha;
      pool.gravity[k] = e[2] === 1 ? 3 : themeCfg.gravity;
      if (e[2] === 1) { pool.size0[k] = 0.22 + Math.random() * 0.12; pool.grow[k] = 0; pool.life[k] = pool.maxLife[k] = 0.8 + Math.random() * 0.6; pool.spin[k] = (Math.random() - 0.5) * 8; }
    } else {
      _c0.setHex(opts.color ?? cfg.color);
      _c1.setHex(opts.color != null ? opts.color : (cfg.color2 ?? cfg.color));
      if (opts.color != null && cfg.blend === 'add') _c0.lerp(WHITE, 0.35);
    }
    pool.c0[k * 3] = _c0.r; pool.c0[k * 3 + 1] = _c0.g; pool.c0[k * 3 + 2] = _c0.b;
    pool.c1[k * 3] = _c1.r; pool.c1[k * 3 + 1] = _c1.g; pool.c1[k * 3 + 2] = _c1.b;
    pool.extra[k * 4 + 2] = shapeOverride >= 0 ? shapeOverride : cfg.shape;
    pool.extra[k * 4 + 3] = Math.random() * 6.28;
  }

  function emit(kind, position, opts = {}) {
    const cfg = KINDS[kind];
    if (!cfg || !position) return;
    const pool = cfg.blend === 'add' ? additive : normal;
    const count = Math.max(1, Math.round(opts.count ?? cfg.count * (kind === 'smoke' ? Math.max(0.5, opts.scale ?? 1) : 1)));
    for (let i = 0; i < count; i++) spawn(pool, cfg, position, opts, i, count);
    if (kind === 'shockwave') {
      const r = rings.find((x) => !x.mesh.visible) ?? rings[0];
      r.mesh.visible = true;
      r.mesh.position.set(position.x, position.y + 0.3, position.z);
      r.t = 0;
      r.radius = 18 * (opts.scale ?? 1);
      r.mesh.material.color.setHex(opts.color ?? 0xffe9a8);
    }
  }

  function step(pool, dt) {
    let n = pool.n;
    const { pos, vel, life, maxLife, extra, col } = pool;
    for (let k = 0; k < n; k++) {
      life[k] -= dt;
      if (life[k] <= 0) {
        // quitar intercambiando con el último vivo
        const last = --n;
        if (k !== last) copy(pool, last, k);
        k--;
        continue;
      }
      const t = 1 - life[k] / maxLife[k];
      const dr = Math.exp(-pool.drag[k] * dt);
      vel[k * 3] *= dr; vel[k * 3 + 2] *= dr;
      vel[k * 3 + 1] = vel[k * 3 + 1] * dr - pool.gravity[k] * dt;
      pos[k * 3] += vel[k * 3] * dt;
      pos[k * 3 + 1] += vel[k * 3 + 1] * dt;
      pos[k * 3 + 2] += vel[k * 3 + 2] * dt;
      extra[k * 4] = Math.max(0.01, pool.size0[k] * (1 + pool.grow[k] * t));
      // entra rápido y se desvanece al final
      extra[k * 4 + 1] = pool.alpha0[k] * Math.min(1, t * 8) * (1 - t * t);
      extra[k * 4 + 3] += pool.spin[k] * dt;
      for (let c = 0; c < 3; c++) col[k * 3 + c] = pool.c0[k * 3 + c] + (pool.c1[k * 3 + c] - pool.c0[k * 3 + c]) * t;
    }
    pool.n = n;
    pool.geo.setDrawRange(0, n);
    if (n > 0) {
      pool.geo.attributes.position.needsUpdate = true;
      pool.geo.attributes.aColor.needsUpdate = true;
      pool.geo.attributes.aExtra.needsUpdate = true;
    }
  }

  function update(dt) {
    step(normal, dt);
    step(additive, dt);
    for (const r of rings) {
      if (!r.mesh.visible) continue;
      r.t += dt;
      const t = r.t / r.dur;
      if (t >= 1) { r.mesh.visible = false; continue; }
      const e = 1 - (1 - t) * (1 - t);
      r.mesh.scale.setScalar(Math.max(0.01, r.radius * e));
      r.mesh.material.opacity = (1 - t) * 0.9;
    }
  }

  function dispose() {
    group.removeFromParent();
    normal.geo.dispose(); additive.geo.dispose();
    normal.points.material.dispose(); additive.points.material.dispose();
    ringGeo.dispose();
    for (const r of rings) r.mesh.material.dispose();
  }

  /** Cambia el tema de las partículas de polvo (nieve / tierra y hojas / ceniza). */
  function setTheme(t) { themeCfg = THEME_DUST[t] ?? null; }

  return { emit, update, dispose, group, setTheme };
}

const WHITE = new THREE.Color(0xffffff);
const FIELDS1 = ['life', 'maxLife', 'size0', 'grow', 'alpha0', 'gravity', 'drag', 'spin'];
function copy(pool, from, to) {
  for (const f of FIELDS1) pool[f][to] = pool[f][from];
  for (const f of ['pos', 'vel', 'col', 'c0', 'c1']) {
    pool[f][to * 3] = pool[f][from * 3];
    pool[f][to * 3 + 1] = pool[f][from * 3 + 1];
    pool[f][to * 3 + 2] = pool[f][from * 3 + 2];
  }
  for (let c = 0; c < 4; c++) pool.extra[to * 4 + c] = pool.extra[from * 4 + c];
}
