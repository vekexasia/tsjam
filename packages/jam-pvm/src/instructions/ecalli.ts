import { GenericPVMInstruction } from "@/instructions/genericInstruction.js";
import { u32, u8 } from "@vekexasia/jam-types";
import { EvaluationContext } from "@/evaluationContext.js";

export const EcalliIx: GenericPVMInstruction<[u32]> = {
  identifier: 78 as u8,
  name: "ecalli",
  decode(
    context: EvaluationContext,
    data: Uint8Array,
    offset: u32,
  ): { args: [u32]; nextOffset: u32 } {
    return { args: [data[offset]], nextOffset: offset + 4 };
  },
  evaluate(context, hostCallIndex: u32) {
    // TODO: implement this
    // graypaper defines an exitreason for this instruction?
    // we should then check the hostcall exitreason and propagate it in case it exits
    return {};
  },
};
