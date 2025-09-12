import { E_4_int } from "@tsjam/codec";
import { Hashing } from "@tsjam/crypto";
import { Hash, u32 } from "@tsjam/types";

/**
 * $(0.7.1 - F.1)
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
 * $(0.7.1 - F.3)
 */
export const FisherYatesH = <T>(arr: T[], entropy: Hash) => {
  return FisherYates(arr, Q(arr.length, entropy));
};

/**
 * $(0.7.1 - F.2)
 */
const Q = (l: number, entropy: Hash): u32[] => {
  const toRet = <u32[]>[];
  const buf = Buffer.allocUnsafe(32 + 4);
  entropy.copy(buf);
  let hash: Hash;
  for (let i = 0; i < l; i++) {
    if (i % 8 === 0) {
      // E_4.encode
      buf.writeUint32LE(Math.floor(i / 8), 32);
      hash = Hashing.blake2b(buf);
    }
    toRet.push(
      E_4_int.decode(hash!.subarray((4 * i) % 32, ((4 * i) % 32) + 4)).value,
    );
  }
  return toRet;
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  describe("fisheryates", () => {
    it("test", () => {
      const entropy = Buffer.allocUnsafe(32).fill(255);
      const arr = [0, 1, 2, 3, 4, 5, 6, 7];
      expect(FisherYatesH(arr, entropy as Hash)).deep.eq([
        1, 2, 6, 0, 7, 4, 3, 5,
      ]);
    });
  });
}
