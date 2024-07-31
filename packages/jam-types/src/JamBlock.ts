import {
  BoundedSeq,
  ED25519Signature,
  Hash,
  JamHeader,
  RingVRFProof,
  SeqOfLength,
  Tagged,
  u32,
  UpToSeq,
  ValidatorIndex,
} from "@/index";
import { CORES, NUMBER_OF_VALIDATORS } from "@/consts.js";
import { WorkReport } from "@/ReportingAndAvailabilityState.js";

export interface JamBlock {
  header: JamHeader;
  extrinsics: JamBlockExtrinsics;
}

/**
 * The assurance extrinsic is a proof that a validator has received and is storing a piece of data.
 * @see section 11.2.1
 */
export type AssuranceExtrinsic = {
  /**
   * the hash of parent header
   **/
  anchorHash: Hash;
  bitstring: SeqOfLength<0 | 1, typeof CORES>;
  /**
   * the validator index assuring they're contributing to the Data avaialbility
   */
  validatorIndex: ValidatorIndex;
  signature: ED25519Signature;
};
/**
 * A single item in the `Eg` extrinsic.
 * @see section 11.4
 */
export type ReportGuarantee = {
  /**
   * the workreport we're referring to
   */
  workReport: WorkReport;
  timeSlot: u32;
  /**
   * the signature along with the validator index
   * the sequence must be ordered by `.validatorIndex`
   * and we must assert that there are no duplicated `.validatorIndex`
   * @see `a` in the paper
   */
  signatures: BoundedSeq<
    {
      validatorIndex: ValidatorIndex;
      signature: ED25519Signature;
    },
    2, // minimum 2 entries
    3 // maximum 3 entries
  >;
};

export interface JamBlockExtrinsics {
  // Et the maximum number of tickets in a block is
  // K=16 and it is allowed to be submitted only if current slot is less than Y=500 ( aka lottery did not end yet)
  // @see section 6.7
  tickets: Tagged<
    { entryIndex: 0 | 1; proof: RingVRFProof }[],
    "block-tickets",
    { maxLength: 16 }
  >;
  judgements: never[];
  preimages: never[];

  /**
   * Assurances by each validator concerning which of the input data of workloads they have
   * correctly received and are storing locally. This is
   * denoted `Ea`.
   * anchored on the parent and ordered by `AssuranceExtrinsic.validatorIndex`
   */
  availability: UpToSeq<AssuranceExtrinsic, typeof NUMBER_OF_VALIDATORS>;
  /**
   * Reports of newly completed workloads
   * whose accuracy is guaranteed by specific validators. This is denoted `EG`.
   */
  reportGuarantees: UpToSeq<ReportGuarantee, typeof CORES>;
}
