import * as assert from "node:assert";
import { uncheckedConverter } from "@vekexasia/bigint-uint8array";

/**
 * simple little encoding for positive integers
 * formula (272) of graypaper
 * @param value - the value to encode
 * @param byteLength - the expected byte length of the encoded value
 */
export const encodeInteger = (
  value: number | bigint,
  byteLength: number,
): Uint8Array => {
  if (byteLength === 0) {
    return new Uint8Array(0);
  }
  value = BigInt(value);
  assert.ok(value >= 0, "value must be positive");
  assert.ok(value < 2 ** (8 * byteLength), "value is too large");
  // we could use the converter but the performance would take a hit at no benefit (checks above)
  return uncheckedConverter.littleEndianToNewArray(value, byteLength);
};

/**
 * E4* encoding allows for variable size encoding for numbers up to 2^29
 * @param value - the value to encode
 */
export const encodeE4Star = (value: number): Uint8Array => {
  assert.ok(value >= 0, "value must be positive");
  if (value < 2 ** (7 * 4)) {
    // e4* encodes exactly as E for values up to 2^28 or 2^(7*4)
    return encodeE(BigInt(value));
  } else {
    assert.ok(value < 2 ** 29, "value is too large");
    return new Uint8Array([
      2 ** 8 - 2 ** 5 + Math.floor(value / 2 ** 24),
      ...encodeInteger(value % 2 ** 24, 3),
    ]);
  }
};

/**
 * E encoding allows for variable size encoding for numbers up to 2^64
 * @param value the valye to encode
 * @returns the encoded value
 */
export const encodeE = (value: bigint): Uint8Array => {
  assert.ok(value >= 0, "value must be positive");
  if (value < 2 ** (7 * 9)) {
    // 2 ** (7 * 9) = 2 ** 63
    let l = 0;
    for (let i = 1; i < 9; i++) {
      if (value >= 2 ** (7 * i)) {
        l = i;
      }
    }
    const ln = BigInt(l);
    return new Uint8Array([
      Number(2n ** 8n - 2n ** (8n - ln) + value / 2n ** (8n * ln)),
      ...encodeInteger(value % 2n ** (8n * ln), l),
    ]);
  } else {
    // encoding from 2 ** 63 to 2 ** 64 - 1 - inclusive
    assert.ok(value < 2n ** 64n, "value is too large");
    return new Uint8Array([
      2 ** 8 - 1, // 255
      ...encodeInteger(value, 8),
    ]);
  }
};
