import { E_2, E_2_int, E_4, E_4_int, E_8, encodeWithCodec } from "@tsjam/codec";
import { Zp } from "@tsjam/constants";
import { PVMIxReturnMods, PVMProgramExecutionContext, u32 } from "@tsjam/types";
import { branch } from "../utils/branch";
import { djump } from "../utils/djump";
import { Z, Z4, Z8, Z8_inv } from "../utils/zed";
import { PVMIxEvaluateFNContextImpl } from "@/impls";
import {
  NoArgIxArgs,
  NoArgIxDecoder,
  OneImmArgs,
  OneImmIxDecoder,
  OneOffsetArgs,
  OneOffsetIxDecoder,
  OneRegOneExtImmArgs,
  OneRegOneExtImmArgsIxDecoder,
  OneRegOneImmArgs,
  OneRegOneImmIxDecoder,
  OneRegOneIMMOneOffsetArgs,
  OneRegOneIMMOneOffsetIxDecoder,
  OneRegTwoImmArgs,
  OneRegTwoImmIxDecoder,
  ThreeRegArgs,
  ThreeRegIxDecoder,
  TwoImmArgs,
  TwoImmIxDecoder,
  TwoRegArgs,
  TwoRegIxDecoder,
  TwoRegOneImmArgs,
  TwoRegOneImmIxDecoder,
  TwoRegOneOffsetArgs,
  TwoRegOneOffsetIxDecoder,
  TwoRegTwoImmIxArgs,
  TwoRegTwoImmIxDecoder,
} from "./decoders";
import { BlockTermination, Ix } from "./ixdb";
import { IxMod, smod, X_4, X_8, X_fn } from "./utils";
import { toSafeMemoryAddress } from "../pvm-memory";

/**
 * This class holds the ixs implementations.
 * But in reality the decorators are calling the `regIx` function
 * which store the implementation (and the ix configuration) in the `IxDb`.
 */
export class Instructions {
  @Ix(0, NoArgIxDecoder)
  @BlockTermination
  trap(_: NoArgIxArgs, context: PVMIxEvaluateFNContextImpl) {
    return [IxMod.ip(context.execution.instructionPointer), IxMod.panic()];
  }

  @Ix(1, NoArgIxDecoder)
  @BlockTermination
  fallthrough(_: NoArgIxArgs, context: PVMIxEvaluateFNContextImpl) {
    return [IxMod.ip(context.execution.instructionPointer + 1)];
  }

  @Ix(10, OneImmIxDecoder)
  ecalli({ vX }: OneImmArgs) {
    return [IxMod.hostCall(vX)];
  }

  @Ix(20, OneRegOneExtImmArgsIxDecoder)
  @BlockTermination
  load_imm_64({ rA, vX }: OneRegOneExtImmArgs) {
    return [IxMod.reg(rA, vX)];
  }

  @Ix(30, TwoImmIxDecoder)
  store_imm_u8({ vX, vY }: TwoImmArgs) {
    return [IxMod.memory(vX, new Uint8Array([Number(vY % 256n)]))];
  }

  @Ix(31, TwoImmIxDecoder)
  store_imm_u16({ vX, vY }: TwoImmArgs) {
    return [IxMod.memory(vX, encodeWithCodec(E_2, vY % 2n ** 16n))];
  }

  @Ix(32, TwoImmIxDecoder)
  store_imm_u32({ vX, vY }: TwoImmArgs) {
    return [IxMod.memory(vX, encodeWithCodec(E_4, vY % 2n ** 32n))];
  }

  @Ix(33, TwoImmIxDecoder)
  store_imm_u64({ vX, vY }: TwoImmArgs) {
    return [IxMod.memory(vX, encodeWithCodec(E_8, BigInt(vY)))];
  }

  @Ix(40, OneOffsetIxDecoder)
  @BlockTermination
  jump({ vX }: OneOffsetArgs, context: PVMIxEvaluateFNContextImpl) {
    return branch(context, vX, true);
  }

  @Ix(50, OneRegOneImmIxDecoder)
  @BlockTermination
  jump_ind({ wA, vX }: OneRegOneImmArgs, context: PVMIxEvaluateFNContextImpl) {
    const jumpLocation = Number((wA.value + vX) % 2n ** 32n) as u32;
    return [...djump(context, jumpLocation)];
  }

  // ### Load unsigned
  @Ix(51, OneRegOneImmIxDecoder)
  load_imm({ rA, vX }: OneRegOneImmArgs) {
    return [IxMod.reg(rA, vX)];
  }

  @Ix(52, OneRegOneImmIxDecoder)
  load_u8({ rA, vX }: OneRegOneImmArgs, context: PVMIxEvaluateFNContextImpl) {
    const memoryAddress = toSafeMemoryAddress(vX);

    if (!context.execution.memory.canRead(memoryAddress, 1)) {
      return handleMemoryFault(
        context.execution.memory.firstUnreadable(memoryAddress, 1)!,
        context.execution,
      );
    }

    return [
      IxMod.reg(
        rA,
        context.execution.memory.getBytes(memoryAddress, 1)[0] as number as u32,
      ),
    ];
  }

  @Ix(54, OneRegOneImmIxDecoder)
  load_u16({ rA, vX }: OneRegOneImmArgs, context: PVMIxEvaluateFNContextImpl) {
    const memoryAddress = toSafeMemoryAddress(vX);
    if (!context.execution.memory.canRead(memoryAddress, 2)) {
      return handleMemoryFault(
        context.execution.memory.firstUnreadable(memoryAddress, 2)!,
        context.execution,
      );
    }

    return [
      IxMod.reg(
        rA,
        E_2_int.decode(context.execution.memory.getBytes(memoryAddress, 2))
          .value,
      ),
    ];
  }

