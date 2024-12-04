import {
  Gas,
  PVMIxExecutionError,
  RegularPVMExitReason,
  u8,
} from "@tsjam/types";
import { regIx } from "@/instructions/ixdb.js";
import { err, ok } from "neverthrow";
import { IxMod } from "../utils";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const fallthrough = regIx<[]>({
  opCode: 1 as u8,
  identifier: "fallthrough",
  blockTermination: true,
  ix: {
    decode() {
      return ok([]);
    },
    evaluate(context) {
      return ok([IxMod.ip(context.execution.instructionPointer + 1)]);
    },
    gasCost: 1n as Gas,
  },
});

export const trap = regIx<[]>({
  opCode: 0 as u8,
  identifier: "trap",
  blockTermination: true,
  ix: {
    decode() {
      return ok([]);
    },
    evaluate() {
      return err(
        new PVMIxExecutionError(
          [],
          RegularPVMExitReason.Panic,
          "trap",
          false, // no double accounting
        ),
      );
    },
    gasCost: 1n as Gas,
  },
});
