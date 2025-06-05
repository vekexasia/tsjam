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
  Hash,
  ServiceIndex,
  Tagged,
  Tau,
  UpToSeq,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import {
  createCodec,
  IdentityCodec,
  JamCodec,
  LengthDiscrimantedIdentity,
} from "@tsjam/codec";

export const serviceMetadataCodec = createCodec<{
  code: PVMProgramCode;
  metadata: Uint8Array;
}>([
  ["metadata", LengthDiscrimantedIdentity],
  ["code", IdentityCodec as unknown as JamCodec<PVMProgramCode>],
]);

export class ServiceAccountImpl implements ServiceAccount {
  storage!: IServiceAccountStorage;
  preimage_p!: Map<Hash, Uint8Array<ArrayBufferLike>>;
  preimage_l!: Map<Hash, Map<Tagged<u32, "length">, UpToSeq<Tau, 3>>>;
  gratisStorageOffset!: u64;
  codeHash!: CodeHash;
  balance!: u64;
  minGasAccumulate!: Gas;
  minGasOnTransfer!: Gas;
  creationTimeSlot!: u32;
  lastAccumulationTimeSlot!: u32;
  parentService!: ServiceIndex;

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
    for (const [y, z] of this.storage.entries()) {
      sum += 34n + BigInt(y.length) + BigInt(z.length);
    }

    return sum as u64;
  }

  /**
   * `a_t`
   * compute the gas threshold of a service account
   * $(0.6.4 - 9.8)
   */
  gasThreshold(): Gas {
    return <Gas>(SERVICE_MIN_BALANCE + // Bs
      SERVICE_ADDITIONAL_BALANCE_PER_ITEM * BigInt(this.itemInStorage()) + // BI*ai
      SERVICE_ADDITIONAL_BALANCE_PER_OCTET * this.totalOctets() -
      this.gratisStorageOffset) /* BL*ao */;
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
