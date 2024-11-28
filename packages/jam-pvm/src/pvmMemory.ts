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
  setBytes(_offset: number | bigint, bytes: Uint8Array): void {
    assert(this.canWrite(_offset, bytes.length), "Memory is not writeable");
    const offset = Number(_offset);
    this.#innerMemory.set(bytes, offset);
  }
  getBytes(_offset: number | bigint, _length: number | bigint): Uint8Array {
    const offset = Number(_offset);
    const length = Number(_length);
    assert(this.canRead(offset, length), "Memory is not readable");
    return this.#innerMemory.subarray(offset, offset + length);
  }
  canRead(_offset: number | bigint, _length: number | bigint): boolean {
    const offset = Number(_offset);
    const length = Number(_length);
    return !!this.acl.find(
      (acl) => offset >= acl.from && offset + length < acl.to,
    );
  }
  canWrite(_offset: number | bigint, _length: number | bigint): boolean {
    const offset = Number(_offset);
    const length = Number(_length);
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
