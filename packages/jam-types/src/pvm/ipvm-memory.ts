import { u32 } from "@/generic-types";

export type Page = number;

export enum PVMMemoryAccessKind {
  Read,
  Write,
  Null,
}
/**
 * Interface middleware for the RAM of the PVM
 * implementors should take care of the memory access
 */
export interface IPVMMemory {
  /**
   * @throws in case there is an issue accessing the memory
   * @param address - offset to write the value to
   * @param bytes - the value to write
   */
  setBytes(address: u32, bytes: Uint8Array): void;

  /**
   * @throws in case there is an issue accessing the memory
   * @param address - the offset to write the value to
   * @param length - the length of the bytes to read
   */
  getBytes(address: u32, length: number): Uint8Array;

  /**
   * wrapper for @{link #firstUnreadable}
   */
  canRead(address: bigint | u32, length: number): boolean;

  /**
   * wrapper for @{link #firstUnwriteable}
   */
  canWrite(address: bigint | u32, length: number): boolean;

  /**
   * Returns the first address that is not readable - undefined if all are readable
   */
  firstUnreadable(address: u32, length: number): u32 | undefined;

  /**
   * Returns the first address that is not writeable - undefined if all are writeable
   */
  firstUnwriteable(address: u32, length: number): u32 | undefined;

  /**
   * Change ACL of specified region
   * being used in void, and zero refine fns
   * $(0.7.1 - 4.24) - acl is defined there
   */
  changeAcl(page: Page, newKind: PVMMemoryAccessKind): this;
}
