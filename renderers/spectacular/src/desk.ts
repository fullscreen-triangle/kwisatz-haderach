// spectacular for the desk: one ES module the console loads at run time
// (web/public/vendor/spectacular/spectacular.js). It holds the viewer, its worker and the
// crossfilter WASM, so a view needs no other file and no network.
//
//   show(el, spec)   validate, then mount; resolves to { destroy, selection } or rejects
//                    with { problems: [{path, message}] }
//   check(spec)      the validator alone: [] when the spec is good
import { mount, validate } from "@spectacular/viz";
import EngineWorker from "@spectacular/viz/src/engine/worker.ts?worker&inline";

export function check(spec: unknown) {
  return validate(spec);
}

export async function show(el: HTMLElement, spec: unknown) {
  const problems = validate(spec);
  if (problems.length) throw { problems };
  const handle = await mount(el, spec as never, { worker: new EngineWorker() });
  return {
    destroy: () => handle.destroy(),
    selection: () => handle.selection(),
    onUpdate: (fn: () => void) => handle.onUpdate(fn),
  };
}
