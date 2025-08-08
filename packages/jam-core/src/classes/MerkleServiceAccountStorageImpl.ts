import { IdentityMap } from "@/data_structures/identityMap";
import { stateKey } from "@/merklization/utils";
import { E_4_int } from "@tsjam/codec";
import {
  IServiceAccountStorage,
  ServiceIndex,
  StateKey,
  u32,
  u64,
} from "@tsjam/types";

const computeStateKey = (serviceIndex: ServiceIndex, key: Uint8Array) => {
  const k = new Uint8Array(4 + key.length);
  E_4_int.encode(<u32>(2 ** 32 - 1), k);
  k.set(key, 4);
  return stateKey(serviceIndex, k);
};

export class MerkleServiceAccountStorageImpl implements IServiceAccountStorage {
  private storage: IdentityMap<StateKey, 31, Uint8Array> = new IdentityMap();

  /**
   * @param serviceIndex - the index of the service account
   * @param octets - $(0.7.1 - 9.8)
   */
  constructor(
    private serviceIndex: ServiceIndex,
    public octets: u64 = <u64>0n,
  ) {}

  toInternalKey(key: Uint8Array): StateKey {
    return computeStateKey(this.serviceIndex, key);
  }

  /**
   * Returns the number of octects to be accounted for the key
   * if it does not exist it returns 0
   */
  octetsForKey(key: Uint8Array): u64 {
    const internalKey = this.toInternalKey(key);
    if (!this.storage.has(internalKey)) {
      return <u64>0n; // key does not exist, so no octets
    }
    const value = this.storage.get(internalKey)!;

    return <u64>(34n + BigInt(key.length) + BigInt(value.length));
  }

  delete(key: Uint8Array): boolean {
    this.octets = <u64>(this.octets - this.octetsForKey(key));
    return this.storage.delete(this.toInternalKey(key));
  }

  has(key: Uint8Array): boolean {
    return this.storage.has(this.toInternalKey(key));
  }

  get(key: Uint8Array): Uint8Array | undefined {
    return this.storage.get(this.toInternalKey(key));
  }

  set(key: Uint8Array, value: Uint8Array): void {
    const preOctetsValue = this.octetsForKey(key);
    this.storage.set(this.toInternalKey(key), value);
    const postOctetsValue = this.octetsForKey(key);
    this.octets = <u64>(this.octets + postOctetsValue - preOctetsValue);
  }

  setFromStateKey(stateKey: StateKey, value: Uint8Array) {
    this.storage.set(stateKey, value);
  }

  entries(): IterableIterator<[StateKey, Uint8Array]> {
    return Array.from(this.storage.entries())
      .map(([stateKey, value]): [StateKey, Uint8Array] => [stateKey, value])
      .values();
  }

  get size(): number {
    return this.storage.size;
  }
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("merkleStorage", () => {
    describe("octets", () => {
      it("should return original for empty storage", () => {
        let x = new MerkleServiceAccountStorageImpl(<ServiceIndex>0);
        expect(x.octets).toBe(0n);

        x = new MerkleServiceAccountStorageImpl(<ServiceIndex>0, <u64>100n);
        expect(x.octets).toBe(100n);
      });
      it("should return 37 for added key of length 1 and value of length 2", () => {
        const x = new MerkleServiceAccountStorageImpl(<ServiceIndex>0);
        x.set(new Uint8Array([1]), new Uint8Array([2, 3]));
        expect(x.octets).toBe(37n); // 34 + 1 + 2
      });
      it("should return 1 after removing the statekey", () => {
        const x = new MerkleServiceAccountStorageImpl(
          <ServiceIndex>0,
          <u64>38n,
        );

        x.setFromStateKey(
          computeStateKey(<ServiceIndex>0, new Uint8Array([1])),
          new Uint8Array([2, 3]),
        );
        expect(x.octets).toBe(38n);

        expect(x.delete(new Uint8Array([1]))).toBe(true);
        expect(x.octets).toBe(1n); // 34 + 1 + 2
      });
      it("should do nothing if we remove inexistent key", () => {
        const x = new MerkleServiceAccountStorageImpl(
          <ServiceIndex>0,
          <u64>38n,
        );
        expect(x.octets).toBe(38n);
        expect(x.delete(new Uint8Array([2]))).toBe(false);
        expect(x.octets).toBe(38n); // 34 + 1 + 2
      });
      it("should update octets when setting a new value for an existing key", () => {
        const x = new MerkleServiceAccountStorageImpl(
          <ServiceIndex>0,
          <u64>38n,
        );

        x.setFromStateKey(
          computeStateKey(<ServiceIndex>0, new Uint8Array([1])),
          new Uint8Array([2, 3]),
        );
        expect(x.octets).toBe(38n);
        x.set(new Uint8Array([1]), new Uint8Array([2, 3, 4]));
        expect(x.octets).toBe(39n);
      });
    });
  });
}
