// Hoja de estilos de toda la UI (inyectada una sola vez) + fuente "Baloo 2" de Google Fonts.

const FONT_URL = 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&display=swap';

const CSS = /* css */`
:root {
  --cr-font: 'Baloo 2', 'Fredoka', ui-rounded, 'Nunito', system-ui, sans-serif;
  --cr-ink: #1b2240;
  --cr-ink-2: #3a4470;
  --cr-white: #ffffff;
  --cr-sky: #4cc9f0;
  --cr-blue: #2a6fdb;
  --cr-yellow: #ffd23f;
  --cr-orange: #fb8500;
  --cr-green: #3ccf73;
  --cr-red: #ef3e4a;
  --cr-purple: #7b5cff;
  --cr-panel: linear-gradient(180deg, #ffffff 0%, #eef4ff 100%);
  --cr-radius: 22px;
  --cr-shadow: 0 8px 0 rgba(27,34,64,.28), 0 18px 40px rgba(10,16,40,.35);
  --cr-safe-b: env(safe-area-inset-bottom, 0px);
  --cr-safe-t: env(safe-area-inset-top, 0px);
}
#ui { font-family: var(--cr-font); color: var(--cr-ink); -webkit-font-smoothing: antialiased; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }
#ui * { box-sizing: border-box; }
#ui button { font-family: inherit; }

/* ---------- capas ---------- */
.cr-screen { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.cr-screen.cr-enter { animation: cr-fade-in .35s ease-out both; }
.cr-screen.cr-leave { animation: cr-fade-out .22s ease-in both; }
.cr-dim { position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(16,24,64,.25), rgba(10,14,40,.7)); pointer-events: auto; }
.cr-blur { backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.cr-fader { position: absolute; inset: 0; background: #0d1b2a; opacity: 0; pointer-events: none; transition: opacity .28s ease; z-index: 50; }
.cr-fader.on { opacity: 1; }

/* ---------- textos ---------- */
.cr-title { font-weight: 800; color: #fff; line-height: .95; letter-spacing: .5px; margin: 0;
  text-shadow: 0 3px 0 var(--cr-ink), 0 -2px 0 var(--cr-ink), 3px 0 0 var(--cr-ink), -3px 0 0 var(--cr-ink), 2px 2px 0 var(--cr-ink), -2px 2px 0 var(--cr-ink), 2px -2px 0 var(--cr-ink), -2px -2px 0 var(--cr-ink), 0 7px 0 rgba(27,34,64,.45); }
.cr-outline { color: #fff; font-weight: 800;
  text-shadow: 0 2px 0 var(--cr-ink), 0 -2px 0 var(--cr-ink), 2px 0 0 var(--cr-ink), -2px 0 0 var(--cr-ink), 1.5px 1.5px 0 var(--cr-ink), -1.5px 1.5px 0 var(--cr-ink), 1.5px -1.5px 0 var(--cr-ink), -1.5px -1.5px 0 var(--cr-ink), 0 4px 0 rgba(27,34,64,.4); }
.cr-muted { color: var(--cr-ink-2); opacity: .8; }

/* ---------- botones ---------- */
.cr-btn { pointer-events: auto; position: relative; display: inline-flex; align-items: center; justify-content: center; gap: .45em;
  border: 0; cursor: pointer; border-radius: 18px; padding: .5em 1.15em .42em; font-size: 22px; font-weight: 800; letter-spacing: .4px;
  color: #fff; text-transform: uppercase; line-height: 1; min-height: 52px;
  box-shadow: 0 6px 0 var(--cr-btn-dark), 0 12px 22px rgba(10,16,40,.35), inset 0 2px 0 rgba(255,255,255,.45);
  background: linear-gradient(180deg, var(--cr-btn-light) 0%, var(--cr-btn-base) 55%, var(--cr-btn-base2) 100%);
  text-shadow: 0 2px 0 rgba(0,0,0,.25);
  transition: transform .08s ease, box-shadow .08s ease, filter .15s ease; outline: none; }
.cr-btn::after { content: ''; position: absolute; left: 10%; right: 10%; top: 5px; height: 34%; border-radius: 12px; background: linear-gradient(180deg, rgba(255,255,255,.45), rgba(255,255,255,0)); pointer-events: none; }
.cr-btn:hover { filter: brightness(1.07); transform: translateY(-1px); }
.cr-btn:active, .cr-btn.is-pressed { transform: translateY(5px); box-shadow: 0 1px 0 var(--cr-btn-dark), 0 4px 10px rgba(10,16,40,.3), inset 0 2px 0 rgba(255,255,255,.35); }
.cr-btn:focus-visible { box-shadow: 0 6px 0 var(--cr-btn-dark), 0 0 0 4px #fff, 0 0 0 8px var(--cr-sky); }
.cr-btn:disabled { filter: grayscale(.85) brightness(.9); cursor: not-allowed; opacity: .75; }
.cr-btn__icon { display: inline-flex; width: 1.05em; height: 1.05em; }
.cr-btn__icon svg { width: 100%; height: 100%; filter: drop-shadow(0 2px 0 rgba(0,0,0,.2)); }
.cr-btn--primary { --cr-btn-light: #ffe066; --cr-btn-base: #ffb703; --cr-btn-base2: #fb8500; --cr-btn-dark: #b45309; }
.cr-btn--secondary { --cr-btn-light: #8ee3ff; --cr-btn-base: #3fb6f2; --cr-btn-base2: #2a7fd6; --cr-btn-dark: #1c4f9c; }
.cr-btn--green { --cr-btn-light: #9af0b2; --cr-btn-base: #3ccf73; --cr-btn-base2: #22a85a; --cr-btn-dark: #157040; }
.cr-btn--danger { --cr-btn-light: #ff9aa0; --cr-btn-base: #ef3e4a; --cr-btn-base2: #c81e3a; --cr-btn-dark: #8a1026; }
.cr-btn--purple { --cr-btn-light: #c3b2ff; --cr-btn-base: #8e6bff; --cr-btn-base2: #6a46e8; --cr-btn-dark: #45289e; }
.cr-btn--ghost { --cr-btn-light: #ffffff; --cr-btn-base: #f1f5ff; --cr-btn-base2: #dbe5fb; --cr-btn-dark: #8f9cc4; color: var(--cr-ink); text-shadow: none; }
.cr-btn--big { font-size: 34px; min-height: 78px; padding: .45em 1.4em .38em; border-radius: 24px; }
.cr-btn--round { width: 56px; height: 56px; min-height: 0; padding: 0; border-radius: 50%; }
.cr-btn--round .cr-btn__icon { width: 26px; height: 26px; }
.cr-btn--round::after { border-radius: 50%; left: 18%; right: 18%; }

/* ---------- contador de monedas ---------- */
.cr-coins { pointer-events: auto; display: inline-flex; align-items: center; gap: 8px; padding: 6px 18px 4px 8px; border-radius: 999px;
  background: rgba(20,28,70,.72); border: 3px solid rgba(255,255,255,.85); color: #fff; font-weight: 800; font-size: 24px; line-height: 1;
  box-shadow: 0 5px 0 rgba(10,16,40,.35); min-width: 110px; }
.cr-coins svg { width: 32px; height: 32px; flex: none; }
.cr-coins.bump { animation: cr-bump .35s ease-out; }
.cr-coins.spend { animation: cr-spend .45s ease-out; }
.cr-coin-ico { display: inline-flex; width: 1.1em; height: 1.1em; vertical-align: -0.18em; }
.cr-coin-ico svg { width: 100%; height: 100%; }

/* ---------- barra superior de menús ---------- */
.cr-topbar { position: absolute; top: calc(16px + var(--cr-safe-t)); left: 20px; right: 20px; display: flex; align-items: center; gap: 14px; pointer-events: none; z-index: 5; }
.cr-topbar__title { font-size: 40px; flex: 1; }
.cr-topbar .cr-coins { margin-left: auto; }

/* ---------- panel ---------- */
.cr-panel { pointer-events: auto; background: var(--cr-panel); border-radius: var(--cr-radius); border: 4px solid #fff; box-shadow: var(--cr-shadow); padding: 22px; color: var(--cr-ink); }

/* ---------- título ---------- */
.cr-title-screen { display: grid; grid-template-columns: minmax(0, 1fr); }
.cr-logo { position: absolute; left: 50%; top: calc(4.5vh + var(--cr-safe-t)); transform: translateX(-50%); text-align: center; white-space: nowrap; }
.cr-logo__row { display: block; font-weight: 800; line-height: .82; }
.cr-logo__row--a { font-size: clamp(54px, 9.5vw, 128px); }
.cr-logo__row--b { font-size: clamp(64px, 11.5vw, 156px); margin-top: -.06em; transform: rotate(-4deg); }
.cr-logo__ch { display: inline-block; color: #fff; animation: cr-letter-in .6s cubic-bezier(.2,1.6,.4,1) both, cr-letter-bob 3.2s ease-in-out infinite;
  animation-delay: calc(var(--i) * 55ms), calc(900ms + var(--i) * 120ms);
  text-shadow: 0 4px 0 var(--cr-ink), 0 -3px 0 var(--cr-ink), 4px 0 0 var(--cr-ink), -4px 0 0 var(--cr-ink), 3px 3px 0 var(--cr-ink), -3px 3px 0 var(--cr-ink), 3px -3px 0 var(--cr-ink), -3px -3px 0 var(--cr-ink), 0 9px 0 var(--cr-ink), 0 14px 18px rgba(0,0,0,.35); }
.cr-logo__row--b .cr-logo__ch { background: linear-gradient(180deg, #fff27a 0%, #ffb703 48%, #fb6a00 100%); -webkit-background-clip: text; background-clip: text; color: transparent; filter: drop-shadow(0 4px 0 var(--cr-ink)) drop-shadow(0 -3px 0 var(--cr-ink)) drop-shadow(3px 0 0 var(--cr-ink)) drop-shadow(-3px 0 0 var(--cr-ink)) drop-shadow(0 8px 10px rgba(0,0,0,.35)); text-shadow: none; }
.cr-logo__tag { display: inline-block; margin-top: 10px; padding: 4px 18px 2px; border-radius: 999px; background: var(--cr-ink); color: #fff; font-weight: 700; font-size: clamp(14px, 1.5vw, 19px); letter-spacing: 3px; text-transform: uppercase; animation: cr-pop-in .5s .8s cubic-bezier(.2,1.5,.4,1) both; box-shadow: 0 4px 0 rgba(0,0,0,.25); }
.cr-menu { position: absolute; left: 50%; bottom: calc(6vh + var(--cr-safe-b)); transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 16px; }
.cr-menu__row { display: flex; gap: 14px; }
.cr-menu > *, .cr-menu__row > * { animation: cr-rise .5s cubic-bezier(.2,1.4,.4,1) both; }
.cr-menu > :nth-child(1) { animation-delay: .55s; }
.cr-menu__row > :nth-child(1) { animation-delay: .65s; }
.cr-menu__row > :nth-child(2) { animation-delay: .72s; }
.cr-menu .cr-btn--big { min-width: 300px; }
.cr-menu .cr-btn--big .cr-btn__icon { width: .8em; height: .8em; }
.cr-menu__row .cr-btn { min-width: 143px; }
.cr-title-coins { position: absolute; top: calc(18px + var(--cr-safe-t)); right: 20px; animation: cr-pop-in .4s .3s both; }
.cr-hint { position: absolute; bottom: calc(10px + var(--cr-safe-b)); left: 0; right: 0; text-align: center; font-size: 15px; font-weight: 600; color: rgba(255,255,255,.88); text-shadow: 0 1px 2px rgba(0,0,0,.6); }
.cr-hint kbd, .cr-kbd { display: inline-block; min-width: 1.6em; padding: 1px 6px; margin: 0 2px; border-radius: 6px; background: rgba(255,255,255,.92); color: var(--cr-ink); font: 700 13px var(--cr-font); box-shadow: 0 2px 0 rgba(0,0,0,.35); text-shadow: none; }

/* ---------- selección de personaje ---------- */
.cr-char-panel { position: absolute; right: 4vw; top: 50%; transform: translateY(-46%); width: min(420px, 40vw); display: flex; flex-direction: column; gap: 14px; animation: cr-slide-left .45s cubic-bezier(.2,1.2,.4,1) both; }
.cr-char-card { position: relative; overflow: hidden; }
.cr-char-card::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 10px; background: var(--kart, #ffd23f); }
.cr-char-name { font-size: 52px; line-height: .9; margin: 4px 0 0; }
.cr-char-animal { display: inline-block; margin-top: 6px; padding: 2px 12px; border-radius: 999px; font-weight: 700; font-size: 15px; text-transform: uppercase; letter-spacing: 1.5px; color: #fff; background: var(--fur, #555); box-shadow: inset 0 -3px 0 rgba(0,0,0,.18); }
.cr-power { display: flex; gap: 14px; align-items: center; margin-top: 16px; padding: 12px 14px; border-radius: 16px; background: #fff; border: 2px solid #dbe4f6; }
.cr-power__icon { flex: none; width: 56px; height: 56px; border-radius: 16px; display: grid; place-items: center; font-size: 30px; background: linear-gradient(180deg, #ffe066, #ffb703); box-shadow: inset 0 -4px 0 rgba(0,0,0,.15); }
.cr-power__label { font-size: 12px; text-transform: uppercase; letter-spacing: 1.6px; font-weight: 700; color: var(--cr-ink-2); opacity: .7; }
.cr-power__name { font-size: 22px; font-weight: 800; line-height: 1.05; }
.cr-power__desc { font-size: 16px; font-weight: 600; color: var(--cr-ink-2); line-height: 1.2; }
.cr-char-lock { display: flex; align-items: center; gap: 8px; margin-top: 14px; font-weight: 800; font-size: 18px; color: #b45309; }
.cr-char-lock svg { width: 22px; height: 22px; }
.cr-char-actions { display: flex; gap: 12px; }
.cr-char-actions .cr-btn { flex: 1; }
.cr-char-nav { position: absolute; top: 50%; transform: translateY(-50%); }
.cr-char-nav--l { left: 3vw; }
.cr-char-nav--r { left: calc(56vw - 70px); }
.cr-char-nav .cr-btn--round { width: 66px; height: 66px; }
.cr-dots { position: absolute; left: 3vw; width: calc(56vw - 3vw); bottom: calc(26px + var(--cr-safe-b)); display: flex; justify-content: center; gap: 10px; pointer-events: none; }
.cr-dot { pointer-events: auto; cursor: pointer; width: 54px; height: 54px; border-radius: 50%; border: 4px solid #fff; background: #ccd6ee center/cover no-repeat; box-shadow: 0 4px 0 rgba(10,16,40,.35); position: relative; transition: transform .15s ease; padding: 0; }
.cr-dot.is-active { transform: scale(1.22); border-color: var(--cr-yellow); box-shadow: 0 4px 0 rgba(10,16,40,.35), 0 0 0 4px rgba(255,210,63,.45); }
.cr-dot.is-locked::after { content: ''; position: absolute; inset: -4px; border-radius: 50%; background: rgba(20,28,70,.55); }
.cr-dot .cr-dot__lock { position: absolute; right: -6px; bottom: -6px; width: 24px; height: 24px; border-radius: 50%; background: var(--cr-ink); color: #ffd23f; display: grid; place-items: center; z-index: 2; }
.cr-dot .cr-dot__lock svg { width: 14px; height: 14px; }
.cr-swap { animation: cr-pop-in .35s cubic-bezier(.2,1.5,.4,1) both; }

/* ---------- selección de pista ---------- */
.cr-tracks { position: absolute; left: 50%; top: 53%; transform: translate(-50%, -50%); display: flex; gap: 26px; width: min(1180px, 94vw); justify-content: center; }
.cr-track { pointer-events: auto; position: relative; flex: 1; max-width: 360px; border-radius: 26px; overflow: hidden; border: 5px solid #fff; background: #fff; box-shadow: var(--cr-shadow); cursor: pointer; text-align: left; padding: 0; color: var(--cr-ink);
  transition: transform .15s ease, box-shadow .15s ease; animation: cr-rise .5s cubic-bezier(.2,1.3,.4,1) both; animation-delay: calc(var(--i) * 90ms + 100ms); outline: none; }
.cr-track:hover:not(.is-locked), .cr-track:focus-visible { transform: translateY(-8px) rotate(-.6deg); box-shadow: 0 14px 0 rgba(27,34,64,.28), 0 26px 50px rgba(10,16,40,.4); }
.cr-track:focus-visible { border-color: var(--cr-yellow); }
.cr-track:active:not(.is-locked) { transform: translateY(2px); }
.cr-track__art { height: 190px; position: relative; display: block; }
.cr-track__art svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.cr-track__num { position: absolute; left: 14px; top: 12px; width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; background: #fff; font-weight: 800; font-size: 22px; box-shadow: 0 3px 0 rgba(0,0,0,.25); }
.cr-track__body { display: block; padding: 14px 18px 18px; }
.cr-track__name { display: block; font-size: 30px; font-weight: 800; line-height: 1; }
.cr-track__theme { display: inline-block; margin-top: 6px; padding: 2px 10px; border-radius: 999px; color: #fff; font-weight: 700; font-size: 13px; letter-spacing: 1.2px; text-transform: uppercase; }
.cr-track__blurb { display: block; margin-top: 8px; font-weight: 600; font-size: 15px; color: var(--cr-ink-2); min-height: 2.4em; line-height: 1.2; }
.cr-track__stats { display: flex; gap: 10px; margin-top: 12px; }
.cr-stat { flex: 1; background: #eef3ff; border-radius: 12px; padding: 6px 10px 4px; display: flex; flex-direction: column; }
.cr-stat__k { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; color: var(--cr-ink-2); opacity: .75; }
.cr-stat__k svg { width: 13px; height: 13px; }
.cr-stat__v { font-size: 22px; font-weight: 800; line-height: 1.1; }
.cr-track__lock { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: rgba(18,24,58,.88); color: #fff; text-align: center; padding: 20px; backdrop-filter: grayscale(1) blur(1px); }
.cr-track__lock svg { width: 54px; height: 54px; color: #ffd23f; filter: drop-shadow(0 4px 0 rgba(0,0,0,.35)); }
.cr-track__lock b { font-size: 22px; }
.cr-track__lock span { font-size: 15px; font-weight: 600; opacity: .9; max-width: 240px; }
.cr-track.is-locked { cursor: not-allowed; }
.cr-track.shake { animation: cr-shake .4s ease both; }
.cr-racer-chip { pointer-events: auto; display: inline-flex; align-items: center; gap: 8px; background: rgba(20,28,70,.72); border: 3px solid rgba(255,255,255,.85); border-radius: 999px; padding: 3px 14px 3px 3px; color: #fff; font-weight: 800; font-size: 18px; }
.cr-racer-chip img { width: 38px; height: 38px; border-radius: 50%; background: #fff; }

/* ---------- tienda ---------- */
.cr-shop { position: absolute; left: 50%; top: 54%; transform: translate(-50%, -50%); width: min(1120px, 94vw); display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
.cr-upg { display: flex; flex-direction: column; align-items: stretch; gap: 10px; animation: cr-rise .5s cubic-bezier(.2,1.3,.4,1) both; animation-delay: calc(var(--i) * 80ms + 80ms); padding: 18px; position: relative; overflow: hidden; }
.cr-upg__icon { width: 70px; height: 70px; border-radius: 20px; display: grid; place-items: center; color: #fff; background: var(--c); box-shadow: inset 0 -5px 0 rgba(0,0,0,.18), 0 4px 0 rgba(0,0,0,.12); align-self: center; }
.cr-upg__icon svg { width: 42px; height: 42px; filter: drop-shadow(0 2px 0 rgba(0,0,0,.2)); }
.cr-upg__name { font-size: 28px; font-weight: 800; text-align: center; line-height: 1; margin-top: 4px; }
.cr-upg__desc { font-size: 15px; font-weight: 600; text-align: center; color: var(--cr-ink-2); line-height: 1.15; min-height: 2.3em; }
.cr-pips { display: flex; gap: 6px; justify-content: center; }
.cr-pip { flex: 1; height: 18px; border-radius: 6px; background: #dfe6f5; box-shadow: inset 0 3px 0 rgba(0,0,0,.08); transition: background .2s; }
.cr-pip.on { background: linear-gradient(180deg, color-mix(in srgb, var(--c) 70%, white), var(--c)); box-shadow: inset 0 -3px 0 rgba(0,0,0,.18); }
.cr-pip.fresh { animation: cr-pip .6s cubic-bezier(.2,1.6,.4,1) both; }
.cr-upg__level { text-align: center; font-weight: 800; font-size: 15px; color: var(--cr-ink-2); letter-spacing: 1px; text-transform: uppercase; }
.cr-upg .cr-btn { font-size: 20px; }
.cr-upg.flash::after { content: ''; position: absolute; inset: 0; border-radius: inherit; background: radial-gradient(circle at 50% 30%, rgba(255,255,255,.95), rgba(255,255,255,0) 70%); animation: cr-flash .6s ease-out both; pointer-events: none; }
.cr-upg.shake { animation: cr-shake .4s ease both; }
.cr-burst { position: absolute; pointer-events: none; font-weight: 800; font-size: 26px; color: #fff; z-index: 40; animation: cr-burst-up .9s ease-out both; }

/* ---------- ajustes ---------- */
.cr-settings { position: absolute; left: 50%; top: 54%; transform: translate(-50%, -50%); width: min(560px, 92vw); display: flex; flex-direction: column; gap: 18px; animation: cr-pop-in .4s cubic-bezier(.2,1.4,.4,1) both; }
.cr-slider { display: grid; grid-template-columns: 44px 1fr 56px; align-items: center; gap: 14px; }
.cr-slider__ico { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; background: var(--cr-blue); color: #fff; }
.cr-slider__ico svg { width: 26px; height: 26px; }
.cr-slider__lbl { font-size: 14px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; color: var(--cr-ink-2); }
.cr-slider__val { font-size: 22px; font-weight: 800; text-align: right; }
.cr-range { -webkit-appearance: none; appearance: none; width: 100%; height: 34px; background: transparent; cursor: pointer; pointer-events: auto; margin: 0; }
.cr-range::-webkit-slider-runnable-track { height: 14px; border-radius: 99px; background: linear-gradient(90deg, var(--cr-sky) 0 var(--p), #dce5f7 var(--p) 100%); box-shadow: inset 0 2px 0 rgba(0,0,0,.08); }
.cr-range::-moz-range-track { height: 14px; border-radius: 99px; background: linear-gradient(90deg, var(--cr-sky) 0 var(--p), #dce5f7 var(--p) 100%); }
.cr-range::-webkit-slider-thumb { -webkit-appearance: none; width: 32px; height: 32px; margin-top: -9px; border-radius: 50%; background: #fff; border: 5px solid var(--cr-blue); box-shadow: 0 3px 0 rgba(0,0,0,.25); }
.cr-range::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%; background: #fff; border: 5px solid var(--cr-blue); }
.cr-range:focus-visible { outline: 3px solid var(--cr-yellow); outline-offset: 3px; border-radius: 8px; }
.cr-sep { height: 2px; background: #dbe4f6; border-radius: 2px; margin: 4px 0; }
.cr-controls { display: grid; grid-template-columns: 1fr auto; gap: 6px 16px; font-weight: 700; font-size: 16px; }
.cr-controls span:nth-child(even) { text-align: right; }
.cr-h3 { margin: 0 0 8px; font-size: 15px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; color: var(--cr-ink-2); }

/* ---------- diálogo ---------- */
.cr-dialog { position: absolute; inset: 0; display: grid; place-items: center; z-index: 30; pointer-events: auto; }
.cr-dialog .cr-panel { width: min(460px, 90vw); text-align: center; animation: cr-pop-in .3s cubic-bezier(.2,1.5,.4,1) both; }
.cr-dialog h2 { margin: 0 0 8px; font-size: 34px; }
.cr-dialog p { margin: 0 0 20px; font-weight: 600; font-size: 18px; color: var(--cr-ink-2); }
.cr-dialog__btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

/* ---------- HUD ---------- */
.cr-hud { position: absolute; inset: 0; pointer-events: none; color: #fff; }
.cr-hud.is-hidden > :not(.cr-keep) { opacity: 0; transition: opacity .3s; }
.cr-pos { position: absolute; left: 22px; top: calc(14px + var(--cr-safe-t)); display: flex; align-items: flex-end; font-weight: 800; line-height: .8; }
.cr-pos__n { font-size: 96px; }
.cr-pos__n sup { font-size: .42em; vertical-align: top; position: relative; top: .14em; margin-left: 2px; }
.cr-pos__t { font-size: 34px; margin-left: 4px; margin-bottom: 12px; opacity: .9; }
.cr-pos.bump .cr-pos__n { animation: cr-pos-bump .45s cubic-bezier(.2,1.6,.4,1); }
.cr-pos.up .cr-pos__n { color: #b8ff5a; }
.cr-pos.down .cr-pos__n { color: #ff8a8a; }
.cr-pos__n { transition: color .6s; }
.cr-timer { position: absolute; left: 26px; top: calc(118px + var(--cr-safe-t)); display: inline-flex; align-items: center; gap: 8px; padding: 4px 14px 2px 10px; border-radius: 12px; background: rgba(14,20,52,.55); font-weight: 800; font-size: 26px; font-variant-numeric: tabular-nums; }
.cr-timer svg { width: 22px; height: 22px; }
.cr-hud-coins { position: absolute; right: 92px; top: calc(18px + var(--cr-safe-t)); }
.cr-hud-pause { position: absolute; right: 22px; top: calc(16px + var(--cr-safe-t)); pointer-events: auto; }
.cr-progress { position: absolute; left: 50%; top: calc(24px + var(--cr-safe-t)); transform: translateX(-50%); width: min(520px, 40vw); height: 34px; }
.cr-progress__track { position: absolute; left: 0; right: 24px; top: 12px; height: 12px; border-radius: 99px; background: rgba(14,20,52,.55); border: 2px solid rgba(255,255,255,.8); overflow: hidden; }
.cr-progress__fill { position: absolute; left: 0; top: 0; bottom: 0; width: 0; background: linear-gradient(90deg, #4cc9f0, #b8ff5a); border-radius: 99px; }
.cr-progress__flag { position: absolute; right: 0; top: 0; width: 28px; height: 32px; color: #fff; filter: drop-shadow(0 2px 0 rgba(0,0,0,.4)); }
.cr-progress__flag svg { width: 100%; height: 100%; }
.cr-progress__dot { position: absolute; top: 13px; width: 16px; height: 16px; margin-left: -8px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 2px 0 rgba(0,0,0,.35); will-change: transform; }
.cr-progress__dot.is-player { top: -9px; width: 30px; height: 30px; margin-left: -15px; border: 3px solid #fff; z-index: 3; background-size: cover; background-position: center; box-shadow: 0 0 0 3px var(--cr-yellow), 0 3px 0 rgba(0,0,0,.35); }
.cr-speedo { position: absolute; right: 22px; bottom: calc(18px + var(--cr-safe-b)); width: 190px; height: 130px; }
.cr-speedo svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.cr-speedo__v { position: absolute; left: 0; right: 0; bottom: 18px; text-align: center; font-weight: 800; font-size: 54px; line-height: 1; font-variant-numeric: tabular-nums; }
.cr-speedo__u { position: absolute; left: 0; right: 0; bottom: 0; text-align: center; font-weight: 800; font-size: 15px; letter-spacing: 2px; opacity: .85; }
.cr-speedo.boost .cr-speedo__v { color: #ffd23f; }
.cr-slots { position: absolute; left: 22px; bottom: calc(40px + var(--cr-safe-b)); display: flex; align-items: flex-end; gap: 16px; }
.cr-item { position: relative; width: 96px; height: 96px; border-radius: 24px; background: rgba(14,20,52,.6); border: 4px solid rgba(255,255,255,.9); display: grid; place-items: center; box-shadow: 0 5px 0 rgba(0,0,0,.3); }
.cr-item__ico { font-size: 52px; line-height: 1; filter: drop-shadow(0 3px 0 rgba(0,0,0,.3)); }
.cr-item__ico.roll { animation: cr-item-roll .5s cubic-bezier(.2,1.5,.4,1); }
.cr-item__empty { width: 40px; height: 40px; border-radius: 10px; border: 3px dashed rgba(255,255,255,.4); }
.cr-key { position: absolute; right: -8px; bottom: -8px; min-width: 28px; height: 28px; padding: 0 6px; border-radius: 9px; background: #fff; color: var(--cr-ink); font-weight: 800; font-size: 16px; display: grid; place-items: center; box-shadow: 0 3px 0 rgba(0,0,0,.35); }
.cr-power-slot { position: relative; width: 96px; height: 96px; }
.cr-power-slot svg.ring { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
.cr-power-slot .ring-bg { fill: rgba(14,20,52,.6); stroke: rgba(255,255,255,.25); }
.cr-power-slot .ring-fg { fill: none; stroke: #ffd23f; stroke-linecap: round; transition: stroke .2s; }
.cr-power-slot__ico { position: absolute; inset: 14px; border-radius: 50%; display: grid; place-items: center; font-size: 40px; background: radial-gradient(circle at 50% 35%, rgba(255,255,255,.25), rgba(255,255,255,0)); filter: grayscale(.6) brightness(.85); transition: filter .2s; }
.cr-power-slot__lbl { position: absolute; left: 50%; bottom: -24px; transform: translateX(-50%); white-space: nowrap; font-size: 13px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
.cr-power-slot.ready .cr-power-slot__ico { filter: none; }
.cr-power-slot.ready .ring-fg { stroke: #b8ff5a; }
.cr-power-slot.ready { animation: cr-glow 0.9s ease-in-out infinite; border-radius: 50%; }
.cr-power-slot.ready .cr-power-slot__lbl { color: #b8ff5a; }

.cr-center { position: absolute; left: 0; right: 0; top: 30%; display: flex; flex-direction: column; align-items: center; pointer-events: none; }
.cr-count { font-size: clamp(120px, 22vw, 260px); font-weight: 800; line-height: 1; }
.cr-count.go { color: #b8ff5a; }
.cr-count.anim { animation: cr-count 1s cubic-bezier(.2,1.4,.4,1) both; }
.cr-count.go.anim { animation: cr-go 1.1s cubic-bezier(.2,1.4,.4,1) both; }
.cr-launch { position: absolute; left: 50%; bottom: 24%; transform: translateX(-50%); width: min(480px, 80vw); text-align: center; animation: cr-pop-in .3s ease both; }
.cr-launch__bar { position: relative; height: 30px; border-radius: 99px; background: linear-gradient(90deg, #5b6aa8 0%, #8a96c9 50%, #ffd23f 50%, #ffd23f 80%, #3ccf73 80%, #3ccf73 95%, #ef3e4a 95%); border: 4px solid #fff; box-shadow: 0 5px 0 rgba(0,0,0,.3); overflow: visible; }
.cr-launch__needle { position: absolute; top: -12px; bottom: -12px; width: 8px; margin-left: -4px; border-radius: 4px; background: #fff; box-shadow: 0 0 0 3px var(--cr-ink), 0 0 12px rgba(255,255,255,.9); left: 0; will-change: left; }
.cr-launch__zone { position: absolute; top: -26px; left: 80%; width: 15%; text-align: center; font-size: 13px; font-weight: 800; letter-spacing: 1px; color: #b8ff5a; }
.cr-launch__lbl { margin-top: 12px; font-weight: 800; font-size: 20px; }
.cr-launch.holding .cr-launch__bar { box-shadow: 0 5px 0 rgba(0,0,0,.3), 0 0 22px rgba(184,255,90,.8); }
.cr-banner { font-size: clamp(56px, 8vw, 110px); font-weight: 800; animation: cr-banner 1.6s cubic-bezier(.2,1.4,.4,1) both; white-space: nowrap; }
.cr-banner.perfect { color: #b8ff5a; }
.cr-banner.good { color: #ffd23f; }
.cr-banner.finish { color: #ffd23f; font-size: clamp(70px, 11vw, 150px); animation-duration: 2.4s; }
.cr-popups { position: absolute; left: 0; right: 0; top: 58%; height: 0; pointer-events: none; }
.cr-popup { position: absolute; left: 50%; transform: translateX(-50%); white-space: nowrap; font-size: 40px; font-weight: 800; animation: cr-popup 1.1s cubic-bezier(.2,1.4,.4,1) both; }
.cr-popup.small { font-size: 28px; }
.cr-popup.blue { color: #7fe3ff; }
.cr-popup.orange { color: #ffb347; }
.cr-popup.green { color: #b8ff5a; }
.cr-popup.red { color: #ff8a8a; }
.cr-popup.gold { color: #ffd23f; }
.cr-coin-pop { position: absolute; right: 120px; top: calc(56px + var(--cr-safe-t)); font-size: 26px; font-weight: 800; color: #ffd23f; animation: cr-coin-pop .7s ease-out both; }

/* ---------- controles táctiles ---------- */
.cr-touch { position: absolute; inset: 0; pointer-events: none; }
.cr-steer { position: absolute; top: 0; bottom: 0; width: 50%; pointer-events: auto; touch-action: none; }
.cr-steer--l { left: 0; }
.cr-steer--r { right: 0; }
.cr-steer__hint { position: absolute; top: 50%; width: 64px; height: 64px; margin-top: -32px; border-radius: 50%; display: grid; place-items: center; background: rgba(255,255,255,.14); border: 3px solid rgba(255,255,255,.35); color: rgba(255,255,255,.75); transition: background .1s, transform .1s; }
.cr-steer__hint svg { width: 34px; height: 34px; }
.cr-steer--l .cr-steer__hint { left: 14px; }
.cr-steer--r .cr-steer__hint { right: 14px; }
.cr-steer.on .cr-steer__hint { background: rgba(255,255,255,.4); transform: scale(1.12); }
.cr-tbtn { position: absolute; pointer-events: auto; touch-action: none; border-radius: 50%; border: 4px solid rgba(255,255,255,.9); color: #fff; font-weight: 800; display: grid; place-items: center; text-align: center; line-height: 1; box-shadow: 0 5px 0 rgba(0,0,0,.35); transition: transform .06s; }
.cr-tbtn.on { transform: scale(.92); filter: brightness(1.2); }
.cr-tbtn--drift { right: 18px; bottom: calc(22px + var(--cr-safe-b)); width: 108px; height: 108px; font-size: 17px; background: radial-gradient(circle at 50% 35%, #ffb35c, #fb8500 70%); }
.cr-tbtn--item, .cr-tbtn--power { width: 82px; height: 82px; background: rgba(14,20,52,.62); font-size: 40px; }
.cr-tbtn--item { right: 138px; bottom: calc(26px + var(--cr-safe-b)); border-radius: 22px; }
.cr-tbtn--power { right: 30px; bottom: calc(146px + var(--cr-safe-b)); }
.cr-tbtn--power.ready { background: radial-gradient(circle at 50% 35%, #d8ff8a, #3ccf73 75%); animation: cr-glow .9s ease-in-out infinite; }
.cr-tbtn__meter { position: absolute; left: 6px; right: 6px; bottom: 6px; height: 6px; border-radius: 3px; background: rgba(255,255,255,.25); overflow: hidden; }
.cr-tbtn__meter i { display: block; height: 100%; width: 0; background: #ffd23f; }
.cr-swipe-hint { position: absolute; left: 50%; bottom: calc(18px + var(--cr-safe-b)); transform: translateX(-50%); font-size: 14px; font-weight: 700; opacity: .7; white-space: nowrap; }

/* ---------- pausa ---------- */
.cr-pause { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: auto; }
.cr-pause .cr-panel { width: min(420px, 90vw); display: flex; flex-direction: column; gap: 14px; text-align: center; animation: cr-pop-in .3s cubic-bezier(.2,1.5,.4,1) both; }
.cr-pause h2 { font-size: 54px; margin: 0 0 6px; }
.cr-pause .cr-btn { width: 100%; }
.cr-pause__info { font-weight: 700; font-size: 16px; color: var(--cr-ink-2); }

/* ---------- resultados ---------- */
.cr-results { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 28px; padding: 24px; pointer-events: auto; }
.cr-results__left { display: flex; flex-direction: column; align-items: center; gap: 10px; width: min(460px, 42vw); }
.cr-results__head { font-size: 76px; text-align: center; animation: cr-pop-in .5s cubic-bezier(.2,1.5,.4,1) both; }
.cr-results__sub { font-size: 22px; font-weight: 700; color: #fff; text-shadow: 0 2px 3px rgba(0,0,0,.5); margin-top: -8px; }
.cr-podium { display: flex; align-items: flex-end; justify-content: center; gap: 10px; margin-top: 8px; }
.cr-podium__col { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 120px; animation: cr-rise .55s cubic-bezier(.2,1.3,.4,1) both; }
.cr-podium__col:nth-child(1) { animation-delay: .35s; }
.cr-podium__col:nth-child(2) { animation-delay: .15s; }
.cr-podium__col:nth-child(3) { animation-delay: .5s; }
.cr-podium__face { width: 86px; height: 86px; border-radius: 50%; border: 4px solid #fff; background: #fff center/cover; box-shadow: 0 4px 0 rgba(0,0,0,.3); }
.cr-podium__col.is-player .cr-podium__face { box-shadow: 0 0 0 5px var(--cr-yellow), 0 4px 0 rgba(0,0,0,.3); }
.cr-podium__name { font-size: 20px; }
.cr-podium__block { width: 100%; border-radius: 14px 14px 6px 6px; display: grid; place-items: start center; padding-top: 8px; font-size: 44px; font-weight: 800; color: #fff; box-shadow: inset 0 -8px 0 rgba(0,0,0,.18), 0 6px 0 rgba(0,0,0,.25); text-shadow: 0 3px 0 rgba(0,0,0,.25); }
.cr-podium__col.p1 .cr-podium__block { height: 130px; background: linear-gradient(180deg, #ffe066, #f4a613); }
.cr-podium__col.p2 .cr-podium__block { height: 95px; background: linear-gradient(180deg, #e7edf7, #9aa7c0); }
.cr-podium__col.p3 .cr-podium__block { height: 70px; background: linear-gradient(180deg, #ffb98a, #c56a33); }
.cr-results__right { width: min(500px, 46vw); display: flex; flex-direction: column; gap: 14px; animation: cr-slide-in .5s .1s cubic-bezier(.2,1.2,.4,1) both; }
.cr-table { width: 100%; border-collapse: separate; border-spacing: 0 5px; }
.cr-table td { padding: 4px 8px; font-weight: 700; font-size: 18px; background: #fff; }
.cr-table td:first-child { border-radius: 12px 0 0 12px; width: 44px; text-align: center; font-weight: 800; font-size: 22px; }
.cr-table td:last-child { border-radius: 0 12px 12px 0; text-align: right; font-variant-numeric: tabular-nums; }
.cr-table tr.is-player td { background: #fff3c4; }
.cr-table img { width: 34px; height: 34px; border-radius: 50%; vertical-align: middle; margin-right: 8px; background: #eef3ff; }
.cr-table tr { animation: cr-rise .4s cubic-bezier(.2,1.3,.4,1) both; animation-delay: calc(var(--i) * 60ms + 300ms); }
.cr-reward { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 16px; border-radius: 16px; background: var(--cr-ink); color: #fff; }
.cr-reward__lines { font-size: 15px; font-weight: 700; opacity: .85; line-height: 1.3; }
.cr-reward__total { display: flex; align-items: center; gap: 8px; font-size: 42px; font-weight: 800; color: #ffd23f; font-variant-numeric: tabular-nums; }
.cr-reward__total svg { width: 40px; height: 40px; }
.cr-reward__total.pop { animation: cr-bump .4s ease-out; }
.cr-badges { display: flex; gap: 8px; flex-wrap: wrap; }
.cr-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px 2px; border-radius: 999px; background: var(--cr-green); color: #fff; font-weight: 800; font-size: 15px; animation: cr-pop-in .4s 1.2s cubic-bezier(.2,1.5,.4,1) both; }
.cr-badge svg { width: 16px; height: 16px; }
.cr-badge.gold { background: #f4a613; }
.cr-results__btns { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.cr-results__btns .cr-btn { font-size: 19px; }

/* ---------- animaciones ---------- */
@keyframes cr-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes cr-fade-out { to { opacity: 0; } }
@keyframes cr-pop-in { 0% { opacity: 0; transform: scale(.6); } 70% { opacity: 1; transform: scale(1.06); } 100% { transform: scale(1); } }
@keyframes cr-rise { 0% { opacity: 0; transform: translateY(40px) scale(.95); } 100% { opacity: 1; transform: none; } }
@keyframes cr-slide-in { 0% { opacity: 0; transform: translateX(60px); } 100% { opacity: 1; transform: none; } }
@keyframes cr-slide-left { 0% { opacity: 0; transform: translate(60px, -46%); } 100% { opacity: 1; transform: translate(0, -46%); } }
@keyframes cr-letter-in { 0% { opacity: 0; transform: translateY(-80px) scale(.4) rotate(-20deg); } 100% { opacity: 1; transform: none; } }
@keyframes cr-letter-bob { 0%, 100% { translate: 0 0; } 50% { translate: 0 -7px; } }
@keyframes cr-bump { 0% { transform: scale(1); } 40% { transform: scale(1.18); } 100% { transform: scale(1); } }
@keyframes cr-spend { 0% { transform: scale(1); } 30% { transform: scale(.9); filter: brightness(1.4); } 100% { transform: scale(1); } }
@keyframes cr-shake { 0%, 100% { translate: 0 0; } 20% { translate: -10px 0; } 40% { translate: 9px 0; } 60% { translate: -6px 0; } 80% { translate: 4px 0; } }
@keyframes cr-pip { 0% { transform: scale(.3); filter: brightness(2); } 100% { transform: none; } }
@keyframes cr-flash { from { opacity: 1; } to { opacity: 0; } }
@keyframes cr-burst-up { 0% { opacity: 0; transform: translate(-50%, 0) scale(.6); } 20% { opacity: 1; transform: translate(-50%, -12px) scale(1.15); } 100% { opacity: 0; transform: translate(-50%, -70px) scale(1); } }
@keyframes cr-count { 0% { opacity: 0; transform: scale(2.6); } 25% { opacity: 1; transform: scale(.92); } 40% { transform: scale(1.04); } 75% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(.7); } }
@keyframes cr-go { 0% { opacity: 0; transform: scale(3) rotate(-8deg); } 25% { opacity: 1; transform: scale(.95) rotate(2deg); } 40% { transform: scale(1.08) rotate(0); } 75% { opacity: 1; } 100% { opacity: 0; transform: scale(1.6); } }
@keyframes cr-banner { 0% { opacity: 0; transform: scale(.3) rotate(-6deg); } 18% { opacity: 1; transform: scale(1.12) rotate(2deg); } 28% { transform: scale(1) rotate(0); } 80% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.1) translateY(-30px); } }
@keyframes cr-popup { 0% { opacity: 0; transform: translate(-50%, 20px) scale(.5); } 20% { opacity: 1; transform: translate(-50%, 0) scale(1.12); } 35% { transform: translate(-50%, 0) scale(1); } 75% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -60px) scale(.95); } }
@keyframes cr-coin-pop { 0% { opacity: 0; transform: translateY(8px) scale(.6); } 25% { opacity: 1; transform: translateY(0) scale(1.15); } 100% { opacity: 0; transform: translateY(-34px) scale(1); } }
@keyframes cr-pos-bump { 0% { transform: scale(1); } 40% { transform: scale(1.3); } 100% { transform: scale(1); } }
@keyframes cr-item-roll { 0% { transform: scale(.2) rotate(-180deg); } 100% { transform: none; } }
@keyframes cr-glow { 0%, 100% { box-shadow: 0 0 0 0 rgba(184,255,90,.0), 0 0 18px 4px rgba(184,255,90,.55); } 50% { box-shadow: 0 0 0 6px rgba(184,255,90,.35), 0 0 34px 10px rgba(184,255,90,.85); } }

/* ---------- responsivo: pantallas angostas / retrato ---------- */
@media (max-width: 760px), (max-aspect-ratio: 4/5) {
  .cr-btn { font-size: 19px; min-height: 48px; }
  .cr-btn--big { font-size: 28px; min-height: 66px; }
  .cr-topbar { left: 12px; right: 12px; top: calc(12px + var(--cr-safe-t)); gap: 10px; }
  .cr-topbar__title { font-size: 30px; }
  .cr-btn--round { width: 48px; height: 48px; }
  .cr-coins { font-size: 20px; min-width: 0; padding: 4px 14px 2px 6px; }
  .cr-coins svg { width: 26px; height: 26px; }
  .cr-logo { top: calc(9vh + var(--cr-safe-t)); }
  .cr-logo__row--a { font-size: 64px; }
  .cr-logo__row--b { font-size: 80px; }
  .cr-title-coins { top: calc(12px + var(--cr-safe-t)); right: 12px; }
  .cr-menu { bottom: calc(5vh + var(--cr-safe-b)); width: calc(100% - 40px); }
  .cr-menu .cr-btn--big { min-width: 0; width: 100%; }
  .cr-menu__row { width: 100%; }
  .cr-menu__row .cr-btn { flex: 1; min-width: 0; }
  .cr-hint { display: none; }

  .cr-char-panel { left: 12px; right: 12px; width: auto; top: auto; bottom: calc(12px + var(--cr-safe-b)); transform: none; animation-name: cr-rise; gap: 10px; }
  .cr-char-card { padding: 16px 16px 14px; }
  .cr-char-name { font-size: 40px; }
  .cr-power { margin-top: 10px; padding: 10px; }
  .cr-power__icon { width: 46px; height: 46px; font-size: 24px; }
  .cr-power__name { font-size: 19px; }
  .cr-power__desc { font-size: 14px; }
  .cr-char-nav { top: 34%; }
  .cr-char-nav--l { left: 10px; }
  .cr-char-nav--r { left: auto; right: 10px; }
  .cr-char-nav .cr-btn--round { width: 52px; height: 52px; }
  .cr-dots { left: 0; width: 100%; top: calc(76px + var(--cr-safe-t)); bottom: auto; gap: 8px; }
  .cr-dot { width: 42px; height: 42px; border-width: 3px; }

  .cr-tracks { flex-direction: column; top: calc(80px + var(--cr-safe-t)); transform: translateX(-50%); gap: 12px; bottom: 12px; overflow-y: auto; justify-content: flex-start; padding: 4px 4px 16px; pointer-events: auto; }
  .cr-track { max-width: none; flex: none; display: grid; grid-template-columns: 112px 1fr; border-width: 4px; border-radius: 20px; }
  .cr-track__art { height: auto; min-height: 150px; }
  .cr-track__num { width: 32px; height: 32px; font-size: 18px; left: 8px; top: 8px; }
  .cr-track__body { padding: 10px 12px 12px; }
  .cr-track__name { font-size: 24px; }
  .cr-track__blurb { font-size: 13px; min-height: 0; margin-top: 4px; }
  .cr-track__stats { margin-top: 8px; gap: 6px; }
  .cr-stat__v { font-size: 18px; }
  .cr-track__lock b { font-size: 18px; }
  .cr-track__lock span { font-size: 13px; }
  .cr-track__lock svg { width: 38px; height: 38px; }
  .cr-racer-chip { font-size: 15px; }
  .cr-racer-chip img { width: 30px; height: 30px; }

  .cr-shop { grid-template-columns: 1fr 1fr; top: calc(80px + var(--cr-safe-t)); transform: translateX(-50%); gap: 12px; bottom: 12px; overflow-y: auto; align-content: start; pointer-events: auto; padding-bottom: 12px; }
  .cr-upg { padding: 12px; gap: 8px; }
  .cr-upg__icon { width: 54px; height: 54px; border-radius: 16px; }
  .cr-upg__icon svg { width: 32px; height: 32px; }
  .cr-upg__name { font-size: 22px; }
  .cr-upg__desc { font-size: 13px; }
  .cr-pip { height: 14px; }
  .cr-upg .cr-btn { font-size: 16px; padding-left: .5em; padding-right: .5em; }

  .cr-settings { top: calc(80px + var(--cr-safe-t)); transform: translateX(-50%); }
  .cr-settings .cr-panel { padding: 16px; }

  .cr-results { flex-direction: column; justify-content: flex-start; gap: 12px; padding: calc(14px + var(--cr-safe-t)) 12px calc(12px + var(--cr-safe-b)); overflow-y: auto; }
  .cr-results__left, .cr-results__right { width: 100%; }
  .cr-results__head { font-size: 54px; }
  .cr-results__sub { font-size: 18px; }
  .cr-podium__col { width: 96px; }
  .cr-podium__face { width: 64px; height: 64px; }
  .cr-podium__col.p1 .cr-podium__block { height: 86px; }
  .cr-podium__col.p2 .cr-podium__block { height: 64px; }
  .cr-podium__col.p3 .cr-podium__block { height: 48px; }
  .cr-podium__block { font-size: 32px; }
  .cr-podium__name { font-size: 17px; }
  .cr-results__right { animation-name: cr-rise; }
  .cr-results__right .cr-panel { padding: 12px; }
  .cr-table td { font-size: 15px; padding: 2px 6px; }
  .cr-table img { width: 28px; height: 28px; }
  .cr-reward__total { font-size: 34px; }

  .cr-pos { left: 14px; }
  .cr-pos__n { font-size: 72px; }
  .cr-pos__t { font-size: 26px; margin-bottom: 8px; }
  .cr-timer { left: 16px; top: calc(92px + var(--cr-safe-t)); font-size: 20px; }
  .cr-hud-coins { right: 76px; top: calc(14px + var(--cr-safe-t)); }
  .cr-hud-pause { right: 14px; top: calc(12px + var(--cr-safe-t)); }
  .cr-progress { top: calc(140px + var(--cr-safe-t)); width: calc(100% - 40px); }
  .cr-speedo { width: 140px; height: 96px; }
  .cr-speedo__v { font-size: 40px; bottom: 14px; }
  .cr-launch { bottom: 34%; }
}
/* En táctil el slot de objeto y el poder son botones: se esconden los slots fijos y el velocímetro sube */
.cr-hud.touch .cr-slots { display: none; }
.cr-hud.touch .cr-speedo { right: auto; left: 50%; transform: translateX(-50%) scale(.85); transform-origin: bottom center; bottom: calc(40px + var(--cr-safe-b)); }
@media (max-width: 760px), (max-aspect-ratio: 4/5) {
  .cr-hud.touch .cr-speedo { bottom: calc(150px + var(--cr-safe-b)); transform: translateX(-50%) scale(.8); }
}

.cr-results__btns { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.cr-topbar__title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
@media (max-width: 760px), (max-aspect-ratio: 4/5) {
  .cr-topbar__title { font-size: 26px; }
  .cr-racer-chip__n { display: none; }
  .cr-racer-chip { padding-right: 3px; }
  .cr-dots { top: calc(80px + var(--cr-safe-t)); }
  .cr-results { gap: 8px; }
  .cr-results__right { gap: 8px; }
  .cr-results__right .cr-panel { padding: 8px 10px; }
  .cr-table { border-spacing: 0 3px; }
  .cr-table td { padding: 1px 6px; font-size: 14px; }
  .cr-table td:first-child { font-size: 17px; width: 32px; }
  .cr-table img { width: 24px; height: 24px; margin-right: 6px; }
  .cr-reward { padding: 8px 12px; }
  .cr-reward__lines { font-size: 13px; }
  .cr-reward__total { font-size: 30px; }
  .cr-reward__total svg { width: 30px; height: 30px; }
  .cr-badge { font-size: 12px; padding: 3px 9px 1px; }
  .cr-results__btns { gap: 8px; }
  .cr-results__btns .cr-btn { font-size: 15px; min-height: 44px; padding-left: .5em; padding-right: .5em; }
  .cr-podium__face { width: 56px; height: 56px; }
  .cr-podium__name { font-size: 15px; }
  .cr-podium__col.p1 .cr-podium__block { height: 70px; }
  .cr-podium__col.p2 .cr-podium__block { height: 52px; }
  .cr-podium__col.p3 .cr-podium__block { height: 38px; }
  .cr-results__head { font-size: 44px; }
}

/* pantallas cortas en horizontal (laptops pequeñas): resultados compactos */
@media (min-width: 761px) and (max-height: 680px) {
  .cr-results { gap: 18px; padding: 12px; }
  .cr-results__head { font-size: 52px; }
  .cr-results__sub { font-size: 17px; margin-top: -4px; }
  .cr-podium__col { width: 96px; }
  .cr-podium__face { width: 62px; height: 62px; }
  .cr-podium__name { font-size: 16px; }
  .cr-podium__col.p1 .cr-podium__block { height: 86px; }
  .cr-podium__col.p2 .cr-podium__block { height: 62px; }
  .cr-podium__col.p3 .cr-podium__block { height: 46px; }
  .cr-results__right { gap: 8px; }
  .cr-table { border-spacing: 0 3px; }
  .cr-table td { padding: 1px 8px; font-size: 16px; }
  .cr-table td:first-child { font-size: 18px; }
  .cr-table img { width: 26px; height: 26px; }
  .cr-reward { padding: 8px 14px; }
  .cr-reward__total { font-size: 32px; }
  .cr-results__btns { gap: 8px; }
  .cr-results__btns .cr-btn { font-size: 16px; }
}


/* pantalla de carga */
.cr-loading { position: absolute; inset: 0; z-index: 60; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; background: radial-gradient(circle at 50% 40%, #27406b, #0d1b2a 70%); color: #fff; animation: cr-fade-in .2s ease-out both; }
.cr-loading__t { font-size: 34px; font-weight: 800; letter-spacing: 1px; }
.cr-loading__s { font-size: 16px; font-weight: 700; opacity: .75; }
.cr-loading__bar { width: min(280px, 60vw); height: 14px; border-radius: 99px; background: rgba(255,255,255,.18); border: 2px solid rgba(255,255,255,.7); overflow: hidden; }
.cr-loading__bar i { display: block; height: 100%; width: 40%; border-radius: 99px; background: linear-gradient(90deg, #4cc9f0, #b8ff5a); animation: cr-load 1s ease-in-out infinite alternate; }
@keyframes cr-load { from { transform: translateX(-20%); } to { transform: translateX(160%); } }

/* guía de controles de la primera carrera */
.cr-tuto { position: absolute; left: 0; right: 0; margin: 0 auto; width: max-content; top: calc(78px + var(--cr-safe-t)); display: flex; gap: 8px 18px; flex-wrap: wrap; justify-content: center; max-width: min(540px, 92vw); padding: 12px 16px; border-radius: 22px; background: rgba(14,20,52,.72); border: 2px solid rgba(255,255,255,.75); box-shadow: 0 8px 0 rgba(0,0,0,.25); color: #fff; pointer-events: none; z-index: 5; animation: cr-pop-in .45s cubic-bezier(.2,1.4,.4,1) both; transition: opacity .5s, transform .5s; }
.cr-tuto.out { opacity: 0; transform: translateY(14px); }
.cr-tuto__it { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 17px; }
.cr-tuto__it .cr-key { position: static; }
.cr-tuto__keys { display: inline-flex; gap: 3px; }
.cr-tuto .cr-key { min-width: 30px; height: 30px; padding: 0 6px; display: inline-grid; place-items: center; border-radius: 8px; background: #fff; color: var(--cr-ink); font-weight: 800; font-size: 15px; box-shadow: 0 3px 0 rgba(0,0,0,.35); }
@media (max-width: 760px), (max-aspect-ratio: 4/5) {
  .cr-tuto { top: calc(190px + var(--cr-safe-t)); flex-direction: column; gap: 6px; align-items: flex-start; }
  .cr-tuto__it { font-size: 15px; }
}
@media (prefers-reduced-motion: reduce) {
  .cr-loading__bar i { animation: none; }
}
@media (prefers-reduced-motion: reduce) {
  .cr-logo__ch { animation: none; }
}

.cr-shop-pick { position: absolute; left: 50%; top: calc(96px + var(--cr-safe-t)); transform: translateX(-50%); display: flex; gap: 12px; z-index: 2; pointer-events: auto; }
.cr-shop-char { display: flex; align-items: center; gap: 8px; padding: 4px 14px 4px 4px; border-radius: 99px; border: 3px solid #fff; background: rgba(255,255,255,.85); font: inherit; font-weight: 800; font-size: 17px; color: var(--cr-ink); cursor: pointer; box-shadow: 0 4px 0 rgba(10,16,40,.3); }
.cr-shop-char.is-active { border-color: var(--cr-yellow); background: #fff; transform: scale(1.08); box-shadow: 0 4px 0 rgba(10,16,40,.3), 0 0 0 3px rgba(255,210,63,.5); }
.cr-shop-char__img { width: 42px; height: 42px; border-radius: 50%; background: #ccd6ee center/cover no-repeat; }
.cr-shop { top: 58%; }
.cr-mini-up { display: grid; gap: 4px; margin: 8px 0 2px; }
.cr-mini-up__row { display: grid; grid-template-columns: 78px 1fr; align-items: center; gap: 8px; font-size: 13px; font-weight: 800; color: var(--cr-ink-2); }
.cr-mini-up__bar { height: 10px; border-radius: 5px; background: #dfe6f5; overflow: hidden; }
.cr-mini-up__bar i { display: block; height: 100%; background: var(--cr-yellow); border-radius: 5px; }
.cr-tbtn--back { right: 140px; bottom: calc(40px + var(--cr-safe-b)); width: 72px; height: 72px; background: rgba(14,20,52,.62); font-size: 15px; }
.cr-pause__keys { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; max-width: 360px; }
.cr-pause__keys span { font-size: 13px; font-weight: 700; padding: 3px 9px; border-radius: 8px; background: rgba(20,28,70,.1); color: var(--cr-ink-2); }
.cr-launch__lock { display: none; position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 18px; }
.cr-launch.locked .cr-launch__bar { box-shadow: 0 5px 0 rgba(0,0,0,.3), 0 0 26px rgba(255,210,63,.95); }
.cr-launch.locked .cr-launch__lock { display: block; }
.cr-launch.locked .cr-launch__lbl { color: #ffd23f; }
@media (max-width: 900px), (max-height: 520px) { .cr-shop-pick { top: calc(76px + var(--cr-safe-t)); gap: 6px; } .cr-shop-char span:last-child { display: none; } .cr-shop-char { padding-right: 4px; } .cr-shop { top: calc(130px + var(--cr-safe-t)); } .cr-mini-up__row { grid-template-columns: 64px 1fr; font-size: 11px; } }
`;

let injected = false;

export function injectStyles() {
  if (injected) return;
  injected = true;
  const head = document.head;
  for (const href of ['https://fonts.googleapis.com', 'https://fonts.gstatic.com']) {
    const l = document.createElement('link');
    l.rel = 'preconnect';
    l.href = href;
    if (href.includes('gstatic')) l.crossOrigin = '';
    head.appendChild(l);
  }
  const font = document.createElement('link');
  font.rel = 'stylesheet';
  font.href = FONT_URL;
  head.appendChild(font);
  const style = document.createElement('style');
  style.id = 'cumbre-rush-ui';
  style.textContent = CSS;
  head.appendChild(style);
}
