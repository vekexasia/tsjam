/* eslint-disable @typescript-eslint/no-unused-vars */
import { u32, u8 } from "@vekexasia/jam-types";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { regIx } from "@/instructions/ixdb.js";

const ecalli = regIx<[u32]>({
  opCode: 78 as u8,
  identifier: "ecalli",
  ix: {
    decode(data: Uint8Array) {
      return [readVarIntFromBuffer(data.subarray(1), (data.length - 1) as u8)];
    },
    evaluate(context, vX: u32) {
      // TODO: implement this
      // graypaper defines an exitreason for this instruction?
      // we should then check the hostcall exitreason and propagate it in case it exits
    },
    gasCost: 1n,
  },
});