  @Ix(56, OneRegOneImmIxDecoder)
  load_u32({ rA, vX }: OneRegOneImmArgs, context: PVMIxEvaluateFNContextImpl) {
    const memoryAddress = toSafeMemoryAddress(vX);
    if (!context.execution.memory.canRead(memoryAddress, 4)) {
      return handleMemoryFault(
        context.execution.memory.firstUnreadable(memoryAddress, 4)!,
        context.execution,
      );
    }
    return [
      IxMod.reg(
        rA,
        E_4_int.decode(context.execution.memory.getBytes(memoryAddress, 4))
          .value,
      ),
    ];
  }

  @Ix(58, OneRegOneImmIxDecoder)
  load_u64({ rA, vX }: OneRegOneImmArgs, context: PVMIxEvaluateFNContextImpl) {
    const memoryAddress = toSafeMemoryAddress(vX);
    if (!context.execution.memory.canRead(memoryAddress, 8)) {
      return handleMemoryFault(
        context.execution.memory.firstUnreadable(memoryAddress, 8)!,
        context.execution,
      );
    }

    return [
      IxMod.reg(
        rA,
        E_8.decode(context.execution.memory.getBytes(memoryAddress, 8)).value,
      ),
    ];
  }

  // ### Load signed
  @Ix(53, OneRegOneImmIxDecoder)
  load_i8({ rA, vX }: OneRegOneImmArgs, context: PVMIxEvaluateFNContextImpl) {
    const memoryAddress = toSafeMemoryAddress(vX);
    if (!context.execution.memory.canRead(memoryAddress, 1)) {
      return handleMemoryFault(
        context.execution.memory.firstUnreadable(memoryAddress, 1)!,
        context.execution,
      );
    }

    return [
      IxMod.reg(
        rA,
        X_fn(1n)(
          BigInt(context.execution.memory.getBytes(memoryAddress, 1)[0]),
        ),
      ),
    ];
  }

  @Ix(55, OneRegOneImmIxDecoder)
  load_i16({ rA, vX }: OneRegOneImmArgs, context: PVMIxEvaluateFNContextImpl) {
    const memoryAddress = toSafeMemoryAddress(vX);
    if (!context.execution.memory.canRead(memoryAddress, 2)) {
      return handleMemoryFault(
        context.execution.memory.firstUnreadable(memoryAddress, 2)!,
        context.execution,
      );
    }

    return [
      IxMod.reg(
        rA,
        X_fn(2n)(
          E_2.decode(context.execution.memory.getBytes(memoryAddress, 2)).value,
        ),
      ),
    ];
  }

  @Ix(57, OneRegOneImmIxDecoder)
  load_i32({ rA, vX }: OneRegOneImmArgs, context: PVMIxEvaluateFNContextImpl) {
    const memoryAddress = toSafeMemoryAddress(vX);
    if (!context.execution.memory.canRead(memoryAddress, 4)) {
      return handleMemoryFault(
        context.execution.memory.firstUnreadable(memoryAddress, 4)!,
        context.execution,
      );
    }

    return [
      IxMod.reg(
        rA,
        X_4(
          E_4.decode(context.execution.memory.getBytes(memoryAddress, 4)).value,
        ),
      ),
    ];
  }

  // ### Store

  @Ix(59, OneRegOneImmIxDecoder)
  store_u8({ wA, vX }: OneRegOneImmArgs) {
    return [IxMod.memory(vX, new Uint8Array([Number(wA.value % 256n)]))];
  }

  @Ix(60, OneRegOneImmIxDecoder)
  store_u16({ wA, vX }: OneRegOneImmArgs) {
    return [IxMod.memory(vX, encodeWithCodec(E_2, wA.value % 2n ** 16n))];
  }

  @Ix(61, OneRegOneImmIxDecoder)
  store_u32({ wA, vX }: OneRegOneImmArgs) {
    return [IxMod.memory(vX, encodeWithCodec(E_4, wA.value % 2n ** 32n))];
  }

  @Ix(62, OneRegOneImmIxDecoder)
  store_u64({ wA, vX }: OneRegOneImmArgs) {
    return [IxMod.memory(vX, encodeWithCodec(E_8, wA.value))];
  }

  @Ix(70, OneRegTwoImmIxDecoder)
  store_imm_ind_u8({ wA, vX, vY }: OneRegTwoImmArgs) {
    const location = wA.value + vX;
    return [IxMod.memory(location, new Uint8Array([Number(vY % 0xffn)]))];
  }

  @Ix(71, OneRegTwoImmIxDecoder)
  store_imm_ind_u16({ wA, vX, vY }: OneRegTwoImmArgs) {
    const location = wA.value + vX;
    return [IxMod.memory(location, encodeWithCodec(E_2, vY % 2n ** 16n))];
  }

  @Ix(72, OneRegTwoImmIxDecoder)
  store_imm_ind_u32({ wA, vX, vY }: OneRegTwoImmArgs) {
    const location = wA.value + vX;
    return [IxMod.memory(location, encodeWithCodec(E_4, vY % 2n ** 32n))];
  }

  @Ix(73, OneRegTwoImmIxDecoder)
  store_imm_ind_u64({ wA, vX, vY }: OneRegTwoImmArgs) {
    const location = wA.value + vX;
    return [IxMod.memory(location, encodeWithCodec(E_8, vY))];
  }

