// Simulación determinista de las físicas en Node (sin navegador) sobre la pista de pruebas.
// Uso: node tests/physics-sim.mjs [escenario] [--dt=0.0167] [--log]
// Escenarios: accel, run, trick, trickfail, gap, drift, driftSameSide, wall, cave, collide, crest, all (por defecto)
import * as THREE from 'three';
import { createKart, statsWithUpgrades } from '../src/physics/index.js';
import { createTestTrack } from '../src/physics/testTrack.js';

const args = process.argv.slice(2);
const which = args.find((a) => !a.startsWith('--')) ?? 'all';
const DT = Number(args.find((a) => a.startsWith('--dt='))?.split('=')[1] ?? 1 / 60);
const LOG = args.includes('--log');

const full = createTestTrack();
const flat = createTestTrack({ layout: 'flat' });
const results = [];
const check = (name, ok, info) => { results.push({ name, ok }); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}  ${info ?? ''}`); };

function makeKart(track, { atM = 6, lateral = 0, id = 'k', upgrades = {} } = {}) {
  const s = track.sample(atM / track.length);
  const position = s.position.clone().addScaledVector(s.right, lateral);
  const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), s.tangent, s.up);
  const kart = createKart({ id, characterId: 'tuko', stats: statsWithUpgrades(upgrades), position, quaternion: new THREE.Quaternion().setFromRotationMatrix(m) });
  kart.events = [];
  kart.onEvent = (type, d) => kart.events.push({ type, at: +simTime.toFixed(2), ...pick(d) });
  kart.update(DT, idle(), track); // se apoya en el suelo
  return kart;
}
const pick = (d) => Object.fromEntries(Object.entries(d).filter(([k]) => !['time', 'n'].includes(k)).map(([k, v]) => [k, typeof v === 'number' ? +v.toFixed(2) : v]));
const idle = () => ({ steer: 0, drift: false, trick: false, useItem: false, usePower: false, launchHold: false, pause: false });

/** Dirección tipo IA: apunta 25 m adelante sobre la línea central. */
function autoSteer(kart, track, lat = 0) {
  const ahead = track.sample(Math.min(1, kart.t + 25 / track.length));
  const target = ahead.position.clone().addScaledVector(ahead.right, lat);
  const to = target.sub(kart.position);
  const f = kart.forward;
  const cross = f.x * to.z - f.z * to.x;
  return THREE.MathUtils.clamp(cross * 0.15, -1, 1);
}

let simTime = 0;
function run(kart, track, seconds, controlsFn, { every = 0.25, label = '' } = {}) {
  const log = [];
  let nextLog = 0;
  const end = simTime + seconds;
  while (simTime < end - 1e-9) {
    const c = controlsFn ? controlsFn(kart, simTime) : idle();
    kart.update(DT, c, track);
    simTime += DT;
    if (simTime >= nextLog) {
      nextLog = simTime + every;
      const row = { t: +simTime.toFixed(2), m: +(kart.t * track.length).toFixed(1), v: +kart.speed.toFixed(1), g: kart.grounded ? 1 : 0,
        air: +kart.airTime.toFixed(2), y: +kart.position.y.toFixed(2), lat: +kart.lateral.toFixed(2), boost: +kart.boostTimer.toFixed(2),
        drift: kart.driftLevel, trick: kart.doingTrick ? 1 : 0 };
      log.push(row);
      if (LOG) console.log(label, JSON.stringify(row));
    }
  }
  return log;
}

const scen = {
  accel() {
    simTime = 0;
    const k = makeKart(flat);
    k.launch(0);
    k.velocity.set(0, 0, 0);
    let t32 = null, t30 = null;
    run(k, flat, 6, (kk, t) => {
      if (t30 == null && kk.speed >= kk.stats.topSpeed * 0.94) t30 = t;
      if (t32 == null && kk.speed >= kk.stats.topSpeed * 0.997) t32 = t;
      return { ...idle(), steer: autoSteer(kk, flat) };
    });
    check('accel: 0→vmáx base (29 m/s) en plano ~3.5 s', t32 != null && Math.abs(t32 - 3.5) < 0.35, `t30=${t30?.toFixed(2)} t32=${t32?.toFixed(2)} vfinal=${k.speed.toFixed(2)}`);
  },
  run() {
    simTime = 0;
    const k = makeKart(full);
    k.launch(0.5);
    const log = run(k, full, 40, (kk) => ({ ...idle(), steer: autoSteer(kk, full) }), { every: 1, label: 'run' });
    const maxV = Math.max(...log.map((r) => r.v));
    const endAt = log.find((r) => r.m > full.length - 3)?.t ?? 99;
    const types = [...new Set(k.events.map((e) => e.type))];
    const lands = k.events.filter((e) => e.type === 'land');
    console.log('  eventos:', JSON.stringify(k.events.filter((e) => e.type !== 'boost').slice(0, 30)));
    console.log('  muestras:', log.filter((_, i) => i % 3 === 0).map((r) => `${r.t}s m=${r.m} v=${r.v} g=${r.g} y=${r.y}`).join(' | '));
    check('run: llega al final sin respawn', k.t > 0.97 && !k.events.some((e) => e.type === 'respawn' && e.at < endAt), `t=${k.t.toFixed(3)} tiempo=${simTime.toFixed(1)} maxV=${maxV}`);
    check('run: despega y aterriza en el salto', lands.some((e) => e.airTime > 0.6), JSON.stringify(lands));
    check('run: pasa por boost pads', k.events.some((e) => e.type === 'boostPad'));
  },
  trick() {
    simTime = 0;
    const k = makeKart(full, { atM: 200 });
    k.launch(1);
    k.velocity.multiplyScalar(30 / k.velocity.length());
    let pressed = false;
    const log = run(k, full, 7, (kk) => {
      const c = { ...idle(), steer: autoSteer(kk, full) };
      if (!pressed && !kk.grounded && kk.airTime > 0.1) { pressed = true; c.trick = true; }
      return c;
    }, { every: 0.1, label: 'trick' });
    const tr = k.events.find((e) => e.type === 'trick');
    const land = k.events.find((e) => e.type === 'land' && e.airTime > 0.5);
    const air = log.filter((r) => !r.g);
    console.log('  vuelo:', air.map((r) => `${r.t}s y=${r.y} v=${r.v} air=${r.air} trick=${r.trick}`).join(' | '));
    check('trick: truco completado → boost al aterrizar', tr?.success === true && k.events.some((e) => e.type === 'boost' && e.at >= (land?.at ?? 99) - 0.01), JSON.stringify({ tr, land }));
  },
  trickfail() {
    simTime = 0;
    const k = makeKart(full, { atM: 200 });
    k.launch(1);
    k.velocity.multiplyScalar(30 / k.velocity.length());
    let pressed = false, vBefore = 0;
    run(k, full, 7, (kk) => {
      const c = { ...idle(), steer: autoSteer(kk, full) };
      // truco tarde: cuando ya está cayendo cerca del suelo
      if (!pressed && !kk.grounded && kk.airTime > 0.3) {
        const g = full.getGroundAt(kk.position);
        if (g && kk.position.y - g.height < 2.5 && kk.velocity.y < 0) { pressed = true; c.trick = true; vBefore = kk.velocity.length(); }
      }
      return c;
    });
    const tr = k.events.find((e) => e.type === 'trick');
    check('trickfail: aterriza a mitad del truco → falla', pressed && tr?.success === false, `vAntes=${vBefore.toFixed(1)} ${JSON.stringify(tr)}`);
  },
  gap() {
    simTime = 0;
    const k = makeKart(full, { atM: 292 });
    k.launch(0);
    k.velocity.multiplyScalar(10 / k.velocity.length());
    const log = run(k, full, 6, (kk) => ({ ...idle(), steer: autoSteer(kk, full) }), { every: 0.25, label: 'gap' });
    const rs = k.events.find((e) => e.type === 'respawn');
    console.log('  caída:', log.map((r) => `${r.t}s m=${r.m} y=${r.y} g=${r.g} v=${r.v}`).join(' | '));
    check('gap: cae al hueco y reaparece después del hueco', !!rs && k.t * full.length > 340 && k.grounded, `respawn@${rs?.at}s m=${(k.t * full.length).toFixed(1)} v=${k.speed.toFixed(1)}`);
  },
  drift() {
    simTime = 0;
    // curva cerrada (slalom, R = 50 m, hacia la izquierda)
    const k = makeKart(full, { atM: 900 });
    k.launch(1);
    run(k, full, 1.5, (kk) => ({ ...idle(), steer: autoSteer(kk, full) }));
    const log = run(k, full, 1.7, (kk) => ({ ...idle(), steer: kk.drifting ? autoSteer(kk, full, 2) : -1, drift: true }), { every: 0.1 });
    const lvl = k.driftLevel;
    const charge = k.driftCharge;
    run(k, full, 0.05, (kk) => ({ ...idle(), steer: autoSteer(kk, full) }));
    const db = k.events.find((e) => e.type === 'driftBoost');
    console.log('  derrape:', log.map((r) => `${r.t}s v=${r.v} lat=${r.lat} lvl=${r.drift}`).join(' | '));
    const minV = Math.min(...log.map((r) => r.v));
    check('drift: nivel 2 tras 1.5 s y boost 1.1 s al soltar', lvl === 2 && db?.level === 2 && k.boostTimer > 1.0, `charge=${charge.toFixed(2)} boost=${k.boostTimer.toFixed(2)} vMin=${minV}`);
    check('drift: mantiene velocidad en la curva', minV > 27, `vMin=${minV} golpes=${k.events.filter((e) => e.type === 'wallHit').length}`);
    const vb = run(k, full, 1.0, (kk) => ({ ...idle(), steer: autoSteer(kk, full) }), { every: 0.2 });
    console.log('  tras mini-turbo:', vb.map((r) => `${r.t}s v=${r.v}`).join(' | '));
    // nivel 1
    run(k, full, 0.9, (kk) => ({ ...idle(), steer: kk.drifting ? autoSteer(kk, full, 2) : -1, drift: true }));
    const l1 = k.driftLevel;
    run(k, full, 0.05, () => idle());
    check('drift: nivel 1 tras 0.7 s', l1 === 1 && k.events.filter((e) => e.type === 'driftBoost').at(-1)?.level === 1, `lvl=${l1}`);
  },
  driftSameSide() {
    simTime = 0;
    // derrape sin contra-giro: solo se mantiene el giro hacia el lado del derrape (curva izquierda)
    const k = makeKart(full, { atM: 900 });
    k.launch(1);
    run(k, full, 1.5, (kk) => ({ ...idle(), steer: autoSteer(kk, full) }));
    const side = Math.sign(autoSteer(k, full)) || -1;
    const h0 = k.heading;
    // solo gira (suave) hacia el lado del derrape; nunca contra-gira
    const log = run(k, full, 1.45, (kk) => ({ ...idle(), steer: side * 0.3, drift: true }), { every: 0.1 });
    const dirOk = k.driftDir === Math.sign(side);
    const lvl = k.driftLevel;
    const dh = Math.abs(Math.atan2(Math.sin(k.heading - h0), Math.cos(k.heading - h0)));
    run(k, full, 0.05, () => idle());
    const db = k.events.find((e) => e.type === 'driftBoost');
    console.log('  derrape mismo lado:', log.map((r) => `${r.t}s v=${r.v} lat=${r.lat} lvl=${r.drift}`).join(' | '));
    check('driftSameSide: nivel 2 solo girando hacia el lado del derrape', dirOk && lvl === 2 && db?.level === 2, `lvl=${lvl} dir=${k.driftDir}`);
    // mantener el giro cierra la curva (aquí incluso pega con la pared interior: es una curva de R=50 y el derrape gira más); basta con que gire y no se frene
    check('driftSameSide: el kart toma la curva (gira hacia el lado y conserva velocidad)', dh > 0.5 && Math.min(...log.map((r) => r.v)) > 25 && k.events.filter((e) => e.type === 'wallHit').length <= 2, `giro=${dh.toFixed(2)} rad lat=${k.lateral.toFixed(1)}`);
    // sin giro el derrape se mantiene y también carga
    const k2 = makeKart(full, { atM: 900 });
    k2.launch(1);
    run(k2, full, 1.5, (kk) => ({ ...idle(), steer: autoSteer(kk, full) }));
    run(k2, full, 0.2, () => ({ ...idle(), steer: side, drift: true }));
    run(k2, full, 1.0, () => ({ ...idle(), drift: true }));
    check('driftSameSide: soltar el giro mantiene el derrape y sigue cargando', k2.drifting && k2.driftCharge > 0.9, `charge=${k2.driftCharge.toFixed(2)}`);
    run(k2, full, 0.6, () => ({ ...idle(), steer: -side, drift: true }));
    check('driftSameSide: girar al lado contrario no cancela el derrape', k2.drifting, `drifting=${k2.drifting}`);
  },
  wall() {
    simTime = 0;
    const k = makeKart(full, { atM: 20 });
    k.launch(1);
    run(k, full, 2.5, (kk) => ({ ...idle(), steer: autoSteer(kk, full) }));
    const v0 = k.speed;
    const log = run(k, full, 2, () => ({ ...idle(), steer: 1 }), { every: 0.1 });
    const hits = k.events.filter((e) => e.type === 'wallHit');
    const maxLat = Math.max(...log.map((r) => Math.abs(r.lat)));
    console.log('  pared:', log.map((r) => `${r.t}s v=${r.v} lat=${r.lat}`).join(' | '));
    check('wall: no sale de la pista y registra golpe', hits.length > 0 && maxLat <= 7.01, `v0=${v0.toFixed(1)} hits=${JSON.stringify(hits.slice(0, 3))} maxLat=${maxLat}`);
    // Embestida: no pierde velocidad
    const k2 = makeKart(full, { atM: 20 });
    k2.launch(1);
    run(k2, full, 2.5, (kk) => ({ ...idle(), steer: autoSteer(kk, full) }));
    k2.effects.ram = 5;
    let lost = 0;
    k2.onEvent = (type) => { if (type === 'wallHit') lost++; };
    const before = k2.speed;
    run(k2, full, 1.2, () => ({ ...idle(), steer: 1 }));
    check('wall: con ram no pierde velocidad', lost > 0 && k2.speed >= before - 0.5, `antes=${before.toFixed(1)} después=${k2.speed.toFixed(1)}`);
  },
  cave() {
    simTime = 0;
    const k = makeKart(full, { atM: 545 });
    k.launch(1);
    run(k, full, 0.3, (kk) => ({ ...idle(), steer: autoSteer(kk, full) }));
    const s = full.sample(k.t);
    k.jump(22, 0);
    const log = run(k, full, 1.2, (kk) => ({ ...idle(), steer: autoSteer(kk, full) }), { every: 0.05 });
    const maxAbove = Math.max(...log.map((r) => r.y - full.sample(r.m / full.length).position.y));
    check('cave: el techo limita la altura', s.segmentType === 'cave' && maxAbove <= 6 - 1.4 + 0.3, `tipo=${s.segmentType} maxSobreSuelo=${maxAbove.toFixed(2)}`);
  },
  crest() {
    simTime = 0;
    const k = makeKart(full, { atM: 760 });
    k.launch(1);
    run(k, full, 6, (kk) => ({ ...idle(), steer: autoSteer(kk, full) }), { every: 0.1 });
    const take = k.events.filter((e) => e.type === 'land');
    check('crest: despega en la cresta de la loma (sin hueco)', take.some((e) => e.airTime > 0.2), JSON.stringify(take));
  },
  collide() {
    simTime = 0;
    const a = makeKart(full, { atM: 40, lateral: -0.6, id: 'a' });
    const b = makeKart(full, { atM: 40, lateral: 0.6, id: 'b' });
    a.launch(1); b.launch(1);
    a.effects.ram = 4;
    run(a, full, 0.01);
    for (let i = 0; i < 30; i++) {
      a.update(DT, idle(), full); b.update(DT, idle(), full);
      a.collideWith(b);
    }
    const d = a.position.distanceTo(b.position);
    check('collide: separa karts y ram empuja fuerte', d >= 2.5 && Math.abs(b.lateral - a.lateral) > 3, `dist=${d.toFixed(2)} latA=${a.lateral.toFixed(2)} latB=${b.lateral.toFixed(2)}`);
    // escudo: inmune a spinOut/slowDown
    b.effects.shield = 3;
    check('shield: inmune a spinOut/slowDown', b.spinOut(1) === false && b.slowDown(0.5, 1) === false && b.spinTimer === 0);
    b.effects.shield = 0;
    const v0 = b.speed;
    b.spinOut(1.0);
    run(b, full, 1.1, () => ({ ...idle(), steer: 1 }));
    check('spinOut: frena y recupera control', b.spinTimer === 0 && b.speed < v0, `v0=${v0.toFixed(1)} v=${b.speed.toFixed(1)}`);
  },
};

const list = which === 'all' ? Object.keys(scen) : which.split(',');
for (const name of list) {
  console.log(`\n== ${name} (dt=${DT.toFixed(4)})`);
  scen[name]();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} OK`);
process.exit(failed.length ? 1 : 0);
