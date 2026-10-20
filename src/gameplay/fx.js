// Efectos visuales ligados al kart: halo del imán, aura de embestida y burbuja del escudo.
import * as THREE from 'three';

export function createFx(models) {
  const bubbleGeo = new THREE.SphereGeometry(1.9, 20, 14);
  const bubbleMat = new THREE.MeshBasicMaterial({
    color: 0x7fd8ff, transparent: true, opacity: 0.28, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const attached = [];

  function attach(racer) {
    const k = racer.kart;
    const halo = models.createMagnetHalo();
    const aura = models.createRamAura();
    const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
    bubble.position.y = 0.8;
    bubble.visible = false;
    bubble.renderOrder = 6;
    k.object3D.add(halo, aura, bubble);
    attached.push({ racer, halo, aura, bubble });
  }

  function update(dt, time) {
    for (const f of attached) {
      const e = f.racer.kart.effects;
      f.halo.visible = e.magnet > 0;
      if (f.halo.visible) f.halo.rotation.y += dt * 3;
      f.aura.visible = e.ram > 0;
      f.bubble.visible = e.shield > 0;
      if (f.bubble.visible) {
        const s = 1 + Math.sin(time * 8) * 0.04;
        f.bubble.scale.setScalar(e.shield < 1 ? s * (0.6 + 0.4 * e.shield) : s);
      }
    }
  }

  return {
    attach, update,
    dispose() { bubbleGeo.dispose(); bubbleMat.dispose(); },
  };
}
