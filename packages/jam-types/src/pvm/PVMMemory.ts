import { u8 } from "@/genericTypes.js";

export interface PVMMemory {
  /**
   * @throws in case there is an issue accessing the memory
   * @param offset - the offset to write the value to
   * @param value - the value to write
   */
  set(offset: number, value: u8): void;
  /**
   * @throws in case there is an issue accessing the memory
   * @param offset
   * @param bytes
   */
  setBytes(offset: number, bytes: Uint8Array): void;
  /**
   * @throws in case there is an issue accessing the memory
   * @param offset
   */
  get(offset: number): u8;
  /**
   * @throws in case there is an issue accessing the memory
   * @param offset
   * @param length
   */
  getBytes(offset: number, length: number): Uint8Array;
}
