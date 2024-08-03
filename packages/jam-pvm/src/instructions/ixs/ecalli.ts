import { GenericPVMInstruction } from "@/instructions/genericInstruction.js";
import { u32, u8 } from "@vekexasia/jam-types";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import assert from "node:assert";

export const EcalliIx: GenericPVMInstruction<[u32]> = {
  identifier: 78 as u8,
  name: "ecalli",
  decode(data: Uint8Array) {
    assert(data[0] === this.identifier, "invalid identifier expected ecalli");
    return [readVarIntFromBuffer(data.subarray(1), (data.length - 1) as u8)];
  },
  evaluate(context, vX: u32) {
    // TODO: implement this
    // graypaper defines an exitreason for this instruction?
    // we should then check the hostcall exitreason and propagate it in case it exits
  },
};
