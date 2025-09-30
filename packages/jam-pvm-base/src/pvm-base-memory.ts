import { Zp } from "@tsjam/constants";
import { u32, Page, PVMMemoryAccessKind, Tagged } from "@tsjam/types";
import assert from "assert";
import { PVMMemory, PVMMemDump } from "./pvm-base";

export type PVMHeap = { start: u32; end: u32; pointer: u32 };
export class PVMBaseMemory implements PVMMemory<PVMBaseMemory> {
  public memoryContent: Map<Page, Buffer>;
  public acl: Map<Page, PVMMemoryAccessKind.Write | PVMMemoryAccessKind.Read>;
  public heap: PVMHeap;
  constructor(dump: PVMMemDump) {
    this.memoryContent = new Map();
    this.acl = new Map();
    this.heap = dump.heap;
  }

  writeAt(
    this: Tagged<PVMBaseMemory, "canWrite">,
    address: u32,
    buf: Buffer,
  ): void {
    if (buf.length === 0) {
      return;
    }
    let remaining = buf.length;
    let addressToWrite: u32 = address;
    let bufOffset = 0;
    while (remaining > 0) {
      const { page, offset } = this.#locationFromAddress(addressToWrite);
      const memory = this.memoryContent.get(page)!;
      const bytesToWrite = Math.min(remaining, Zp - offset);
      memory.set(buf.subarray(bufOffset, bufOffset + bytesToWrite), offset);
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

  readInto(address: u32, buf: Buffer): void {
    if (buf.length === 0) {
      return;
    }
    const length = buf.length;
    const { page, offset } = this.#locationFromAddress(address);
    const memory = this.memoryContent.get(page)!;
    const bytesToRead = Math.min(length, Zp - offset);
    memory.copy(buf, 0, offset, offset + bytesToRead);
    // log(
    //   `getBytes[${address.toString(16)}] l:${length} v:${Buffer.from(chunk.slice()).toString("hex")}`,
    //   true,
    // );
    if (bytesToRead !== length) {
      this.readInto(
        toSafeMemoryAddress(BigInt(address) + BigInt(bytesToRead)),
        buf.subarray(bytesToRead),
      );
    }
  }

  clone(): PVMBaseMemory {
    throw new Error("Method not implemented.");
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

  upsertACL(
    page: Page,
    kind: PVMMemoryAccessKind.Read,
  ): Tagged<PVMBaseMemory, "canRead">;
  upsertACL(
    page: Page,
    kind: PVMMemoryAccessKind.Write,
  ): Tagged<PVMBaseMemory, "canWrite">;
  upsertACL(page: Page, kind: PVMMemoryAccessKind.Null): PVMBaseMemory;
  upsertACL(page: Page, kind: PVMMemoryAccessKind): PVMBaseMemory {
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

  canRead(
    address: u32,
    length: number,
  ): this is Tagged<PVMBaseMemory, "canRead"> {
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
  ): this is Tagged<this, "canRead" | "canWrite"> {
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
  }

  sbrk(size: u32): u32 {
    if (this.heap.pointer + size >= this.heap.end) {
      const cnt = Math.ceil(size / Zp);
      for (let i = 0; i < cnt; i++) {
        // allocate one page
        //  log("allocating new page in heap", true);
        this.acl.set(this.heap.end / Zp + i, PVMMemoryAccessKind.Write);
        this.memoryContent.set(this.heap.end / Zp + i, Buffer.alloc(Zp));
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
}

export const toSafeMemoryAddress = (rawAddr: bigint): u32 => {
  return <u32>Number(rawAddr % 2n ** 32n);
};
