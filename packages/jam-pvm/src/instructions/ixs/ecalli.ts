import { u8 } from "@tsjam/types";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { Ix } from "@/instructions/ixdb.js";
import assert from "node:assert";
import { IxMod } from "../utils";

// $(0.6.1 - A.19)
export const OneImmIxDecoder = (bytes: Uint8Array) => {
  const lx = Math.min(4, bytes.length);
  const vX = readVarIntFromBuffer(bytes, lx as u8);
  assert(vX <= 255n, "value is too large");
  return { vX: <u8>Number(readVarIntFromBuffer(bytes, lx as u8)) };
};

export type OneImmArgs = ReturnType<typeof OneImmIxDecoder>;

class OneImmIxs {
  @Ix(10, OneImmIxDecoder)
  ecalli({ vX }: OneImmArgs) {
    return [IxMod.hostCall(vX)];
  }
}
