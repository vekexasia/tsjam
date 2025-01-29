import { u32 } from "@/genericTypes";

/*
 * `A` - Access Control List
 * $(0.5.4 - 4.24)
 */
export type PVMACL = {
  page: number;
  kind: PVMMemoryAccessKind.Read | PVMMemoryAccessKind.Write;
};
export type PVMMemoryContent = { at: u32; content: Uint8Array };
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
   * @param offset - offset to write the value to
   * @param bytes - the value to write
   */
  setBytes(offset: number | bigint, bytes: Uint8Array): this;
  /**
   * @throws in case there is an issue accessing the memory
   * @param offset - the offset to write the value to
   * @param length - the length of the bytes to read
   */
  getBytes(offset: number | bigint, length: number | bigint): Uint8Array;

  canRead(offset: number | bigint, length: number | bigint): boolean;
  canWrite(offset: number | bigint, length: number | bigint): boolean;

  firstUnreadable(
    offset: number | bigint,
    length: number | bigint,
  ): u32 | undefined;
  firstUnwriteable(
    offset: number | bigint,
    length: number | bigint,
  ): u32 | undefined;
  /**
   * Change ACL of specified region
   * being used in void, and zero refine fns
   */
  changeAcl(page: number, newKind: "read" | "write" | "null"): this;
}
