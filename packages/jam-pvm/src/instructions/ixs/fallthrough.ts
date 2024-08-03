import { u8 } from "@vekexasia/jam-types";
import { regIx } from "@/instructions/ixdb.js";

export const FallthroughIx = regIx<[]>({
  opCode: 17 as u8,
  identifier: "fallthrough",
  blockTermination: true,
  ix: {
    decode() {
      return [];
    },
    evaluate() {
      // TODO: implement this is not specified in the paper. most likely its a useless instruction
      return {};
    },
  },
});
