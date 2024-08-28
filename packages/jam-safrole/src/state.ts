import {
  BandersnatchKey,
  BandersnatchRingRoot,
  Blake2bHash,
  ByteArrayOfLength,
  EPOCH_LENGTH,
  NUMBER_OF_VALIDATORS,
  OpaqueHash,
  SeqOfLength,
  Tagged,
  TicketIdentifier,
  u32,
  UpToSeq,
  ValidatorData,
} from "@vekexasia/jam-types";

/**
 * Denoted with gamma (y) in the Greek alphabet.
 * This is the basic state of the Safrole state machine.
 */
export interface SafroleBasicState {
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

/**
 *
 *
 */
export interface SafroleState extends SafroleBasicState {
  tau: u32;
  // entropy accumulator of randomness
  // (65) in graypaper
  eta: [_0: Blake2bHash, _1: Blake2bHash, _2: Blake2bHash, _3: Blake2bHash];
  /**
   * `λ` Validator keys and metadata which were active in the prior epoch.
   */
  lambda: SeqOfLength<ValidatorData, typeof NUMBER_OF_VALIDATORS, "lambda">;
  /**
   * `κ` Validator keys and metadata which are active in the current epoch.
   */
  kappa: SeqOfLength<ValidatorData, typeof NUMBER_OF_VALIDATORS, "kappa">;
  /**
   * `ι` Validator keys and metadata which will be active in the next epoch.
   */
  iota: SeqOfLength<ValidatorData, typeof NUMBER_OF_VALIDATORS, "iota">;
}

/**
 * for tests
 */
export interface SafroleInput {
  slot: u32;
  entropy: OpaqueHash; // generated from the entropy accumulator?
  extrinsic: Array<{
    attempt: 0 | 1;
    signature: ByteArrayOfLength<784>;
  }>;
}
export interface SafroleOutput {
  epochMark?: {
    entropy: ByteArrayOfLength<32>; // todo fix type
    validatorKeys: SeqOfLength<
      ByteArrayOfLength<32>, // todo fix type
      typeof NUMBER_OF_VALIDATORS,
      "validatorkeys"
    >;
  };
  ticketsMark?: SafroleBasicState["gamma_a"];
}