  @Ix(80, OneRegOneIMMOneOffsetIxDecoder)
  @BlockTermination
  load_imm_jump(
    { rA, vX, vY }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    return [IxMod.reg(rA, vX), ...branch(context, vY, true)];
  }

  @Ix(81, OneRegOneIMMOneOffsetIxDecoder)
  @BlockTermination
  branch_eq_imm(
    { wA, vX, vY }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    return branch(context, vY, wA.value === vX);
  }

  @Ix(82, OneRegOneIMMOneOffsetIxDecoder)
  @BlockTermination
  branch_ne_imm(
    { vX, vY, wA }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    return branch(context, vY, wA.value != vX);
  }

  @Ix(83, OneRegOneIMMOneOffsetIxDecoder)
  @BlockTermination
  branch_lt_u_imm(
    { vX, vY, wA }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    return branch(context, vY, wA.value < vX);
  }

  @Ix(84, OneRegOneIMMOneOffsetIxDecoder)
  @BlockTermination
  branch_le_u_imm(
    { vX, vY, wA }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    return branch(context, vY, wA.value <= vX);
  }

  @Ix(85, OneRegOneIMMOneOffsetIxDecoder)
  @BlockTermination
  branch_ge_u_imm(
    { vX, vY, wA }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    return branch(context, vY, wA.value >= vX);
  }

  @Ix(86, OneRegOneIMMOneOffsetIxDecoder)
  @BlockTermination
  branch_gt_u_imm(
    { vX, vY, wA }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    return branch(context, vY, wA.value > vX);
  }

  @Ix(87, OneRegOneIMMOneOffsetIxDecoder)
  @BlockTermination
  branch_lt_s_imm(
    { vX, vY, wA }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    return branch(context, vY, Z(8, wA.value) < Z(8, vX));
  }

  @Ix(88, OneRegOneIMMOneOffsetIxDecoder)
  @BlockTermination
  branch_le_s_imm(
    { vX, vY, wA }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    return branch(context, vY, Z(8, wA.value) <= Z(8, vX));
  }

  @Ix(89, OneRegOneIMMOneOffsetIxDecoder)
  @BlockTermination
  branch_ge_s_imm(
    { vX, vY, wA }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    return branch(context, vY, Z(8, wA.value) >= Z(8, vX));
  }

  @Ix(90, OneRegOneIMMOneOffsetIxDecoder)
  @BlockTermination
  branch_gt_s_imm(
    { vX, vY, wA }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    return branch(context, vY, Z(8, wA.value) > Z(8, vX));
  }

  @Ix(100, TwoRegIxDecoder)
  move_reg({ rD, wA }: TwoRegArgs) {
    return [IxMod.reg(rD, wA.value)];
  }

  @Ix(101, TwoRegIxDecoder)
  sbrk({ rD, wA }: TwoRegArgs, context: PVMIxEvaluateFNContextImpl) {
    const location = context.execution.memory.firstWriteableInHeap(
      <u32>Number(wA),
    )!;

    return [IxMod.reg(rD, location)];
  }

  @Ix(102, TwoRegIxDecoder)
  count_set_bits_64({ rD, wA }: TwoRegArgs) {
    const wa = wA;
    let sum = 0n;
    let val: bigint = wa.value;
    for (let i = 0; i < 64; i++) {
      sum += val & 1n;
      val >>= 1n;
    }
    return [IxMod.reg(rD, sum)];
  }

  @Ix(103, TwoRegIxDecoder)
  count_set_bits_32({ rD, wA }: TwoRegArgs) {
    const wa = wA;
    let sum = 0n;
    let val: bigint = wa.value % 2n ** 32n;
    for (let i = 0; i < 32; i++) {
      sum += val & 1n;
      val >>= 1n;
    }
    return [IxMod.reg(rD, sum)];
  }

  @Ix(104, TwoRegIxDecoder)
  leading_zero_bits_64({ rD, wA }: TwoRegArgs) {
    const wa = wA;
    const val: bigint = wa.value;
    let count = 0n;
    for (let i = 0; i < 64; i++) {
      if (val & (1n << (63n - BigInt(i)))) {
        break;
      }
      count++;
    }
    return [IxMod.reg(rD, count)];
  }

  @Ix(105, TwoRegIxDecoder)
  leading_zero_bits_32({ rD, wA }: TwoRegArgs) {
    const wa = wA;
    const val: bigint = wa.value % 2n ** 32n;
    let count = 0n;
    for (let i = 0; i < 32; i++) {
      if (val & (1n << (31n - BigInt(i)))) {
        break;
      }
      count++;
    }
    return [IxMod.reg(rD, count)];
  }

  @Ix(106, TwoRegIxDecoder)
  trailing_zero_bits_64({ rD, wA }: TwoRegArgs) {
    const wa = wA;
    const val: bigint = wa.value;
    let count = 0n;
    for (let i = 0; i < 64; i++) {
      if (val & (1n << BigInt(i))) {
        break;
      }
      count++;
    }
    return [IxMod.reg(rD, count)];
  }

  @Ix(107, TwoRegIxDecoder)
  trailing_zero_bits_32({ rD, wA }: TwoRegArgs) {
    const wa = wA;
    const val: bigint = wa.value % 2n ** 32n;
    let count = 0n;
    for (let i = 0; i < 32; i++) {
      if (val & (1n << BigInt(i))) {
        break;
      }
      count++;
    }
    return [IxMod.reg(rD, count)];
  }

  @Ix(108, TwoRegIxDecoder)
  sign_extend_8({ rD, wA }: TwoRegArgs) {
    return [IxMod.reg(rD, Z8_inv(Z(1, wA.value % 2n ** 8n)))];
  }

