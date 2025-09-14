import * as console from "as-console";
export enum MemoryAccess {
  Read,
  Write,
  Null,
}
export type Page = u32;
const Zp: u32 = 2 ** 12;

export class PVMMemory {
  private acl: Map<Page, MemoryAccess>;
  private memoryContent: Map<Page, Uint8Array>;
  public heapStart: u32;
  public heapEnd: u32;
  public heapPointer: u32;
  constructor(
    acl: Map<Page, MemoryAccess>,
    memoryContent: Map<Page, Uint8Array>,
    heapStart: u32,
    heapEnd: u32,
    heapPointer: u32,
  ) {
    this.acl = acl;
    this.memoryContent = memoryContent;
    this.heapStart = heapStart;
    this.heapEnd = heapEnd;
    this.heapPointer = heapPointer;
  }

  deinit(): void {
    this.memoryContent = new Map();
    this.acl = new Map();
  }

  pageOf(address: u32): Page {
    return address / Zp;
  }

  offsetInPage(address: u32): u32 {
    return address % Zp;
  }

  pagesInRange(address: u32, length: u32): Page[] {
    if (length === 0) {
      return [];
    }
    const startPage = this.pageOf(address);
    const offset = this.offsetInPage(address);
    const toRet: Page[] = [startPage];
    let remaining: i64 = i64(length) - i64(Zp - offset);
    while (remaining > 0) {
      // we modulo on the max page number which is total ram / page size
      toRet.push((toRet[toRet.length - 1] + 1) % 2 ** 20);
      remaining -= Zp;
    }
    // console.log(`pagesInRange: ${toRet.join(", ")}`);
    return toRet;
  }

  /**
   * Returns the first unreadable address in the range [address, address + length[
   * or address - 1 if the whole range is readable
   */
  firstUnreadable(address: u32, length: u32): u32 {
    const pages = this.pagesInRange(address, length);
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      if (!this.acl.has(page)) {
        return <u32>(page * Zp);
      }
    }
    return address + length;
  }

  /**
   * Returns the first unwriteable address in the range [address, address + length[
   * or address - 1 if the whole range is writeable
   */
  firstUnwriteable(address: u32, length: u32): u32 {
    const pages = this.pagesInRange(address, length);
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      if (!this.acl.has(page) || this.acl.get(page) !== MemoryAccess.Write) {
        return page * Zp;
      }
    }
    return address + length;
  }

  canRead(address: u32, length: u32): boolean {
    return this.firstUnreadable(address, length) === address + length;
  }

  canWrite(address: u32, length: u32): boolean {
    return this.firstUnwriteable(address, length) === address + length;
  }

  readInto(address: u32, destination: Uint8Array): u32 {
    // eventually remove
    // assert(this.canRead(address, length), "memory region not readable");
    const toRead = u32(destination.length);
    let read = 0;
    let remaining = toRead;

    while (read != toRead) {
      const page = this.pageOf(address);
      const offset = this.offsetInPage(address);
      const memory = this.memoryContent.get(page);
      const amountToCopy = u32(Math.min(Zp - offset, remaining));
      destination.set(memory.subarray(offset, offset + amountToCopy), read);
      read += amountToCopy;
      remaining -= amountToCopy;
      address += Zp - offset;
    }
    return destination.length;
  }

  writeAt(address: u32, source: Uint8Array): u32 {
    let toWrite = i64(source.length);
    while (toWrite > 0) {
      const page = this.pageOf(address);
      const offset = this.offsetInPage(address);
      const memory = this.memoryContent.get(page);
      memory.set(
        source.subarray(0, <u32>Math.min(u32(toWrite), Zp - offset)),
        offset,
      );
      toWrite -= Zp - offset;
      address += Zp - offset;
    }
    return source.length;
  }

  sbrk(requestedSize: u32): u32 {
    if (this.heapPointer + requestedSize >= this.heapEnd) {
      const cnt = u32(Math.ceil(f64(requestedSize) / f64(Zp)));
      for (let i = u32(0); i < cnt; i++) {
        const newPage = this.heapEnd / Zp + i;
        // allocate one page
        this.acl.set(newPage, MemoryAccess.Write);
        this.memoryContent.set(newPage, new Uint8Array(Zp).fill(0));
      }
      //const prevEnd = this.heap.end;
      this.heapEnd = <u32>(this.heapEnd + cnt * Zp);
    }
    const oldPointer = this.heapPointer;
    this.heapPointer = oldPointer + requestedSize;
    return oldPointer;
  }
}
