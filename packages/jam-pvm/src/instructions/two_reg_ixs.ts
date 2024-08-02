import { GenericPVMInstruction } from "@/instructions/genericInstruction.js";
import { u16, u32, u8 } from "@vekexasia/jam-types";
import assert from "node:assert";
import { RegisterIdentifier } from "@/types.js";

const create2RegIx = (
  identifier: u8,
  name: string,
  evaluate: GenericPVMInstruction<
    [RegisterIdentifier, RegisterIdentifier]
  >["evaluate"],
): GenericPVMInstruction<[RegisterIdentifier, RegisterIdentifier]> => {
  return {
    identifier,
    name,
    decode(bytes) {
      assert(
        bytes[0] === this.identifier,
        `invalid identifier expected ${name}`,
      );
      const rd = Math.min(12, bytes[1] % 16);
      const ra = Math.min(12, Math.floor(bytes[1] / 16));
      return [rd as RegisterIdentifier, ra as RegisterIdentifier];
    },
    evaluate,
  };
};

export const MoveRegIx = create2RegIx(
  82 as u8,
  "move_reg",
  (context, rd, ra) => {
    context.registers[rd] = context.registers[ra];
    return {};
  },
);

export const SBRKIx = create2RegIx(87 as u8, "sbrk", (context, rd, ra) => {
  //TODO implement sbrk
  return {};
});
