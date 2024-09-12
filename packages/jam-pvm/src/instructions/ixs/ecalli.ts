/* eslint-disable @typescript-eslint/no-unused-vars */
import { PVMExitReason, u32, u8 } from "@vekexasia/jam-types";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { regIx } from "@/instructions/ixdb.js";

const ecalli = regIx<[u32]>({
  opCode: 78 as u8,
  identifier: "ecalli",
  ix: {
    decode(bytes: Uint8Array) {
      const lx = Math.min(4, bytes.length);
      return [readVarIntFromBuffer(bytes, lx as u8)];
    },
    evaluate(context, vX: u32) {
      return {
        exitReason: {
          type: "host-call",
          h: vX,
        },
      };
    },
    gasCost: 1n,
  },
});
