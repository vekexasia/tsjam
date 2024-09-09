import { vi } from "vitest";
import { IPVMMemory, PVMIx, SeqOfLength, u32, u8 } from "@vekexasia/jam-types";
import { toTagged } from "@vekexasia/jam-utils";

const mockMemory = (): IPVMMemory => ({
  setBytes: vi.fn(),
  getBytes: vi.fn(),
});
export const createEvContext = (): Parameters<PVMIx<any>["evaluate"]>[0] => ({
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
