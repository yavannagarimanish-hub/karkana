import { describe, expect, it } from 'vitest';
import { discountPercent, formatINR, paiseToRupees, rupeesToPaise, sumPaise } from '../money';

describe('rupee ↔ paise conversion', () => {
  it('converts both ways', () => {
    expect(rupeesToPaise(109)).toBe(10900);
    expect(rupeesToPaise(10.5)).toBe(1050);
    expect(paiseToRupees(10900)).toBe(109);
  });

  it('rounds rather than truncates', () => {
    expect(rupeesToPaise(0.005)).toBe(1);
    expect(rupeesToPaise(1.005)).toBe(101); // banker-free, nearest
  });

  it('refuses non-finite input', () => {
    expect(() => rupeesToPaise(Number.NaN)).toThrow(RangeError);
    expect(() => rupeesToPaise(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('formatINR', () => {
  it('uses Indian digit grouping (input is paise)', () => {
    expect(formatINR(123456789)).toBe('₹12,34,567.89'); // ₹12,34,567.89
    expect(formatINR(10900)).toBe('₹109');
    expect(formatINR(10000000)).toBe('₹1,00,000'); // one lakh
    expect(formatINR(0)).toBe('₹0');
  });

  it('drops decimals for whole rupees and can drop the symbol', () => {
    expect(formatINR(10900, { withSymbol: false })).toBe('109');
    expect(formatINR(10950)).toBe('₹109.50');
  });

  it('handles negatives', () => {
    expect(formatINR(-5000)).toBe('-₹50');
  });
});

describe('discountPercent', () => {
  it('matches the catalogue convention', () => {
    expect(discountPercent(18000, 10900)).toBe(39);
  });

  it('returns 0 when there is nothing to discount', () => {
    expect(discountPercent(10000, 10000)).toBe(0);
    expect(discountPercent(10000, 12000)).toBe(0);
    expect(discountPercent(0, 100)).toBe(0);
  });
});

describe('sumPaise', () => {
  it('adds integers exactly', () => {
    expect(sumPaise([10900, 11900, 12900])).toBe(35700);
    expect(sumPaise([])).toBe(0);
  });
});
