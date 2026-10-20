// Entornos por tema: cielo con gradiente y sol, niebla, luces con sombra que siguen a la cámara,
// montañas lejanas en silueta y clima con Points (todo animado en GPU).
import * as THREE from 'three';
import { Builder, getMat, jitter, rng, mix } from './builder.js';

export const THEMES = {
  snow: {
    skyTop: 0x3d7fd6, skyHorizon: 0xcfe4f7, skyBottom: 0xe3eef8, fog: 0xcfe4f7, fogNear: 70, fogFar: 520,
    sunDir: [0.55, 0.62, -0.55], sunColor: 0xfff4e0, sunGlow: 0xfff6dc, sunIntensity: 2.6,
    hemiSky: 0xe4f1ff, hemiGround: 0x8ea4bd, hemiIntensity: 1.25,
    mountainNear: 0x6f8fb5, mountainFar: 0x9fbbd8, peak: 0xffffff, clouds: 0xffffff,
  },
  jungle: {
    skyTop: 0x2f9ad8, skyHorizon: 0xcdeccf, skyBottom: 0xd9f0d0, fog: 0xbfe0bf, fogNear: 45, fogFar: 400,
    sunDir: [0.5, 0.7, -0.5], sunColor: 0xfff0c8, sunGlow: 0xfff2b0, sunIntensity: 2.7,
    hemiSky: 0xfff7d6, hemiGround: 0x3f6b39, hemiIntensity: 1.15,
    mountainNear: 0x3e7f55, mountainFar: 0x79b089, peak: 0x5c9d63, clouds: 0xffffff,
  },
  volcano: {
    skyTop: 0x2b1538, skyHorizon: 0xff8f54, skyBottom: 0x6a2a20, fog: 0xb4573c, fogNear: 40, fogFar: 380,
    sunDir: [-0.5, 0.42, -0.75], sunColor: 0xffc08a, sunGlow: 0xff7a3a, sunIntensity: 2.9,
    hemiSky: 0xffc7a3, hemiGround: 0x6a3226, hemiIntensity: 1.6,
    mountainNear: 0x3b2220, mountainFar: 0x7a3a2c, peak: 0x2a1614, clouds: 0x5a3a3a,
  },
};

const SHADOW_SIZE = 70;    // lado del frustum de sombras (m)
const SHADOW_MAP = 2048;

