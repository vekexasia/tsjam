import { IdentityMap, IdentityMapCodec } from "@/data-structures/identity-map";
import {
  BaseJamCodecable,
  codec,
  createCodec,
  eSubBigIntCodec,
  eSubIntCodec,
  IdentityCodec,
  JamCodec,
  JamCodecable,
  LengthDiscrimantedIdentityCodec,
  xBytesCodec,
} from "@tsjam/codec";
import {
  SERVICE_ADDITIONAL_BALANCE_PER_ITEM,
  SERVICE_ADDITIONAL_BALANCE_PER_OCTET,
  SERVICE_MIN_BALANCE,
} from "@tsjam/constants";
import type {
  Balance,
  CodeHash,
  Gas,
  Hash,
  IServiceAccountRequests,
  IServiceAccountStorage,
  PVMProgramCode,
  ServiceAccount,
  ServiceIndex,
  Tagged,
  u32,
  u64,
  UpToSeq,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import assert from "node:assert";
import { ConditionalExcept } from "type-fest";
import { SlotImpl } from "./slot-impl";
import { MerkleServiceAccountStorageImpl } from "./merkle-account-data-storage-impl";
import { compareUint8Arrays } from "uint8array-extras";

export const serviceMetadataCodec = createCodec<{
  metadata: Uint8Array;
  code: PVMProgramCode;
}>([
  ["metadata", LengthDiscrimantedIdentityCodec],
  ["code", IdentityCodec as unknown as JamCodec<PVMProgramCode>],
]);

/**
 * `A`
 * $(0.7.1 - 9.3)
 */
@JamCodecable()
export class ServiceAccountImpl
  extends BaseJamCodecable
  implements ServiceAccount
{
  @codec(
    IdentityMapCodec(xBytesCodec(32), LengthDiscrimantedIdentityCodec, {
      key: "key",
      value: "blob",
    }),
  )
  preimages: IdentityMap<Hash, 32, Uint8Array> = new IdentityMap();

  requests: IServiceAccountRequests;

  @eSubBigIntCodec(8)
  gratis!: Balance;

  @codec(xBytesCodec(32))
  codeHash!: CodeHash;

  @eSubBigIntCodec(8)
  balance!: Balance;

  @eSubBigIntCodec(8)
  minAccGas!: Gas;

  @eSubBigIntCodec(8)
  minMemoGas!: Gas;

  @codec(SlotImpl)
  created!: SlotImpl;

  @codec(SlotImpl)
  lastAcc!: SlotImpl;

  @eSubIntCodec(4)
  parent!: ServiceIndex;

  storage!: IServiceAccountStorage;

  @codec(MerkleServiceAccountStorageImpl)
  merkleStorage: MerkleServiceAccountStorageImpl;

  constructor(
    values: Omit<
      ConditionalExcept<ServiceAccountImpl, Function>,
      | "requests"
      | "storage"
      | "itemInStorage"
      | "totalOctets"
      | "gasThreshold"
      | "metadata"
      | "code"
      | "merkleStorage"
    >,
    // TODO: refactor to make this private
    merkleStorage: MerkleServiceAccountStorageImpl,
  ) {
    super();
    this.preimages = values.preimages;
    this.gratis = values.gratis;
    this.codeHash = values.codeHash;
    this.balance = values.balance;
    this.minAccGas = values.minAccGas;
    this.minMemoGas = values.minMemoGas;
    this.created = values.created;
    this.lastAcc = values.lastAcc;
    this.parent = values.parent;

    this.merkleStorage = merkleStorage;

    this.requests = this.merkleStorage.requests;
    this.storage = this.merkleStorage.storage;
  }

  /**
   * `a_i` - total number of preimage lookup dictionaries and
   * $(0.7.1 - 9.8)
   */
  itemInStorage(): u32 {
    return this.merkleStorage.items;
  }

  /**
   * `a_o` - total octets in the preimage lookup and storage
   * $(0.7.1 - 9.8)
   */
  totalOctets(): u64 {
    return this.merkleStorage.octets;
  }

  /**
   * `a_t`
   * compute the gas threshold of a service account
   * $(0.7.1 - 9.8)
   */
  gasThreshold(): Gas {
    const toRet = <Gas>(SERVICE_MIN_BALANCE + // Bs
      SERVICE_ADDITIONAL_BALANCE_PER_ITEM * BigInt(this.itemInStorage()) + // BI*ai
      SERVICE_ADDITIONAL_BALANCE_PER_OCTET * this.totalOctets() - // BL*ao
      this.gratis); // - af
    if (toRet < 0n) {
      return toTagged(0n);
    }
    return toRet;
  }

  private decodedMetaAndCode?: {
    code: PVMProgramCode | undefined;
    metadata: Uint8Array | undefined;
  };

  /**
   *
   * computes bold_c and bold_m
   * $(0.7.1 - 9.4)
   */
  private decodeMetaAndCode(): void {
    const codePreimage = this.preimages.get(this.codeHash);
    if (typeof codePreimage === "undefined") {
      this.decodedMetaAndCode = { code: undefined, metadata: undefined };
    } else {
      // TODO: handle decoding errors
      this.decodedMetaAndCode = serviceMetadataCodec.decode(
        this.preimages.get(this.codeHash)!,
      ).value;
    }
  }

  metadata(): Uint8Array | undefined {
    if (typeof this.decodedMetaAndCode === "undefined") {
      this.decodeMetaAndCode();
    }
    return this.decodedMetaAndCode!.metadata;
  }

  /**
   * `bold_c`
   */
  code(): PVMProgramCode | undefined {
    if (typeof this.decodedMetaAndCode === "undefined") {
      this.decodeMetaAndCode();
    }
    return this.decodedMetaAndCode!.code;
  }

  /**
   * $(0.7.1 - 12.41) | Y()
   */
  isPreimageSolicitedButNotYetProvided(hash: Hash, length: number): boolean {
    return (
      !this.preimages.has(hash) &&
      this.requests.get(hash, toTagged(length))?.length === 0
    );
  }

  /**
   * `Λ`
   * $(0.7.1 - 9.5 / 9.7)
   * @param a - the service account
   * @param tau - the timeslot for the lookup max -D old. not enforced here.
   * @param hash - the hash to look up
   */
  historicalLookup(
    tau: Tagged<SlotImpl, "-D">, // $(0.7.1 - 9.5) states that TAU is no older than D
    hash: Hash,
  ): Uint8Array | undefined {
    const ap = this.preimages.get(hash);
    if (
      typeof ap !== "undefined" &&
      I_Fn(<UpToSeq<SlotImpl, 3>>this.requests.get(hash, <u32>ap.length)!, tau)
    ) {
      return this.preimages.get(hash)!;
    }
  }

  clone() {
    return new ServiceAccountImpl(this, this.merkleStorage.clone());
  }

  equals(other: ServiceAccountImpl): boolean {
    return (
      this === other ||
      (this.balance === other.balance &&
        compareUint8Arrays(this.codeHash, other.codeHash) === 0 &&
        this.created.value === other.created.value &&
        this.gratis === other.gratis &&
        this.lastAcc.value === other.lastAcc.value &&
        this.minAccGas === other.minAccGas &&
        this.minMemoGas === other.minMemoGas &&
        this.parent === other.parent &&
        this.merkleStorage.equals(other.merkleStorage))
    );
  }
}
/**
 * Checks based on the length of the preimage and tau if it is valid
 */
const I_Fn = (l: UpToSeq<SlotImpl, 3>, t: SlotImpl) => {
  switch (l.length) {
    case 0: // requested but not provided
      return false;
    case 1: // avalaible since l[0]
      return l[0] <= t;
    case 2: // was prev available but not anymore since l[1]
      return l[0] <= t && l[1] > t;
    case 3: // re-avaialble from l[2]
      return l[0] <= t && l[1] > t && l[2] <= t;
    default:
      assert(false, "should never happen");
  }
};
