import { PVMBaseMemory, PVMMemDump } from "@tsjam/pvm-base";

/**
 * Defines the memory content of a single page
 */
export class PVMJSMemory extends PVMBaseMemory {
  constructor(dump: PVMMemDump) {
    super(dump);
    this.memoryContent = new Map(
      [...dump.pages.entries()].map(([page, { data }]) => [page, data]),
    );
    this.acl = new Map(
      [...dump.pages.entries()].map(([page, x]) => [page, x.acl]),
    );

    this.heap = dump.heap;
  }
}
