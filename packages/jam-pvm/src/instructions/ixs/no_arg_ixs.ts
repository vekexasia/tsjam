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
    evaluate() {
      // TODO: implement this is not specified in the paper. most likely its a useless instruction
    },
  },
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const trap = regIx<[]>({
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

// TODO: implement tests?
