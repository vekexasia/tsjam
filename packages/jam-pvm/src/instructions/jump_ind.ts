import { RegularPVMExitReason } from "@/exitReason.js";
import { GenericPVMInstruction } from "@/instructions/genericInstruction.js";
import { u32, u8 } from "@vekexasia/jam-types";
import assert from "node:assert";
import { RegisterIdentifier } from "@/types.js";
import { readVarIntFromBuffer } from "@/utils/varint.js";
const ZA = 4;
export const JumpIndIx: GenericPVMInstruction<[RegisterIdentifier, u32]> = {
  identifier: 19 as u8,
  name: "jump_ind",
  decode(bytes) {
    assert(
      bytes[0] === this.identifier,
      "invalid identifier expected jump_ind",
    );
    const ra = Math.min(12, bytes[1] % 16);
    const lx = Math.min(4, Math.max(0, bytes.length - 2));
    const vx = readVarIntFromBuffer(bytes.subarray(2), lx as u8);

    return [ra as RegisterIdentifier, vx];
  },
  evaluate(context, ra, vx) {
    const wa = context.registers[ra];
    const jumpLocation = ((wa + vx) % 2 ** 32) as u32;

    // first branch of djump(a)
    if (jumpLocation == 2 ** 32 - 2 ** 16) {
      return { exitReason: RegularPVMExitReason.Halt };
    } else if (
      jumpLocation === 0 ||
      jumpLocation > context.program.j.length * ZA ||
      jumpLocation % ZA != 0 ||
      false /* TODO check if start of block context.program.j[jumpLocation / ZA] !== 1*/
    ) {
      return { exitReason: RegularPVMExitReason.Panic };
    }

    return {
      nextInstructionPointer: (context.program.j[
        Math.floor(jumpLocation / ZA)
      ] - 1) as u32,
    };
  },
};
