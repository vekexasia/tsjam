import { vi } from "vitest";
import { PVMMemory } from "@/pvmMemory.js";
import {
  IParsedProgram,
  PVMIx,
  PVMProgram,
  PVMProgramExecutionContext,
  SeqOfLength,
  u32,
  u8,
} from "@vekexasia/jam-types";
import { toTagged } from "@vekexasia/jam-utils";

const mockMemory = (): typeof PVMMemory => ({
  set: vi.fn(),
  setBytes: vi.fn(),
  get: vi.fn(),
  getBytes: vi.fn(),
});
export const createEvContext = (): Parameters<PVMIx<any>["evaluate"]>[0] => ({
  execution: {
    instructionPointer: toTagged(0),
    gas: toTagged(0),
    memory: mockMemory(),
    registers: new Array(13).fill(0 as u8) as SeqOfLength<u32, 13>,
  },
  program: {
    j: [],
    z: null as any,
    c: null as any,
    k: [],
  },
  parsedProgram: {
    isBlockBeginning: vi.fn(),
    ixAt: vi.fn(),
    skip: vi.fn(),
  },
});
