import { EvaluationContext } from "@/evaluationContext.js";
import { vi } from "vitest";
import { PVMMemory } from "@/pvmMemory.js";
import { SeqOfLength, toTagged, u32, u8 } from "@vekexasia/jam-types";

const mockMemory = (): typeof PVMMemory => ({
  set: vi.fn(),
  setBytes: vi.fn(),
  get: vi.fn(),
  getBytes: vi.fn(),
});
export const createEvContext = (): EvaluationContext => ({
  instructionPointer: toTagged(0),
  memory: mockMemory(),
  program: {
    j: [],
    z: null as any,
    c: null as any,
    k: [],
  },
  meta: {
    blockBeginnings: new Set<u32>(),
    ixSkips: new Map<u32, u32>(),
  },
  registers: new Array(13).fill(0 as u8) as SeqOfLength<u32, 13>,
});
