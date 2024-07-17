import * as assert from "node:assert";
import { uncheckedConverter } from "@vekexasia/bigint-uint8array";

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
