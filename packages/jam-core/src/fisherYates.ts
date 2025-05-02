import { E_4_int, encodeWithCodec } from "@tsjam/codec";
import { Hashing } from "@tsjam/crypto";
import { Hash, u32 } from "@tsjam/types";
import { bigintToBytes } from "@tsjam/utils";

/**
 * $(0.6.4 - F.1)
 */
export const FisherYates = <T>(arr: T[], entropies: number[]) => {
  const sliced = arr.slice();
  let l = sliced.length;
  let index = 0;
  const toRet = <T[]>[];
  while (l > 0) {
    index = entropies[sliced.length - l] % l;
    toRet.push(sliced[index]);
    sliced[index] = sliced[l - 1];
    l--;
  }
  return toRet;
};

/**
 * $(0.6.4 - F.3)
 */
export const FisherYatesH = <T>(arr: T[], entropy: Hash) => {
  return FisherYates(arr, Q(arr.length, entropy));
};

/**
 * $(0.6.4 - F.2)
 */
const Q = (l: number, entropy: Hash): u32[] => {
  const entropyBin = bigintToBytes(entropy, 32);
  const toRet = <u32[]>[];
  for (let i = 0; i < l; i++) {
    toRet.push(
      E_4_int.decode(
        Hashing.blake2bBuf(
          new Uint8Array([
            ...entropyBin,
            ...encodeWithCodec(E_4_int, <u32>Math.floor(i / 8)),
          ]),
        ).subarray((4 * i) % 32, ((4 * i) % 32) + 4),
      ).value,
    );
  }
  return toRet;
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  describe("fisheryates", () => {
    it("test", () => {
      const entropy =
        0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffn;
      const arr = [0, 1, 2, 3, 4, 5, 6, 7];
      expect(FisherYatesH(arr, entropy as Hash)).deep.eq([
        1, 2, 6, 0, 7, 4, 3, 5,
      ]);
    });
  });
}
