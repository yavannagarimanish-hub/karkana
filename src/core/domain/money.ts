/**
 * Money handling.
 *
 * All arithmetic happens in **integer paise** so that rounding errors can never
 * accumulate across an order. Rupee floats exist only at the persistence
 * boundary (the catalogue stores rupees) and in the UI (formatting).
 */

const PAISE_PER_RUPEE = 100;

/**
 * Rupees (possibly fractional) → integer paise.
 *
 * The `toPrecision` step matters: in binary floating point `1.005 * 100` is
 * `100.49999999999999`, so a naive `Math.round` would silently drop a paisa.
 * Normalising to 15 significant digits first keeps decimal intent.
 */
export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) {
    throw new RangeError(`rupeesToPaise: ${rupees} is not a finite number`);
  }
  return Math.round(Number((rupees * PAISE_PER_RUPEE).toPrecision(15)));
}

export function paiseToRupees(paise: number): number {
  return paise / PAISE_PER_RUPEE;
}

/** `123456` → `"₹1,234.56"`; whole rupees drop the decimals (`₹1,234`). */
export function formatINR(paise: number, opts: { withSymbol?: boolean } = {}): string {
  const { withSymbol = true } = opts;
  const rupees = paise / PAISE_PER_RUPEE;
  const needsDecimals = !Number.isInteger(rupees);

  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: needsDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(rupees));

  const sign = rupees < 0 ? '-' : '';
  return `${sign}${withSymbol ? '₹' : ''}${formatted}`;
}

/** Percentage off, rounded to a whole number: `mrp 180, price 109` → `39`. */
export function discountPercent(mrpPaise: number, pricePaise: number): number {
  if (mrpPaise <= 0 || pricePaise <= 0 || mrpPaise <= pricePaise) {
    return 0;
  }
  return Math.round(((mrpPaise - pricePaise) / mrpPaise) * 100);
}

export function sumPaise(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
