import { IPVMMemory, u32 } from "@vekexasia/jam-types";

/**
 * `M` set
 * This is the implementation of (34) in the graypaper
 * providing both `V` and using `A`
 */
export class PVMMemory implements IPVMMemory {
  #innerMemory = new Uint8Array(2 ** 32);
  constructor(
    initialMemory: Array<{ at: u32; content: Uint8Array }>,
    private acl: Array<{ from: u32; to: u32; writable: boolean }>,
  ) {
    for (const { at, content } of initialMemory) {
      this.#innerMemory.set(content, at);
    }
  }
  setBytes(offset: number, bytes: Uint8Array): void {
    const writeable = this.acl.find(
      (acl) =>
        offset >= acl.from && offset + bytes.length < acl.to && acl.writable,
    );
    if (!writeable) {
      throw new Error("Memory is not writeable");
    }
    this.#innerMemory.set(bytes, offset);
  }
  getBytes(offset: number, length: number): Uint8Array {
    const read = this.acl.find(
      (acl) => offset >= acl.from && offset + length < acl.to,
    );
    if (!read) {
      throw new Error("Memory is not readable");
    }
    return this.#innerMemory.subarray(offset, offset + length);
  }
}
