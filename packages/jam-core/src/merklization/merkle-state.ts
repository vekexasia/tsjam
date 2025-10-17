import { IdentityMap } from "@/data-structures/identity-map";
import type { JamStateImpl } from "@/impls/jam-state-impl";
import { bit, E_4_int, encodeWithCodec } from "@tsjam/codec";
import { Hashing } from "@tsjam/crypto";
import type {
  ByteArrayOfLength,
  Hash,
  ServiceIndex,
  StateKey,
  StateRootHash,
  u32,
} from "@tsjam/types";
import { serviceAccountDataCodec } from "./state-codecs";
import { stateKey } from "./utils";

// utility types
export type MerkleStateMap = IdentityMap<StateKey, 31, Buffer>;
export type NonEmptyTrieNode = MerkleStateTrieNode & {
  identifier: ByteArrayOfLength<64>;
};
export type MerkleBranchNode = NonEmptyTrieNode & {
  identifier: ByteArrayOfLength<64>;
  left: MerkleStateTrieNode;
  right: MerkleStateTrieNode;
  leaves: MerkleStateTrieNode[];
};
export type MerkleLeafNode = NonEmptyTrieNode & {
  identifier: ByteArrayOfLength<64>;
  value: Uint8Array;
  key: StateKey;
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
          ...serviceAccount,
          itemInStorage: serviceAccount.itemInStorage(),
          totalOctets: serviceAccount.totalOctets(),
        }),
      );

      for (const [h, p] of serviceAccount.preimages) {
        const k = MerkleState.preimageKey(serviceIndex, h);
        toRet.set(k, p);
      }

      for (const [stateKey, v] of serviceAccount.merkleStorage.entries()) {
        toRet.set(stateKey, v);
      }
    }

    return new MerkleState(toRet);
  }

  static preimageKey(serviceIndex: ServiceIndex, h: Hash): StateKey {
    const pref = encodeWithCodec(E_4_int, <u32>(2 ** 32 - 2));
    const k = stateKey(serviceIndex, Buffer.concat([pref, h]));
    return k;
  }
}

export class MerkleStateTrieNode {
  // either B or L output
  public identifier?: ByteArrayOfLength<64>;
  public readonly hash: Hash;
  public left?: MerkleStateTrieNode;
  public right?: MerkleStateTrieNode;
  public key?: StateKey;
  public value?: Uint8Array;
  public leaves?: MerkleLeafNode[];

  constructor(hash: Hash) {
    this.hash = hash;
  }

  isBranch(): this is MerkleBranchNode {
    return (
      typeof this.left !== "undefined" && typeof this.right !== "undefined"
    );
  }

  isEmptyLeaf(): this is MerkleLeafNode {
    return typeof this.identifier !== "undefined";
  }

  /**
   * Traverses the trie for the given bit encoded key.
   * Returns the nodes on the path.
   * used in jam-np
   */
  traverseTo(
    origKey: ByteArrayOfLength<64>,
    traversingKey: bit[] = bits(origKey),
  ): NonEmptyTrieNode[] {
    if (traversingKey.length === 0) {
      return [this as NonEmptyTrieNode];
    }
    if (typeof this.identifier === "undefined") {
      // empty node.
      return [];
    }
    if (Buffer.compare(this.identifier, origKey) === 0) {
      return [this as NonEmptyTrieNode];
    }
    if (!this.isBranch()) {
      return [this as NonEmptyTrieNode];
    }
    if (traversingKey[0] === 0) {
      return [this as NonEmptyTrieNode].concat(
        this.left.traverseTo(origKey, traversingKey.slice(1)),
      );
    } else {
      return [this as NonEmptyTrieNode].concat(
        this.right.traverseTo(origKey, traversingKey.slice(1)),
      );
    }
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
    toRet.leaves = [];
    if (left.isBranch()) {
      toRet.leaves.push(...left.leaves);
    } else if (!left.isEmptyLeaf()) {
      toRet.leaves.push(left as MerkleLeafNode);
    }
    if (right.isBranch()) {
      toRet.leaves.push(...right.leaves);
    } else if (!right.isEmptyLeaf()) {
      toRet.leaves.push(right as MerkleLeafNode);
    }

    return toRet;
  }

  static leaf(key: StateKey, value: Uint8Array): MerkleLeafNode {
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
    toRet.key = key;
    return toRet as MerkleLeafNode;
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
    it("traverse", () => {
      const m = new Map<bit[], [StateKey, Uint8Array]>();
      function build(n: number) {
        const stateKey = Buffer.from([n]) as StateKey;
        return {
          bits: bits(stateKey),
          v: [stateKey, stateKey],
          leaf: MerkleStateTrieNode.leaf(stateKey, stateKey),
        } as { bits: bit[]; v: [StateKey, Uint8Array]; leaf: MerkleLeafNode };
      }
      const _000 = build(0b00000000);

      m.set(_000.bits, _000.v);
      const _001 = build(0b00100000);
      m.set(_001.bits, _001.v);

      const _100 = build(0b10000000);
      m.set(_100.bits, _100.v);

      const res = MerkleState.buildTrie(m);

      // 000
      expect(
        res
          .traverseTo(_000.leaf.identifier, _000.bits)
          .map((a) => a.identifier)
          .pop()
          ?.toString("hex"),
      ).toStrictEqual(_000.leaf.identifier?.toString("hex"));

      // 001
      expect(
        res
          .traverseTo(_001.leaf.identifier, _001.bits)
          .map((a) => a.identifier)
          .pop()
          ?.toString("hex"),
      ).toStrictEqual(_001.leaf.identifier.toString("hex"));

      // 100
      expect(
        res
          .traverseTo(_100.leaf.identifier, _100.bits)
          .map((a) => a.identifier)
          .pop()
          ?.toString("hex"),
      ).toStrictEqual(_100.leaf.identifier.toString("hex"));

      // 010 not found
      // [root, left(branch(000, 001)]
      const _010 = build(0b01000000);
      const t = res.traverseTo(_010.leaf.identifier, _010.bits);
      expect(t.length).toBe(2);
      expect(t[0].identifier).toStrictEqual(res.identifier);
      expect(t[1].isBranch()).toBe(true);
      expect(t[1].left?.isBranch()).toStrictEqual(true);
      expect(t[1].left?.left?.identifier).toStrictEqual(_000.leaf.identifier);
      expect(t[1].left?.right?.identifier).toStrictEqual(_001.leaf.identifier);
      expect(t[1].right?.identifier).toStrictEqual(EMPTYNODE.identifier);

      // 110 not found
      // should be [root, right(100)]
      const _110 = build(0b11000000);
      const t2 = res.traverseTo(_110.leaf.identifier, _110.bits);
      expect(t2.length).toBe(2);
      expect(t2[0].identifier).toStrictEqual(res.identifier);
      expect(t2[1].identifier).toStrictEqual(res.right?.identifier);
      expect(t2[1].identifier).toStrictEqual(_100.leaf.identifier);
    });
  });
}
