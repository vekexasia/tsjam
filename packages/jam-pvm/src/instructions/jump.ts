import { GenericPVMInstruction } from "@/instructions/genericInstruction.js";
import { u32, u8 } from "@vekexasia/jam-types";
import assert from "node:assert";
import { LittleEndian } from "@vekexasia/jam-codec";

export const JumpIx: GenericPVMInstruction<[u32]> = {
  identifier: 5 as u8,
  name: "jump",
  decode(bytes) {
    assert(bytes[0] === this.identifier, "invalid identifier expected jump");
    const lx = Math.min(4, bytes.length - 1);

    const vx = LittleEndian.decode(bytes.subarray(1, lx + 1));
    return [Number(vx.value) as u32];
  },
  evaluate(context, vx) {
    assert(vx < context.memory.length, "jump target out of bounds");
    assert(context.program.k[vx] !== 1, "jump target is not an instruction");
    // TODO: implement check that the ix is actually a start block instruction
    return { nextInstructionPointer: vx };
  },
};
