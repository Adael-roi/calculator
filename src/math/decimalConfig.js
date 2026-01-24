// Central decimal configuration
import Decimal from 'decimal.js';

// Default precision (change as needed)
Decimal.set({ precision: 34, rounding: Decimal.ROUND_HALF_UP });

export default Decimal;

// Note: You may wire Decimal into mathjs as its BigNumber backend in `engine.js`.
