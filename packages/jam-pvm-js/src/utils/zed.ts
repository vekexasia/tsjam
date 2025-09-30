import assert from "node:assert";

/**
 * Z(n, a) = a if a &lt; 2^(8n-1) else a - 2^(8n)
 * @param n - the number of bytes
 * @param a - the number to convert
 * $(0.7.1 - A.10)
 */
export const Z = (n: number) => {
  assert(n >= 0, "n in Z(n) must be positive");
  if (n == 0) {
    return <T extends bigint>() => 0n as T;
  }
  const limit = 2n ** (8n * BigInt(n) - 1n);
  return <T extends bigint>(a: bigint) => {
    if (a >= limit) {
      return (a - limit * 2n) as T;
    }
    return a as T;
  };
};

/**
 * Z_inv(n, a) = (2^(8n) + a) mod 2^(8n)
 * @param n - the number of bytes
 * @param a - the number to convert
 * $(0.7.1 - A.11)
 */
export const Z_inv = <T extends bigint>(n: number, a: bigint) => {
  assert(n >= 0, "n in Z_inv(n) must be positive");
  return ((2n ** (8n * BigInt(n)) + a) % 2n ** (8n * BigInt(n))) as T;
};

export const Z1 = Z(1);
export const Z2 = Z(2);
export const Z4 = Z(4);
export const Z8 = Z(8);

export const Z4_inv = <T extends number>(a: number | bigint) =>
  Number(Z_inv(4, BigInt(a))) as T;

export const Z8_inv = <T extends bigint>(a: bigint) => Z_inv(8, BigInt(a)) as T;

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  describe("Z", () => {
    it("should not touch if less than 2^(8n-1)", () => {
      expect(Z4(0n)).toBe(0n);
      expect(Z4(1n)).toBe(1n);
      expect(Z4(2n ** 31n - 1n)).toBe(2n ** 31n - 1n);
    });
    it("should convert to negative if greater than 2^(8n-1)", () => {
      expect(Z4(2n ** 31n)).toBe(-1n * 2n ** 31n);
      expect(Z4(2n ** 32n - 1n)).toBe(-1n);
    });
  });
  describe("Z_inv", () => {
    it("should work if less than 2^(8n-1)", () => {
      expect(Z4_inv(0)).toBe(0);
      expect(Z4_inv(1)).toBe(1);
      expect(Z4_inv(2 ** 31 - 1)).toBe(2 ** 31 - 1);

      expect(Z8_inv(0n)).toBe(0n);
      expect(Z8_inv(1n)).toBe(1n);
      expect(Z8_inv(2n ** 63n - 1n)).toBe(2n ** 63n - 1n);
    });
    it("should work if greater than 2^(8n-1)", () => {
      expect(Z4_inv(-1 * 2 ** 31)).toBe(2 ** 31);
      expect(Z4_inv(-1)).toBe(2 ** 32 - 1);
    });

    it("should go on limits", () => {
      expect(Z8(Z8_inv(-1n * 2n ** 63n))).toBe(-1n * 2n ** 63n);
    });
  });
}
