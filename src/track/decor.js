// (temporal) decoración
import { createProp } from '../art/index.js';
import { placeOnFrame } from './road.js';
export function buildDecor(f, ctx) {
  for (const i of [ctx.startLineIndex, f.finishIndex]) {
    const a = createProp('arch', ctx.theme);
    placeOnFrame(a, f, i);
    ctx.group.add(a);
  }
  return { update() {} };
}