  @Ix(109, TwoRegIxDecoder)
  sign_extend_16({ rD, wA }: TwoRegArgs) {
    return [IxMod.reg(rD, Z8_inv(Z(2, wA.value % 2n ** 16n)))];
  }

  @Ix(110, TwoRegIxDecoder)
  zero_extend_16({ rD, wA }: TwoRegArgs) {
    return [IxMod.reg(rD, wA.value % 2n ** 16n)];
  }

  @Ix(111, TwoRegIxDecoder)
  reverse_bytes({ rD, wA }: TwoRegArgs) {
    let newVal = 0n;
    const wa = wA;
    for (let i = 0; i < 8; i++) {
      newVal |= ((wa.value >> BigInt(i * 8)) & 0xffn) << BigInt((7 - i) * 8);
    }
    return [IxMod.reg(rD, newVal)];
  }

  @Ix(180, TwoRegTwoImmIxDecoder)
  @BlockTermination
  load_imm_jump_ind(
    args: TwoRegTwoImmIxArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    return [
      IxMod.reg(args.rA, args.vX),
      ...djump(context, Number((args.wB.value + args.vY) % 2n ** 32n) as u32),
    ];
  }

  // 2 reg 1 offset
  @Ix(170, TwoRegOneOffsetIxDecoder)
  @BlockTermination
  branch_eq(
    { wA, wB, offset }: TwoRegOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    return branch(
      context,
      (context.execution.instructionPointer + offset) as u32,
      wA === wB,
    );
  }

  @Ix(171, TwoRegOneOffsetIxDecoder)
  @BlockTermination
  branch_ne(
    { wA, wB, offset }: TwoRegOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    return branch(
      context,
      (context.execution.instructionPointer + offset) as u32,
      wA !== wB,
    );
  }

  @Ix(172, TwoRegOneOffsetIxDecoder)
  @BlockTermination
  branch_lt_u(
    { wA, wB, offset }: TwoRegOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    return branch(
      context,
      (context.execution.instructionPointer + offset) as u32,
      wA < wB,
    );
  }

  @Ix(173, TwoRegOneOffsetIxDecoder)
  @BlockTermination
  branch_lt_s(
    { wA, wB, offset }: TwoRegOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    return branch(
      context,
      (context.execution.instructionPointer + offset) as u32,
      Z(8, wA.value) < Z(8, wB.value),
    );
  }

  @Ix(174, TwoRegOneOffsetIxDecoder)
  @BlockTermination
  branch_ge_u(
    { wA, wB, offset }: TwoRegOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    return branch(
      context,
      (context.execution.instructionPointer + offset) as u32,
      wA >= wB,
    );
  }

  @Ix(175, TwoRegOneOffsetIxDecoder)
  @BlockTermination
  branch_ge_s(
    { wA, wB, offset }: TwoRegOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    return branch(
      context,
      (context.execution.instructionPointer + offset) as u32,
      Z(8, wA.value) >= Z(8, wB.value),
    );
  }

  @Ix(120, TwoRegOneImmIxDecoder)
  store_ind_u8({ wB, vX, wA }: TwoRegOneImmArgs) {
    const location = toSafeMemoryAddress(wB.value + vX);
    return [
      IxMod.memory(location as u32, new Uint8Array([Number(wA.value & 0xffn)])),
    ];
  }

  @Ix(121, TwoRegOneImmIxDecoder)
  store_ind_u16({ wA, wB, vX }: TwoRegOneImmArgs) {
    const location = toSafeMemoryAddress(wB.value + vX);
    return [IxMod.memory(location, encodeWithCodec(E_2, wA.value & 0xffffn))];
  }

  @Ix(122, TwoRegOneImmIxDecoder)
  store_ind_u32({ wA, wB, vX }: TwoRegOneImmArgs) {
    const location = toSafeMemoryAddress(wB.value + vX);
    const tmp = new Uint8Array(4);
    E_4.encode(BigInt(wA.value % 2n ** 32n), tmp);
    return [IxMod.memory(location, tmp)];
  }

  @Ix(123, TwoRegOneImmIxDecoder)
  store_ind_u64({ wA, wB, vX }: TwoRegOneImmArgs) {
    const location = toSafeMemoryAddress(wB.value + vX);
    return [IxMod.memory(location, encodeWithCodec(E_8, wA.value))];
  }

  // # load unsigned
  @Ix(124, TwoRegOneImmIxDecoder)
  load_ind_u8(
    { rA, wB, vX }: TwoRegOneImmArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    const location = toSafeMemoryAddress(wB.value + vX);
    if (!context.execution.memory.canRead(location, 1)) {
      return handleMemoryFault(
        context.execution.memory.firstUnreadable(location, 1)!,
        context.execution,
      );
    }
    return [
      IxMod.reg(rA, context.execution.memory.getBytes(location, 1)[0] as u32),
    ];
  }

  @Ix(126, TwoRegOneImmIxDecoder)
  load_ind_u16(
    { rA, wB, vX }: TwoRegOneImmArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    const location = toSafeMemoryAddress(wB.value + vX);
    if (!context.execution.memory.canRead(location, 2)) {
      return handleMemoryFault(
        context.execution.memory.firstUnreadable(location, 2)!,
        context.execution,
      );
    }
    const r = context.execution.memory.getBytes(location, 2);
    return [IxMod.reg(rA, E_2.decode(r).value)];
  }

