import { u32 } from "@/genericTypes";

export type Page = number;
/*
 * `A` - Access Control List
 * $(0.5.4 - 4.24)
 */
export type PVMACL = {
  page: Page;
  kind: PVMMemoryAccessKind.Read | PVMMemoryAccessKind.Write;
};
export type PVMMemoryContent = { address: u32; content: Uint8Array };
export enum PVMMemoryAccessKind {
  Read = "read",
  Write = "write",
  Null = "null",
}
/**
 * Interface middleware for the RAM of the PVM
 * implementors should take care of the memory access
 */
export interface IPVMMemory {
  clone(): this;
  /**
   * @throws in case there is an issue accessing the memory
   * @param address - offset to write the value to
   * @param bytes - the value to write
   */
  setBytes(address: u32, bytes: Uint8Array): this;
  /**
   * @throws in case there is an issue accessing the memory
   * @param address - the offset to write the value to
   * @param length - the length of the bytes to read
   */
  getBytes(address: u32, length: number): Uint8Array;

  canRead(address: u32, length: number): boolean;
  canWrite(address: u32, length: number): boolean;

  firstUnreadable(address: u32, length: number): u32 | undefined;
  firstUnwriteable(address: u32, length: number): u32 | undefined;
  /**
   * Change ACL of specified region
   * being used in void, and zero refine fns
   */
  changeAcl(page: Page, newKind: PVMMemoryAccessKind): this;
}
