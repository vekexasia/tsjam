/**
 * Appendix B.1: Host Call Result Constants
 */
export enum HostCallResult {
  /**
   * The return value indicating an item does not exist.
   */
  NONE = 2 ** 32 - 1,
  /**
   * Name unknown.
   */
  WHAT = 2 ** 32 - 2,
  /**
   * The return value for when a memory index is provided for reading/writing which is not accessible
   */
  OOB = 2 ** 32 - 3,
  /**
   * Index unknown
   */
  WHO = 2 ** 32 - 4,
  /**
   * Storage full
   */
  FULL = 2 ** 32 - 5,
  /**
   * Core index unknown
   */
  CORE = 2 ** 32 - 6,
  /**
   * Insufficient funds
   */
  CASH = 2 ** 32 - 7,
  /**
   * Gas Limit too low
   */
  LOW = 2 ** 32 - 8,
  /**
   * Gas Limit too high
   */
  HIGH = 2 ** 32 - 9,
  /**
   * The item is already solicited or cannot be forgotten
   */
  HUH = 2 ** 32 - 10,
  /**
   * General success
   */
  OK = 0,
}

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
}
