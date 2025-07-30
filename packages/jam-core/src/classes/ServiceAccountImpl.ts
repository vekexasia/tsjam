import {
  createCodec,
  IdentityCodec,
  JamCodec,
  LengthDiscrimantedIdentity,
} from "@tsjam/codec";
import {
  SERVICE_ADDITIONAL_BALANCE_PER_ITEM,
  SERVICE_ADDITIONAL_BALANCE_PER_OCTET,
  SERVICE_MIN_BALANCE,
} from "@tsjam/constants";
import {
  Balance,
  CodeHash,
  Gas,
  Hash,
  IServiceAccountStorage,
  PVMProgramCode,
  ServiceAccount,
  ServiceIndex,
  Tagged,
  Tau,
  u32,
  u64,
  UpToSeq,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import assert from "node:assert";
import { a } from "vitest/dist/chunks/suite.B2jumIFP.js";

export const serviceMetadataCodec = createCodec<{
  code: PVMProgramCode;
  metadata: Uint8Array;
}>([
  ["metadata", LengthDiscrimantedIdentity],
  ["code", IdentityCodec as unknown as JamCodec<PVMProgramCode>],
]);

/**
 * `A`
 * $(0.7.1 - 9.3)
 */
export class ServiceAccountImpl implements ServiceAccount {
  preimages: ServiceAccount["preimages"] = new Map();
  requests: ServiceAccount["requests"] = new Map();
  gratis!: Balance;
  codeHash!: CodeHash;
  balance!: Balance;
  minAccGas!: Gas;
  minMemoGas!: Gas;
  created!: Tau;
  lastAcc!: Tau;
  parent!: ServiceIndex;
  storage!: IServiceAccountStorage;

  constructor(
    values: Omit<
      ServiceAccount,
      "itemInStorage" | "totalOctets" | "gasThreshold" | "metadata" | "code"
    >,
  ) {
    for (const key of Object.keys(values)) {
      // @ts-ignore
      this[key] = values[key];
    }
  }

  /**
   * `a_i` - total number of preimage lookup dictionaries and
   * $(0.7.1 - 9.8)
   */
  itemInStorage(): u32 {
    return toTagged(2 * this.requests.size + this.storage.size);
  }

  /**
   * `a_o` - total octets in the preimage lookup and storage
   * $(0.7.1 - 9.8)
   */
  totalOctets(): u64 {
    let sum: bigint = 0n;

    for (const zmap of this.requests.values()) {
      for (const length of zmap.keys()) {
        sum += BigInt(length) + 81n;
      }
    }
    sum += this.storage.octets;

    return sum as u64;
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
      (this.requests.get(hash)?.get(toTagged(<u32>length))?.length ?? 0) !== 0
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
    tau: Tagged<Tau, "-D">, // $(0.7.1 - 9.5) states that TAU is no older than D
    hash: Hash,
  ): Uint8Array | undefined {
    const ap = this.preimages.get(hash);
    if (
      typeof ap !== "undefined" &&
      I_Fn(this.requests.get(hash)!.get(toTagged(ap.length as u32))!, tau)
    ) {
      return this.preimages.get(hash)!;
    }
  }
}
/**
 * Checks based on the length of the preimage and tau if it is valid
 */
const I_Fn = (l: UpToSeq<Tau, 3>, t: Tau) => {
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
