import {
  BandersnatchKey,
  BandersnatchRingRoot,
  SeqOfLength,
  Tagged,
  UpToSeq,
} from "@/genericTypes";
import { Ticket } from "@/sets/Ticket";
import { ValidatorData } from "@/ValidatorData";
import { EPOCH_LENGTH, NUMBER_OF_VALIDATORS } from "@tsjam/constants";

export type GammaSFallback = SeqOfLength<
  BandersnatchKey,
  typeof EPOCH_LENGTH,
  "gamma_s"
>;
export type GammaSNormal = SeqOfLength<Ticket, typeof EPOCH_LENGTH, "gamma_s">;
/**
 * Denoted with gamma (y) in the Greek alphabet.
 * This is the basic state of the Safrole state machine.
 * @see $(0.7.0 - 6.3)
 */
export interface SafroleState {
  /**
   * `YZ`
   * a Bandersnatch ring root composed with the one Bandersnatch key of each of the next
   * epoch’s validators, defined in gamma_k
   * @see $(0.7.0 - 6.4)
   */
  gamma_z: Tagged<BandersnatchRingRoot, "gamma_z">;

  /**
   * `γa` is the ticket accumulator, a series of highest scoring ticket identifiers to be used for the next epoch
   * @see $(0.7.0 - 6.5)
   */
  gamma_a: UpToSeq<Ticket, typeof EPOCH_LENGTH, "gamma_a">;

  /**
   * `γs`
   * is the current epoch’s slot-sealer series, which is either a
   * full complement of EPOCH_LENGTH tickets or, in the case of a fallback
   * mode, a series of EPOCH_LENGTH Bandersnatch keys
   * @see $(0.7.0 - 6.5)
   */
  gamma_s: GammaSNormal | GammaSFallback;

  /**
   * `YP`
   * pending set of validator that will be active in the next epoch and that determines
   * the next gamma_z
   * @see $(0.7.0 - 6.7)
   */
  gamma_p: SeqOfLength<ValidatorData, typeof NUMBER_OF_VALIDATORS, "gamma_k">;
}
