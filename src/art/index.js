// API pública del módulo de arte (contratos KartModel, Environment, Particles y PROP_KINDS en src/core/contracts.js).
// Todo es procedural: geometrías de Three.js con colores por vértice y materiales compartidos.
export { createKartModel, createCharacterPreview } from './kartModel.js';
export { createEnvironment, THEMES } from './environment.js';
export { createProp, getPropGeometries, getPropVariantCount } from './props.js';
export { createParticles } from './particles.js';
export { getMat } from './builder.js';
