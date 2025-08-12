import { PVMProgramExecutionContextImpl } from "@/impls/pvm/pvm-program-execution-context-impl";
import { PVMRegisterImpl } from "@/impls/pvm/pvm-register-impl";
import { PVMRegistersImpl } from "@/impls/pvm/pvm-registers-impl";
import { PVMMemory } from "@/pvm";
import { applyMods } from "@/pvm/functions/utils";
import { Gas, IParsedProgram, PVMIx, PVMProgram, u32, u8 } from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import { vi } from "vitest";

const mockMemory = (): PVMMemory => {
  const pvmMemory = new PVMMemory([], new Map(), {
    pointer: <u32>0,
    start: <u32>0,
    end: <u32>0,
  });
  pvmMemory.setBytes = vi.fn();

  pvmMemory.setBytes = vi.fn();
  pvmMemory.getBytes = vi.fn();
  pvmMemory.canRead = vi.fn();
  pvmMemory.canWrite = vi.fn();
  pvmMemory.firstUnwriteable = vi.fn();
  pvmMemory.firstUnreadable = vi.fn();
  pvmMemory.changeAcl = vi.fn();
  pvmMemory.clone = vi.fn().mockReturnThis();
  pvmMemory.firstWriteableInHeap = vi.fn();
  return pvmMemory;
};
export const createEvContext = (): {
  execution: PVMProgramExecutionContextImpl;
  program: PVMProgram;
  parsedProgram: IParsedProgram;
} => ({
  execution: new PVMProgramExecutionContextImpl({
    instructionPointer: toTagged(0),
    gas: 0n as Gas,
    memory: mockMemory(),
    registers: new PVMRegistersImpl(
      toTagged(new Array(13).fill(null).map(() => new PVMRegisterImpl())),
    ),
  }),
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
  ix: PVMIx<T>,
  args: T,
) => {
  const r = ix.evaluate(args, ctx);
  return applyMods(ctx.execution, {} as object, r);
};
