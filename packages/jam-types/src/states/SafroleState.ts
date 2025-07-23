import {
  BandersnatchKey,
  BandersnatchRingRoot,
  SeqOfLength,
  Tagged,
  UpToSeq,
} from "@/genericTypes";
import { Ticket } from "@/sets/Ticket";
import { Validators } from "@/Validators";
import { EPOCH_LENGTH } from "@tsjam/constants";

export type GammaSFallback = SeqOfLength<
  BandersnatchKey,
  typeof EPOCH_LENGTH,
  "gamma_s"
>;
export type GammaSNormal = SeqOfLength<Ticket, typeof EPOCH_LENGTH, "gamma_s">;

export type GammaS = {
  keys?: GammaSFallback;
  tickets?: GammaSNormal;
};

export type GammaA = {
  elements: UpToSeq<Ticket, typeof EPOCH_LENGTH, "gamma_a">;
};

export type GammaZ = {
  root: BandersnatchRingRoot;
};
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
  gamma_z: GammaZ;

  /**
   * `γa` is the ticket accumulator, a series of highest scoring ticket identifiers to be used for the next epoch
   * @see $(0.7.0 - 6.5)
   */
  gamma_a: GammaA;

  /**
   * `γs`
   * is the current epoch’s slot-sealer series, which is either a
   * full complement of EPOCH_LENGTH tickets or, in the case of a fallback
   * mode, a series of EPOCH_LENGTH Bandersnatch keys
   * @see $(0.7.0 - 6.5)
   */
  gamma_s: GammaS;

  /**
   * `YP`
   * pending set of validator that will be active in the next epoch and that determines
   * the next gamma_z
   * @see $(0.7.0 - 6.7)
   */
  gamma_p: Tagged<Validators, "gamma_p">;
}
