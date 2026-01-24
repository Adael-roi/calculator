import { evaluate } from '../math/engine.js';

self.addEventListener('message', async (ev) => {
  const { id, type, expression, mode } = ev.data || {};
  if (type === 'eval') {
    const res = await evaluate(expression, mode);
    if (res.ok) self.postMessage({ id, ok: true, result: res.result });
    else self.postMessage({ id, ok: false, error: res.error });
  }
});
