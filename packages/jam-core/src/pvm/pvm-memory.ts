import { Zp } from "@tsjam/constants";
import { IPVMMemory, Page, PVMMemoryAccessKind, u32 } from "@tsjam/types";
import assert from "node:assert";
export type MemoryContent = { at: u32; content: Uint8Array };
import { log } from "@/utils";

/**
 * Defines the memory content of a single page
 */
export type PVMHeap = { start: u32; end: u32; pointer: u32 };
export class PVMMemory implements IPVMMemory {
  #innerMemoryContent = new Map<Page, Uint8Array>();
  constructor(
    initialMemory: MemoryContent[] | Map<Page, Uint8Array>,
    private acl: Map<
      Page,
      PVMMemoryAccessKind.Read | PVMMemoryAccessKind.Write
    >,
    public heap: PVMHeap,
  ) {
    // if initialMemory is a map, we can directly use it
    if (initialMemory instanceof Map) {
      this.#innerMemoryContent = initialMemory;
    } else {
      this.#innerMemoryContent = new Map();
      for (const page of acl.keys()) {
        this.#innerMemoryContent.set(page, new Uint8Array(Zp).fill(0));
      }
      for (const { at, content } of initialMemory) {
        this.#setBytes(at, content);
      }
    }
  }

  #locationFromAddress(address: u32 | bigint) {
    return {
      page: Math.floor(Number(address) / Zp),
      offset: Number(address) % Zp,
    };
  }

  #pagesInRange(address: u32, length: number) {
    if (length === 0) {
      return [];
    }
    const { page: startPage, offset } = this.#locationFromAddress(address);
    const toRet: number[] = [startPage];
    let remaining = length - (Zp - offset);
    while (remaining > 0) {
      // we modulo on the max page number which is total ram / page size
      toRet.push((toRet[toRet.length - 1] + 1) % (2 ** 32 / Zp));
      remaining -= Zp;
    }
    return toRet;
  }

  #getPageMemory(page: number): Uint8Array {
    const memory = this.#innerMemoryContent.get(page);
    assert(
      memory,
      `Page ${page}|0x${(page * Zp).toString(16)} is not allocated`,
    );
    return memory;
  }

  #setBytes(address: u32 | bigint, bytes: Uint8Array): void {
    if (bytes.length === 0) {
      return;
    }
    const { page, offset } = this.#locationFromAddress(address);
    const memory = this.#getPageMemory(page);
    const bytesToWrite = Math.min(bytes.length, Zp - offset);
    // we replace current uint8array with a new copy so that old references to this location
    // in memory are still kept intact and unchanged in case error happens
    const newMemory = new Uint8Array(Zp);
    newMemory.set(memory, 0);
    newMemory.set(bytes.subarray(0, bytesToWrite), offset);
    this.#innerMemoryContent.set(page, newMemory);
    // if offset + bytes.length exceeds page we should call setbytes again
    if (bytesToWrite < bytes.length) {
      this.#setBytes(
        toSafeMemoryAddress(BigInt(address) + BigInt(bytesToWrite)),
        bytes.subarray(bytesToWrite),
      );
    }
  }

  /**
   * Returns copy of content in single Uint8Array
   */
  #getBytes(address: u32 | bigint, length: number): Uint8Array {
    if (length === 0) {
      return new Uint8Array(0);
    }
    const { page, offset } = this.#locationFromAddress(address);
    const memory = this.#getPageMemory(page);
    const bytesToRead = Math.min(length, Zp - offset);
    const chunk = memory.subarray(offset, offset + bytesToRead);
    // log(
    //   `getBytes[${address.toString(16)}] l:${length} v:${Buffer.from(chunk.slice()).toString("hex")}`,
    //   true,
    // );
    if (bytesToRead !== length) {
      const sub = this.#getBytes(
        toSafeMemoryAddress(BigInt(address) + BigInt(bytesToRead)),
        length - bytesToRead,
      );
      const toRet = new Uint8Array(chunk.length + sub.length);
      toRet.set(chunk);
      toRet.set(sub, chunk.length);
      return toRet;
    }
    return chunk.slice();
  }

  changeAcl(page: Page, kind: PVMMemoryAccessKind): this {
    if (!this.acl.has(page)) {
      assert(
        kind === PVMMemoryAccessKind.Read || kind == PVMMemoryAccessKind.Write,
      );
      this.acl.set(page, kind);
    } else if (kind === PVMMemoryAccessKind.Null) {
      this.acl.delete(page);
    } else {
      this.acl.set(page, kind);
    }
    return this;
  }

  setBytes(address: u32, bytes: Uint8Array): this {
    assert(this.canWrite(address, bytes.length), "Memory is not writeable");
    this.#setBytes(address, bytes);

    //log(
    //  `setBytes[${address.toString(16)}] = ${Buffer.from(bytes).toString("hex")} - l:${bytes.length}`,
    //  true,
    //);
    return this;
  }

  getBytes(address: u32 | bigint, length: number): Uint8Array {
    assert(this.canRead(address, length), "Memory is not readable");
    const r = this.#getBytes(address, length);
    return r;
  }

  canRead(address: u32 | bigint, length: number): boolean {
    if (typeof address === "bigint") {
      if (address >= 2n ** 32n) {
        return false;
      }
      address = <u32>Number(address);
    }
    return this.firstUnreadable(address, length) === undefined;
  }

  firstUnreadable(address: u32, length: number): u32 | undefined {
    const pages = this.#pagesInRange(address, length);
    for (const page of pages) {
      if (!this.acl.has(page)) {
        return <u32>(page * Zp);
      }
    }
  }

  canWrite(address: u32 | bigint, length: number): boolean {
    if (typeof address === "bigint") {
      if (address >= 2n ** 32n) {
        return false;
      }
      address = <u32>Number(address);
    }

    return this.firstUnwriteable(address, length) === undefined;
  }

  firstUnwriteable(address: u32, length: number): u32 | undefined {
    const pages = this.#pagesInRange(address, length);
    for (const page of pages) {
      if (!this.acl.has(page)) {
        return <u32>(page * Zp);
      }
      const kind = this.acl.get(page);
      if (kind === PVMMemoryAccessKind.Read) {
        return <u32>(page * Zp);
      }
    }
  }

  // TODO: rename to sbrk properly
  firstWriteableInHeap(size: u32): u32 | undefined {
    if (this.heap.pointer + size >= this.heap.end) {
      for (let i = 0; i < Math.ceil(size / Zp); i++) {
        // allocate one page
        //  log("allocating new page in heap", true);
        this.acl.set(this.heap.end / Zp + i, PVMMemoryAccessKind.Write);
        this.#innerMemoryContent.set(
          this.heap.end / Zp + i,
          new Uint8Array(Zp).fill(0),
        );
      }
      //const prevEnd = this.heap.end;
      this.heap.end = <u32>(this.heap.end + Math.ceil(size / Zp) * Zp);
      //log(
      //  `New heap end: 0x${this.heap.end.toString(16)} - ${this.heap.end} - from 0x${prevEnd.toString(16)} - ${prevEnd}`,
      //  true,
      //);
    }

    const oldPointer = this.heap.pointer;
    this.heap.pointer = <u32>(oldPointer + size);
    return oldPointer;
  }

  clone() {
    return new PVMMemory(
      new Map(this.#innerMemoryContent.entries()), // we crete a new identical map the setBytes will effectively clone the memory only if changes in the new instance.
      new Map(this.acl.entries()),
      { ...this.heap },
    ) as this;
  }

  toString() {
    let str = "";
    for (const [page, memory] of this.#innerMemoryContent.entries()) {
      str += `Page ${page}|0x${(page * Zp).toString(16)}: ${Buffer.from(memory).toString("hex")}\n`;
    }
    return str;
  }
}

export const toInBoundsMemoryAddress = (rawAddr: bigint): u32 => {
  assert(rawAddr < 2n ** 32n, "Address is out of memory bounds");
  return <u32>Number(rawAddr);
};

export const toSafeMemoryAddress = (rawAddr: u32 | bigint): u32 => {
  return <u32>Number(BigInt(rawAddr) % 2n ** 32n);
};
