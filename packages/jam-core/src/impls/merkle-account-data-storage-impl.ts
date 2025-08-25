import { IdentityMap, IdentityMapCodec } from "@/data-structures/identity-map";
import { stateKey } from "@/merklization/utils";
import {
  asCodec,
  BaseJamCodecable,
  codec,
  createArrayLengthDiscriminator,
  E_4_int,
  encodeWithCodec,
  JamCodecable,
  LengthDiscrimantedIdentityCodec,
  xBytesCodec,
} from "@tsjam/codec";
import type {
  Hash,
  IServiceAccountRequests,
  IServiceAccountStorage,
  ServiceIndex,
  StateKey,
  Tagged,
  u32,
  u64,
  UpToSeq,
} from "@tsjam/types";
import { SlotImpl } from "./slot-impl";
import { compareUint8Arrays } from "uint8array-extras";

type StorageKey = Tagged<StateKey, "storage">;
type RequestKey = Tagged<StateKey, "request">;

const computeStorageKey = (serviceIndex: ServiceIndex, key: Uint8Array) => {
  const k = new Uint8Array(4 + key.length);
  E_4_int.encode(<u32>(2 ** 32 - 1), k);
  k.set(key, 4);
  return <StorageKey>stateKey(serviceIndex, k);
};

/** computes a_l state key */
const computeRequestKey = (
  serviceIndex: ServiceIndex,
  hash: Hash,
  length: u32,
) => {
  const k = new Uint8Array([...encodeWithCodec(E_4_int, length), ...hash]);
  return <RequestKey>stateKey(serviceIndex, k);
};
const singleRequestCodec = createArrayLengthDiscriminator<
  UpToSeq<SlotImpl, 3>,
  SlotImpl
>(asCodec(SlotImpl));

/**
 * stores both a_s and a_l
 * original issue https://github.com/gavofyork/graypaper/issues/436
 *
 */
@JamCodecable()
export class MerkleServiceAccountStorageImpl extends BaseJamCodecable {
  @codec(
    IdentityMapCodec(xBytesCodec(31), LengthDiscrimantedIdentityCodec, {
      key: "stateKey",
      value: "blob",
    }),
  )
  private _storage: IdentityMap<StorageKey | RequestKey, 31, Uint8Array> =
    new IdentityMap();

  /**
   * @param serviceIndex - the index of the service account
   * @param octets - $(0.7.1 - 9.8)
   */
  constructor(
    private serviceIndex: ServiceIndex,
    public octets: u64 = <u64>0n,
    public items: u32 = <u32>0,
  ) {
    super();
  }

  setFromStateKey(stateKey: StateKey, value: Uint8Array) {
    this._storage.set(stateKey as StorageKey | RequestKey, value);
  }

  entries(): IterableIterator<[StorageKey | RequestKey, Uint8Array]> {
    return Array.from(this._storage.entries())
      .map(([stateKey, value]): [StorageKey | RequestKey, Uint8Array] => [
        stateKey,
        value,
      ])
      .values();
  }

  get storage(): IServiceAccountStorage {
    const toRet = <IServiceAccountStorage>{
      set: (key, value) => {
        const innerKey = computeStorageKey(this.serviceIndex, key);
        toRet.delete(key);
        this._storage.set(innerKey, value);

        this.items = <u32>(this.items + 1);
        this.octets = <u64>(
          (this.octets + 34n + BigInt(value.length) + BigInt(key.length))
        );
      },
      get: (key) => {
        const internalKey = computeStorageKey(this.serviceIndex, key);
        return this._storage.get(internalKey);
      },
      has: (key) => {
        const internalKey = computeStorageKey(this.serviceIndex, key);
        return this._storage.has(internalKey);
      },
      delete: (key) => {
        const innerKey = computeStorageKey(this.serviceIndex, key);
        if (this._storage.has(innerKey)) {
          const curValue = this._storage.get(innerKey)!;
          this.items = <u32>(this.items - 1);
          this.octets = <u64>(
            (this.octets - 34n - BigInt(curValue.length) - BigInt(key.length))
          );
          return this._storage.delete(innerKey);
        }
        return false;
      },
    };

    return toRet;
  }

  get requests(): IServiceAccountRequests {
    const innerGet = (key: RequestKey) => {
      const b = this._storage.get(key);
      if (!b) {
        return undefined;
      }
      return singleRequestCodec.decode(b).value;
    };

    const toRet = <IServiceAccountRequests>{
      set: (hash, length, value: UpToSeq<SlotImpl, 3>) => {
        const key = computeRequestKey(this.serviceIndex, hash, length);
        // handles all the items and octets
        toRet.delete(hash, length);
        // const curValue = innerGet(key);
        // // subtract old value length if any
        // this.items = <u32>(this.items - 2 * (curValue?.length ?? 0));
        // this.octets = <u64>(
        //   (this.octets -
        //     BigInt(81 + length) * (typeof curValue !== "undefined" ? 1n : 0n))
        // );

        this._storage.set(key, encodeWithCodec(singleRequestCodec, value));

        this.items = <u32>(this.items + 2);
        this.octets = <u64>(this.octets + BigInt(81) + BigInt(length));
      },
      get: (hash, length) => {
        const key = computeRequestKey(this.serviceIndex, hash, length);
        return Object.freeze(innerGet(key));
      },
      has: (hash, length) => {
        const key = computeRequestKey(this.serviceIndex, hash, length);
        return this._storage.has(key);
      },
      delete: (hash, length) => {
        const key = computeRequestKey(this.serviceIndex, hash, length);
        if (this._storage.has(key)) {
          this.items = <u32>(this.items - 2);
          this.octets = <u64>(this.octets - BigInt(length + 81));
          return this._storage.delete(key);
        }
        return false;
      },
    };

    return toRet;
  }

