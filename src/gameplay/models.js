// Geometrías propias de gameplay: catapulta de salida, bola de nieve, charco de miel,
// halo de imán y aura de embestida. Geometrías y materiales compartidos (se crean una vez
// por carrera y se liberan en dispose).
import * as THREE from 'three';

/** Curva de hélice a lo largo de +Z (longitud 1) para el resorte. */
class HelixCurve extends THREE.Curve {
  constructor(turns, radius) {
    super();
    this.turns = turns;
    this.radius = radius;
  }
  getPoint(u, out = new THREE.Vector3()) {
    const a = u * this.turns * Math.PI * 2;
    return out.set(Math.cos(a) * this.radius, Math.sin(a) * this.radius, u);
  }
}

/** Charco irregular (disco con borde ondulado). */
function blobGeometry(radius, seed) {
  const shape = new THREE.Shape();
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = radius * (0.82 + 0.18 * Math.sin(a * 3 + seed) * Math.cos(a * 2 - seed * 0.7));
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  const g = new THREE.ShapeGeometry(shape, 2);
  g.rotateX(-Math.PI / 2);
  return g;
}

export function createModels() {
  const geos = [];
  const mats = [];
  const G = (g) => (geos.push(g), g);
  const M = (m) => (mats.push(m), m);

  const mat = {
    wood: M(new THREE.MeshStandardMaterial({ color: 0x9a6334, roughness: 0.85 })),
    woodDark: M(new THREE.MeshStandardMaterial({ color: 0x6b4122, roughness: 0.9 })),
    metal: M(new THREE.MeshStandardMaterial({ color: 0xc9d2de, roughness: 0.3, metalness: 0.8 })),
    stripe: M(new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.5, emissive: 0x332200 })),
    red: M(new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.5 })),
    snow: M(new THREE.MeshStandardMaterial({ color: 0xf4fbff, roughness: 0.55, emissive: 0x6fa8dc, emissiveIntensity: 0.25, flatShading: true })),
    honey: M(new THREE.MeshStandardMaterial({
      color: 0xf2a516, roughness: 0.15, metalness: 0.1, emissive: 0x7a4a00, emissiveIntensity: 0.35,
      transparent: true, opacity: 0.92, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    })),
    honeyBlob: M(new THREE.MeshStandardMaterial({ color: 0xffb72b, roughness: 0.12, emissive: 0x8a5200, emissiveIntensity: 0.4 })),
    magnet: M(new THREE.MeshBasicMaterial({ color: 0xff4d6d, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })),
    magnet2: M(new THREE.MeshBasicMaterial({ color: 0x4cc9ff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })),
    ram: M(new THREE.MeshBasicMaterial({ color: 0xff7a2e, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })),
  };

  const geo = {
    base: G(new THREE.BoxGeometry(2.6, 0.18, 3.2)),
    rail: G(new THREE.BoxGeometry(0.18, 0.35, 3.0)),
    wall: G(new THREE.BoxGeometry(2.2, 1.1, 0.3)),
    stripe: G(new THREE.BoxGeometry(2.24, 0.16, 0.32)),
    plate: G(new THREE.BoxGeometry(1.7, 0.75, 0.16)),
    spring: G(new THREE.TubeGeometry(new HelixCurve(7, 0.3), 140, 0.05, 6, false)),
    rod: G(new THREE.CylinderGeometry(0.06, 0.06, 1, 8).rotateX(Math.PI / 2).translate(0, 0, 0.5)),
    flagPole: G(new THREE.CylinderGeometry(0.035, 0.035, 1.6, 6).translate(0, 0.8, 0)),
    flag: G(new THREE.PlaneGeometry(0.6, 0.38).translate(0.3, 0, 0)),
    snowball: G(new THREE.IcosahedronGeometry(0.6, 1)),
    honey: [G(blobGeometry(1.9, 0.3)), G(blobGeometry(1.9, 2.1)), G(blobGeometry(1.9, 4.4))],
    honeyBlob: G(new THREE.SphereGeometry(0.32, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2)),
    magnetRing: G(new THREE.TorusGeometry(1.7, 0.07, 6, 40).rotateX(Math.PI / 2)),
    ramCone: G(new THREE.ConeGeometry(1.0, 1.8, 16, 1, true).rotateX(-Math.PI / 2)),
  };

  /**
   * Catapulta de resorte detrás de un kart (en el marco local del kart: +Z = atrás).
   * setTension(0..1) comprime el resorte; release() lo dispara.
   */
  function createCatapult() {
    const group = new THREE.Group();
    group.name = 'catapult';
    const add = (g, m, x, y, z) => {
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };
    const WALL_Z = 3.5;
    const REST_Z = 1.3; // placa empujadora apoyada en la cola del kart
    add(geo.base, mat.woodDark, 0, 0.09, 2.0);
    add(geo.rail, mat.wood, -1.15, 0.3, 2.0);
    add(geo.rail, mat.wood, 1.15, 0.3, 2.0);
    add(geo.wall, mat.wood, 0, 0.7, WALL_Z);
    add(geo.stripe, mat.stripe, 0, 1.05, WALL_Z);
    add(geo.stripe, mat.stripe, 0, 0.45, WALL_Z);
    const pole = add(geo.flagPole, mat.metal, 1.0, 1.2, WALL_Z);
    const flag = add(geo.flag, mat.red, 1.0, 2.55, WALL_Z);
    flag.material = mat.red;
    pole.castShadow = false;
    const plate = add(geo.plate, mat.red, 0, 0.55, REST_Z);
    const spring = add(geo.spring, mat.metal, 0, 0.55, REST_Z);
    const rod = add(geo.rod, mat.metal, 0, 0.55, REST_Z);
    let tension = 0;
    let released = false;
    let platePos = REST_Z;
    let plateVel = 0;
    let time = 0;
    let life = 0;

    function layout() {
      plate.position.z = platePos;
      spring.position.z = platePos + 0.08;
      spring.scale.z = Math.max(0.15, WALL_Z - 0.15 - spring.position.z);
      rod.position.z = platePos;
      rod.scale.z = WALL_Z - platePos;
    }
    layout();

    return {
      group,
      /** Retroceso visual del kart (m) para una tensión dada. */
      pullback: (t) => t * 0.75,
      setTension(t) {
        tension = t;
      },
      release() {
        released = true;
        plateVel = -26;
      },
      /** @returns {boolean} false cuando ya terminó y se puede quitar */
      update(dt) {
        time += dt;
        if (!released) {
          const target = REST_Z + tension * 0.75;
          platePos += (target - platePos) * Math.min(1, dt * 18);
          // tiembla un poco cuando está muy tenso
          plate.position.x = tension > 0.75 ? Math.sin(time * 70) * 0.03 * tension : 0;
        } else {
          // resorte amortiguado alrededor de una posición algo adelantada
          const target = REST_Z - 0.2;
          plateVel += (-(platePos - target) * 160 - plateVel * 7) * dt;
          platePos += plateVel * dt;
          platePos = Math.max(0.2, platePos);
          life += dt;
          if (life > 3) {
            const s = Math.max(0.001, 1 - (life - 3) / 0.6);
            group.scale.setScalar(s);
            if (life > 3.6) return false;
          }
        }
        flag.rotation.y = Math.sin(time * 5) * 0.35;
        layout();
        return true;
      },
    };
  }

  function createSnowball() {
    const mesh = new THREE.Mesh(geo.snowball, mat.snow);
    mesh.castShadow = true;
    return mesh;
  }

  function createHoney(variant = 0) {
    const group = new THREE.Group();
    const pool = new THREE.Mesh(geo.honey[variant % geo.honey.length], mat.honey);
    pool.position.y = 0.06;
    pool.receiveShadow = true;
    group.add(pool);
    const blobs = [[0.5, 0.3, 1], [-0.7, -0.4, 0.8], [0.1, -0.9, 0.7], [-0.2, 0.8, 0.6]];
    for (const [x, z, s] of blobs) {
      const b = new THREE.Mesh(geo.honeyBlob, mat.honeyBlob);
      b.position.set(x, 0.04, z);
      b.scale.set(s, s * 0.7, s);
      group.add(b);
    }
    return group;
  }

  function createMagnetHalo() {
    const group = new THREE.Group();
    const a = new THREE.Mesh(geo.magnetRing, mat.magnet);
    const b = new THREE.Mesh(geo.magnetRing, mat.magnet2);
    a.position.y = 0.5;
    b.position.y = 0.9;
    b.scale.setScalar(0.8);
    group.add(a, b);
    group.visible = false;
    return group;
  }

  function createRamAura() {
    const mesh = new THREE.Mesh(geo.ramCone, mat.ram);
    mesh.position.set(0, 0.65, -1.9);
    mesh.visible = false;
    mesh.renderOrder = 5;
    return mesh;
  }

  return {
    createCatapult, createSnowball, createHoney, createMagnetHalo, createRamAura,
    dispose() {
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
    },
  };
}
