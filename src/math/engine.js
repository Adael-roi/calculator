// Thin evaluation wrapper that uses mathjs + Decimal (BigNumber)
import Decimal from './decimalConfig.js';
import { create, all } from 'mathjs';

// Create a mathjs instance configured to use Decimal (via mathjs BigNumber)
const config = { number: 'BigNumber', precision: 64 };
const math = create(all, config);

// Configure mathjs BigNumber to use Decimal.
// Note: mathjs supports a BigNumber implementation; alternatively, convert inputs/outputs using Decimal.

export async function evaluate(expression, angleMode = 'rad') {
  try {
    // Safe evaluate using mathjs (no eval). Caller should ensure expression is a string from UI.
    // If angleMode is 'deg', convert trig function arguments from degrees to radians
    let processedExpr = expression;
    
    if (angleMode === 'deg') {
      // Convert degrees to radians for trig functions by wrapping arguments
      // Strategy: Find each trig function call and wrap its argument with (pi/180)*
      processedExpr = processedExpr.replace(
        /(sin|cos|tan)\(([^()]+|\([^()]*\))\)/g,
        (match, func, arg) => `${func}((pi/180)*(${arg}))`
      );
    }
    
    const result = math.evaluate(processedExpr);
    return { ok: true, result: String(result) };
  } catch (err) {
    return { ok: false, error: err.message || 'Evaluation error' };
  }
}