/** @returns {import('../core/contracts.js').Environment} */
export function createEnvironment(theme) {
  const T = THEMES[theme] ?? THEMES.snow;
  const themeKey = THEMES[theme] ? theme : 'snow';
  const group = new THREE.Group();
  group.name = `env-${themeKey}`;
  const sunDir = new THREE.Vector3(...T.sunDir).normalize();

  // ---------- cielo ----------
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1200, 32, 16), new THREE.ShaderMaterial({
    uniforms: {
      uTop: { value: new THREE.Color(T.skyTop) },
      uHorizon: { value: new THREE.Color(T.skyHorizon) },
      uBottom: { value: new THREE.Color(T.skyBottom) },
      uSunDir: { value: sunDir },
      uSunGlow: { value: new THREE.Color(T.sunGlow) },
    },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main(){
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww; // siempre al fondo
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uTop, uHorizon, uBottom, uSunDir, uSunGlow;
      varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = h > 0.0 ? mix(uHorizon, uTop, pow(smoothstep(0.0, 1.0, h), 0.55)) : mix(uHorizon, uBottom, smoothstep(0.0, 0.25, -h));
        float s = max(dot(d, normalize(uSunDir)), 0.0);
        col += uSunGlow * (pow(s, 6.0) * 0.22 + pow(s, 120.0) * 0.55 + pow(s, 900.0) * 0.6);
        col = mix(col, vec3(1.0, 0.98, 0.92) * 1.6, smoothstep(0.99935, 0.9996, s));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  }));
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  group.add(sky);

  // ---------- luces ----------
  const hemi = new THREE.HemisphereLight(T.hemiSky, T.hemiGround, T.hemiIntensity);
  group.add(hemi);
  const sun = new THREE.DirectionalLight(T.sunColor, T.sunIntensity);
  sun.castShadow = true;
  sun.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP);
  const sc = sun.shadow.camera;
  sc.left = -SHADOW_SIZE / 2; sc.right = SHADOW_SIZE / 2; sc.top = SHADOW_SIZE / 2; sc.bottom = -SHADOW_SIZE / 2;
  sc.near = 1; sc.far = 400;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  group.add(sun, sun.target);

  // ---------- montañas lejanas ----------
  const far = new THREE.Group();
  far.add(mountainRing(themeKey, T, 980, 24, T.mountainFar, 120, 230, 11));
  far.add(mountainRing(themeKey, T, 760, 20, T.mountainNear, 70, 160, 23));
  const clouds = cloudRing(themeKey, T);
  if (clouds) far.add(clouds);
  group.add(far);

  // ---------- clima ----------
  const weather = createWeather(themeKey);
  for (const w of weather) group.add(w.points);

  // ---------- estado ----------
  let time = 0;
  const lastCam = new THREE.Vector3();
  const moveDir = new THREE.Vector3(0, 0, -1);
  const center = new THREE.Vector3();
  let first = true;
  const texel = SHADOW_SIZE / SHADOW_MAP;
  // base ortonormal de la luz para ajustar el centro a la rejilla de texels (evita parpadeo de sombras)
  const lz = sunDir.clone().negate();
  const lx = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), lz).normalize();
  const ly = new THREE.Vector3().crossVectors(lz, lx);

  return {
    group,
    sun,
    hemi,
    theme: themeKey,
    apply(scene) {
      scene.background = new THREE.Color(T.skyHorizon);
      scene.fog = new THREE.Fog(T.fog, T.fogNear, T.fogFar);
    },
    update(dt, cameraPosition) {
      time += dt;
      if (!cameraPosition) return;
      // dirección de avance de la cámara (suavizada) para adelantar el frustum de sombras
      if (!first) {
        const dx = cameraPosition.x - lastCam.x;
        const dz = cameraPosition.z - lastCam.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.02) moveDir.lerp(new THREE.Vector3(dx / d, 0, dz / d), Math.min(1, dt * 3)).normalize();
      }
      first = false;
      lastCam.copy(cameraPosition);
      center.copy(cameraPosition).addScaledVector(moveDir, SHADOW_SIZE * 0.3);
      center.y -= 3;
      // ajuste a texel
      const a = Math.round(center.dot(lx) / texel) * texel;
      const b = Math.round(center.dot(ly) / texel) * texel;
      const c = center.dot(lz);
      center.set(0, 0, 0).addScaledVector(lx, a).addScaledVector(ly, b).addScaledVector(lz, c);
      sun.target.position.copy(center);
      sun.position.copy(center).addScaledVector(sunDir, 200);
      sun.target.updateMatrixWorld();

      sky.position.copy(cameraPosition);
      far.position.set(cameraPosition.x, cameraPosition.y - 45, cameraPosition.z);
      if (clouds) clouds.rotation.y += dt * 0.004;
      for (const w of weather) {
        w.uniforms.uTime.value = time;
        w.uniforms.uCam.value.copy(cameraPosition);
      }
    },
    dispose() {
      group.traverse((o) => {
        if (o.isMesh || o.isPoints) {
          o.geometry.dispose();
          if (o.material?.isShaderMaterial) o.material.dispose();
        }
      });
      sun.shadow.map?.dispose();
    },
  };
}

