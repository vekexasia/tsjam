import { IdentityMap } from "@/data-structures/identity-map";
import { JamStateImpl } from "@/impls/jam-state-impl";
import { SlotImpl } from "@/impls/slot-impl";
import {
  E_4_int,
  bit,
  createArrayLengthDiscriminator,
  encodeWithCodec,
} from "@tsjam/codec";
import { Hashing } from "@tsjam/crypto";
import {
  ByteArrayOfLength,
  Hash,
  StateKey,
  StateRootHash,
  u32,
} from "@tsjam/types";
import { serviceAccountDataCodec } from "./state-codecs";
import { stateKey } from "./utils";

/**
 * Merkelize state
 * `Mσ`
 * $(0.7.1 - D.5)
 */
export const merkelizeState = (state: JamStateImpl): StateRootHash => {
  const stateMap = merkleStateMap(state);
  return M_fn(
    new Map(
      [...stateMap.entries()].map(([k, v]) => {
        return [bits(k), [k, v]];
      }),
    ),
  ) as StateRootHash;
};

export const bits = (ar: Uint8Array): bit[] => {
  const a = [...ar]
    .map((a) =>
      a
        .toString(2)
        .padStart(8, "0")
        .split("")
        .map((a) => parseInt(a)),
    )
    .flat();
  return a as bit[];
};

// $(0.7.1 - D.3)
const B_fn = (l: Hash, r: Hash): ByteArrayOfLength<64> => {
  return new Uint8Array([
    l[0] & 0b01111111,
    ...l.subarray(1),
    ...r,
  ]) as ByteArrayOfLength<64>;
};

// $(0.7.1 - D.4) | implementation avoids using bits()
const L_fn = (
  k: ByteArrayOfLength<31>,
  v: Uint8Array,
): ByteArrayOfLength<64> => {
  if (v.length <= 32) {
    return new Uint8Array([
      0b10000000 + v.length,
      ...k,
      ...v,
      ...new Array(32 - v.length).fill(0),
    ]) as ByteArrayOfLength<64>;
  } else {
    return new Uint8Array([
      0b11000000,
      ...k,
      ...Hashing.blake2b(v),
    ]) as ByteArrayOfLength<64>;
  }
};

// $(0.7.1 - D.6)
export const M_fn = (d: Map<bit[], [StateKey, Uint8Array]>): Hash => {
  if (d.size === 0) {
    return <Hash>new Uint8Array(32).fill(0);
  } else if (d.size === 1) {
    const [[k, v]] = d.values();
    return Hashing.blake2b(L_fn(k, v));
  } else {
    const l = new Map(
      [...d.entries()]
        .filter(([k]) => k[0] === 0)
        .map(([k, v]) => [k.slice(1), v]),
    );
    const r = new Map(
      [...d.entries()]
        .filter(([k]) => k[0] === 1)
        .map(([k, v]) => [k.slice(1), v]),
    );
    return Hashing.blake2b(B_fn(M_fn(l), M_fn(r)));
  }
};

/*
 * `T(σ)`
 * $(0.7.1 - D.2)
 */
export const merkleStateMap = (state: JamStateImpl) => {
  const toRet: IdentityMap<StateKey, 31, Uint8Array> = new IdentityMap();

  toRet.set(stateKey(1), state.authPool.toBinary());

  toRet.set(stateKey(2), state.authQueue.toBinary());

  // β
  toRet.set(stateKey(3), state.beta.toBinary());

  toRet.set(stateKey(4), state.safroleState.toBinary());

  // 5
  toRet.set(stateKey(5), state.disputes.toBinary());

  // 6
  toRet.set(stateKey(6), state.entropy.toBinary());

  // 7
  toRet.set(stateKey(7), state.iota.toBinary());

  // 8
  toRet.set(stateKey(8), state.kappa.toBinary());

  // 9
  toRet.set(stateKey(9), state.lambda.toBinary());

  // 10
  toRet.set(stateKey(10), state.rho.toBinary());

  // 11
  toRet.set(stateKey(11), state.slot.toBinary());

  // 12
  toRet.set(stateKey(12), state.privServices.toBinary());

  // 13
  toRet.set(stateKey(13), state.statistics.toBinary());

  // 14
  toRet.set(stateKey(14), state.accumulationQueue.toBinary());

  // 15 - accumulationHistory
  toRet.set(stateKey(15), state.accumulationHistory.toBinary());

  // 16 thetha
  toRet.set(stateKey(16), state.mostRecentAccumulationOutputs.toBinary());

  for (const [serviceIndex, serviceAccount] of state.serviceAccounts.elements) {
    toRet.set(
      stateKey(255, serviceIndex),
      encodeWithCodec(serviceAccountDataCodec, {
        zeroPrefix: 0n,
        ...serviceAccount,
        itemInStorage: serviceAccount.itemInStorage(),
        totalOctets: serviceAccount.totalOctets(),
      }),
    );

    for (const [h, p] of serviceAccount.preimages) {
      const pref = encodeWithCodec(E_4_int, <u32>(2 ** 32 - 2));
      toRet.set(stateKey(serviceIndex, new Uint8Array([...pref, ...h])), p);
    }

    for (const [stateKey, v] of serviceAccount.merkleStorage.entries()) {
      toRet.set(stateKey, v);
    }
  }

  return toRet;
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  const fs = await import("fs");
  describe("merkle", () => {
    it("test from vectors", () => {
      const r: Array<{ input: Record<string, string>; output: string }> =
        JSON.parse(
          fs.readFileSync(
            new URL(`../../test/fixtures/trie.json`, import.meta.url).pathname,
            "utf8",
          ),
        );
      for (const t of r) {
        const m = new Map<bit[], [StateKey, Uint8Array]>();
        for (const key in t.input) {
          const keyBuf = Buffer.from(`${key}`, "hex").subarray(
            0,
            31,
          ) as Uint8Array as StateKey;
          const keyBits = bits(keyBuf);
          //const keyHash: Hash = bytesToBigInt(keyBuf);
          const value = Buffer.from(t.input[key], "hex");
          m.set(keyBits, [keyBuf, value]);
        }
        const res = M_fn(m);
        expect(Buffer.from(res).toString("hex")).eq(t.output);
      }
    });
  });
}
