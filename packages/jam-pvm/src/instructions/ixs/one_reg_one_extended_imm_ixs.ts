import { Result, ok } from "neverthrow";
import {
  Gas,
  PVMIxDecodeError,
  PVMIxEvaluateFN,
  PVMIxExecutionError,
  RegisterIdentifier,
  u64,
  u8,
} from "@tsjam/types";
import { regIx } from "@/instructions/ixdb.js";
import assert from "node:assert";
import { E_8 } from "@tsjam/codec";
import { IxMod } from "@/instructions/utils.js";

type InputType = [register: RegisterIdentifier, value: u64];

// $(0.5.4 - A.18)
const decode = (bytes: Uint8Array): Result<InputType, PVMIxDecodeError> => {
  assert(bytes.length > 0, "no input bytes");
  const ra = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const vx = E_8.decode(bytes.subarray(2, 2 + 8)).value;

  return ok([ra, vx as u64]);
};

const create1Reg1ExtendedIMMIx = (
  opCode: u8,
  identifier: string,
  evaluate: PVMIxEvaluateFN<InputType, PVMIxExecutionError>,
  blockTermination?: true,
) => {
  return regIx({
    opCode,
    identifier,
    blockTermination,
    ix: {
      decode,
      evaluate,
      gasCost: 1n as Gas,
    },
  });
};

export const load_imm_64 = create1Reg1ExtendedIMMIx(
  20 as u8,
  "load_imm_64",
  (context, rA, vx) => {
    return ok([IxMod.reg(rA, vx)]);
  },
  true,
);
