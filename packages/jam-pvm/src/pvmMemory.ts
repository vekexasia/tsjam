import { u8 } from "@vekexasia/jam-types";

const innerMemory = new Uint8Array(0x10000);
export const PVMMemory = {
  set(offset: number, value: u8) {
    innerMemory[offset] = value;
  },
  setBytes(offset: number, bytes: Uint8Array) {
    innerMemory.set(bytes, offset);
  },
  get(offset: number): u8 {
    return innerMemory[offset] as u8;
  },
  getBytes(offset: number, length: number) {
    return innerMemory.subarray(offset, offset + length);
  },
};
