import { RegularPVMExitReason, u8 } from "@vekexasia/jam-types";
import { regIx } from "@/instructions/ixdb.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const fallthrough = regIx<[]>({
  opCode: 17 as u8,
  identifier: "fallthrough",
  blockTermination: true,
  ix: {
    decode() {
      return [];
    },
    evaluate(context) {
      context.execution.instructionPointer++;
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
      return [];
    },
    evaluate() {
      return { exitReason: RegularPVMExitReason.Panic };
    },
    gasCost: 1n,
  },
});

// TODO: implement tests?
