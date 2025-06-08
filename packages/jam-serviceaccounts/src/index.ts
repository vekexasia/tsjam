import {
  SERVICE_ADDITIONAL_BALANCE_PER_ITEM,
  SERVICE_ADDITIONAL_BALANCE_PER_OCTET,
  SERVICE_MIN_BALANCE,
} from "@tsjam/constants";
import {
  Gas,
  PVMProgramCode,
  IServiceAccountStorage,
  ServiceAccount,
  u32,
  u64,
  CodeHash,
  ServiceIndex,
  StateKey,
  Hash,
  Tagged,
  UpToSeq,
  Tau,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import {
  createCodec,
  E_4_int,
  IdentityCodec,
  JamCodec,
  LengthDiscrimantedIdentity,
} from "@tsjam/codec";
import { stateKey } from "@tsjam/merklization";

export const serviceMetadataCodec = createCodec<{
  code: PVMProgramCode;
  metadata: Uint8Array;
}>([
  ["metadata", LengthDiscrimantedIdentity],
  ["code", IdentityCodec as unknown as JamCodec<PVMProgramCode>],
]);

export class ServiceAccountStorageImpl implements IServiceAccountStorage {
  private storage: Map<StateKey, { keyLength: number; value: Uint8Array }> =
    new Map();
  constructor(private serviceIndex: ServiceIndex) {}

  toMerkleKey(key: Uint8Array): StateKey {
    const k = new Uint8Array(4 + key.length);
    E_4_int.encode(<u32>(2 ** 32 - 1), k);
    k.set(key, 4);

    return stateKey(this.serviceIndex, k);
  }

  delete(key: Uint8Array): boolean {
    return this.storage.delete(this.toMerkleKey(key));
  }

  has(key: Uint8Array): boolean {
    return this.storage.has(this.toMerkleKey(key));
  }

  get(key: Uint8Array): Uint8Array | undefined {
    return this.storage.get(this.toMerkleKey(key))?.value;
  }

  set(key: Uint8Array, value: Uint8Array): void {
    this.storage.set(this.toMerkleKey(key), { keyLength: key.length, value });
  }

  setFromStateKey(stateKey: StateKey, keyLength: number, value: Uint8Array) {
    this.storage.set(stateKey, { keyLength, value });
  }

  entries(): IterableIterator<
    [{ stateKey: StateKey; keyLength: number }, Uint8Array]
  > {
    return Array.from(this.storage.entries())
      .map(
        ([stateKey, { keyLength, value }]): [
          { stateKey: StateKey; keyLength: number },
          Uint8Array,
        ] => [{ stateKey, keyLength }, value],
      )
      .values();
  }

  get size(): number {
    return this.storage.size;
  }

  clone() {
    const clone = new ServiceAccountStorageImpl(this.serviceIndex);
    clone.storage = new Map(this.storage);
    return clone;
  }
}

export class ServiceAccountImpl implements ServiceAccount {
  preimage_p: ServiceAccount["preimage_p"] = new Map();
  preimage_l: ServiceAccount["preimage_l"] = new Map();
  gratisStorageOffset!: u64;
  codeHash!: CodeHash;
  balance!: u64;
  minGasAccumulate!: Gas;
  minGasOnTransfer!: Gas;
  creationTimeSlot!: u32;
  lastAccumulationTimeSlot!: u32;
  parentService!: ServiceIndex;

  constructor(public storage: IServiceAccountStorage) {}

  /**
   * `a_i` - total number of preimage lookup dictionaries and
   * $(0.6.7 - 9.8)
   */
  itemInStorage(): u32 {
    return toTagged(2 * this.preimage_l.size + this.storage.size);
  }

  /**
   * `a_o` - total octets in the preimage lookup and storage
   * $(0.6.6 - 9.8)
   */
  totalOctets(): u64 {
    let sum: bigint = 0n;

    for (const zmap of this.preimage_l.values()) {
      for (const length of zmap.keys()) {
        sum += BigInt(length) + 81n;
      }
    }
    for (const [{ keyLength }, z] of this.storage.entries()) {
      sum += 34n + BigInt(keyLength) + BigInt(z.length);
    }

    return sum as u64;
  }

  /**
   * `a_t`
   * compute the gas threshold of a service account
   * $(0.6.6 - 9.8)
   */
  gasThreshold(): Gas {
    return <Gas>(SERVICE_MIN_BALANCE + // Bs
      SERVICE_ADDITIONAL_BALANCE_PER_ITEM * BigInt(this.itemInStorage()) + // BI*ai
      SERVICE_ADDITIONAL_BALANCE_PER_OCTET * this.totalOctets() - // BL*ao
      this.gratisStorageOffset); // - af
  }

  private decodedMetaAndCode?: {
    code: PVMProgramCode | undefined;
    metadata: Uint8Array | undefined;
  };

  /**
   *
   * computes bold_c and bold_m
   * $(0.6.6 - 9.4)
   */
  private decodeMetaAndCode(): void {
    const codePreimage = this.preimage_p.get(this.codeHash);
    if (typeof codePreimage === "undefined") {
      this.decodedMetaAndCode = { code: undefined, metadata: undefined };
    } else {
      // TODO: handle decoding errors
      this.decodedMetaAndCode = serviceMetadataCodec.decode(
        this.preimage_p.get(this.codeHash)!,
      ).value;
    }
  }

  metadata(): Uint8Array | undefined {
    if (typeof this.decodedMetaAndCode === "undefined") {
      this.decodeMetaAndCode();
    }
    return this.decodedMetaAndCode!.metadata;
  }

  code(): PVMProgramCode | undefined {
    if (typeof this.decodedMetaAndCode === "undefined") {
      this.decodeMetaAndCode();
    }
    return this.decodedMetaAndCode!.code;
  }
}
