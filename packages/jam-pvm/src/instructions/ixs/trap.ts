import { RegularPVMExitReason } from "@/exitReason.js";
import { u8 } from "@vekexasia/jam-types";
import { regIx } from "@/instructions/ixdb.js";

export const TrapIx = regIx<[]>({
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
  },
});
