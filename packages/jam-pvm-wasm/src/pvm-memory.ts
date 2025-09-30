import { PVMBaseMemory, PVMMemDump } from "@tsjam/pvm-base";
import { Page, PVMMemoryAccessKind, Tagged, u32 } from "@tsjam/types";
import assert from "assert";
export type PVMHeap = { start: u32; end: u32; pointer: u32 };
export class PVMWasmMemory extends PVMBaseMemory {
  constructor(memDump: PVMMemDump) {
    super(memDump);
    // we allocate the memory so that it's aligned in wasm
    const nPages = memDump.pages.size;
    const buf = Buffer.allocUnsafe(4 + (4 + 4) * nPages + nPages * 4096);
    buf.writeUInt32LE(nPages);
    let b = buf.subarray(4);
    for (const [page, { acl, data }] of memDump.pages.entries()) {
      b.writeUInt32LE(page);
      b.writeUInt32LE(acl, 4);
      b.set(data, 8);
      b = b.subarray(8 + 4096);
      this.memoryContent.set(page, b.subarray(8, 8 + 4096));
      this.acl.set(page, acl);
    }
  }

  upsertACL(
    page: Page,
    kind: PVMMemoryAccessKind.Read,
  ): Tagged<PVMWasmMemory, "canRead">;
  upsertACL(
    page: Page,
    kind: PVMMemoryAccessKind.Write,
  ): Tagged<PVMWasmMemory, "canWrite">;
  upsertACL(page: Page, kind: PVMMemoryAccessKind.Null): PVMWasmMemory;
  upsertACL(page: Page, kind: PVMMemoryAccessKind): PVMWasmMemory {
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
}
