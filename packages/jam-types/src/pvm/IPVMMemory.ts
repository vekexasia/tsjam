import { u32 } from "@/genericTypes";
export type MemoryRegion = { from: u32; to: u32 };
/*
 * `A` - Access Control List
 * $(0.5.3 - 4.24)
 */
export type PVMACL = MemoryRegion & { writable: boolean };
export type PVMMemoryContent = { at: u32; content: Uint8Array };

/**
 * Interface middleware for the RAM of the PVM
 * implementors should take care of the memory access
 */
export interface IPVMMemory {
  clone(): this;
  /**
   * @throws in case there is an issue accessing the memory
   * @param offset - offset to write the value to
   * @param bytes - the value to write
   */
  setBytes(offset: number | bigint, bytes: Uint8Array): void;
  /**
   * @throws in case there is an issue accessing the memory
   * @param offset - the offset to write the value to
   * @param length - the length of the bytes to read
   */
  getBytes(offset: number | bigint, length: number | bigint): Uint8Array;

  canRead(offset: number | bigint, length: number | bigint): boolean;
  canWrite(offset: number | bigint, length: number | bigint): boolean;

  /**
   * Change ACL of specified region
   * being used in void, and zero refine fns
   */
  changeAcl(memory: MemoryRegion, newKind: "read" | "write" | "null"): void;
}
