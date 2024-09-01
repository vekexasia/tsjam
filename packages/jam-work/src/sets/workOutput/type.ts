/**
 * defined as `J` set in the paper
 * see (122)
 */
export enum WorkError {
  /**
   * the work was not executed because the gas limit was reached
   * @see infinity symbol in the paper
   */
  OutOfGas = 0,

  /**
   * Possibly a program failure
   * @see lightning bolt in the paper
   */
  UnexpectedTermination = 1,

  /**
   * Service code was not available for lookup @ the lookup anchor block
   *
   * it essentially means that `WorkResult.codeHash` preimage was not found
   */
  Bad = 2,
  /**
   * Code too big (exceeded `S`)
   */
  Big = 3,
}
export type WorkOutput = Uint8Array | WorkError;
