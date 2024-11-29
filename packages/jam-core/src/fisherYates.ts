import { E_4_int, encodeWithCodec } from "@tsjam/codec";
import { Hashing } from "@tsjam/crypto";
import { Hash, u32 } from "@tsjam/types";
import { bigintToBytes } from "@tsjam/utils";

/**
 * $(0.5.0 - F.1)
 */
export const FisherYates = <T>(arr: T[], entropies: number[]) => {
  const sliced = arr.slice();
  let l = sliced.length;
  let index = 0;
  const toRet = <T[]>[];
  while (l > 0) {
    index = entropies[index] % l;
    toRet.push(sliced[index]);
    sliced[index] = sliced[l - 1];
    l--;
  }
  return toRet;
};

/**
 * $(0.5.0 - F.3)
 */
export const FisherYatesH = <T>(arr: T[], entropy: Hash) => {
  return FisherYates(arr, Q(arr.length, entropy));
};

/**
 * $(0.5.0 - F.2)
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