  @Ix(128, TwoRegOneImmIxDecoder)
  load_ind_u32(
    { rA, wB, vX }: TwoRegOneImmArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    const location = toSafeMemoryAddress(wB.value + vX);
    if (!context.execution.memory.canRead(location, 4)) {
      return handleMemoryFault(
        context.execution.memory.firstUnreadable(location, 4)!,
        context.execution,
      );
    }
    const r = context.execution.memory.getBytes(location, 4);
    return [IxMod.reg(rA, E_4.decode(r).value)];
  }

  @Ix(130, TwoRegOneImmIxDecoder)
  load_ind_u64(
    { rA, wB, vX }: TwoRegOneImmArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    const location = toSafeMemoryAddress(wB.value + vX);
    if (!context.execution.memory.canRead(location, 8)) {
      return handleMemoryFault(
        context.execution.memory.firstUnreadable(location, 8)!,
        context.execution,
      );
    }
    const r = context.execution.memory.getBytes(location, 8);
    return [IxMod.reg(rA, E_8.decode(r).value)];
  }

  // # load signed
  @Ix(125, TwoRegOneImmIxDecoder)
  load_ind_i8(
    { rA, wB, vX }: TwoRegOneImmArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    const location = toSafeMemoryAddress(wB.value + vX);
    if (!context.execution.memory.canRead(location, 1)) {
      return handleMemoryFault(
        context.execution.memory.firstUnreadable(location, 1)!,
        context.execution,
      );
    }
    const raw = context.execution.memory.getBytes(location, 1);
    const val = Z8_inv(Z(1, BigInt(raw[0])));
    return [IxMod.reg(rA, val)];
  }

  @Ix(127, TwoRegOneImmIxDecoder)
  load_ind_i16(
    { rA, wB, vX }: TwoRegOneImmArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    const location = toSafeMemoryAddress(wB.value + vX);
    if (!context.execution.memory.canRead(location, 2)) {
      return handleMemoryFault(
        context.execution.memory.firstUnreadable(location, 2)!,
        context.execution,
      );
    }
    const val = context.execution.memory.getBytes(location, 2);
    const num = E_2.decode(val).value;
    return [IxMod.reg(rA, Z8_inv(Z(2, num)))];
  }

  @Ix(129, TwoRegOneImmIxDecoder)
  load_ind_i32(
    { rA, wB, vX }: TwoRegOneImmArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    const location = toSafeMemoryAddress(wB.value + vX);
    if (!context.execution.memory.canRead(location, 4)) {
      return handleMemoryFault(
        context.execution.memory.firstUnreadable(location, 4)!,
        context.execution,
      );
    }
    const val = context.execution.memory.getBytes(location, 4);
    const num = E_4.decode(val).value;
    return [IxMod.reg(rA, Z8_inv(Z(4, num)))];
  }

