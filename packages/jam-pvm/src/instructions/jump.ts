import { GenericPVMInstruction } from "@/instructions/genericInstruction.js";
import { u32, u8 } from "@vekexasia/jam-types";
import assert from "node:assert";
import { LittleEndian } from "@vekexasia/jam-codec";
import { branch } from "@/utils/branch.js";

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
    return branch(context, vx, true);
  },
};
