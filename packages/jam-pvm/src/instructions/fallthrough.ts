import { GenericPVMInstruction } from "@/instructions/genericInstruction.js";
import { u8 } from "@vekexasia/jam-types";

export const FallthroughIx: GenericPVMInstruction<[]> = {
  identifier: 17 as u8,
  name: "fallthrough",
  evaluate() {
    // TODO: implement this is not specified in the paper. most likely its a useless instruction
    return {};
  },
};
