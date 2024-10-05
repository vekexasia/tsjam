/* eslint-disable @typescript-eslint/no-unused-vars */
import { PVMExitReason, u32, u8 } from "@tsjam/types";
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
      return [
        {
          type: "exit",
          data: { type: "host-call", opCode: vX as number as u8 },
        },
      ];
    },
    gasCost: 1n,
  },
});