  // math
  @Ix(131, TwoRegOneImmIxDecoder)
  add_imm_32({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, X_4((wB.value + vX) % 2n ** 32n))];
  }

  @Ix(132, TwoRegOneImmIxDecoder)
  and_imm({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, wB.value & BigInt(vX))];
  }

  @Ix(133, TwoRegOneImmIxDecoder)
  xor_imm({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, wB.value ^ BigInt(vX))];
  }

  @Ix(134, TwoRegOneImmIxDecoder)
  or_imm({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, wB.value | BigInt(vX))];
  }

  @Ix(135, TwoRegOneImmIxDecoder)
  mul_imm_32({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, (wB.value * BigInt(vX)) % 2n ** 32n)];
  }

  @Ix(136, TwoRegOneImmIxDecoder)
  set_lt_u_imm({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, wB.value < vX ? 1 : 0)];
  }

  @Ix(137, TwoRegOneImmIxDecoder)
  set_lt_s_imm({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, Z8(wB.value) < Z8(BigInt(vX)) ? 1 : 0)];
  }

  @Ix(138, TwoRegOneImmIxDecoder)
  shlo_l_imm_32({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, X_4((wB.value << vX % 32n) % 2n ** 32n))];
  }

  @Ix(139, TwoRegOneImmIxDecoder)
  shlo_r_imm_32({ rA, wB, vX }: TwoRegOneImmArgs) {
    const wb = Number(wB.value % 2n ** 32n);
    return [IxMod.reg(rA, X_4(BigInt(wb >>> Number(vX % 32n))))];
  }

  @Ix(140, TwoRegOneImmIxDecoder)
  shar_r_imm_32({ rA, wB, vX }: TwoRegOneImmArgs) {
    const wb = Number(wB.value % 2n ** 32n);
    return [IxMod.reg(rA, Z8_inv(BigInt(Z4(wb) >> Number(vX % 32n))))];
  }

  @Ix(141, TwoRegOneImmIxDecoder)
  neg_add_imm_32({ rA, wB, vX }: TwoRegOneImmArgs) {
    let val = (vX + 2n ** 32n - wB.value) % 2n ** 32n;
    if (val < 0n) {
      // other languages behave differently than js when modulo a negative number
      // see comment 3 on pull 3 of jamtestvector.
      val += 2n ** 32n;
    }
    return [IxMod.reg(rA, X_4(val))];
  }

  @Ix(142, TwoRegOneImmIxDecoder)
  set_gt_u_imm({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, wB.value > vX ? 1 : 0)];
  }

  @Ix(143, TwoRegOneImmIxDecoder)
  set_gt_s_imm({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, Z8(wB.value) > Z8(BigInt(vX)) ? 1 : 0)];
  }

  @Ix(144, TwoRegOneImmIxDecoder)
  shlo_l_imm_alt_32({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, X_4((vX << wB.value % 32n) % 2n ** 32n))];
  }

  @Ix(145, TwoRegOneImmIxDecoder)
  shlo_r_imm_alt_32({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, (Number(vX) >>> Number(wB.value % 32n)) as u32)];
  }

  @Ix(146, TwoRegOneImmIxDecoder)
  shar_r_imm_alt_32({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [
      IxMod.reg(rA, Z8_inv(BigInt(Z4(vX % 2n ** 32n)) >> wB.value % 32n)),
    ];
  }

  @Ix(147, TwoRegOneImmIxDecoder)
  cmov_iz_imm({ rA, wB, vX }: TwoRegOneImmArgs) {
    if (wB.value === 0n) {
      return [IxMod.reg(rA, vX)];
    }

    return [];
  }

  @Ix(148, TwoRegOneImmIxDecoder)
  cmov_nz_imm({ rA, wB, vX }: TwoRegOneImmArgs) {
    if (wB.value !== 0n) {
      return [IxMod.reg(rA, vX)];
    }
    return [];
  }

  @Ix(149, TwoRegOneImmIxDecoder)
  add_imm_64({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, (wB.value + BigInt(vX)) % 2n ** 64n)];
  }

  @Ix(150, TwoRegOneImmIxDecoder)
  mul_imm_64({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, (wB.value * BigInt(vX)) % 2n ** 64n)];
  }

  @Ix(151, TwoRegOneImmIxDecoder)
  shlo_l_imm_64({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, X_8((wB.value << BigInt(vX % 64n)) % 2n ** 64n))];
  }

  @Ix(152, TwoRegOneImmIxDecoder)
  shlo_r_imm_64({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, X_8(wB.value / 2n ** (BigInt(vX) % 64n)))];
  }

  @Ix(153, TwoRegOneImmIxDecoder)
  shar_r_imm_64({ rA, wB, vX }: TwoRegOneImmArgs) {
    const z8b = Z8(wB.value);
    const dividend = 2n ** (BigInt(vX) % 64n);
    let result = z8b / dividend;
    // Math.floor for negative numbers
    if (z8b < 0n && dividend > 0n && z8b % dividend !== 0n) {
      result -= 1n;
    }
    return [IxMod.reg(rA, Z8_inv(result))];
  }

  @Ix(154, TwoRegOneImmIxDecoder)
  neg_add_imm_64({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, (BigInt(vX) + 2n ** 64n - wB.value) % 2n ** 64n)];
  }

  @Ix(155, TwoRegOneImmIxDecoder)
  shlo_l_imm_alt_64({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, (BigInt(vX) << wB.value % 64n) % 2n ** 64n)];
  }

  @Ix(156, TwoRegOneImmIxDecoder)
  shlo_r_imm_alt_64({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, (BigInt(vX) / 2n ** (wB.value % 64n)) % 2n ** 64n)];
  }

  @Ix(157, TwoRegOneImmIxDecoder)
  shar_r_imm_alt_64({ rA, wB, vX }: TwoRegOneImmArgs) {
    return [IxMod.reg(rA, Z8_inv(Z8(BigInt(vX)) >> wB.value % 64n))];
  }

  @Ix(158, TwoRegOneImmIxDecoder)
  rot_r_64_imm({ rA, wB, vX }: TwoRegOneImmArgs) {
    const shift = vX % 64n;
    const mask = 2n ** 64n - 1n;
    const value = wB.value;
    const result = (value >> shift) | ((value << (64n - shift)) & mask);
    return [IxMod.reg(rA, result)];
  }

  @Ix(159, TwoRegOneImmIxDecoder)
  rot_r_64_imm_alt({ rA, wB, vX }: TwoRegOneImmArgs) {
    const shift = wB.value % 64n;
    const mask = 2n ** 64n - 1n;
    const value = vX;
    const result = (value >> shift) | ((value << (64n - shift)) & mask);
    return [IxMod.reg(rA, result)];
  }

  @Ix(160, TwoRegOneImmIxDecoder)
  rot_r_32_imm({ rA, wB, vX }: TwoRegOneImmArgs) {
    const shift = vX % 32n;
    const mask = 2n ** 32n - 1n;
    const value = wB.value % 2n ** 32n;
    const result = (value >> shift) | ((value << (32n - shift)) & mask);
    return [IxMod.reg(rA, X_4(result))];
  }

  @Ix(161, TwoRegOneImmIxDecoder)
  rot_r_32_imm_alt({ rA, wB, vX }: TwoRegOneImmArgs) {
    const shift = wB.value % 32n;
    const mask = 2n ** 32n - 1n;
    const value = vX % 2n ** 32n;
    const result = (value >> shift) | ((value << (32n - shift)) & mask);
    return [IxMod.reg(rA, X_4(result))];
  }

  @Ix(190, ThreeRegIxDecoder)
  add_32({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, X_4((wA.value + wB.value) % 2n ** 32n))];
  }

  @Ix(191, ThreeRegIxDecoder)
  sub_32({ wA, wB, rD }: ThreeRegArgs) {
    return [
      IxMod.reg(
        rD,
        X_4((wA.value + 2n ** 32n - (wB.value % 2n ** 32n)) % 2n ** 32n),
      ),
    ];
  }

  @Ix(192, ThreeRegIxDecoder)
  mul_32({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, X_4((wA.value * wB.value) % 2n ** 32n))];
  }

  @Ix(193, ThreeRegIxDecoder)
  div_u_32({ wA, wB, rD }: ThreeRegArgs) {
    if (wB.value % 2n ** 32n === 0n) {
      return [IxMod.reg(rD, 2n ** 64n - 1n)];
    } else {
      return [IxMod.reg(rD, wA.value / wB.value)]; // NOTE: this was math.floor but bigint division is already trunctaing
    }
  }

  @Ix(194, ThreeRegIxDecoder)
  div_s_32({ wA, wB, rD }: ThreeRegArgs) {
    const z4a = Z4(wA.value % 2n ** 32n);
    const z4b = Z4(wB.value % 2n ** 32n);
    let newVal: number | bigint;
    if (z4b === 0) {
      newVal = 2n ** 64n - 1n;
    } else if (z4a == -1 * 2 ** 31 && z4b === -1) {
      newVal = Z8_inv(BigInt(z4a));
    } else {
      // this is basically `rtz`
      newVal = Z8_inv(BigInt(Math.trunc(z4a / z4b)));
    }

    return [IxMod.reg(rD, newVal)];
  }

  @Ix(195, ThreeRegIxDecoder)
  rem_u_32({ wA, wB, rD }: ThreeRegArgs) {
    let newVal: number | bigint;
    if (wB.value % 2n ** 32n === 0n) {
      newVal = X_4(wA.value % 2n ** 32n);
    } else {
      newVal = X_4((wA.value % 2n ** 32n) % (wB.value % 2n ** 32n));
    }
    return [IxMod.reg(rD, newVal)];
  }

  @Ix(196, ThreeRegIxDecoder)
  rem_s_32({ wA, wB, rD }: ThreeRegArgs) {
    const z4a = Z4(wA.value % 2n ** 32n);
    const z4b = Z4(wB.value % 2n ** 32n);
    let newVal: number | bigint;
    if (z4a === -1 * 2 ** 31 && z4b === -1) {
      newVal = 0;
    } else {
      newVal = Z8_inv(smod(BigInt(z4a), BigInt(z4b)));
    }
    return [IxMod.reg(rD, newVal)];
  }

  @Ix(197, ThreeRegIxDecoder)
  shlo_l_32({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, X_4((wA.value << wB.value % 32n) % 2n ** 32n))];
  }

  @Ix(198, ThreeRegIxDecoder)
  shlo_r_32({ wA, wB, rD }: ThreeRegArgs) {
    const wa_32 = Number(wA.value % 2n ** 32n);
    const wb_32 = Number(wB.value % 2n ** 32n);
    return [IxMod.reg(rD, X_4(BigInt(wa_32 >>> wb_32)))];
  }

  @Ix(199, ThreeRegIxDecoder)
  shar_r_32({ wA, wB, rD }: ThreeRegArgs) {
    const z4a = Z4(wA.value % 2n ** 32n);
    return [
      IxMod.reg(
        rD,
        Z8_inv(BigInt(Math.floor(z4a / 2 ** Number(wB.value % 32n)))),
      ),
    ];
  }

  @Ix(200, ThreeRegIxDecoder)
  add_64({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, (wA.value + wB.value) % 2n ** 64n)];
  }

  @Ix(201, ThreeRegIxDecoder)
  sub_64({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, (wA.value + 2n ** 64n - wB.value) % 2n ** 64n)];
  }

  @Ix(202, ThreeRegIxDecoder)
  mul_64({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, (wA.value * wB.value) % 2n ** 64n)];
  }

  @Ix(203, ThreeRegIxDecoder)
  div_u_64({ wA, wB, rD }: ThreeRegArgs) {
    if (wB.value === 0n) {
      return [IxMod.reg(rD, 2n ** 64n - 1n)];
    } else {
      return [IxMod.reg(rD, wA.value / wB.value)];
    }
  }

  @Ix(204, ThreeRegIxDecoder)
  div_s_64({ wA, wB, rD }: ThreeRegArgs) {
    const z8a = Z8(wA.value);
    const z8b = Z8(wB.value);
    let newVal: number | bigint;
    if (wB.value === 0n) {
      newVal = 2n ** 64n - 1n;
    } else if (z8a == -1n * 2n ** 63n && z8b === -1n) {
      newVal = wA.value;
    } else {
      newVal = Z8_inv(z8a / z8b); // since bigint (RegisterValue) has no decimal point this is `rtz` already
    }
    return [IxMod.reg(rD, newVal)];
  }

  @Ix(205, ThreeRegIxDecoder)
  rem_u_64({ wA, wB, rD }: ThreeRegArgs) {
    let newVal: number | bigint;
    if (wB.value === 0n) {
      newVal = wA.value;
    } else {
      newVal = wA.value % wB.value;
    }
    return [IxMod.reg(rD, newVal)];
  }

  @Ix(206, ThreeRegIxDecoder)
  rem_s_64({ wA, wB, rD }: ThreeRegArgs) {
    const z8a = Z8(wA.value);
    const z8b = Z8(wB.value);
    let newVal: number | bigint;
    if (z8a === -1n * 2n ** 63n && z8b === -1n) {
      newVal = 0 as u32;
    } else {
      newVal = Z8_inv(smod(z8a, z8b));
    }
    return [IxMod.reg(rD, newVal)];
  }

  @Ix(207, ThreeRegIxDecoder)
  shlo_l_64({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, (wA.value << wB.value % 64n) % 2n ** 64n)];
  }

  @Ix(208, ThreeRegIxDecoder)
  shlo_r_64({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, wA.value / 2n ** (wB.value % 64n))];
  }

  @Ix(209, ThreeRegIxDecoder)
  shar_r_64({ wA, wB, rD }: ThreeRegArgs) {
    const z8a = Z8(wA.value);
    const dividend = 2n ** (wB.value % 64n);
    let result = z8a / dividend;
    if (z8a < 0n && dividend > 0n && z8a % dividend !== 0n) {
      result -= 1n;
    }
    return [IxMod.reg(rD, Z8_inv(result))];
  }

  @Ix(210, ThreeRegIxDecoder)
  and({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, wA.value & wB.value)];
  }

  @Ix(211, ThreeRegIxDecoder)
  xor({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, wA.value ^ wB.value)];
  }

  @Ix(212, ThreeRegIxDecoder)
  or({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, wA.value | wB.value)];
  }

  @Ix(213, ThreeRegIxDecoder)
  mul_upper_s_s({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, Z8_inv((Z8(wA.value) * Z8(wB.value)) / 2n ** 64n))];
  }

  @Ix(214, ThreeRegIxDecoder)
  mul_upper_u_u({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, (wA.value * wB.value) / 2n ** 64n)];
  }

  @Ix(215, ThreeRegIxDecoder)
  mul_upper_s_u({ wA, wB, rD }: ThreeRegArgs) {
    const mult = Z8(wA.value) * wB.value;
    let val = mult / 2n ** 64n;
    if (val < 0n && mult % 2n ** 64n !== 0n) {
      val--;
    }
    return [IxMod.reg(rD, Z8_inv(val))];
  }

  @Ix(216, ThreeRegIxDecoder)
  set_lt_u({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, wA < wB ? 1 : 0)];
  }

  @Ix(217, ThreeRegIxDecoder)
  set_lt_s({ wA, wB, rD }: ThreeRegArgs) {
    const z4a = Z8(wA.value);
    const z4b = Z8(wB.value);
    return [IxMod.reg(rD, z4a < z4b ? 1 : 0)];
  }

  @Ix(218, ThreeRegIxDecoder)
  cmov_iz({ wA, wB, rD }: ThreeRegArgs) {
    if (wB.value === 0n) {
      return [IxMod.reg(rD, wA.value)];
    }
    return [];
  }

  @Ix(219, ThreeRegIxDecoder)
  cmov_nz({ wA, wB, rD }: ThreeRegArgs) {
    if (wB.value !== 0n) {
      return [IxMod.reg(rD, wA.value)];
    }
    return [];
  }

  @Ix(220, ThreeRegIxDecoder)
  rot_l_64({ wA, wB, rD }: ThreeRegArgs) {
    const shift = wB.value & 63n; // ensure its in the range 0-63
    const mask = 2n ** 64n - 1n;
    const result = ((wA.value << shift) | (wA.value >> (64n - shift))) & mask;
    return [IxMod.reg(rD, result)];
  }

  @Ix(221, ThreeRegIxDecoder)
  rot_l_32({ wA: _wA, wB, rD }: ThreeRegArgs) {
    const wA = _wA.value % 2n ** 32n;
    const shift = wB.value & 31n; // ensure its in the range 0-31
    const mask = 2n ** 32n - 1n;
    const result = ((wA << shift) | (wA >> (32n - shift))) & mask;
    return [IxMod.reg(rD, X_4(result))];
  }

  @Ix(222, ThreeRegIxDecoder)
  rot_r_64({ wA, wB, rD }: ThreeRegArgs) {
    const shift = wB.value & 63n; // ensure its in the range 0-63
    const mask = 2n ** 64n - 1n;
    const result = ((wA.value >> shift) | (wA.value << (64n - shift))) & mask;
    return [IxMod.reg(rD, result)];
  }

  @Ix(223, ThreeRegIxDecoder)
  rot_r_32({ wA: _wA, wB, rD }: ThreeRegArgs) {
    const wA = _wA.value % 2n ** 32n;
    const shift = wB.value & 31n; // ensure its in the range 0-31
    const mask = 2n ** 32n - 1n;
    const result = ((wA >> shift) | (wA << (32n - shift))) & mask;
    return [IxMod.reg(rD, X_4(result))];
  }

  @Ix(224, ThreeRegIxDecoder)
  and_inv({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, wA.value & ~wB.value)];
  }

  @Ix(225, ThreeRegIxDecoder)
  or_inv({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, (2n ** 64n + (wA.value | ~wB.value)) % 2n ** 64n)];
  }

  @Ix(226, ThreeRegIxDecoder)
  xnor({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, (2n ** 64n + ~(wA.value ^ wB.value)) % 2n ** 64n)];
  }

  @Ix(227, ThreeRegIxDecoder)
  max({ wA, wB, rD }: ThreeRegArgs) {
    const z8a = Z8(wA.value);
    const z8b = Z8(wB.value);
    // using wA and wB is basically a Z8_inv
    return [IxMod.reg(rD, z8a > z8b ? wA.value : wB.value)];
  }

  @Ix(228, ThreeRegIxDecoder)
  max_u({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, wA.value > wB.value ? wA.value : wB.value)];
  }

  @Ix(229, ThreeRegIxDecoder)
  min({ wA, wB, rD }: ThreeRegArgs) {
    const z8a = Z8(wA.value);
    const z8b = Z8(wB.value);
    // using wA and wB is basically a Z8_inv
    return [IxMod.reg(rD, z8a < z8b ? wA.value : wB.value)];
  }

  @Ix(230, ThreeRegIxDecoder)
  min_u({ wA, wB, rD }: ThreeRegArgs) {
    return [IxMod.reg(rD, wA.value < wB.value ? wA.value : wB.value)];
  }
}

/**
 * $(0.6.4 - A.9)
 * $(0.6.4 - A.8) | is handled by caller
 */
const handleMemoryFault = (
  location: u32,
  context: PVMProgramExecutionContext,
): PVMIxReturnMods => {
  if (location < 2 ** 16) {
    return [IxMod.panic()];
  }
  return IxMod.pageFault(<u32>(Zp * Math.floor(location % Zp)), context);
};
