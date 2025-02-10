import { PVMIxEvaluateFNContext, RegisterIdentifier } from "@tsjam/types";
import { BlockTermination, Ix } from "@/instructions/ixdb.js";
import assert from "node:assert";
import { E_8 } from "@tsjam/codec";
import { IxMod } from "@/instructions/utils.js";

// $(0.6.1 - A.20)
const OneRegOneExtImmArgsIxDecoder = (
  bytes: Uint8Array,
  context: PVMIxEvaluateFNContext,
) => {
  assert(bytes.length > 0, "no input bytes");
  const rA = Math.min(12, bytes[0] % 16) as RegisterIdentifier;

  const vX = E_8.decode(bytes.subarray(1, 1 + 8)).value;

  return { rA, wA: context.execution.registers[rA], vX };
};

export type OneRegOneExtImmArgs = ReturnType<
  typeof OneRegOneExtImmArgsIxDecoder
>;

class OneRegOneExtImmIxs {
  @Ix(20, OneRegOneExtImmArgsIxDecoder)
  @BlockTermination
  load_imm_64({ rA, vX }: OneRegOneExtImmArgs) {
    return [IxMod.reg(rA, vX)];
  }
}
