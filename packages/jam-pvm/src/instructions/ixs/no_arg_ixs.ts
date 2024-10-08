import {
  PVMIxExecutionError,
  RegularPVMExitReason,
  u32,
  u8,
} from "@tsjam/types";
import { regIx } from "@/instructions/ixdb.js";
import { err, ok } from "neverthrow";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const fallthrough = regIx<[]>({
  opCode: 17 as u8,
  identifier: "fallthrough",
  blockTermination: true,
  ix: {
    decode() {
      return ok([]);
    },
    evaluate(context) {
      return ok([
        { type: "ip", data: (context.execution.instructionPointer + 1) as u32 },
      ]);
    },
    gasCost: 1n,
  },
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    gasCost: 1n,
  },
});
