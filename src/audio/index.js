// API pública de audio (WebAudio 100 % sintetizado, sin archivos):
//   audio.attach(events, save)  escucha EVENTS y lee volúmenes de save.data.settings
//   audio.unlock()              primer gesto del usuario (attach ya registra pointerdown/keydown)
//   audio.play(name, opts?)     name ∈ SFX; opts {volume, pitch, ...extras por sonido: level, power, success}
//   audio.playMusic(id)         'menu' | 'pico' | 'selva' | 'canon' (crossfade)
//   audio.stopMusic()
//   audio.setEngine(speedRatio, boosting, drifting?)  0..1; null/-1 apaga con fade
//   audio.setVolumes({music, sfx})
export { audio } from './audio.js';
