import {
  CORES,
  ED25519Signature,
  Hash,
  NUMBER_OF_VALIDATORS,
  SeqOfLength,
  UpToSeq,
  ValidatorIndex,
} from "@vekexasia/jam-types";

/**
 * The assurance extrinsic is a proof that a validator has received and is storing a piece of data.
 * @see section 11.2.1
 */
export type AssuranceExtrinsic = {
  /**
   * `a` the hash of parent header
   **/
  anchorHash: Hash;
  /**
   * `f`
   */
  bitstring: SeqOfLength<0 | 1, typeof CORES>;
  /**
   * `v` the validator index assuring they're contributing to the Data availability
   */
  validatorIndex: ValidatorIndex;
  /**
   * `s` the signature of the validator
   */
  signature: ED25519Signature;
};
/**
 * Assurances by each validator concerning which of the input data of workloads they have
 * correctly received and are storing locally. This is
 * denoted `Ea`.
 * anchored on the parent and ordered by `AssuranceExtrinsic.validatorIndex`
 */
export type EA_Extrinsic = UpToSeq<
  AssuranceExtrinsic,
  typeof NUMBER_OF_VALIDATORS
>;
