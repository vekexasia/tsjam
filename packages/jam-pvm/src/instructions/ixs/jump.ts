import { u32, u8 } from "@vekexasia/jam-types";
import { LittleEndian } from "@vekexasia/jam-codec";
import { branch } from "@/utils/branch.js";
import { regIx } from "@/instructions/ixdb.js";

const jump = regIx<[u32]>({
  opCode: 5 as u8,
  identifier: "jump",
  blockTermination: true,
  ix: {
    decode(bytes) {
      const lx = Math.min(4, bytes.length - 1);

      const vx = LittleEndian.decode(bytes.subarray(1, lx + 1));
      return [Number(vx.value) as u32];
    },
    evaluate(context, vx) {
      return branch(context, vx, true);
    },
  },
});
