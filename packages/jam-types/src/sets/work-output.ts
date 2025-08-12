/**
 * defined as `E` set in the paper
 * $(0.7.1 - 11.7)
 */
export enum WorkError {
  /**
   * the work was not executed because the gas limit was reached
   * @see infinity symbol in the paper
   */
  OutOfGas = 1,

  /**
   * Possibly a program failure
   * @see lightning bolt in the paper
   */
  Panic = 2,

  /**
   * ⊚
   */
  BadExports = 3,

  /**
   * ⊖
   */
  Oversize = 4,

  /**
   * Service code was not available for lookup at the lookup anchor block
   * it essentially means that `WorkResult.codeHash` preimage was not found
   */
  Bad = 5,
  /**
   * Code too big (exceeded `S`)
   */
  Big = 6,
}
/**
 * Output Data ofr the refine logic
 * either success or error is set
 */
export type WorkOutput = { success?: Uint8Array; error?: WorkError };
