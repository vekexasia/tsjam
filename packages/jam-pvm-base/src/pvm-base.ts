import {
  Gas,
  PVMMemoryAccessKind,
  PVMProgram,
  Tagged,
  u32,
} from "@tsjam/types";
import { PVMExitReasonImpl } from "./pvm-exit-reason";
import { PVMRegistersImpl } from "./pvm-registers";

export type Page = number;
export type PVMMemDump = {
  pages: Map<
    Page,
    { acl: PVMMemoryAccessKind.Read | PVMMemoryAccessKind.Write; data: Buffer }
  >;
  heap: { start: u32; end: u32; pointer: u32 };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface PVMMemory<T extends PVMMemory<any>> {
  firstUnreadable(address: u32, length: number): u32 | undefined;

  /**
   * check if can read from memory
   */
  canRead(address: u32, length: number): this is Tagged<T, "canRead">;
  /**
   * read from memory into a buffer ( the length of the buffer is the length to read )
   */
  readInto(this: Tagged<T, "canRead">, address: u32, buf: Buffer): void;

  /**
   * check if can write into memory
   */
  canWrite(
    address: number,
    length: number,
  ): this is Tagged<T, "canWrite" | "canRead">;

  firstUnwriteable(address: u32, length: number): u32 | undefined;
  /**
   * write from buffer into memory ( the length of the buffer is the length to write )
   */
  writeAt(this: Tagged<T, "canWrite">, address: number, buf: Buffer): void;

  /**
   * change the ACL of a memory page
   */
  upsertACL(page: Page, kind: PVMMemoryAccessKind.Read): Tagged<T, "canRead">;
  upsertACL(page: Page, kind: PVMMemoryAccessKind.Write): Tagged<T, "canWrite">;
  upsertACL(page: Page, kind: PVMMemoryAccessKind.Null): T;

  /**
   * provide a memory dump of the current memory state
   * Buffers should be copies of the internal memory
   */
  clone(): T;
}

/**
 * Base class for implementations to extend/implement
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface PVMBase<T extends PVMMemory<any>> {
  readonly memory: T;
  pc: u32;
  gas: Gas;
  registers: PVMRegistersImpl;

  /**
   * should run the pvm until it exits either for failure or hostcall
   */
  run(): PVMExitReasonImpl;

  /**
   * deinit pvm if implementation needs it
   */
  deinit(): void;

  set_debug(value: boolean): void;
}

export type BaseMemory = PVMMemory<BaseMemory>;

export type PVM = PVMBase<BaseMemory>;

export interface PVMImplementation<P extends PVM, M extends BaseMemory> {
  buildMemory(memDump: PVMMemDump): M;
  buildPVM(conf: {
    mem: M;
    regs: PVMRegistersImpl;
    gas: Gas;
    pc: u32;
    program: PVMProgram;
  }): P;
}
