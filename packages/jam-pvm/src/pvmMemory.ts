import { IPVMMemory, PVMACL, u32 } from "@tsjam/types";
import assert from "node:assert";
export type MemoryContent = { at: u32; content: Uint8Array };

export class PVMMemory implements IPVMMemory {
  #innerMemory = new Uint8Array(2 ** 32);
  constructor(
    initialMemory: MemoryContent[],
    private acl: PVMACL[],
  ) {
    for (const { at, content } of initialMemory) {
      this.#innerMemory.set(content, at);
    }
  }
  addACL(acl: { from: u32; to: u32; writable: boolean }): void {
    this.acl.push(acl);
  }
  setBytes(offset: number, bytes: Uint8Array): void {
    assert(this.canWrite(offset, bytes.length), "Memory is not writeable");
    this.#innerMemory.set(bytes, offset);
  }
  getBytes(offset: number, length: number): Uint8Array {
    assert(this.canRead(offset, length), "Memory is not readable");
    return this.#innerMemory.subarray(offset, offset + length);
  }
  canRead(offset: number, length: number): boolean {
    return !!this.acl.find(
      (acl) => offset >= acl.from && offset + length < acl.to,
    );
  }
  canWrite(offset: number, length: number): boolean {
    return !!this.acl.find(
      (acl) => offset >= acl.from && offset + length < acl.to && acl.writable,
    );
  }
  clone(): this {
    return new PVMMemory(
      [{ at: 0 as u32, content: this.#innerMemory }],
      this.acl.map((acl) => ({ ...acl })),
    ) as this;
  }
}
