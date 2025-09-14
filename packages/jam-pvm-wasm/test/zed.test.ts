import { describe, expect, it } from "vitest";
import { Z, Z_inv } from "../build/release";
describe("Z", () => {
  it("should not touch if less than 2^(8n-1)", () => {
    expect(Z(4, 0n)).toBe(0n);
    expect(Z(4, 1n)).toBe(1n);
    expect(Z(0, 0n)).toBe(0n);
    expect(Z(1, 2n ** 7n - 1n)).toBe(2n ** 7n - 1n);
    expect(Z(2, 2n ** 15n - 1n)).toBe(2n ** 15n - 1n);
    expect(Z(4, 2n ** 31n - 1n)).toBe(2n ** 31n - 1n);
    expect(Z(8, 2n ** 63n - 1n)).toBe(2n ** 63n - 1n);
    expect(Z(7, 2n ** 55n - 1n)).toBe(2n ** 55n - 1n);
  });
  it("should convert to negative if greater than 2^(8n-1)", () => {
    expect(Z(1, 2n ** 7n)).toBe(-1n * 2n ** 7n);
    expect(Z(2, 2n ** 15n)).toBe(-1n * 2n ** 15n);
    expect(Z(4, 2n ** 31n)).toBe(-1n * 2n ** 31n);
    expect(Z(8, 2n ** 63n)).toBe(-1n * 2n ** 63n);
    expect(Z(1, 2n ** 8n - 1n)).toBe(-1n);
    expect(Z(2, 2n ** 16n - 1n)).toBe(-1n);
    expect(Z(4, 2n ** 32n - 1n)).toBe(-1n);
    expect(Z(8, 2n ** 64n - 1n)).toBe(-1n);
    expect(Z(7, 2n ** 56n - 1n)).toBe(-1n);
  });
});
describe("Z_inv", () => {
  it("should work if less than 2^(8n-1)", () => {
    expect(Z_inv(4, 0n)).toBe(0n);
    expect(Z_inv(4, 1n)).toBe(1n);
    expect(Z_inv(4, 2n ** 31n - 1n)).toBe(2n ** 31n - 1n);

    expect(Z_inv(8, 0n)).toBe(0n);
    expect(Z_inv(8, 1n)).toBe(1n);
    expect(Z_inv(8, 2n ** 63n - 1n)).toBe(2n ** 63n - 1n);
    expect(Z_inv(8, -1n * 2n ** 63n - 1n)).toBe(2n ** 63n - 1n);
  });
  it("should work if greater than 2^(8n-1)", () => {
    expect(Z_inv(4, -1n * 2n ** 31n)).toBe(2n ** 31n);
    expect(Z_inv(4, -1n)).toBe(2n ** 32n - 1n);

    expect(Z_inv(8, -1n * 2n ** 63n)).toBe(2n ** 63n);
    expect(Z_inv(8, -1n)).toBe(2n ** 64n - 1n);
  });

  it("should go on limits", () => {
    expect(Z(8, Z_inv(8, -1n * 2n ** 63n))).toBe(-1n * 2n ** 63n);
  });
});
