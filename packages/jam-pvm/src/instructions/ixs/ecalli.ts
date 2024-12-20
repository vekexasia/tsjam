/* eslint-disable @typescript-eslint/no-unused-vars */
import { err, ok } from "neverthrow";
import { Gas, PVMIxExecutionError, u64, u8 } from "@tsjam/types";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { regIx } from "@/instructions/ixdb.js";

// $(0.5.3 - A.15)
export const ecalli = regIx<[u8]>({
  opCode: 10 as u8,
  identifier: "ecalli",
  ix: {
    decode(bytes: Uint8Array) {
      const lx = Math.min(4, bytes.length);
      return ok([Number(readVarIntFromBuffer(bytes, lx as u8)) as u8]);
    },
    evaluate(context, vX) {
      return err(
        new PVMIxExecutionError(
          [],
          { type: "host-call", opCode: Number(vX) as u8 },
          "ecalli",
          false,
        ),
      );
    },
    gasCost: 1n as Gas,
  },
});
