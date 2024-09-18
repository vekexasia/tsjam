import { vi } from "vitest";
import {
  IPVMMemory,
  IParsedProgram,
  PVMProgram,
  PVMProgramExecutionContext,
  SeqOfLength,
  u32,
  u8,
} from "@vekexasia/jam-types";
import { toTagged } from "@vekexasia/jam-utils";

const mockMemory = (): IPVMMemory => ({
  setBytes: vi.fn(),
  getBytes: vi.fn(),
  canRead: vi.fn(),
  canWrite: vi.fn(),
});
export const createEvContext = (): {
  execution: PVMProgramExecutionContext;
  program: PVMProgram;
  parsedProgram: IParsedProgram;
} => ({
  execution: {
    instructionPointer: toTagged(0),
    gas: toTagged(0n),
    memory: mockMemory(),
    registers: new Array(13).fill(0 as u8) as SeqOfLength<u32, 13>,
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
