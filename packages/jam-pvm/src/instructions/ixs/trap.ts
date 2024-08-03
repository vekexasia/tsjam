import { RegularPVMExitReason } from "@/exitReason.js";
import { GenericPVMInstruction } from "@/instructions/genericInstruction.js";
import { u8 } from "@vekexasia/jam-types";

export const TrapIx: GenericPVMInstruction<[]> = {
  identifier: 0 as u8,
  name: "trap",
  decode() {
    return [];
  },
  evaluate() {
    return { exitReason: RegularPVMExitReason.Panic };
  },
};
