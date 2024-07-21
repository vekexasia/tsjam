export type TicketIdentifier = {
  id: Uint8Array;
  attempt: 0 | 1;
};
export type ValidatorKeyTuple = {
  bandersnatchPKey: Uint8Array;
  ed25519PKey: Uint8Array;
  // 144 bytes long
  blsKey: Uint8Array;
  // 128 bytes long
  metadata: Uint8Array;
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
  gamma_z: Uint8Array[];

  /**
   * Finally, γa is the ticket accumulator, a series of highestscoring ticket identifiers to be used for the next epoch
   */
  gamma_a: TicketIdentifier[];

  /**
   * γs
   * is the current epoch’s slot-sealer series, which is either a
   * full complement of E tickets or, in the case of a fallback
   * mode, a series of E Bandersnatch keys
   */
  gamma_s: TicketIdentifier[] | Uint8Array[];

  /**
   * γk
   * pending set of validator that will be active in the next epoch and that determines
   * gamma_z (bandersnatch ring root)
   */
  gamma_k: ValidatorKeyTuple[];
}
