/**
 * defined as `J` set in the paper
 * $(0.6.1 - 11.7)
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
   * ⊚
   */
  BadExports = 2,

  /**
   * Service code was not available for lookup at the lookup anchor block
   * it essentially means that `WorkResult.codeHash` preimage was not found
   */
  Bad = 3,
  /**
   * Code too big (exceeded `S`)
   */
  Big = 4,
}
/**
 * Output Data ofr the refine logic
 */
export type WorkOutput = Uint8Array | WorkError;
