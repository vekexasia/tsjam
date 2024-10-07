import {
  DisputeExtrinsic,
  EA_Extrinsic,
  EG_Extrinsic,
  EP_Tuple,
  TicketExtrinsics,
} from "@/index";
import { SignedJamHeader } from "@/header";

export interface JamBlock {
  header: SignedJamHeader;
  extrinsics: JamBlockExtrinsics;
}

export interface JamBlockExtrinsics {
  // Et the maximum number of tickets in a block is
  // K=16 and it is allowed to be submitted only if current slot is less than Y=500 ( aka lottery did not end yet)
  // @see section 6.7
  tickets: TicketExtrinsics;
  disputes: DisputeExtrinsic;
  preimages: EP_Tuple[];

  /**
   * Assurances by each validator concerning which of the input data of workloads they have
   * correctly received and are storing locally. This is
   * denoted `Ea`.
   * anchored on the parent and ordered by `AssuranceExtrinsic.validatorIndex`
   */
  assurances: EA_Extrinsic;
  /**
   * Reports of newly completed workloads
   * whose accuracy is guaranteed by specific validators. This is denoted `EG`.
   */
  reportGuarantees: EG_Extrinsic;
}
