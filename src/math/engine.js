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
      // Wrap trig function arguments with degree-to-radian conversion
      processedExpr = processedExpr
        .replace(/sin\(/g, 'sin((pi/180)*')
        .replace(/cos\(/g, 'cos((pi/180)*')
        .replace(/tan\(/g, 'tan((pi/180)*');
      
      // Balance parentheses for wrapped expressions
      const sinCount = (processedExpr.match(/sin\(/g) || []).length;
      const cosCount = (processedExpr.match(/cos\(/g) || []).length;
      const tanCount = (processedExpr.match(/tan\(/g) || []).length;
      const extraClosing = sinCount + cosCount + tanCount;
      
      // Find each trig function and add closing paren after its argument
      let balanced = processedExpr;
      for (let i = 0; i < extraClosing; i++) {
        const trigMatch = balanced.match(/(sin|cos|tan)\(\(pi\/180\)\*[^)]*\)/);
        if (trigMatch) {
          const idx = trigMatch.index + trigMatch[0].length;
          balanced = balanced.slice(0, idx) + ')' + balanced.slice(idx);
        }
      }
      processedExpr = balanced;
    }
    
    const result = math.evaluate(processedExpr);
    return { ok: true, result: String(result) };
  } catch (err) {
    return { ok: false, error: err.message || 'Evaluation error' };
  }
}
