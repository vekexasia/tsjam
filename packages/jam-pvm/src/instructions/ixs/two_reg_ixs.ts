import { EvaluateFunction } from "@/instructions/genericInstruction.js";
import { u8 } from "@vekexasia/jam-types";
import { RegisterIdentifier } from "@/types.js";
import { regIx } from "@/instructions/ixdb.js";

const create2RegIx = (
  identifier: u8,
  name: string,
  evaluate: EvaluateFunction<[RegisterIdentifier, RegisterIdentifier]>,
) => {
  return regIx<[RegisterIdentifier, RegisterIdentifier]>({
    opCode: identifier,
    identifier: name,
    ix: {
      decode(bytes) {
        const rd = Math.min(12, bytes[1] % 16);
        const ra = Math.min(12, Math.floor(bytes[1] / 16));
        return [rd as RegisterIdentifier, ra as RegisterIdentifier];
      },
      evaluate,
    },
  });
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
