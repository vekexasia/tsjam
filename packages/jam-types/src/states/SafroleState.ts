import {
  BandersnatchKey,
  BandersnatchRingRoot,
  SeqOfLength,
  Tagged,
  UpToSeq,
} from "@/genericTypes";
import { TicketIdentifier } from "@/sets/Ticket";
import { ValidatorData } from "@/ValidatorData";
import { EPOCH_LENGTH, NUMBER_OF_VALIDATORS } from "@tsjam/constants";

/**
 * Denoted with gamma (y) in the Greek alphabet.
 * This is the basic state of the Safrole state machine.
 * @see (48) - 0.4.5
 */
export interface SafroleState {
  /**
   * `yz`
   * a Bandersnatch ring root composed with the one Bandersnatch key of each of the next
   * epoch’s validators, defined in gamma_k
   * @see (49) - 0.4.5
   */
  gamma_z: Tagged<BandersnatchRingRoot, "gamma_z">;

  /**
   * `γa` is the ticket accumulator, a series of highest scoring ticket identifiers to be used for the next epoch
   * @see (50) - 0.4.5
   */
  gamma_a: UpToSeq<TicketIdentifier, typeof EPOCH_LENGTH, "gamma_a">;

  /**
   * `γs`
   * is the current epoch’s slot-sealer series, which is either a
   * full complement of EPOCH_LENGTH tickets or, in the case of a fallback
   * mode, a series of EPOCH_LENGTH Bandersnatch keys
   * @see (50) - 0.4.5
   */
  gamma_s:
    | SeqOfLength<TicketIdentifier, typeof EPOCH_LENGTH, "gamma_s">
    | SeqOfLength<BandersnatchKey, typeof EPOCH_LENGTH, "gamma_s">;

  /**
   * `γk`
   * pending set of validator that will be active in the next epoch and that determines
   * the next gamma_z
   * @see $(0.5.0 - 6.7)
   */
  gamma_k: SeqOfLength<ValidatorData, typeof NUMBER_OF_VALIDATORS, "gamma_k">;
}
