// Buses de mezcla: música (con "duck") y sfx → master → compresor suave → salida.
export const MUSIC_LEVEL = 0.75; // la música va por debajo de los efectos

export function createBuses(ctx, destination = ctx.destination) {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 12;
  comp.ratio.value = 3;
  comp.attack.value = 0.005;
  comp.release.value = 0.2;

  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(comp).connect(destination);

  const music = ctx.createGain();
  const duck = ctx.createGain();
  music.connect(duck).connect(master);

  const sfx = ctx.createGain();
  sfx.connect(master);

  return { master, comp, music, duck, sfx };
}

export function setBusVolume(ctx, param, v, smooth = true) {
  const val = Math.max(0, Math.min(1, Number(v) || 0));
  if (smooth) param.setTargetAtTime(val, ctx.currentTime, 0.05);
  else param.value = val;
}
