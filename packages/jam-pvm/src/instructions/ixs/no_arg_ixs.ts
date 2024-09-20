import { RegularPVMExitReason, u32, u8 } from "@vekexasia/jam-types";
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
      return [
        { type: "ip", data: (context.execution.instructionPointer + 1) as u32 },
      ];
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
      return [{ type: "exit", data: RegularPVMExitReason.Panic, dio: "can" }];
    },
    gasCost: 1n,
  },
});
