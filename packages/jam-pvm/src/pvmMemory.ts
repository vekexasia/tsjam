import { u8 } from "@vekexasia/jam-types";
import { PVMExitReason } from "@/exitReason.js";

const innerMemory = new Uint8Array(0x10000);
export const PVMMemory = {
  /**
   * @throws in case there is an issue accessing the memory
   * @param offset
   * @param value
   */
  set(offset: number, value: u8): void {
    innerMemory[offset] = value;
  },
  /**
   * @throws in case there is an issue accessing the memory
   * @param offset
   * @param bytes
   */
  setBytes(offset: number, bytes: Uint8Array): void {
    innerMemory.set(bytes, offset);
  },
  /**
   * @throws in case there is an issue accessing the memory
   * @param offset
   */
  get(offset: number): u8 {
    return innerMemory[offset] as u8;
  },
  /**
   * @throws in case there is an issue accessing the memory
   * @param offset
   * @param length
   */
  getBytes(offset: number, length: number): Uint8Array {
    return innerMemory.subarray(offset, offset + length);
  },
};
