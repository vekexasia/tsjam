import { EvaluationContext } from "@/evaluationContext.js";
import { vi } from "vitest";
import { PVMMemory } from "@/pvmMemory.js";
import { SeqOfLength, u32, u8 } from "../../jam-types/dist/types/genericTypes";

const mockMemory = (): typeof PVMMemory => ({
  set: vi.fn(),
  setBytes: vi.fn(),
  get: vi.fn(),
  getBytes: vi.fn(),
});
export const createEvContext = (): EvaluationContext => ({
  instructionPointer: 0,
  memory: mockMemory(),
  program: {
    j: [],
    z: null as any,
    c: null as any,
    k: [],
  },
  registers: new Array(13).fill(0 as u8) as SeqOfLength<u32, 13>,
});
