import { JamHeader, RingVRFProof, Tagged, UpToSeq } from "@/index";
import { CORES, NUMBER_OF_VALIDATORS } from "@vekexasia/jam-constants";

export interface JamBlock {
  header: JamHeader;
  extrinsics: JamBlockExtrinsics;
}

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
  availability: UpToSeq<any, typeof NUMBER_OF_VALIDATORS>;
  /**
   * Reports of newly completed workloads
   * whose accuracy is guaranteed by specific validators. This is denoted `EG`.
   */
  reportGuarantees: UpToSeq<any, typeof CORES>;
}
// TODO: Move this file to a separate package to avoid circular dependencies
