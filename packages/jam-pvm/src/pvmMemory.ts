import { Zp } from "@tsjam/constants";
import { IPVMMemory, PVMACL, PVMMemoryAccessKind, u32 } from "@tsjam/types";
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

  changeAcl(pageIndex: number, kind: PVMMemoryAccessKind): this {
    const index = this.acl.findIndex((a) => a.page === pageIndex);
    if (index === -1) {
      assert(
        kind === PVMMemoryAccessKind.Read || kind == PVMMemoryAccessKind.Write,
      );
      this.acl.push({ page: pageIndex, kind });
    } else if (kind === PVMMemoryAccessKind.Null) {
      this.acl.splice(index, 1);
    } else {
      this.acl[index].kind = kind;
    }
    return this;
  }

  setBytes(_offset: number | bigint, bytes: Uint8Array): this {
    assert(this.canWrite(_offset, bytes.length), "Memory is not writeable");
    const offset = Number(_offset);
    this.#innerMemory.set(bytes, offset);
    return this;
  }

  getBytes(_offset: number | bigint, _length: number | bigint): Uint8Array {
    const offset = Number(_offset);
    const length = Number(_length);
    assert(this.canRead(offset, length), "Memory is not readable");
    return this.#innerMemory.subarray(offset, offset + length);
  }

  canRead(_offset: number | bigint, _length: number | bigint): boolean {
    return this.firstUnreadable(_offset, _length) === undefined;
  }

  firstUnreadable(
    _offset: number | bigint,
    _length: number | bigint,
  ): u32 | undefined {
    const offset = Number(_offset);
    const length = Number(_length);
    const pageOffset = Math.floor(offset / Zp);
    let pageEnd = Math.ceil((offset + length) / Zp);
    if (pageEnd === Math.floor((offset + length) / Zp)) {
      pageEnd--;
    }
    for (let p = pageOffset; p < pageEnd; p++) {
      if (!this.acl.some((a) => a.page === p)) {
        return <u32>(p * Zp);
      }
    }
    return undefined;
  }

  canWrite(_offset: number | bigint, _length: number | bigint): boolean {
    return this.firstUnwriteable(_offset, _length) === undefined;
  }

  firstUnwriteable(
    _offset: number | bigint,
    _length: number | bigint,
  ): u32 | undefined {
    const offset = Number(_offset);
    const length = Number(_length);
    const pageOffset = Math.floor(offset / Zp);
    let pageEnd = Math.ceil((offset + length) / Zp);
    if (pageEnd === Math.floor((offset + length) / Zp)) {
      pageEnd--;
    }
    for (let p = pageOffset; p < pageEnd; p++) {
      if (
        !this.acl.some(
          (a) => a.page === p && a.kind === PVMMemoryAccessKind.Write,
        )
      ) {
        return <u32>(p * Zp);
      }
    }
    return undefined;
  }

  clone(): this {
    return new PVMMemory(
      [{ at: 0 as u32, content: this.#innerMemory }],
      this.acl.map((acl) => ({ ...acl })),
    ) as this;
  }
}
