import { u32, u8 } from "@vekexasia/jam-types";
import { EvaluateFunction } from "@/instructions/genericInstruction.js";
import { RegisterIdentifier } from "@/types.js";
import { branch } from "@/utils/branch.js";
import { Z } from "@/utils/zed.js";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { regIx } from "@/instructions/ixdb.js";
import assert from "node:assert";
import { E_sub } from "@vekexasia/jam-codec";

const decode = (
  bytes: Uint8Array,
): [register: RegisterIdentifier, vx: u32, offset: u32] => {
  assert(bytes.length > 0, "no input bytes");
  const ra = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const lx = Math.min(4, Math.floor(bytes[0] / 16) % 8);
  assert(bytes.length >= lx + 1, "not enough bytes");
  const ly = Math.min(4, Math.max(0, bytes.length - 1 - lx));
  const vx = readVarIntFromBuffer(bytes.subarray(1, 1 + lx), lx as u8);
  // this is not vy as in the paper since we 're missing the current instruction pointer
  // at this stage. to get vy = ip + offset
  const offset = Z(
    ly,
    Number(E_sub(ly).decode(bytes.subarray(1 + lx, 1 + lx + ly)).value),
  ) as u32;
  return [ra, vx, offset];
};

const create1Reg1IMM1OffsetIx = (
  identifier: u8,
  name: string,
  evaluate: EvaluateFunction<[RegisterIdentifier, u32, u32]>,
  blockTermination?: true,
) => {
  return regIx<[RegisterIdentifier, u32, u32]>({
    opCode: identifier,
    identifier: name,
    blockTermination,
    ix: {
      decode,
      evaluate(context, ri, vx, offset) {
        // in reality here offset is i32.
        const vy = (context.instructionPointer + offset) as u32;
        return evaluate(context, ri, vx, vy);
      },
    },
  });
};

export const load_imm_jump = create1Reg1IMM1OffsetIx(
  6 as u8,
  "load_imm_jump",
  (context, ri, vx, vy) => {
    context.registers[ri] = vx;
    return branch(context, vy, true);
  },
  true,
);

export const branch_eq_imm = create1Reg1IMM1OffsetIx(
  7 as u8,
  "branch_eq_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, context.registers[ri] === vx);
  },
  true,
);

export const branch_ne_imm = create1Reg1IMM1OffsetIx(
  15 as u8,
  "branch_ne_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, context.registers[ri] != vx);
  },
  true,
);

export const branch_lt_u_imm = create1Reg1IMM1OffsetIx(
  44 as u8,
  "branch_lt_u_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, context.registers[ri] < vx);
  },
  true,
);

export const branch_le_u_imm = create1Reg1IMM1OffsetIx(
  59 as u8,
  "branch_le_u_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, context.registers[ri] <= vx);
  },
  true,
);

export const branch_ge_u_imm = create1Reg1IMM1OffsetIx(
  52 as u8,
  "branch_ge_u_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, context.registers[ri] >= vx);
  },
  true,
);

export const branch_gt_u_imm = create1Reg1IMM1OffsetIx(
  50 as u8,
  "branch_gt_u_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, context.registers[ri] > vx);
  },
  true,
);

export const branch_lt_s_imm = create1Reg1IMM1OffsetIx(
  32 as u8,
  "branch_lt_s_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, Z(4, context.registers[ri]) < Z(4, vx));
  },
  true,
);

export const branch_le_s_imm = create1Reg1IMM1OffsetIx(
  46 as u8,
  "branch_le_s_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, Z(4, context.registers[ri]) <= Z(4, vx));
  },
  true,
);

export const branch_ge_s_imm = create1Reg1IMM1OffsetIx(
  45 as u8,
  "branch_ge_s_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, Z(4, context.registers[ri]) >= Z(4, vx));
  },
  true,
);

export const branch_gt_s_imm = create1Reg1IMM1OffsetIx(
  53 as u8,
  "branch_gt_s_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, Z(4, context.registers[ri]) > Z(4, vx));
  },
  true,
);
if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  describe("decode", () => {
    const encodeRaLx = (ra: number, lx: number) => {
      return ra + lx * 16;
    };
    it("should decode 1Reg1IMM1Offset", () => {
      const [ri, vx, offset] = decode(
        Uint8Array.from([encodeRaLx(1, 1), 0x12, 0x00, 0x00, 0x11]),
      );
      expect(ri).toEqual(1);
      expect(vx).toEqual(0x12000000);
      expect(offset).toEqual(0x110000);
    });
    it("should put 0 in vx if lx is 0", () => {
      const [ri, vx, offset] = decode(
        Uint8Array.from([encodeRaLx(1, 0), 0x11]),
      );
      expect(ri).toEqual(1);
      expect(vx).toEqual(0);
      expect(offset).toEqual(0x11);
    });
    it("should max use 4 if lx > 4 and 1 for offset", () => {
      const [ri, vx, offset] = decode(
        Uint8Array.from([encodeRaLx(1, 6), 0x12, 0x00, 0x00, 0x11, 1]),
      );
      expect(ri).toEqual(1);
      expect(vx).toEqual(0x12000011);
      expect(offset).toEqual(1);
    });
    it("should discard extra bytes", () => {
      const [ri, vx, offset] = decode(
        Uint8Array.from([
          encodeRaLx(1, 4),
          0x12,
          0x00,
          0x00,
          0x11,
          0x00,
          0x00,
          0x00,
          0x00,
          1, // extra byte
        ]),
      );
      expect(ri).toEqual(1);
      expect(vx).toEqual(0x12000011);
      expect(offset).toEqual(0);
    });
    it("should decode when lx is 0 and no other bytes", () => {
      const [ri, vx, offset] = decode(Uint8Array.from([encodeRaLx(1, 0)]));
      expect(ri).toEqual(1);
      expect(vx).toEqual(0);
      expect(offset).toEqual(0);
    });
    describe("errors", () => {
      it("should fail if no input bytes", () => {
        expect(() => decode(new Uint8Array([]))).toThrow("no input bytes");
      });
      it("should fail if not enough bytes", () => {
        expect(() => decode(new Uint8Array([encodeRaLx(1, 1)]))).toThrow(
          "not enough bytes",
        );
      });
    });
  });
}
