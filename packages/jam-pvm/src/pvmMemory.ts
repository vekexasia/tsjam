import { u8 } from "@vekexasia/jam-types";
import { PVMExitReason } from "@/exitReason.js";

const innerMemory = new Uint8Array(0x10000);
export const PVMMemory = {
  set(offset: number, value: u8): PVMExitReason | void {
    innerMemory[offset] = value;
  },
  setBytes(offset: number, bytes: Uint8Array): PVMExitReason | void {
    innerMemory.set(bytes, offset);
  },
  get(offset: number): u8 | PVMExitReason {
    return innerMemory[offset] as u8;
  },
  getBytes(offset: number, length: number): Uint8Array | PVMExitReason {
    return innerMemory.subarray(offset, offset + length);
  },
};
