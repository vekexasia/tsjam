import { vi } from "vitest";
import {
  Gas,
  IPVMMemory,
  IParsedProgram,
  PVMIx,
  PVMIxExecutionError,
  PVMProgram,
  PVMProgramExecutionContext,
  RegisterValue,
  SeqOfLength,
  u8,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import { applyMods } from "@/functions/utils";

const mockMemory = (): IPVMMemory => ({
  setBytes: vi.fn(),
  getBytes: vi.fn(),
  canRead: vi.fn(),
  canWrite: vi.fn(),
  firstUnwriteable: vi.fn(),
  firstUnreadable: vi.fn(),
  changeAcl: vi.fn(),
  clone: vi.fn().mockReturnThis(),
  firstWriteableInHeap: vi.fn(),
});
export const createEvContext = (): {
  execution: PVMProgramExecutionContext;
  program: PVMProgram;
  parsedProgram: IParsedProgram;
} => ({
  execution: {
    instructionPointer: toTagged(0),
    gas: 0n as Gas,
    memory: mockMemory(),
    registers: new Array(13).fill(0n as RegisterValue) as SeqOfLength<
      RegisterValue,
      13
    >,
  },
  program: {
    j: [],
    z: 0 as u8,
    c: new Uint8Array(0),
    k: [],
  },
  parsedProgram: {
    isBlockBeginning: vi.fn(),
    ixAt: vi.fn(),
    skip: vi.fn(),
  },
});

export const runTestIx = <T extends unknown[]>(
  ctx: ReturnType<typeof createEvContext>,
  ix: PVMIx<T, PVMIxExecutionError>,
  ...args: T
) => {
  const r = ix.evaluate(ctx, ...args);
  // FIXME: this should be properly handled
  if (r.isErr()) {
    throw new Error(`Error in ix: ${r.error}`);
  }
  return applyMods(ctx.execution, {} as object, r.value);
};
