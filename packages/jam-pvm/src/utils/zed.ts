import assert from "node:assert";

/**
 * Z(n, a) = a if a &lt; 2^(8n-1) else a - 2^(8n)
 * @param n - the number of bytes
 * @param a - the number to convert
 * @see (221) in graypaper
 */
export const Z = <T extends number>(n: number, a: number) => {
  assert(n >= 0, "n in Z(n) must be positive");
  const limit = 2 ** (8 * n - 1);
  if (a >= limit) {
    return (a - limit * 2) as T;
  }
  return a as T;
};
/**
 * Z_inv(n, a) = (2^(8n) + a) mod 2^(8n)
 * @param n - the number of bytes
 * @param a - the number to convert
 * @see (222) in graypaper
 */
export const Z_inv = <T extends number>(n: number, a: number) => {
  assert(n >= 0, "n in Z_inv(n) must be positive");
  return ((2 ** (8 * n) + a) % 2 ** (8 * n)) as T;
};

export const Z4 = <T extends number>(a: number) => Z<T>(4, a);
export const Z4_inv = <T extends number>(a: number) => Z_inv<T>(4, a);

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  describe("Z", () => {
    it("should not touch if less than 2^(8n-1)", () => {
      expect(Z4(0)).toBe(0);
      expect(Z4(1)).toBe(1);
      expect(Z4(2 ** 31 - 1)).toBe(2 ** 31 - 1);
    });
    it("should convert to negative if greater than 2^(8n-1)", () => {
      expect(Z4(2 ** 31)).toBe(-1 * 2 ** 31);
      expect(Z4(2 ** 32 - 1)).toBe(-1);
    });
  });
  describe("Z_inv", () => {
    it("should work if less than 2^(8n-1)", () => {
      expect(Z4_inv(0)).toBe(0);
      expect(Z4_inv(1)).toBe(1);
      expect(Z4_inv(2 ** 31 - 1)).toBe(2 ** 31 - 1);
    });
    it("should work if greater than 2^(8n-1)", () => {
      expect(Z4_inv(-1 * 2 ** 31)).toBe(2 ** 31);
      expect(Z4_inv(-1)).toBe(2 ** 32 - 1);
    });
  });
}
