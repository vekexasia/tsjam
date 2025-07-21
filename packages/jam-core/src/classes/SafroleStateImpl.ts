import {
  BandersnatchRingRootCodec,
  BaseJamCodecable,
  binaryCodec,
  BufferJSONCodec,
  codec,
  JamCodecable,
  jsonCodec,
  lengthDiscriminatedCodec,
} from "@tsjam/codec";
import { EPOCH_LENGTH } from "@tsjam/constants";
import {
  BandersnatchRingRoot,
  GammaSFallback,
  GammaSNormal,
  SafroleState,
  Tagged,
  Ticket,
  UpToSeq,
} from "@tsjam/types";
import { ValidatorsImpl } from "./ValidatorsImpl";
import { TicketImpl } from "./TicketImpl";

/**
 * Denoted with gamma (y) in the Greek alphabet.
 * This is the basic state of the Safrole state machine.
 * @see $(0.7.0 - 6.3)
 */
@JamCodecable()
export class SafroleStateImpl extends BaseJamCodecable implements SafroleState {
  /**
   * `YP`
   * pending set of validator that will be active in the next epoch and that determines
   * the next gamma_z
   * @see $(0.7.0 - 6.7)
   */
  @codec(ValidatorsImpl)
  gamma_p!: Tagged<ValidatorsImpl, "gamma_k">;
  /**
   * `YZ`
   * a Bandersnatch ring root composed with the one Bandersnatch key of each of the next
   * epoch’s validators, defined in gamma_k
   * @see $(0.7.0 - 6.4)
   */
  @jsonCodec(BufferJSONCodec())
  @binaryCodec(BandersnatchRingRootCodec)
  gamma_z!: Tagged<BandersnatchRingRoot, "gamma_z">;

  /**
   * `γs`
   * is the current epoch’s slot-sealer series, which is either a
   * full complement of EPOCH_LENGTH tickets or, in the case of a fallback
   * mode, a series of EPOCH_LENGTH Bandersnatch keys
   * @see $(0.7.0 - 6.5)
   */
  gamma_s!: GammaSNormal | GammaSFallback;

  /**
   * `γa` is the ticket accumulator, a series of highest scoring ticket identifiers to be used for the next epoch
   * @see $(0.7.0 - 6.5)
   */
  @lengthDiscriminatedCodec(TicketImpl)
  gamma_a!: UpToSeq<TicketImpl, typeof EPOCH_LENGTH, "gamma_a">;
}
