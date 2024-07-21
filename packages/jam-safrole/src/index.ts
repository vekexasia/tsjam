import {
  ByteArrayOfLength,
  Tagged,
  ValidatorData,
  OpaqueHash,
  u32,
  u8,
  ByteArray32,
} from "@vekexasia/jam-types";

export type TicketIdentifier = {
  // opaque 32-byte hash
  id: OpaqueHash;
  attempt: u8;
};

/**
 * Denoted with gamma (y) in the Greek alphabet.
 * This is the basic state of the Safrole state machine.
 */
export interface SafroleBasicState {
  /**
   * epochs root, a Bandersnatch ring root composed with the one Bandersnatch key of each of the next
   * epoch’s validators, defined in gamma_k
   */
  gamma_z: Tagged<ByteArrayOfLength<144>, "gamma_z">;

  /**
   * Finally, γa is the ticket accumulator, a series of highestscoring ticket identifiers to be used for the next epoch
   * length is up to epoch length
   * Sealing-key contest ticket acccumulator
   */
  gamma_a: Tagged<TicketIdentifier[], "gamma_a", { length: "epoch-length" }>;

  /**
   * γs
   * is the current epoch’s slot-sealer series, which is either a
   * full complement of E tickets or, in the case of a fallback
   * mode, a series of E Bandersnatch keys
   */
  gamma_s: Tagged<
    TicketIdentifier[] | Uint8Array[],
    "gamma_s",
    { length: "epoch-length" }
  >;

  /**
   * γk
   * pending set of validator that will be active in the next epoch and that determines
   * gamma_z (bandersnatch ring root)
   */
  gamma_k: Tagged<ValidatorData[], "gamma_k", { length: "nvalidators" }>;
}
export interface SafroleState extends SafroleBasicState {
  tau: u32;
  // entropy accumulator of randomness
  // (65) in graypaper
  eta: [OpaqueHash, OpaqueHash, OpaqueHash, OpaqueHash];
  // Validator keys and metadata which were active in the prior epoch.
  lambda: Tagged<ValidatorData[], "lambda", { length: "nvalidators" }>;
  // Validator data for the current epoch.
  kappa: Tagged<ValidatorData[], "kappa", { length: "nvalidators" }>;
  // Validator data for the next epoch.
  iota: Tagged<ValidatorData[], "iota", { length: "nvalidators" }>;
}

/**
 * for tests
 */
export interface SafroleInput {
  slot: u32;
  entropy: OpaqueHash; // generated from the entropy accumulator?
  extrinsic: Array<{
    attempt: u8;
    signature: ByteArrayOfLength<784>;
  }>;
}
export interface SafroleOutput {
  epochMark?: {
    entropy: ByteArray32;
    validatorKeys: Tagged<
      ByteArray32[],
      "validatorKeys",
      { length: "nvalidators" }
    >;
  };
  ticketsMark?: SafroleBasicState["gamma_a"];
}
