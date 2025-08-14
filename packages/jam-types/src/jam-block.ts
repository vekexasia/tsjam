import { SignedJamHeader } from "@/header";
import {
  DisputeExtrinsic,
  EA_Extrinsic,
  EG_Extrinsic,
  EP_Extrinsic,
  TicketsExtrinsic,
} from "@/index";

/**
 * The Jam Block
 * $(0.7.1 - 4.2)
 */
export interface JamBlock {
  header: SignedJamHeader;
  extrinsics: JamBlockExtrinsics;
}

/**
 * `E` - the exstrinsics tuple in JamBlock
 * $(0.7.1 - 4.3)
 */
export interface JamBlockExtrinsics {
  /**
   * `Et` - Tickets, used for the mechanism which manages the selection of validators for the permissioning of block authoring.
   */
  tickets: TicketsExtrinsic;

  /**
   * `Ed` - votes by validators on dispute(s) arising between them presently taking place.
   */
  disputes: DisputeExtrinsic;

  /**
   * `Ep` - Static data which is presently being requested to be available for workloads to be able to fetch on demand
   */
  preimages: EP_Extrinsic;

  /**
   * `Ea`
   * Assurances by each validator concerning which of the input data of workloads they have
   * correctly received and are storing locally. This is
   * denoted `Ea`.
   * anchored on the parent and ordered by `AssuranceExtrinsic.validatorIndex`
   */
  assurances: EA_Extrinsic;

  /**
   * `Eg`
   * Reports of newly completed workloads
   * whose accuracy is guaranteed by specific validators. This is denoted `EG`.
   */
  reportGuarantees: EG_Extrinsic;
}
