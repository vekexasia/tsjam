import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import {
  CoreIndex,
  ED25519PublicKey,
  SeqOfLength,
  Tagged,
} from "@/genericTypes.js";

/**
 * Guarantors assignments. Every block each core has 3 validators assigned to guarantee work reports for it
 * section 11.3
 * $(0.5.0 - 11.17)
 */
export type GuarantorsAssignment = {
  /**
   * `c` - the core index
   */
  validatorsAssignedCore: SeqOfLength<CoreIndex, typeof NUMBER_OF_VALIDATORS>;

  /**
   * `k` - the validators' public key
   */
  validatorsED22519Key: SeqOfLength<
    ED25519PublicKey,
    typeof NUMBER_OF_VALIDATORS
  >;
};

// defined in $(0.5.0 - 11.21)
export type G_Star = Tagged<GuarantorsAssignment, "G*">;
