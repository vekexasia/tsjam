import { Zp } from "@tsjam/constants";
import {
  IPVMMemory,
  Page,
  PVMMemoryAccessKind,
  Tagged,
  u32,
} from "@tsjam/types";
import assert from "node:assert";
export type MemoryContent = { at: u32; content: Uint8Array };

/**
 * Defines the memory content of a single page
 */
export type PVMHeap = { start: u32; end: u32; pointer: u32 };
export class PVMMemory implements IPVMMemory {
  public innerMemoryContent = new Map<Page, Buffer>();
  constructor(
    initialMemory: MemoryContent[] | Map<Page, Buffer>,
    public acl: Map<
      Page,
      PVMMemoryAccessKind.Read | PVMMemoryAccessKind.Write
    >,
    public heap: PVMHeap,
  ) {
    // if initialMemory is a map, we can directly use it
    if (initialMemory instanceof Map) {
      this.innerMemoryContent = initialMemory;
    } else {
      this.innerMemoryContent = new Map();
      for (const page of acl.keys()) {
        this.innerMemoryContent.set(page, Buffer.alloc(Zp));
      }
      for (const { at, content } of initialMemory) {
        (this as PVMMemory as Tagged<PVMMemory, "canWrite">).setBytes(
          at,
          content,
        );
      }
    }
  }

  #locationFromAddress(address: u32) {
    return {
      page: <u32>Math.floor(address / Zp),
      offset: address % Zp,
    };
  }

  #pagesInRange(address: u32, length: number): Page[] {
    if (length === 0) {
      return [];
    }
    const { page: startPage, offset } = this.#locationFromAddress(address);
    const toRet: u32[] = new Array<u32>();
    toRet.push(startPage);
    let remaining = length - (Zp - offset);
    while (remaining > 0) {
      // we modulo on the max page number which is total ram / page size
      toRet.push(<u32>((toRet[toRet.length - 1] + 1) % (2 ** 32 / Zp)));
      remaining -= Zp;
    }
    return toRet;
  }

  changeAcl(
    page: Page,
    kind: PVMMemoryAccessKind.Read,
  ): Tagged<this, "canRead">;
  changeAcl(
    page: Page,
    kind: PVMMemoryAccessKind.Write,
  ): Tagged<this, "canWrite">;
  changeAcl(page: Page, kind: PVMMemoryAccessKind.Null): this;
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

  setBytes(
    this: Tagged<PVMMemory, "canWrite">,
    address: u32,
    bytes: Uint8Array,
  ) {
    if (bytes.length === 0) {
      return;
    }
    let remaining = bytes.length;
    let addressToWrite: u32 = address;
    let bufOffset = 0;
    while (remaining > 0) {
      const { page, offset } = this.#locationFromAddress(addressToWrite);
      const memory = this.innerMemoryContent.get(page)!;
      const bytesToWrite = Math.min(remaining, Zp - offset);
      memory.set(bytes.subarray(bufOffset, bufOffset + bytesToWrite), offset);
      // @ts-expect-error - i love typeguards
      addressToWrite += bytesToWrite;
      bufOffset += bytesToWrite;
      remaining -= bytesToWrite;
    }
    //log(
    //  `setBytes[${address.toString(16)}] = ${Buffer.from(bytes).toString("hex")} - l:${bytes.length}`,
    //  true,
    //);
  }

  getBytes(
    this: Tagged<PVMMemory, "canRead">,
    address: u32,
    length: number,
  ): Buffer {
    if (length === 0) {
      return Buffer.allocUnsafe(0);
    }
    const { page, offset } = this.#locationFromAddress(address);
    const memory = this.innerMemoryContent.get(page)!;
    const bytesToRead = Math.min(length, Zp - offset);
    // TODO: if we do this we need to make sure that the underlying memory is not changed
    //if (bytesToRead === length) {
    //  return memory.subarray(offset, offset + bytesToRead);
    //}
    const chunk = Buffer.allocUnsafe(length);
    memory.copy(chunk, 0, offset, offset + bytesToRead);
    // log(
    //   `getBytes[${address.toString(16)}] l:${length} v:${Buffer.from(chunk.slice()).toString("hex")}`,
    //   true,
    // );
    if (bytesToRead !== length) {
      const sub = this.getBytes(
        toSafeMemoryAddress(BigInt(address) + BigInt(bytesToRead)),
        length - bytesToRead,
      );
      chunk.set(sub, bytesToRead);
    }
    return chunk;
  }

  canRead(address: u32, length: number): this is Tagged<PVMMemory, "canRead"> {
    return typeof this.firstUnreadable(address, length) === "undefined";
  }

  firstUnreadable(address: u32, length: number): u32 | undefined {
    const pages = this.#pagesInRange(address, length);
    for (const page of pages) {
      if (!this.acl.has(page)) {
        return <u32>(page * Zp);
      }
    }
    // // apparently rw readings cant spawn rw section and heap
    // if (
    //   pages[0] * Zp < this.heap.start &&
    //   pages[pages.length - 1] * Zp >= this.heap.start
    // ) {
    //   return this.heap.start;
    // }
  }

  canWrite(
    address: u32,
    length: number,
  ): this is Tagged<PVMMemory, "canRead" | "canWrite"> {
    return this.firstUnwriteable(address, length) === undefined;
  }

  firstUnwriteable(address: u32, length: number): u32 | undefined {
    const pages = this.#pagesInRange(address, length);
    for (const page of pages) {
      const acl = this.acl.get(page);
      if (acl !== PVMMemoryAccessKind.Write) {
        return <u32>(page * Zp);
      }
    }
    // apparently rw readings CAN
    //
    //if (
    //  pages[0] * Zp < this.heap.start &&
    //  pages[pages.length - 1] * Zp >= this.heap.start
    //) {
    //  return this.heap.start;
    //}
  }

  // TODO: rename to sbrk properly
  firstWriteableInHeap(size: u32): u32 {
    if (this.heap.pointer + size >= this.heap.end) {
      const cnt = Math.ceil(size / Zp);
      for (let i = 0; i < cnt; i++) {
        // allocate one page
        //  log("allocating new page in heap", true);
        this.acl.set(this.heap.end / Zp + i, PVMMemoryAccessKind.Write);
        this.innerMemoryContent.set(this.heap.end / Zp + i, Buffer.alloc(Zp));
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
      new Map(this.innerMemoryContent.entries()), // we crete a new identical map the setBytes will effectively clone the memory only if changes in the new instance.
      new Map(this.acl.entries()),
      { ...this.heap },
    ) as this;
  }

  toString() {
    let str = "";
    for (const [page, memory] of this.innerMemoryContent.entries()) {
      str += `Page ${page}|0x${(page * Zp).toString(16)}: ${Buffer.from(memory).toString("hex")}\n`;
    }
    return str;
  }
}

export const toSafeMemoryAddress = (rawAddr: bigint): u32 => {
  return <u32>Number(rawAddr % 2n ** 32n);
};
