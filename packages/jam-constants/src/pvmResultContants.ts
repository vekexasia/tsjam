/**
 * Appendix B.1: Host Call Result Constants
 */
export const HostCallResult = {
  /**
   * The return value indicating an item does not exist.
   */
  NONE: 2n ** 64n - 1n,
  /**
   * Name unknown.
   */
  WHAT: 2n ** 64n - 2n,
  /**
   * The return value for when a memory index is provided for reading/writing which is not accessible
   */
  OOB: 2n ** 64n - 3n,
  /**
   * Index unknown
   */
  WHO: 2n ** 64n - 4n,
  /**
   * Storage full
   */
  FULL: 2n ** 64n - 5n,
  /**
   * Core index unknown
   */
  CORE: 2n ** 64n - 6n,
  /**
   * Insufficient funds
   */
  CASH: 2n ** 64n - 7n,
  /**
   * Gas Limit too low
   */
  LOW: 2n ** 64n - 8n,
  /**
   * The item is already solicited or cannot be forgotten
   */
  HUH: 2n ** 64n - 9n,
  /**
   * General success
   */
  OK: 0n,
};

export enum InnerPVMResultCode {
  /**
   * The invocation completed and halted normally.
   */
  HALT = 0,
  /**
   * The invocation completed with a panic.
   */
  PANIC = 1,
  /**
   * The invocation completed with a page fault
   */
  FAULT = 2,
  /**
   * The invocation completed with a host-call fault
   */
  HOST = 3,
  /**
   * The invocation completed by running out of gas
   */
  OOG = 4,
}
