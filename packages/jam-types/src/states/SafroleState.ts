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
 */
export interface SafroleState {
  /**
   * epochs root, a Bandersnatch ring root composed with the one Bandersnatch key of each of the next
   * epoch’s validators, defined in gamma_k
   */
  gamma_z: Tagged<BandersnatchRingRoot, "gamma_z">;

  /**
   * Finally, γa is the ticket accumulator, a series of highestscoring ticket identifiers to be used for the next epoch
   * length is up to epoch length
   * Sealing-key contest ticket acccumulator
   */
  gamma_a: UpToSeq<TicketIdentifier, typeof EPOCH_LENGTH, "gamma_a">;

  /**
   * γs
   * is the current epoch’s slot-sealer series, which is either a
   * full complement of E tickets or, in the case of a fallback
   * mode, a series of E Bandersnatch keys
   */
  gamma_s:
    | SeqOfLength<TicketIdentifier, typeof EPOCH_LENGTH, "gamma_s">
    | SeqOfLength<BandersnatchKey, typeof EPOCH_LENGTH, "gamma_s">;

  /**
   * γk
   * pending set of validator that will be active in the next epoch and that determines
   * gamma_z (bandersnatch ring root)
   */
  gamma_k: SeqOfLength<ValidatorData, typeof NUMBER_OF_VALIDATORS, "gamma_k">;
}
