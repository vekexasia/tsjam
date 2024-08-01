import { GenericPVMInstruction } from "@/instructions/genericInstruction.js";
import { u32, u8 } from "@vekexasia/jam-types";

export const EcalliIx: GenericPVMInstruction<u32> = {
  identifier: 78 as u8,
  name: "ecalli",
  byteSize: (1 + 4) as u8,
  evaluate(hostCallIndex: u32) {
    // TODO: implement this
    // graypaper defines an exitreason for this instruction?
    // we should then check the hostcall exitreason and propagate it in case it exits
    return {};
  },
};
