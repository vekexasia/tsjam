import "@/pvm/instructions/instructions.js";
import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import { toTagged } from "@tsjam/utils";
import {
  Gas,
  Page,
  PVMMemoryAccessKind,
  PVMProgramCode,
  PVMRegisterRawValue,
  Tagged,
  u32,
} from "@tsjam/types";
import JSONBig from "json-bigint";
import { basicInvocation, deblobProgram } from "@/pvm/invocations/basic";
import { PVMMemory } from "@/pvm/pvm-memory";
import {
  PVMExitReasonImpl,
  PVMIxEvaluateFNContextImpl,
  PVMProgramExecutionContextImpl,
  PVMRegisterImpl,
  PVMRegistersImpl,
} from "@/index";
const JSONBigNative = JSONBig({ useNativeBigInt: true });

describe("pvm", () => {
  const doTest = (filename: string) => () => {
    const json = JSONBigNative.parse(
      fs.readFileSync(`${__dirname}/fixtures/${filename}.json`, "utf-8"),
    );
    const pvmACL = new Map<
      Page,
      PVMMemoryAccessKind.Read | PVMMemoryAccessKind.Write
    >();

    for (const { address, length, "is-writable": isWritable } of json[
      "initial-page-map"
    ]) {
      for (let i = 0; i < length / 4096; i++) {
        pvmACL.set(
          Math.floor(address / 4096),
          isWritable ? PVMMemoryAccessKind.Write : PVMMemoryAccessKind.Read,
        );
      }
    }
    const execContext = new PVMProgramExecutionContextImpl({
      instructionPointer: toTagged(json["initial-pc"]),
      gas: toTagged(BigInt(json["initial-gas"]) as Gas),
      memory: new PVMMemory(
        json["initial-memory"].map(
          (v: { address: number; contents: number[] }) => ({
            at: v.address,
            content: Buffer.from(v.contents),
          }),
        ),
        pvmACL,
        { start: <u32>0, end: <u32>0, pointer: <u32>0 },
      ),
      registers: new PVMRegistersImpl(),
    });
    json["initial-regs"]
      .map((reg: number) => BigInt(reg))
      .forEach(
        (r: bigint, index: number) =>
          (execContext.registers.elements[index] = new PVMRegisterImpl(
            <PVMRegisterRawValue>r,
          )),
      );
    const res = deblobProgram(
      <PVMProgramCode>Buffer.from(<number[]>json.program),
    );
    let exitReason: PVMExitReasonImpl;
    if (res instanceof PVMExitReasonImpl) {
      exitReason = res;
    } else {
      exitReason = basicInvocation(
        res,
        new PVMIxEvaluateFNContextImpl({
          program: res,
          execution: execContext,
        }),
      );
    }
    if (exitReason.isPanic()) {
      expect("panic").toEqual(json["expected-status"]);
    } else if (exitReason.isHalt()) {
      expect("halt").toEqual(json["expected-status"]);
    } else if (exitReason.isOutOfGas()) {
      expect("out-of-gas").toEqual(json["expected-status"]);
    } else if (exitReason.isPageFault()) {
      expect("page-fault").toEqual(json["expected-status"]);
      expect(exitReason.address).toEqual(json["expected-page-fault-address"]);
    }

    expect(execContext.instructionPointer, "instruction pointer").toEqual(
      json["expected-pc"],
    );
    expect(execContext.registers.elements.map((a) => a.value)).toEqual(
      json["expected-regs"].map((reg: bigint | number) => BigInt(reg)),
    );
    for (const { address, contents } of json["expected-memory"]) {
      expect(
        (<Tagged<PVMMemory, "canRead">>execContext.memory).getBytes(
          address,
          contents.length,
        ),
      ).toEqual(Buffer.from(contents));
    }
    // expect(r.context.gas).toEqual(toTagged(BigInt(json["expected-gas"])));
  };

  /* NOTE: regenerate with
   * for i in $(ls); do X=$(echo $i | cut -d "." -f1); echo 'it("'$X'", doTest("'$X'"));'; done
   */
  it("gas_basic_consume_all", doTest("gas_basic_consume_all"));
  it("inst_add_32", doTest("inst_add_32"));
  it("inst_add_32_with_overflow", doTest("inst_add_32_with_overflow"));
  it("inst_add_32_with_truncation", doTest("inst_add_32_with_truncation"));
  it(
    "inst_add_32_with_truncation_and_sign_extension",
    doTest("inst_add_32_with_truncation_and_sign_extension"),
  );
  it("inst_add_64", doTest("inst_add_64"));
  it("inst_add_64_with_overflow", doTest("inst_add_64_with_overflow"));
  it("inst_add_imm_32", doTest("inst_add_imm_32"));
  it(
    "inst_add_imm_32_with_truncation",
    doTest("inst_add_imm_32_with_truncation"),
  );
  it(
    "inst_add_imm_32_with_truncation_and_sign_extension",
    doTest("inst_add_imm_32_with_truncation_and_sign_extension"),
  );
  it("inst_add_imm_64", doTest("inst_add_imm_64"));
  it("inst_and", doTest("inst_and"));
  it("inst_and_imm", doTest("inst_and_imm"));
  it("inst_branch_eq_imm_nok", doTest("inst_branch_eq_imm_nok"));
  it("inst_branch_eq_imm_ok", doTest("inst_branch_eq_imm_ok"));
  it("inst_branch_eq_nok", doTest("inst_branch_eq_nok"));
  it("inst_branch_eq_ok", doTest("inst_branch_eq_ok"));
  it(
    "inst_branch_greater_or_equal_signed_imm_nok",
    doTest("inst_branch_greater_or_equal_signed_imm_nok"),
  );
  it(
    "inst_branch_greater_or_equal_signed_imm_ok",
    doTest("inst_branch_greater_or_equal_signed_imm_ok"),
  );
  it(
    "inst_branch_greater_or_equal_signed_nok",
    doTest("inst_branch_greater_or_equal_signed_nok"),
  );
  it(
    "inst_branch_greater_or_equal_signed_ok",
    doTest("inst_branch_greater_or_equal_signed_ok"),
  );
  it(
    "inst_branch_greater_or_equal_unsigned_imm_nok",
    doTest("inst_branch_greater_or_equal_unsigned_imm_nok"),
  );
  it(
    "inst_branch_greater_or_equal_unsigned_imm_ok",
    doTest("inst_branch_greater_or_equal_unsigned_imm_ok"),
  );
  it(
    "inst_branch_greater_or_equal_unsigned_nok",
    doTest("inst_branch_greater_or_equal_unsigned_nok"),
  );
  it(
    "inst_branch_greater_or_equal_unsigned_ok",
    doTest("inst_branch_greater_or_equal_unsigned_ok"),
  );
  it(
    "inst_branch_greater_signed_imm_nok",
    doTest("inst_branch_greater_signed_imm_nok"),
  );
  it(
    "inst_branch_greater_signed_imm_ok",
    doTest("inst_branch_greater_signed_imm_ok"),
  );
  it(
    "inst_branch_greater_unsigned_imm_nok",
    doTest("inst_branch_greater_unsigned_imm_nok"),
  );
  it(
    "inst_branch_greater_unsigned_imm_ok",
    doTest("inst_branch_greater_unsigned_imm_ok"),
  );
  it(
    "inst_branch_less_or_equal_signed_imm_nok",
    doTest("inst_branch_less_or_equal_signed_imm_nok"),
  );
  it(
    "inst_branch_less_or_equal_signed_imm_ok",
    doTest("inst_branch_less_or_equal_signed_imm_ok"),
  );
  it(
    "inst_branch_less_or_equal_unsigned_imm_nok",
    doTest("inst_branch_less_or_equal_unsigned_imm_nok"),
  );
  it(
    "inst_branch_less_or_equal_unsigned_imm_ok",
    doTest("inst_branch_less_or_equal_unsigned_imm_ok"),
  );
  it(
    "inst_branch_less_signed_imm_nok",
    doTest("inst_branch_less_signed_imm_nok"),
  );
  it(
    "inst_branch_less_signed_imm_ok",
    doTest("inst_branch_less_signed_imm_ok"),
  );
  it("inst_branch_less_signed_nok", doTest("inst_branch_less_signed_nok"));
  it("inst_branch_less_signed_ok", doTest("inst_branch_less_signed_ok"));
  it(
    "inst_branch_less_unsigned_imm_nok",
    doTest("inst_branch_less_unsigned_imm_nok"),
  );
  it(
    "inst_branch_less_unsigned_imm_ok",
    doTest("inst_branch_less_unsigned_imm_ok"),
  );
  it("inst_branch_less_unsigned_nok", doTest("inst_branch_less_unsigned_nok"));
  it("inst_branch_less_unsigned_ok", doTest("inst_branch_less_unsigned_ok"));
  it("inst_branch_not_eq_imm_nok", doTest("inst_branch_not_eq_imm_nok"));
  it("inst_branch_not_eq_imm_ok", doTest("inst_branch_not_eq_imm_ok"));
  it("inst_branch_not_eq_nok", doTest("inst_branch_not_eq_nok"));
  it("inst_branch_not_eq_ok", doTest("inst_branch_not_eq_ok"));
  it("inst_cmov_if_zero_imm_nok", doTest("inst_cmov_if_zero_imm_nok"));
  it("inst_cmov_if_zero_imm_ok", doTest("inst_cmov_if_zero_imm_ok"));
  it("inst_cmov_if_zero_nok", doTest("inst_cmov_if_zero_nok"));
  it("inst_cmov_if_zero_ok", doTest("inst_cmov_if_zero_ok"));
  it("inst_div_signed_32", doTest("inst_div_signed_32"));
  it("inst_div_signed_32_by_zero", doTest("inst_div_signed_32_by_zero"));
  it(
    "inst_div_signed_32_with_overflow",
    doTest("inst_div_signed_32_with_overflow"),
  );
  it("inst_div_signed_64", doTest("inst_div_signed_64"));
  it("inst_div_signed_64_by_zero", doTest("inst_div_signed_64_by_zero"));
  it(
    "inst_div_signed_64_with_overflow",
    doTest("inst_div_signed_64_with_overflow"),
  );
  it("inst_div_unsigned_32", doTest("inst_div_unsigned_32"));
  it("inst_div_unsigned_32_by_zero", doTest("inst_div_unsigned_32_by_zero"));
  it(
    "inst_div_unsigned_32_with_overflow",
    doTest("inst_div_unsigned_32_with_overflow"),
  );
  it("inst_div_unsigned_64", doTest("inst_div_unsigned_64"));
  it("inst_div_unsigned_64_by_zero", doTest("inst_div_unsigned_64_by_zero"));
  it(
    "inst_div_unsigned_64_with_overflow",
    doTest("inst_div_unsigned_64_with_overflow"),
  );
  it("inst_fallthrough", doTest("inst_fallthrough"));
  it("inst_jump", doTest("inst_jump"));
  it(
    "inst_jump_indirect_invalid_djump_to_zero_nok",
    doTest("inst_jump_indirect_invalid_djump_to_zero_nok"),
  );
  it(
    "inst_jump_indirect_misaligned_djump_with_offset_nok",
    doTest("inst_jump_indirect_misaligned_djump_with_offset_nok"),
  );
  it(
    "inst_jump_indirect_misaligned_djump_without_offset_nok",
    doTest("inst_jump_indirect_misaligned_djump_without_offset_nok"),
  );
  it(
    "inst_jump_indirect_with_offset_ok",
    doTest("inst_jump_indirect_with_offset_ok"),
  );
  it(
    "inst_jump_indirect_without_offset_ok",
    doTest("inst_jump_indirect_without_offset_ok"),
  );
  it("inst_load_i16", doTest("inst_load_i16"));
  it("inst_load_i32", doTest("inst_load_i32"));
  it("inst_load_i8", doTest("inst_load_i8"));
  it("inst_load_imm", doTest("inst_load_imm"));
  it("inst_load_imm_64", doTest("inst_load_imm_64"));
  it("inst_load_imm_and_jump", doTest("inst_load_imm_and_jump"));
  it(
    "inst_load_imm_and_jump_indirect_different_regs_with_offset_ok",
    doTest("inst_load_imm_and_jump_indirect_different_regs_with_offset_ok"),
  );
  it(
    "inst_load_imm_and_jump_indirect_different_regs_without_offset_ok",
    doTest("inst_load_imm_and_jump_indirect_different_regs_without_offset_ok"),
  );
  it(
    "inst_load_imm_and_jump_indirect_invalid_djump_to_zero_different_regs_without_offset_nok",
    doTest(
      "inst_load_imm_and_jump_indirect_invalid_djump_to_zero_different_regs_without_offset_nok",
    ),
  );
  it(
    "inst_load_imm_and_jump_indirect_invalid_djump_to_zero_same_regs_without_offset_nok",
    doTest(
      "inst_load_imm_and_jump_indirect_invalid_djump_to_zero_same_regs_without_offset_nok",
    ),
  );
  it(
    "inst_load_imm_and_jump_indirect_misaligned_djump_different_regs_with_offset_nok",
    doTest(
      "inst_load_imm_and_jump_indirect_misaligned_djump_different_regs_with_offset_nok",
    ),
  );
  it(
    "inst_load_imm_and_jump_indirect_misaligned_djump_different_regs_without_offset_nok",
    doTest(
      "inst_load_imm_and_jump_indirect_misaligned_djump_different_regs_without_offset_nok",
    ),
  );
  it(
    "inst_load_imm_and_jump_indirect_misaligned_djump_same_regs_with_offset_nok",
    doTest(
      "inst_load_imm_and_jump_indirect_misaligned_djump_same_regs_with_offset_nok",
    ),
  );
  it(
    "inst_load_imm_and_jump_indirect_misaligned_djump_same_regs_without_offset_nok",
    doTest(
      "inst_load_imm_and_jump_indirect_misaligned_djump_same_regs_without_offset_nok",
    ),
  );
  it(
    "inst_load_imm_and_jump_indirect_same_regs_with_offset_ok",
    doTest("inst_load_imm_and_jump_indirect_same_regs_with_offset_ok"),
  );
  it(
    "inst_load_imm_and_jump_indirect_same_regs_without_offset_ok",
    doTest("inst_load_imm_and_jump_indirect_same_regs_without_offset_ok"),
  );
  it(
    "inst_load_indirect_i16_with_offset",
    doTest("inst_load_indirect_i16_with_offset"),
  );
  it(
    "inst_load_indirect_i16_without_offset",
    doTest("inst_load_indirect_i16_without_offset"),
  );
  it(
    "inst_load_indirect_i32_with_offset",
    doTest("inst_load_indirect_i32_with_offset"),
  );
  it(
    "inst_load_indirect_i32_without_offset",
    doTest("inst_load_indirect_i32_without_offset"),
  );
  it(
    "inst_load_indirect_i8_with_offset",
    doTest("inst_load_indirect_i8_with_offset"),
  );
  it(
    "inst_load_indirect_i8_without_offset",
    doTest("inst_load_indirect_i8_without_offset"),
  );
  it(
    "inst_load_indirect_u16_with_offset",
    doTest("inst_load_indirect_u16_with_offset"),
  );
  it(
    "inst_load_indirect_u16_without_offset",
    doTest("inst_load_indirect_u16_without_offset"),
  );
  it(
    "inst_load_indirect_u32_with_offset",
    doTest("inst_load_indirect_u32_with_offset"),
  );
  it(
    "inst_load_indirect_u32_without_offset",
    doTest("inst_load_indirect_u32_without_offset"),
  );
  it(
    "inst_load_indirect_u64_with_offset",
    doTest("inst_load_indirect_u64_with_offset"),
  );
  it(
    "inst_load_indirect_u64_without_offset",
    doTest("inst_load_indirect_u64_without_offset"),
  );
  it(
    "inst_load_indirect_u8_with_offset",
    doTest("inst_load_indirect_u8_with_offset"),
  );
  it(
    "inst_load_indirect_u8_without_offset",
    doTest("inst_load_indirect_u8_without_offset"),
  );
  it("inst_load_u16", doTest("inst_load_u16"));
  it("inst_load_u32", doTest("inst_load_u32"));
  it("inst_load_u64", doTest("inst_load_u64"));
  it("inst_load_u8", doTest("inst_load_u8"));
  it("inst_move_reg", doTest("inst_move_reg"));
  it("inst_mul_32", doTest("inst_mul_32"));
  it("inst_mul_64", doTest("inst_mul_64"));
  it("inst_mul_imm_32", doTest("inst_mul_imm_32"));
  it("inst_mul_imm_64", doTest("inst_mul_imm_64"));
  it("inst_negate_and_add_imm_32", doTest("inst_negate_and_add_imm_32"));
  it("inst_negate_and_add_imm_64", doTest("inst_negate_and_add_imm_64"));
  it("inst_or", doTest("inst_or"));
  it("inst_or_imm", doTest("inst_or_imm"));
  it("inst_rem_signed_32", doTest("inst_rem_signed_32"));
  it("inst_rem_signed_32_by_zero", doTest("inst_rem_signed_32_by_zero"));
  it(
    "inst_rem_signed_32_with_overflow",
    doTest("inst_rem_signed_32_with_overflow"),
  );
  it("inst_rem_signed_64", doTest("inst_rem_signed_64"));
  it("inst_rem_signed_64_by_zero", doTest("inst_rem_signed_64_by_zero"));
  it(
    "inst_rem_signed_64_with_overflow",
    doTest("inst_rem_signed_64_with_overflow"),
  );
  it("inst_rem_unsigned_32", doTest("inst_rem_unsigned_32"));
  it("inst_rem_unsigned_32_by_zero", doTest("inst_rem_unsigned_32_by_zero"));
  it("inst_rem_unsigned_64", doTest("inst_rem_unsigned_64"));
  it("inst_rem_unsigned_64_by_zero", doTest("inst_rem_unsigned_64_by_zero"));
  it("inst_ret_halt", doTest("inst_ret_halt"));
  it("inst_ret_invalid", doTest("inst_ret_invalid"));
  it(
    "inst_set_greater_than_signed_imm_0",
    doTest("inst_set_greater_than_signed_imm_0"),
  );
  it(
    "inst_set_greater_than_signed_imm_1",
    doTest("inst_set_greater_than_signed_imm_1"),
  );
  it(
    "inst_set_greater_than_unsigned_imm_0",
    doTest("inst_set_greater_than_unsigned_imm_0"),
  );
  it(
    "inst_set_greater_than_unsigned_imm_1",
    doTest("inst_set_greater_than_unsigned_imm_1"),
  );
  it("inst_set_less_than_signed_0", doTest("inst_set_less_than_signed_0"));
  it("inst_set_less_than_signed_1", doTest("inst_set_less_than_signed_1"));
  it(
    "inst_set_less_than_signed_imm_0",
    doTest("inst_set_less_than_signed_imm_0"),
  );
  it(
    "inst_set_less_than_signed_imm_1",
    doTest("inst_set_less_than_signed_imm_1"),
  );
  it("inst_set_less_than_unsigned_0", doTest("inst_set_less_than_unsigned_0"));
  it("inst_set_less_than_unsigned_1", doTest("inst_set_less_than_unsigned_1"));
  it(
    "inst_set_less_than_unsigned_imm_0",
    doTest("inst_set_less_than_unsigned_imm_0"),
  );
  it(
    "inst_set_less_than_unsigned_imm_1",
    doTest("inst_set_less_than_unsigned_imm_1"),
  );
  it(
    "inst_shift_arithmetic_right_32",
    doTest("inst_shift_arithmetic_right_32"),
  );
  it(
    "inst_shift_arithmetic_right_32_with_overflow",
    doTest("inst_shift_arithmetic_right_32_with_overflow"),
  );
  it(
    "inst_shift_arithmetic_right_64",
    doTest("inst_shift_arithmetic_right_64"),
  );
  it(
    "inst_shift_arithmetic_right_64_with_overflow",
    doTest("inst_shift_arithmetic_right_64_with_overflow"),
  );
  it(
    "inst_shift_arithmetic_right_imm_32",
    doTest("inst_shift_arithmetic_right_imm_32"),
  );
  it(
    "inst_shift_arithmetic_right_imm_64",
    doTest("inst_shift_arithmetic_right_imm_64"),
  );
  it(
    "inst_shift_arithmetic_right_imm_alt_32",
    doTest("inst_shift_arithmetic_right_imm_alt_32"),
  );
  it(
    "inst_shift_arithmetic_right_imm_alt_64",
    doTest("inst_shift_arithmetic_right_imm_alt_64"),
  );
  it("inst_shift_logical_left_32", doTest("inst_shift_logical_left_32"));
  it(
    "inst_shift_logical_left_32_with_overflow",
    doTest("inst_shift_logical_left_32_with_overflow"),
  );
  it("inst_shift_logical_left_64", doTest("inst_shift_logical_left_64"));
  it(
    "inst_shift_logical_left_64_with_overflow",
    doTest("inst_shift_logical_left_64_with_overflow"),
  );
  it(
    "inst_shift_logical_left_imm_32",
    doTest("inst_shift_logical_left_imm_32"),
  );
  it(
    "inst_shift_logical_left_imm_64",
    doTest("inst_shift_logical_left_imm_64"),
  );
  it(
    "inst_shift_logical_left_imm_alt_32",
    doTest("inst_shift_logical_left_imm_alt_32"),
  );
  it(
    "inst_shift_logical_left_imm_alt_64",
    doTest("inst_shift_logical_left_imm_alt_64"),
  );
  it("inst_shift_logical_right_32", doTest("inst_shift_logical_right_32"));
  it(
    "inst_shift_logical_right_32_with_overflow",
    doTest("inst_shift_logical_right_32_with_overflow"),
  );
  it("inst_shift_logical_right_64", doTest("inst_shift_logical_right_64"));
  it(
    "inst_shift_logical_right_64_with_overflow",
    doTest("inst_shift_logical_right_64_with_overflow"),
  );
  it(
    "inst_shift_logical_right_imm_32",
    doTest("inst_shift_logical_right_imm_32"),
  );
  it(
    "inst_shift_logical_right_imm_64",
    doTest("inst_shift_logical_right_imm_64"),
  );
  it(
    "inst_shift_logical_right_imm_alt_32",
    doTest("inst_shift_logical_right_imm_alt_32"),
  );
  it(
    "inst_shift_logical_right_imm_alt_64",
    doTest("inst_shift_logical_right_imm_alt_64"),
  );
  it(
    "inst_store_imm_indirect_u16_with_offset_nok",
    doTest("inst_store_imm_indirect_u16_with_offset_nok"),
  );
  it(
    "inst_store_imm_indirect_u16_with_offset_ok",
    doTest("inst_store_imm_indirect_u16_with_offset_ok"),
  );
  it(
    "inst_store_imm_indirect_u16_without_offset_ok",
    doTest("inst_store_imm_indirect_u16_without_offset_ok"),
  );
  it(
    "inst_store_imm_indirect_u32_with_offset_nok",
    doTest("inst_store_imm_indirect_u32_with_offset_nok"),
  );
  it(
    "inst_store_imm_indirect_u32_with_offset_ok",
    doTest("inst_store_imm_indirect_u32_with_offset_ok"),
  );
  it(
    "inst_store_imm_indirect_u32_without_offset_ok",
    doTest("inst_store_imm_indirect_u32_without_offset_ok"),
  );
  it(
    "inst_store_imm_indirect_u64_with_offset_nok",
    doTest("inst_store_imm_indirect_u64_with_offset_nok"),
  );
  it(
    "inst_store_imm_indirect_u64_with_offset_ok",
    doTest("inst_store_imm_indirect_u64_with_offset_ok"),
  );
  it(
    "inst_store_imm_indirect_u64_without_offset_ok",
    doTest("inst_store_imm_indirect_u64_without_offset_ok"),
  );
  it(
    "inst_store_imm_indirect_u8_with_offset_nok",
    doTest("inst_store_imm_indirect_u8_with_offset_nok"),
  );
  it(
    "inst_store_imm_indirect_u8_with_offset_ok",
    doTest("inst_store_imm_indirect_u8_with_offset_ok"),
  );
  it(
    "inst_store_imm_indirect_u8_without_offset_ok",
    doTest("inst_store_imm_indirect_u8_without_offset_ok"),
  );
  it("inst_store_imm_u16", doTest("inst_store_imm_u16"));
  it("inst_store_imm_u32", doTest("inst_store_imm_u32"));
  it("inst_store_imm_u64", doTest("inst_store_imm_u64"));
  it("inst_store_imm_u8", doTest("inst_store_imm_u8"));
  it(
    "inst_store_imm_u8_trap_inaccessible",
    doTest("inst_store_imm_u8_trap_inaccessible"),
  );
  it(
    "inst_store_indirect_u16_with_offset_nok",
    doTest("inst_store_indirect_u16_with_offset_nok"),
  );
  it(
    "inst_store_indirect_u16_with_offset_ok",
    doTest("inst_store_indirect_u16_with_offset_ok"),
  );
  it(
    "inst_store_indirect_u16_without_offset_ok",
    doTest("inst_store_indirect_u16_without_offset_ok"),
  );
  it(
    "inst_store_indirect_u32_with_offset_nok",
    doTest("inst_store_indirect_u32_with_offset_nok"),
  );
  it(
    "inst_store_indirect_u32_with_offset_ok",
    doTest("inst_store_indirect_u32_with_offset_ok"),
  );
  it(
    "inst_store_indirect_u32_without_offset_ok",
    doTest("inst_store_indirect_u32_without_offset_ok"),
  );
  it(
    "inst_store_indirect_u64_with_offset_nok",
    doTest("inst_store_indirect_u64_with_offset_nok"),
  );
  it(
    "inst_store_indirect_u64_with_offset_ok",
    doTest("inst_store_indirect_u64_with_offset_ok"),
  );
  it(
    "inst_store_indirect_u64_without_offset_ok",
    doTest("inst_store_indirect_u64_without_offset_ok"),
  );
  it(
    "inst_store_indirect_u8_with_offset_nok",
    doTest("inst_store_indirect_u8_with_offset_nok"),
  );
  it(
    "inst_store_indirect_u8_with_offset_ok",
    doTest("inst_store_indirect_u8_with_offset_ok"),
  );
  it(
    "inst_store_indirect_u8_without_offset_ok",
    doTest("inst_store_indirect_u8_without_offset_ok"),
  );
  it("inst_store_u16", doTest("inst_store_u16"));
  it("inst_store_u32", doTest("inst_store_u32"));
  it("inst_store_u64", doTest("inst_store_u64"));
  it("inst_store_u8", doTest("inst_store_u8"));
  it("inst_sub_32", doTest("inst_sub_32"));
  it("inst_sub_32_with_overflow", doTest("inst_sub_32_with_overflow"));
  it("inst_sub_64", doTest("inst_sub_64"));
  it("inst_sub_64_with_overflow", doTest("inst_sub_64_with_overflow"));
  it("inst_sub_imm_32", doTest("inst_sub_imm_32"));
  it("inst_sub_imm_64", doTest("inst_sub_imm_64"));
  it("inst_trap", doTest("inst_trap"));
  it("inst_xor", doTest("inst_xor"));
  it("inst_xor_imm", doTest("inst_xor_imm"));
  it("riscv_rv64ua_amoadd_d", doTest("riscv_rv64ua_amoadd_d"));
  it("riscv_rv64ua_amoadd_w", doTest("riscv_rv64ua_amoadd_w"));
  it("riscv_rv64ua_amoand_d", doTest("riscv_rv64ua_amoand_d"));
  it("riscv_rv64ua_amoand_w", doTest("riscv_rv64ua_amoand_w"));
  it("riscv_rv64ua_amomax_d", doTest("riscv_rv64ua_amomax_d"));
  it("riscv_rv64ua_amomax_w", doTest("riscv_rv64ua_amomax_w"));
  it("riscv_rv64ua_amomaxu_d", doTest("riscv_rv64ua_amomaxu_d"));
  it("riscv_rv64ua_amomaxu_w", doTest("riscv_rv64ua_amomaxu_w"));
  it("riscv_rv64ua_amomin_d", doTest("riscv_rv64ua_amomin_d"));
  it("riscv_rv64ua_amomin_w", doTest("riscv_rv64ua_amomin_w"));
  it("riscv_rv64ua_amominu_d", doTest("riscv_rv64ua_amominu_d"));
  it("riscv_rv64ua_amominu_w", doTest("riscv_rv64ua_amominu_w"));
  it("riscv_rv64ua_amoor_d", doTest("riscv_rv64ua_amoor_d"));
  it("riscv_rv64ua_amoor_w", doTest("riscv_rv64ua_amoor_w"));
  it("riscv_rv64ua_amoswap_d", doTest("riscv_rv64ua_amoswap_d"));
  it("riscv_rv64ua_amoswap_w", doTest("riscv_rv64ua_amoswap_w"));
  it("riscv_rv64ua_amoxor_d", doTest("riscv_rv64ua_amoxor_d"));
  it("riscv_rv64ua_amoxor_w", doTest("riscv_rv64ua_amoxor_w"));
  it("riscv_rv64uc_rvc", doTest("riscv_rv64uc_rvc"));
  it("riscv_rv64ui_add", doTest("riscv_rv64ui_add"));
  it("riscv_rv64ui_addi", doTest("riscv_rv64ui_addi"));
  it("riscv_rv64ui_addiw", doTest("riscv_rv64ui_addiw"));
  it("riscv_rv64ui_addw", doTest("riscv_rv64ui_addw"));
  it("riscv_rv64ui_and", doTest("riscv_rv64ui_and"));
  it("riscv_rv64ui_andi", doTest("riscv_rv64ui_andi"));
  it("riscv_rv64ui_beq", doTest("riscv_rv64ui_beq"));
  it("riscv_rv64ui_bge", doTest("riscv_rv64ui_bge"));
  it("riscv_rv64ui_bgeu", doTest("riscv_rv64ui_bgeu"));
  it("riscv_rv64ui_blt", doTest("riscv_rv64ui_blt"));
  it("riscv_rv64ui_bltu", doTest("riscv_rv64ui_bltu"));
  it("riscv_rv64ui_bne", doTest("riscv_rv64ui_bne"));
  it("riscv_rv64ui_jal", doTest("riscv_rv64ui_jal"));
  it("riscv_rv64ui_jalr", doTest("riscv_rv64ui_jalr"));
  it("riscv_rv64ui_lb", doTest("riscv_rv64ui_lb"));
  it("riscv_rv64ui_lbu", doTest("riscv_rv64ui_lbu"));
  it("riscv_rv64ui_ld", doTest("riscv_rv64ui_ld"));
  it("riscv_rv64ui_lh", doTest("riscv_rv64ui_lh"));
  it("riscv_rv64ui_lhu", doTest("riscv_rv64ui_lhu"));
  it("riscv_rv64ui_lui", doTest("riscv_rv64ui_lui"));
  it("riscv_rv64ui_lw", doTest("riscv_rv64ui_lw"));
  it("riscv_rv64ui_lwu", doTest("riscv_rv64ui_lwu"));
  it("riscv_rv64ui_ma_data", doTest("riscv_rv64ui_ma_data"));
  it("riscv_rv64ui_or", doTest("riscv_rv64ui_or"));
  it("riscv_rv64ui_ori", doTest("riscv_rv64ui_ori"));
  it("riscv_rv64ui_sb", doTest("riscv_rv64ui_sb"));
  it("riscv_rv64ui_sd", doTest("riscv_rv64ui_sd"));
  it("riscv_rv64ui_sh", doTest("riscv_rv64ui_sh"));
  it("riscv_rv64ui_simple", doTest("riscv_rv64ui_simple"));
  it("riscv_rv64ui_sll", doTest("riscv_rv64ui_sll"));
  it("riscv_rv64ui_slli", doTest("riscv_rv64ui_slli"));
  it("riscv_rv64ui_slliw", doTest("riscv_rv64ui_slliw"));
  it("riscv_rv64ui_sllw", doTest("riscv_rv64ui_sllw"));
  it("riscv_rv64ui_slt", doTest("riscv_rv64ui_slt"));
  it("riscv_rv64ui_slti", doTest("riscv_rv64ui_slti"));
  it("riscv_rv64ui_sltiu", doTest("riscv_rv64ui_sltiu"));
  it("riscv_rv64ui_sltu", doTest("riscv_rv64ui_sltu"));
  it("riscv_rv64ui_sra", doTest("riscv_rv64ui_sra"));
  it("riscv_rv64ui_srai", doTest("riscv_rv64ui_srai"));
  it("riscv_rv64ui_sraiw", doTest("riscv_rv64ui_sraiw"));
  it("riscv_rv64ui_sraw", doTest("riscv_rv64ui_sraw"));
  it("riscv_rv64ui_srl", doTest("riscv_rv64ui_srl"));
  it("riscv_rv64ui_srli", doTest("riscv_rv64ui_srli"));
  it("riscv_rv64ui_srliw", doTest("riscv_rv64ui_srliw"));
  it("riscv_rv64ui_srlw", doTest("riscv_rv64ui_srlw"));
  it("riscv_rv64ui_sub", doTest("riscv_rv64ui_sub"));
  it("riscv_rv64ui_subw", doTest("riscv_rv64ui_subw"));
  it("riscv_rv64ui_sw", doTest("riscv_rv64ui_sw"));
  it("riscv_rv64ui_xor", doTest("riscv_rv64ui_xor"));
  it("riscv_rv64ui_xori", doTest("riscv_rv64ui_xori"));
  it("riscv_rv64um_div", doTest("riscv_rv64um_div"));
  it("riscv_rv64um_divu", doTest("riscv_rv64um_divu"));
  it("riscv_rv64um_divuw", doTest("riscv_rv64um_divuw"));
  it("riscv_rv64um_divw", doTest("riscv_rv64um_divw"));
  it("riscv_rv64um_mul", doTest("riscv_rv64um_mul"));
  it("riscv_rv64um_mulh", doTest("riscv_rv64um_mulh"));
  it("riscv_rv64um_mulhsu", doTest("riscv_rv64um_mulhsu"));
  it("riscv_rv64um_mulhu", doTest("riscv_rv64um_mulhu"));
  it("riscv_rv64um_mulw", doTest("riscv_rv64um_mulw"));
  it("riscv_rv64um_rem", doTest("riscv_rv64um_rem"));
  it("riscv_rv64um_remu", doTest("riscv_rv64um_remu"));
  it("riscv_rv64um_remuw", doTest("riscv_rv64um_remuw"));
  it("riscv_rv64um_remw", doTest("riscv_rv64um_remw"));
  it("riscv_rv64uzbb_andn", doTest("riscv_rv64uzbb_andn"));
  it("riscv_rv64uzbb_clz", doTest("riscv_rv64uzbb_clz"));
  it("riscv_rv64uzbb_clzw", doTest("riscv_rv64uzbb_clzw"));
  it("riscv_rv64uzbb_cpop", doTest("riscv_rv64uzbb_cpop"));
  it("riscv_rv64uzbb_cpopw", doTest("riscv_rv64uzbb_cpopw"));
  it("riscv_rv64uzbb_ctz", doTest("riscv_rv64uzbb_ctz"));
  it("riscv_rv64uzbb_ctzw", doTest("riscv_rv64uzbb_ctzw"));
  it("riscv_rv64uzbb_max", doTest("riscv_rv64uzbb_max"));
  it("riscv_rv64uzbb_maxu", doTest("riscv_rv64uzbb_maxu"));
  it("riscv_rv64uzbb_min", doTest("riscv_rv64uzbb_min"));
  it("riscv_rv64uzbb_minu", doTest("riscv_rv64uzbb_minu"));
  it("riscv_rv64uzbb_orc_b", doTest("riscv_rv64uzbb_orc_b"));
  it("riscv_rv64uzbb_orn", doTest("riscv_rv64uzbb_orn"));
  it("riscv_rv64uzbb_rev8", doTest("riscv_rv64uzbb_rev8"));
  it("riscv_rv64uzbb_rol", doTest("riscv_rv64uzbb_rol"));
  it("riscv_rv64uzbb_rolw", doTest("riscv_rv64uzbb_rolw"));
  it("riscv_rv64uzbb_ror", doTest("riscv_rv64uzbb_ror"));
  it("riscv_rv64uzbb_rori", doTest("riscv_rv64uzbb_rori"));
  it("riscv_rv64uzbb_roriw", doTest("riscv_rv64uzbb_roriw"));
  it("riscv_rv64uzbb_rorw", doTest("riscv_rv64uzbb_rorw"));
  it("riscv_rv64uzbb_sext_b", doTest("riscv_rv64uzbb_sext_b"));
  it("riscv_rv64uzbb_sext_h", doTest("riscv_rv64uzbb_sext_h"));
  it("riscv_rv64uzbb_xnor", doTest("riscv_rv64uzbb_xnor"));
  it("riscv_rv64uzbb_zext_h", doTest("riscv_rv64uzbb_zext_h"));
});
