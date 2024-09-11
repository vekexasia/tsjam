import {
  CoreIndex,
  ED25519PublicKey,
  SeqOfLength,
  Tagged,
} from "@vekexasia/jam-types";
import { NUMBER_OF_VALIDATORS } from "@vekexasia/jam-constants";

/**
 * Guarantors assignments. Every block each core has 3 validators assigned to guarantee work reports for it
 * section 11.3
 */
export type GuarantorsAssignment = {
  /**
   * `c` - the core index
   */
  validatorsAssignedCore: SeqOfLength<CoreIndex, typeof NUMBER_OF_VALIDATORS>;

  /**
   * `v` - the validators' public key
   */
  validatorsED22519Key: SeqOfLength<
    ED25519PublicKey,
    typeof NUMBER_OF_VALIDATORS
  >;
};

export type G_Star = Tagged<GuarantorsAssignment, "G*">;
