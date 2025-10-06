import { IdentityMap } from "@/data-structures/identity-map";
import type { JamStateImpl } from "@/impls/jam-state-impl";
import { bit, E_4_int, encodeWithCodec } from "@tsjam/codec";
import { Hashing } from "@tsjam/crypto";
import type {
  ByteArrayOfLength,
  Hash,
  StateKey,
  StateRootHash,
  u32,
} from "@tsjam/types";
import { serviceAccountDataCodec } from "./state-codecs";
import { stateKey } from "./utils";

// utility types
export type MerkleStateMap = IdentityMap<StateKey, 31, Buffer>;
export type MerkleBranchNode = MerkleStateTrieNode & {
  identifier: ByteArrayOfLength<64>;
  left: MerkleStateTrieNode;
  right: MerkleStateTrieNode;
};
export type MerkleLeafNode = MerkleStateTrieNode & {
  identifier: ByteArrayOfLength<64>;
  value: Uint8Array;
};

/**
 * Holds the merklizedState
 * with the merkle state map and the trie that contains the
 * stateRootHash
 */
export class MerkleState {
  public map: MerkleStateMap;
  public trie!: MerkleStateTrieNode;
  constructor(map: MerkleStateMap) {
    this.map = map;

    // $(0.7.1 - D.5) | `Mσ`
    this.trie = MerkleState.buildTrie(
      new Map(
        [...map.entries()].map(([k, v]) => {
          return [bits(k), [k, v]];
        }),
      ),
    );
  }

  get root(): StateRootHash {
    return this.trie.hash as StateRootHash;
  }

  // $(0.7.1 - D.6) - some of hashes are handled elsewhere
  public static buildTrie(
    d: Map<bit[], [StateKey, Uint8Array]>,
  ): MerkleStateTrieNode {
    if (d.size === 0) {
      return EMPTYNODE;
    } else if (d.size === 1) {
      const [[k, v]] = d.values();
      return MerkleStateTrieNode.leaf(k, v);
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
      return MerkleStateTrieNode.branch(this.buildTrie(l), this.buildTrie(r));
    }
  }

  /**
   * creates an instance of MerkleState
   * `T(σ)`
   * $(0.7.0 - D.2)
   */
  public static fromState(state: JamStateImpl): MerkleState {
    const toRet: MerkleStateMap = new IdentityMap();

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

    for (const [serviceIndex, serviceAccount] of state.serviceAccounts
      .elements) {
      const sk = stateKey(255, serviceIndex);
      toRet.set(
        sk,
        encodeWithCodec(serviceAccountDataCodec, {
          zeroPrefix: 0,
          ...serviceAccount,
          itemInStorage: serviceAccount.itemInStorage(),
          totalOctets: serviceAccount.totalOctets(),
        }),
      );

      for (const [h, p] of serviceAccount.preimages) {
        const pref = encodeWithCodec(E_4_int, <u32>(2 ** 32 - 2));
        const k = stateKey(serviceIndex, Buffer.concat([pref, h]));
        toRet.set(k, p);
      }

      for (const [stateKey, v] of serviceAccount.merkleStorage.entries()) {
        toRet.set(stateKey, v);
      }
    }

    return new MerkleState(toRet);
  }
}

export class MerkleStateTrieNode {
  // either B or L output
  public identifier?: ByteArrayOfLength<64>;
  public readonly hash: Hash;
  public left?: MerkleStateTrieNode;
  public right?: MerkleStateTrieNode;
  public value?: Uint8Array;

  constructor(hash: Hash) {
    this.hash = hash;
  }

  isBranch(): this is MerkleBranchNode {
    return (
      typeof this.left !== "undefined" && typeof this.right !== "undefined"
    );
  }

  /**
   * $(0.7.1 - D.3)
   */
  static branch(left: MerkleStateTrieNode, right: MerkleStateTrieNode) {
    const identifier = Buffer.concat([
      Buffer.from([left.hash[0] & 0b01111111]),
      left.hash.subarray(1),
      right.hash,
    ]) as ByteArrayOfLength<64>;

    // $(0.7.1 - D.6)
    const hash = Hashing.blake2b(identifier);
    const toRet = new MerkleStateTrieNode(hash);
    toRet.identifier = identifier;
    toRet.left = left;
    toRet.right = right;
    return toRet;
  }

  static leaf(key: StateKey, value: Uint8Array) {
    let identifier: ByteArrayOfLength<64>;
    if (value.length <= 32) {
      identifier = Buffer.concat([
        Buffer.from([0b10000000 + value.length]),
        key,
        value,
        Buffer.alloc(32 - value.length),
      ]) as ByteArrayOfLength<64>;
    } else {
      identifier = Buffer.concat([
        Buffer.from([0b11000000]),
        key,
        Hashing.blake2b(value),
      ]) as ByteArrayOfLength<64>;
    }

    // $(0.7.1 - D.6)
    const hash = Hashing.blake2b(identifier);

    const toRet = new MerkleStateTrieNode(hash);
    toRet.identifier = identifier;
    toRet.value = value;
    return toRet;
  }
}

// utility stuff
const EMPTYNODE = new MerkleStateTrieNode(<Hash>Buffer.alloc(32));
const bits = (ar: Uint8Array): bit[] => {
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
        const res = MerkleState.buildTrie(m);
        expect(Buffer.from(res.hash).toString("hex")).eq(t.output);
      }
    });
  });
}
