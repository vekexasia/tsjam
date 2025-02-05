import {
  Gas,
  PVMIxDecodeError,
  PVMIxEvaluateFN,
  RegisterIdentifier,
  RegisterValue,
  u32,
  u8,
} from "@tsjam/types";
import { branch } from "@/utils/branch.js";
import { Z } from "@/utils/zed.js";
import { readVarIntFromBuffer } from "@/utils/varint.js";
import { regIx } from "@/instructions/ixdb.js";
import { E_sub } from "@tsjam/codec";
import { Result, err, ok } from "neverthrow";

// $(0.6.1 - A.25)
const decode = (
  bytes: Uint8Array,
): Result<
  [register: RegisterIdentifier, vx: RegisterValue, offset: u32],
  PVMIxDecodeError
> => {
  if (bytes.length === 0) {
    return err(new PVMIxDecodeError("no input bytes"));
  }
  const ra = Math.min(12, bytes[0] % 16) as RegisterIdentifier;
  const lx = Math.min(4, Math.floor(bytes[0] / 16) % 8);
  if (bytes.length < lx + 1) {
    return err(new PVMIxDecodeError("not enough bytes"));
  }
  const ly = Math.min(4, Math.max(0, bytes.length - 1 - lx));
  const vx = readVarIntFromBuffer(
    bytes.subarray(1, 1 + lx),
    lx as u8,
  ) as RegisterValue;
  // this is not vy as in the paper since we 're missing the current instruction pointer
  // at this stage. to get vy = ip + offset
  const offset = Number(
    Z(ly, E_sub(ly).decode(bytes.subarray(1 + lx, 1 + lx + ly)).value),
  ) as u32;
  return ok([ra, vx, offset]);
};

const create1Reg1IMM1OffsetIx = (
  identifier: u8,
  name: string,
  evaluate: PVMIxEvaluateFN<[RegisterIdentifier, RegisterValue, u32]>,
  blockTermination?: true,
) => {
  return regIx<[RegisterIdentifier, RegisterValue, u32]>({
    opCode: identifier,
    identifier: name,
    blockTermination,
    ix: {
      decode,
      evaluate(context, ri, vx, offset) {
        // in reality here offset is i32.
        const vy = (context.execution.instructionPointer + offset) as u32;
        return evaluate(context, ri, vx, vy);
      },
      gasCost: 1n as Gas,
    },
  });
};

export const load_imm_jump = create1Reg1IMM1OffsetIx(
  80 as u8,
  "load_imm_jump",
  (context, ri, vx, vy) => {
    const br = branch(context, vy, true);
    if (br.isOk()) {
      return ok([
        { type: "register", data: { index: ri, value: vx } },
        ...br.value,
      ]);
    }
    return br;
  },
  true,
);

export const branch_eq_imm = create1Reg1IMM1OffsetIx(
  81 as u8,
  "branch_eq_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, context.execution.registers[ri] === vx);
  },
  true,
);

export const branch_ne_imm = create1Reg1IMM1OffsetIx(
  82 as u8,
  "branch_ne_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, context.execution.registers[ri] != vx);
  },
  true,
);

export const branch_lt_u_imm = create1Reg1IMM1OffsetIx(
  83 as u8,
  "branch_lt_u_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, context.execution.registers[ri] < vx);
  },
  true,
);

export const branch_le_u_imm = create1Reg1IMM1OffsetIx(
  84 as u8,
  "branch_le_u_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, context.execution.registers[ri] <= vx);
  },
  true,
);

export const branch_ge_u_imm = create1Reg1IMM1OffsetIx(
  85 as u8,
  "branch_ge_u_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, context.execution.registers[ri] >= vx);
  },
  true,
);

export const branch_gt_u_imm = create1Reg1IMM1OffsetIx(
  86 as u8,
  "branch_gt_u_imm",
  (context, ri, vx, vy) => {
    return branch(context, vy, context.execution.registers[ri] > vx);
  },
  true,
);

export const branch_lt_s_imm = create1Reg1IMM1OffsetIx(
  87 as u8,
  "branch_lt_s_imm",
  (context, ri, vx, vy) => {
    return branch(
      context,
      vy,
      Z(8, context.execution.registers[ri]) < Z(8, vx),
    );
  },
  true,
);

export const branch_le_s_imm = create1Reg1IMM1OffsetIx(
  88 as u8,
  "branch_le_s_imm",
  (context, ri, vx, vy) => {
    return branch(
      context,
      vy,
      Z(8, context.execution.registers[ri]) <= Z(8, vx),
    );
  },
  true,
);

export const branch_ge_s_imm = create1Reg1IMM1OffsetIx(
  89 as u8,
  "branch_ge_s_imm",
  (context, ri, vx, vy) => {
    return branch(
      context,
      vy,
      Z(8, context.execution.registers[ri]) >= Z(8, vx),
    );
  },
  true,
);

export const branch_gt_s_imm = create1Reg1IMM1OffsetIx(
  90 as u8,
  "branch_gt_s_imm",
  (context, ri, vx, vy) => {
    return branch(
      context,
      vy,
      Z(8, context.execution.registers[ri]) > Z(8, vx),
    );
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
      )._unsafeUnwrap();
      expect(ri).toEqual(1);
      expect(vx).toEqual(0x12n);
      expect(offset).toEqual(0x110000);
    });
    it("should max use 4 if lx > 4 and 1 for offset", () => {
      const [ri, vx, offset] = decode(
        Uint8Array.from([encodeRaLx(1, 6), 0x12, 0x00, 0x00, 0x11, 1]),
      )._unsafeUnwrap();
      expect(ri).toEqual(1);
      expect(vx).toEqual(0x11000012n);
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
      )._unsafeUnwrap();
      expect(ri).toEqual(1);
      expect(vx).toEqual(0x11000012n);
      expect(offset).toEqual(0);
    });
    describe("errors", () => {
      it("should fail if no input bytes", () => {
        expect(decode(new Uint8Array([]))._unsafeUnwrapErr().message).toEqual(
          "no input bytes",
        );
      });
      it("should fail if not enough bytes", () => {
        expect(
          decode(new Uint8Array([encodeRaLx(1, 1)]))._unsafeUnwrapErr().message,
        ).toEqual("not enough bytes");
      });
    });
  });
}