  clone() {
    const toRet = new MerkleServiceAccountStorageImpl(
      this.serviceIndex,
      this.octets,
      this.items,
    );

    toRet._storage = this._storage.clone();
    return toRet;
  }

  equals(other: MerkleServiceAccountStorageImpl) {
    return (
      this === other ||
      [...this._storage.entries()].every(([k, v]) => {
        return (
          other._storage.has(k) &&
          compareUint8Arrays(other._storage.get(k)!, v) === 0
        );
      })
    );
  }
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  const { randomHash } = await import("@/test/utils.js");

  describe("merkleStorage", () => {
    describe("storage", () => {
      describe("delete", () => {
        it("should do nothing if key does not exist", () => {
          const x = new MerkleServiceAccountStorageImpl(
            <ServiceIndex>0,
            <u64>69n,
            <u32>4,
          );
          const key = randomHash();
          expect(x.storage.delete(key)).toBe(false);
          expect(x.items).toBe(4);
          expect(x.octets).toBe(69n);
        });
        it("should remove existing key and update items and octets", () => {
          const x = new MerkleServiceAccountStorageImpl(
            <ServiceIndex>0,
            <u64>69n,
            <u32>4,
          );
          const key = randomHash();
          const value = new Uint8Array([1, 2, 3]);
          x.storage.set(key, value);
          expect(x.storage.has(key)).toBe(true);
          expect(x.items).not.toBe(4);
          expect(x.octets).not.toBe(69n);

          expect(x.storage.delete(key)).toBe(true);

          expect(x.items).toBe(4);
          expect(x.octets).toBe(69n);
          expect(x.storage.has(key)).toBe(false);
        });
      });
      describe("set", () => {
        it("new set should add to items and octets", () => {
          const initialoctets = <u64>69n;
          const initialitems = <u32>4;
          const x = new MerkleServiceAccountStorageImpl(
            <ServiceIndex>0,
            initialoctets,
            initialitems,
          );
          const key = randomHash();
          const value = new Uint8Array([1, 2, 3]);
          x.storage.set(key, value);
          expect(x.items).toBe(<u32>(initialitems + 1));
          expect(Number(x.octets)).toBe(
            Number(initialoctets) + 34 + key.length + value.length,
          );
        });
        it("update set should update items and octets", () => {
          const x = new MerkleServiceAccountStorageImpl(
            <ServiceIndex>0,
            <u64>69n,
            <u32>4,
          );
          const key = randomHash();
          const value = new Uint8Array([1, 2, 3]);
          x.storage.set(key, value);

          const octetsBefore = x.octets;
          const itemsBefore = x.items;

          x.storage.set(key, new Uint8Array([1, 2, 3, 4]));

          expect(x.items).toBe(itemsBefore);
          expect(x.octets).toBe(octetsBefore + 1n);
        });
      });
    });
    describe("requests", () => {
      describe("delete", () => {
        it("should do nothing if key does not exist", () => {
          const x = new MerkleServiceAccountStorageImpl(
            <ServiceIndex>0,
            <u64>69n,
            <u32>4,
          );
          const hash = randomHash();
          const length = <u32>1000;
          expect(x.requests.delete(hash, length)).toBe(false);
          expect(x.items).toBe(4);
          expect(x.octets).toBe(69n);
        });
        it("should remove existing key and update items and octets", () => {
          const x = new MerkleServiceAccountStorageImpl(
            <ServiceIndex>0,
            <u64>69n,
            <u32>4,
          );
          const hash = randomHash();
          const length = <u32>1000;
          const value = <UpToSeq<SlotImpl, 3>>[new SlotImpl(<u32>1)];
          x.requests.set(hash, length, value);
          expect(x.items).not.toBe(4);
          expect(x.octets).not.toBe(69n);
          expect(x.requests.delete(hash, length)).toBe(true);
          expect(x.items).toBe(4);
          expect(x.octets).toBe(69n);
        });
      });
      describe("set", () => {
        it("new set should add to items and octets", () => {
          const initialoctets = <u64>69n;
          const initialitems = <u32>4;
          const x = new MerkleServiceAccountStorageImpl(
            <ServiceIndex>0,
            initialoctets,
            initialitems,
          );
          const hash = randomHash();
          const value = <UpToSeq<SlotImpl, 3>>[new SlotImpl(<u32>1)];
          x.requests.set(hash, <u32>1000, value);
          expect(x.items).toBe(<u32>(initialitems + value.length * 2));
          expect(x.octets).toBe(<u64>(initialoctets + 1000n + 81n));
        });
        it("update set should update items and octets", () => {
          const x = new MerkleServiceAccountStorageImpl(
            <ServiceIndex>0,
            <u64>69n,
            <u32>4,
          );
          const hash = randomHash();
          const value = <UpToSeq<SlotImpl, 3>>[new SlotImpl(<u32>1)];
          x.requests.set(hash, <u32>1000, value);

          const octetsBefore = x.octets;
          const itemsBefore = x.items;
          value.push(new SlotImpl(<u32>2));
          x.requests.set(hash, <u32>1000, value);

          expect(x.items).toBe(itemsBefore);
          expect(x.octets).toBe(octetsBefore);
        });
      });
    });
  });
}
