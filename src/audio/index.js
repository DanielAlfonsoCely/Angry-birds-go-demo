// STUB del orquestador: audio mudo.
// El Agente de Arte/Audio lo reemplaza con WebAudio sintetizado. Interfaz pública:
//   audio.attach(events, save)  escucha EVENTS y lee volúmenes de save.data.settings
//   audio.unlock()              llamar en el primer gesto del usuario (requisito del navegador)
//   audio.play(name, opts?)     name ∈ SFX (src/core/contracts.js); opts {volume, pitch}
//   audio.playMusic(id)         'menu' | 'pico' | 'selva' | 'canon'
//   audio.stopMusic()
//   audio.setEngine(speedRatio, boosting)  0..1, sonido de motor del jugador (null/-1 = apagar)
//   audio.setVolumes({music, sfx})

export const audio = {
  attach() {},
  unlock() {},
  play() {},
  playMusic() {},
  stopMusic() {},
  setEngine() {},
  setVolumes() {},
};