// ---------------------------------------------------------------------------------
function mountainRing(theme, T, radius, count, color, hMin, hMax, seed) {
  const r = rng(seed);
  const b = new Builder();
  const base = new THREE.Color(T.skyHorizon);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + r() * 0.2;
    const h = hMin + r() * (hMax - hMin);
    const w = h * (theme === 'jungle' ? 1.4 : 1.0) * (0.8 + r() * 0.5);
    const rr = radius + (r() - 0.5) * 120;
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    let geo;
    if (theme === 'jungle') {
      geo = new THREE.SphereGeometry(1, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2);
    } else {
      geo = new THREE.ConeGeometry(1, 1, 6 + Math.floor(r() * 3), 3);
      geo.translate(0, 0.5, 0);
    }
    jitter(geo, 0.18, seed + i);
    const isVolcanoPeak = theme === 'volcano' && i % 7 === 3;
    const colFn = (px, py) => {
      const t = THREE.MathUtils.clamp(py / h, 0, 1);
      let c = new THREE.Color(color).lerp(base, 0.35 * (1 - t));
      if (theme === 'snow' && t > 0.7) c = new THREE.Color(T.peak).lerp(new THREE.Color(T.skyHorizon), 0.15);
      if (isVolcanoPeak && t > 0.8) c = new THREE.Color(0xff5a1f);
      return c.getHex();
    };
    if (isVolcanoPeak) {
      // cono truncado de volcán con brillo en la boca
      geo.dispose();
      geo = new THREE.CylinderGeometry(0.16, 1, 1, 9, 2);
      geo.translate(0, 0.5, 0);
      jitter(geo, 0.08, seed + i);
    }
    b.add(geo, colFn, { p: [x, -10, z], s: [w, h, w] });
    if (isVolcanoPeak) b.add(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 9), 0xffa13d, { p: [x, -10 + h, z], s: [w, h, w], mat: 'glow' });
  }
  const geos = b.geometries();
  const g = new THREE.Group();
  for (const [k, geo] of Object.entries(geos)) {
    const mat = k === 'glow' ? getMat('glow') : farMaterial();
    const m = new THREE.Mesh(geo, mat);
    m.frustumCulled = false;
    g.add(m);
  }
  return g;
}

let _farMat = null;
function farMaterial() {
  // sin luz ni niebla: silueta con gradiente horneado
  _farMat ??= new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
  return _farMat;
}

function cloudRing(theme, T) {
  const r = rng(99);
  const b = new Builder();
  const n = theme === 'volcano' ? 10 : 16;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.3;
    const rad = 620 + r() * 160;
    const y = theme === 'volcano' ? 230 + r() * 80 : 150 + r() * 120;
    const s = 30 + r() * 30;
    for (let k = 0; k < 5; k++) {
      const geo = new THREE.IcosahedronGeometry(1, 1);
      const off = (k - 2) * s * 0.7;
      const ca = Math.cos(a), sa = Math.sin(a);
      b.add(geo, (px, py) => mix(T.clouds, T.skyHorizon, py < y ? 0.45 : 0.05), {
        p: [ca * rad - sa * off, y + (k === 2 ? s * 0.3 : 0), sa * rad + ca * off],
        s: [s * (1 - Math.abs(k - 2) * 0.18), s * 0.55 * (1 - Math.abs(k - 2) * 0.15), s * 0.8],
      });
    }
  }
  const geos = b.geometries();
  const m = new THREE.Mesh(geos.smooth, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, transparent: true, opacity: theme === 'volcano' ? 0.8 : 0.92 }));
  m.frustumCulled = false;
  return m;
}

// ---------------------------------------------------------------------------------
// Clima: Points que envuelven la cámara. La posición se calcula en el shader (sin trabajo de CPU).
const WEATHER = {
  snow: [
    { count: 1600, box: [90, 50, 90], vel: [0.6, -3.2, 0.3], size: 0.22, color: 0xffffff, sway: 0.8, shape: 0, opacity: 0.95 },
  ],
  jungle: [
    { count: 160, box: [80, 40, 80], vel: [0.8, -1.4, 0.2], size: 0.38, color: 0x7ac74f, color2: 0xe9c46a, sway: 2.0, shape: 1, opacity: 1 },
    { count: 160, box: [70, 16, 70], vel: [0, 0.15, 0], size: 0.18, color: 0xd7ff6b, sway: 1.6, shape: 2, opacity: 1, additive: true, yOffset: -4 },
  ],
  volcano: [
    { count: 600, box: [80, 45, 80], vel: [0.4, 2.4, 0.2], size: 0.2, color: 0xff7b2e, color2: 0xffd166, sway: 1.2, shape: 2, opacity: 1, additive: true },
    { count: 900, box: [90, 50, 90], vel: [0.8, -1.2, 0.4], size: 0.2, color: 0x6b5a55, color2: 0xa89890, sway: 0.9, shape: 0, opacity: 0.75 },
  ],
};

