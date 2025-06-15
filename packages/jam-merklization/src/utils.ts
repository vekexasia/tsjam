import { E_4, encodeWithCodec } from "@tsjam/codec";
import { Hashing } from "@tsjam/crypto";
import { Hash, ServiceIndex, StateKey } from "@tsjam/types";
import { bigintToBytes } from "@tsjam/utils";

export type HashFn = (preimage: Uint8Array) => Hash;
export const maybeBigintToBytes = (x: Uint8Array | Hash): Uint8Array =>
  typeof x === "bigint" ? bigintToBytes(x, 32) : x;

/**
 * `C` in graypaper
 * $(0.6.7 - D.1)
 */
export const stateKey = (
  i: number,
  _s?: ServiceIndex | Uint8Array,
): StateKey => {
  if (_s instanceof Uint8Array) {
    const h: Uint8Array = _s;
    const a = Hashing.blake2bBuf(h);
    const s = i;
    const n = encodeWithCodec(E_4, BigInt(s));
    return new Uint8Array([
      n[0],
      a[0],
      n[1],
      a[1],
      n[2],
      a[2],
      n[3],
      a[3],
      ...a.subarray(4, 27), // ends at [26]
    ]) as StateKey;
  }
  if (typeof _s === "number") {
    // its ServiceIndex
    const n = encodeWithCodec(E_4, BigInt(_s));
    return new Uint8Array([
      i,
      n[0],
      0,
      n[1],
      0,
      n[2],
      0,
      n[3],
      ...new Array(31 - 4 - 4).fill(0),
    ]) as StateKey;
  }
  return new Uint8Array([i, ...new Array(30).fill(0)]) as StateKey;
};
