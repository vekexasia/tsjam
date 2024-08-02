import assert from "node:assert";

/**
 * Z(n, a) = a if a < 2^(8n-1) else a - 2^(8n)
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