function createWeather(theme) {
  return (WEATHER[theme] ?? []).map((cfg, idx) => {
    const r = rng(17 + idx);
    const n = cfg.count;
    const pos = new Float32Array(n * 3);
    const data = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = r() * cfg.box[0];
      pos[i * 3 + 1] = r() * cfg.box[1];
      pos[i * 3 + 2] = r() * cfg.box[2];
      data[i * 4] = 0.6 + r() * 0.8;     // velocidad relativa
      data[i * 4 + 1] = r() * 100;       // fase
      data[i * 4 + 2] = 0.6 + r() * 0.8; // tamaño relativo
      data[i * 4 + 3] = r();             // mezcla de color
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aData', new THREE.BufferAttribute(data, 4));
    const uniforms = {
      uTime: { value: 0 },
      uCam: { value: new THREE.Vector3() },
      uBox: { value: new THREE.Vector3(...cfg.box) },
      uVel: { value: new THREE.Vector3(...cfg.vel) },
      uSize: { value: cfg.size },
      uScale: { value: 400 },
      uSway: { value: cfg.sway },
      uYOff: { value: cfg.yOffset ?? 0 },
      uColor: { value: new THREE.Color(cfg.color) },
      uColor2: { value: new THREE.Color(cfg.color2 ?? cfg.color) },
      uOpacity: { value: cfg.opacity },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms,
      defines: { SHAPE: cfg.shape },
      vertexShader: /* glsl */`
        uniform float uTime, uSize, uScale, uSway, uYOff; uniform vec3 uCam, uBox, uVel;
        attribute vec4 aData;
        varying float vMix; varying float vAlpha; varying float vRot;
        void main(){
          vec3 p = position + uVel * uTime * aData.x;
          p.x += sin(uTime * 0.9 + aData.y) * uSway;
          p.z += cos(uTime * 0.7 + aData.y * 1.3) * uSway;
          vec3 rel = mod(p - uCam - vec3(0.0, uYOff, 0.0) + uBox * 0.5, uBox) - uBox * 0.5;
          vec3 wp = uCam + vec3(0.0, uYOff, 0.0) + rel;
          vec3 e = abs(rel) / (uBox * 0.5);
          vAlpha = 1.0 - smoothstep(0.7, 1.0, max(max(e.x, e.y), e.z));
          #if SHAPE == 2
            vAlpha *= 0.55 + 0.45 * sin(uTime * 3.0 + aData.y * 7.0);
          #endif
          vMix = aData.w;
          vRot = uTime * (0.8 + aData.x) + aData.y;
          vec4 mv = viewMatrix * vec4(wp, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = min(uSize * aData.z * uScale / max(0.5, -mv.z), 14.0);
          vAlpha *= smoothstep(1.0, 4.0, -mv.z);
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uColor, uColor2; uniform float uOpacity;
        varying float vMix; varying float vAlpha; varying float vRot;
        void main(){
          vec2 c = gl_PointCoord - 0.5;
          float a;
          #if SHAPE == 1
            // hoja: elipse girando
            float cs = cos(vRot), sn = sin(vRot);
            vec2 q = vec2(c.x * cs - c.y * sn, c.x * sn + c.y * cs);
            a = 1.0 - smoothstep(0.42, 0.5, length(q * vec2(1.0, 2.4)));
          #elif SHAPE == 2
            a = pow(max(0.0, 1.0 - length(c) * 2.0), 1.8);
          #else
            a = 1.0 - smoothstep(0.25, 0.5, length(c));
          #endif
          if (a * vAlpha < 0.01) discard;
          vec3 col = mix(uColor, uColor2, vMix);
          gl_FragColor = vec4(col, a * vAlpha * uOpacity);
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
      blending: cfg.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.renderOrder = 2;
    points.onBeforeRender = (renderer, scene, camera) => {
      const h = renderer.getDrawingBufferSize(_size).y;
      uniforms.uScale.value = h / (2 * Math.tan(THREE.MathUtils.degToRad((camera.fov ?? 60) / 2)));
    };
    return { points, uniforms };
  });
}
const _size = new THREE.Vector2();
