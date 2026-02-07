import { evaluate } from '../src/math/engine.js';

const tests = [
  '1+2',
  '2^10',
  'sqrt(2)',
  'sin(pi/2)',
  'cos(0)',
  'log10(100)',
  'factorial(5) || 120' // intentionally odd expression to see error handling
];

for (const expr of tests) {
  try {
    const res = await evaluate(expr, 'rad');
    console.log(expr, '=>', res);
  } catch (err) {
    console.error(expr, '=>', 'ERROR', err);
  }
}
