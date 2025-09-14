import { PVMExitReasonImpl } from "@/impls/pvm/pvm-exit-reason-impl";
import { PVMIxEvaluateFNContextImpl } from "@/impls/pvm/pvm-ix-evaluate-fn-context-impl";
import { Zp } from "@tsjam/constants";
import { PVMRegisterRawValue, u32, u8 } from "@tsjam/types";
import { toSafeMemoryAddress } from "../pvm-memory";
import { branch } from "../utils/branch";
import { djump } from "../utils/djump";
import { Z1, Z2, Z4, Z8, Z8_inv } from "../utils/zed";
import {
  type NoArgIxArgs,
  NoArgIxDecoder,
  type OneImmArgs,
  OneImmIxDecoder,
  type OneOffsetArgs,
  OneOffsetIxDecoder,
  type OneRegOneExtImmArgs,
  OneRegOneExtImmArgsIxDecoder,
  type OneRegOneImmArgs,
  OneRegOneImmIxDecoder,
  type OneRegOneIMMOneOffsetArgs,
  OneRegOneIMMOneOffsetIxDecoder,
  type OneRegTwoImmArgs,
  OneRegTwoImmIxDecoder,
  type ThreeRegArgs,
  ThreeRegIxDecoder,
  type TwoImmArgs,
  TwoImmIxDecoder,
  type TwoRegArgs,
  TwoRegIxDecoder,
  type TwoRegOneImmArgs,
  TwoRegOneImmIxDecoder,
  type TwoRegOneOffsetArgs,
  TwoRegOneOffsetIxDecoder,
  type TwoRegTwoImmIxArgs,
  TwoRegTwoImmIxDecoder,
} from "./decoders";
import { BlockTermination, Ix } from "./ixdb";
import { smod, X_1, X_2, X_4, X_8 } from "./utils";

const E_2_Buf = Buffer.alloc(2);
const E_4_Buf = Buffer.alloc(4);
const E_8_Buf = Buffer.alloc(8);
/**
 * This class holds the ixs implementations.
 * But in reality the decorators are calling the `regIx` function
 * which store the implementation (and the ix configuration) in the `IxDb`.
 */
export class Instructions {
  @Ix(0, NoArgIxDecoder, true)
  @BlockTermination
  trap(_: NoArgIxArgs) {
    return PVMExitReasonImpl.panic();
  }

  @Ix(1, NoArgIxDecoder, true)
  @BlockTermination
  fallthrough(_: NoArgIxArgs, context: PVMIxEvaluateFNContextImpl) {
    context.execution.instructionPointer = <u32>(
      (context.execution.instructionPointer + 1)
    );
  }

  @Ix(10, OneImmIxDecoder)
  ecalli({ vX }: OneImmArgs) {
    return PVMExitReasonImpl.hostCall(<u8>vX);
  }

  @Ix(20, OneRegOneExtImmArgsIxDecoder)
  @BlockTermination
  load_imm_64({ wA, vX }: OneRegOneExtImmArgs) {
    wA.value = <PVMRegisterRawValue>vX;
  }

  @Ix(30, TwoImmIxDecoder)
  store_imm_u8({ vX, vY }: TwoImmArgs, context: PVMIxEvaluateFNContextImpl) {
    return storeSafe(vX, Buffer.from([Number(vY % 256n)]), context);
  }

  @Ix(31, TwoImmIxDecoder)
  store_imm_u16({ vX, vY }: TwoImmArgs, context: PVMIxEvaluateFNContextImpl) {
    E_2_Buf.writeUint16LE(Number(vY % 2n ** 16n));
    return storeSafe(vX, E_2_Buf, context);
  }

  @Ix(32, TwoImmIxDecoder)
  store_imm_u32({ vX, vY }: TwoImmArgs, context: PVMIxEvaluateFNContextImpl) {
    E_4_Buf.writeUint32LE(Number(vY % 2n ** 32n));
    return storeSafe(vX, E_4_Buf, context);
  }

  @Ix(33, TwoImmIxDecoder)
  store_imm_u64({ vX, vY }: TwoImmArgs, context: PVMIxEvaluateFNContextImpl) {
    E_8_Buf.writeBigUint64LE(vY);
    return storeSafe(vX, E_8_Buf, context);
  }

  @Ix(40, OneOffsetIxDecoder, true)
  @BlockTermination
  jump(
    { ipOffset }: OneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
    skip: number,
  ) {
    return branch(context, ipOffset, true, skip);
  }

  @Ix(50, OneRegOneImmIxDecoder, true)
  @BlockTermination
  jump_ind({ wA, vX }: OneRegOneImmArgs, context: PVMIxEvaluateFNContextImpl) {
    const jumpLocation = Number((wA.value + vX) % 2n ** 32n) as u32;
    return djump(jumpLocation, context);
  }

  // ### Load unsigned
  @Ix(51, OneRegOneImmIxDecoder)
  load_imm({ vX, wA }: OneRegOneImmArgs) {
    wA.value = <PVMRegisterRawValue>vX;
  }

  @Ix(52, OneRegOneImmIxDecoder)
  load_u8({ wA, vX }: OneRegOneImmArgs, context: PVMIxEvaluateFNContextImpl) {
    const memoryAddress = toSafeMemoryAddress(vX);

    if (!context.execution.memory.canRead(memoryAddress, 1)) {
      return handleMemoryFault(
        context.execution.memory.firstUnreadable(memoryAddress, 1)!,
      );
    }

    wA.value = <PVMRegisterRawValue>(
      BigInt(context.execution.memory.getBytes(memoryAddress, 1)[0])
    );
  }

  @Ix(54, OneRegOneImmIxDecoder)
  load_u16({ wA, vX }: OneRegOneImmArgs, context: PVMIxEvaluateFNContextImpl) {
    const memoryAddress = toSafeMemoryAddress(vX);
    if (!context.execution.memory.canRead(memoryAddress, 2)) {
      return handleMemoryFault(
        context.execution.memory.firstUnreadable(memoryAddress, 2)!,
      );
    }
    const memVal = context.execution.memory
      .getBytes(memoryAddress, 2)
      .readUint16LE();

    wA.value = <PVMRegisterRawValue>BigInt(memVal);
  }

  @Ix(56, OneRegOneImmIxDecoder)
  load_u32({ wA, vX }: OneRegOneImmArgs, context: PVMIxEvaluateFNContextImpl) {
    const memoryAddress = toSafeMemoryAddress(vX);
    if (!context.execution.memory.canRead(memoryAddress, 4)) {
      return handleMemoryFault(
        context.execution.memory.firstUnreadable(memoryAddress, 4)!,
      );
    }

    const memVal = context.execution.memory
      .getBytes(memoryAddress, 4)
      .readUInt32LE();
    wA.value = <PVMRegisterRawValue>BigInt(memVal);
  }

  @Ix(58, OneRegOneImmIxDecoder)
  load_u64({ wA, vX }: OneRegOneImmArgs, context: PVMIxEvaluateFNContextImpl) {
    const memoryAddress = toSafeMemoryAddress(vX);
    if (!context.execution.memory.canRead(memoryAddress, 8)) {
      return handleMemoryFault(
        context.execution.memory.firstUnreadable(memoryAddress, 8)!,
      );
    }

    wA.value = <
      PVMRegisterRawValue // E_8
    >context.execution.memory.getBytes(memoryAddress, 8).readBigUint64LE();
  }

  // ### Load signed
  @Ix(53, OneRegOneImmIxDecoder)
  load_i8({ wA, vX }: OneRegOneImmArgs, context: PVMIxEvaluateFNContextImpl) {
    const memoryAddress = toSafeMemoryAddress(vX);
    if (!context.execution.memory.canRead(memoryAddress, 1)) {
      return handleMemoryFault(
        context.execution.memory.firstUnreadable(memoryAddress, 1)!,
      );
    }

    wA.value = <PVMRegisterRawValue>(
      X_1(BigInt(context.execution.memory.getBytes(memoryAddress, 1)[0]))
    );
  }

  @Ix(55, OneRegOneImmIxDecoder)
  load_i16({ wA, vX }: OneRegOneImmArgs, context: PVMIxEvaluateFNContextImpl) {
    const memoryAddress = toSafeMemoryAddress(vX);
    if (!context.execution.memory.canRead(memoryAddress, 2)) {
      return handleMemoryFault(
        context.execution.memory.firstUnreadable(memoryAddress, 2)!,
      );
    }

    const memVal = context.execution.memory
      .getBytes(memoryAddress, 2)
      .readUint16LE();
    wA.value = <PVMRegisterRawValue>X_2(BigInt(memVal));
  }

  @Ix(57, OneRegOneImmIxDecoder)
  load_i32({ wA, vX }: OneRegOneImmArgs, context: PVMIxEvaluateFNContextImpl) {
    const memoryAddress = toSafeMemoryAddress(vX);
    if (!context.execution.memory.canRead(memoryAddress, 4)) {
      return handleMemoryFault(
        context.execution.memory.firstUnreadable(memoryAddress, 4)!,
      );
    }

    const memVal = context.execution.memory
      .getBytes(memoryAddress, 4)
      .readUInt32LE();
    wA.value = <PVMRegisterRawValue>X_4(BigInt(memVal));
  }

  // ### Store

  @Ix(59, OneRegOneImmIxDecoder)
  store_u8({ wA, vX }: OneRegOneImmArgs, context: PVMIxEvaluateFNContextImpl) {
    return storeSafe(
      toSafeMemoryAddress(vX),
      Buffer.from([Number(wA.value % 256n)]),
      context,
    );
  }

  @Ix(60, OneRegOneImmIxDecoder)
  store_u16({ wA, vX }: OneRegOneImmArgs, context: PVMIxEvaluateFNContextImpl) {
    E_2_Buf.writeUint16LE(Number(wA.value % 2n ** 16n));
    return storeSafe(toSafeMemoryAddress(vX), E_2_Buf, context);
  }

  @Ix(61, OneRegOneImmIxDecoder)
  store_u32({ wA, vX }: OneRegOneImmArgs, context: PVMIxEvaluateFNContextImpl) {
    E_4_Buf.writeUint32LE(Number(wA.value % 2n ** 32n));
    return storeSafe(toSafeMemoryAddress(vX), E_4_Buf, context);
  }

  @Ix(62, OneRegOneImmIxDecoder)
  store_u64({ wA, vX }: OneRegOneImmArgs, context: PVMIxEvaluateFNContextImpl) {
    E_8_Buf.writeBigUint64LE(wA.value);
    return storeSafe(toSafeMemoryAddress(vX), E_8_Buf, context);
  }

  @Ix(70, OneRegTwoImmIxDecoder)
  store_imm_ind_u8(
    { wA, vX, vY }: OneRegTwoImmArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    const location = wA.value + vX;
    return storeSafe(
      toSafeMemoryAddress(location),
      Buffer.from([Number(vY % 0xffn)]),
      context,
    );
  }

  @Ix(71, OneRegTwoImmIxDecoder)
  store_imm_ind_u16(
    { wA, vX, vY }: OneRegTwoImmArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    const location = wA.value + vX;
    E_2_Buf.writeUint16LE(Number(vY % 2n ** 16n));
    return storeSafe(toSafeMemoryAddress(location), E_2_Buf, context);
  }

  @Ix(72, OneRegTwoImmIxDecoder)
  store_imm_ind_u32(
    { wA, vX, vY }: OneRegTwoImmArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    const location = wA.value + vX;
    E_4_Buf.writeUint32LE(Number(vY % 2n ** 32n));
    return storeSafe(toSafeMemoryAddress(location), E_4_Buf, context);
  }

  @Ix(73, OneRegTwoImmIxDecoder)
  store_imm_ind_u64(
    { wA, vX, vY }: OneRegTwoImmArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    const location = wA.value + vX;
    E_8_Buf.writeBigUint64LE(vY);

    return storeSafe(toSafeMemoryAddress(location), E_8_Buf, context);
  }

  @Ix(80, OneRegOneIMMOneOffsetIxDecoder, true)
  @BlockTermination
  load_imm_jump(
    { wA, vX, ipOffset }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
    skip: number,
  ) {
    wA.value = vX;
    return branch(context, ipOffset, true, skip);
  }

  @Ix(81, OneRegOneIMMOneOffsetIxDecoder, true)
  @BlockTermination
  branch_eq_imm(
    { wA, vX, ipOffset }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
    skip: number,
  ) {
    return branch(context, ipOffset, wA.value === vX, skip);
  }

  @Ix(82, OneRegOneIMMOneOffsetIxDecoder, true)
  @BlockTermination
  branch_ne_imm(
    { vX, ipOffset, wA }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
    skip: number,
  ) {
    return branch(context, ipOffset, wA.value != vX, skip);
  }

  @Ix(83, OneRegOneIMMOneOffsetIxDecoder, true)
  @BlockTermination
  branch_lt_u_imm(
    { vX, ipOffset, wA }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
    skip: number,
  ) {
    return branch(context, ipOffset, wA.value < vX, skip);
  }

  @Ix(84, OneRegOneIMMOneOffsetIxDecoder, true)
  @BlockTermination
  branch_le_u_imm(
    { vX, ipOffset, wA }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
    skip: number,
  ) {
    return branch(context, ipOffset, wA.value <= vX, skip);
  }

  @Ix(85, OneRegOneIMMOneOffsetIxDecoder, true)
  @BlockTermination
  branch_ge_u_imm(
    { vX, ipOffset, wA }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
    skip: number,
  ) {
    return branch(context, ipOffset, wA.value >= vX, skip);
  }

  @Ix(86, OneRegOneIMMOneOffsetIxDecoder, true)
  @BlockTermination
  branch_gt_u_imm(
    { vX, ipOffset, wA }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
    skip: number,
  ) {
    return branch(context, ipOffset, wA.value > vX, skip);
  }

  @Ix(87, OneRegOneIMMOneOffsetIxDecoder, true)
  @BlockTermination
  branch_lt_s_imm(
    { vX, ipOffset, wA }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
    skip: number,
  ) {
    return branch(context, ipOffset, Z8(wA.value) < Z8(vX), skip);
  }

  @Ix(88, OneRegOneIMMOneOffsetIxDecoder, true)
  @BlockTermination
  branch_le_s_imm(
    { vX, ipOffset, wA }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
    skip: number,
  ) {
    return branch(context, ipOffset, Z8(wA.value) <= Z8(vX), skip);
  }

  @Ix(89, OneRegOneIMMOneOffsetIxDecoder, true)
  @BlockTermination
  branch_ge_s_imm(
    { vX, ipOffset, wA }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
    skip: number,
  ) {
    return branch(context, ipOffset, Z8(wA.value) >= Z8(vX), skip);
  }

  @Ix(90, OneRegOneIMMOneOffsetIxDecoder, true)
  @BlockTermination
  branch_gt_s_imm(
    { vX, ipOffset, wA }: OneRegOneIMMOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
    skip: number,
  ) {
    return branch(context, ipOffset, Z8(wA.value) > Z8(vX), skip);
  }

  @Ix(100, TwoRegIxDecoder)
  move_reg({ wD, wA }: TwoRegArgs) {
    wD.value = wA.value;
  }

  @Ix(101, TwoRegIxDecoder)
  sbrk({ wD, wA }: TwoRegArgs, context: PVMIxEvaluateFNContextImpl) {
    const requestedSize = <u32>Number(wA.value);
    const pointer = context.execution.memory.heap.pointer;
    if (requestedSize === 0) {
      wD.value = <PVMRegisterRawValue>BigInt(pointer);
      return;
    }

    const location = context.execution.memory.firstWriteableInHeap(
      <u32>Number(wA),
    )!;
    wD.value = <PVMRegisterRawValue>BigInt(location);
  }

  @Ix(102, TwoRegIxDecoder)
  count_set_bits_64({ wD, wA }: TwoRegArgs) {
    const wa = wA;
    let sum = 0n;
    let val: bigint = wa.value;
    for (let i = 0; i < 64; i++) {
      sum += val & 1n;
      val >>= 1n;
    }
    wD.value = <PVMRegisterRawValue>sum;
  }

  @Ix(103, TwoRegIxDecoder)
  count_set_bits_32({ wD, wA }: TwoRegArgs) {
    const wa = wA;
    let sum = 0n;
    let val: bigint = wa.value % 2n ** 32n;
    for (let i = 0; i < 32; i++) {
      sum += val & 1n;
      val >>= 1n;
    }
    wD.value = <PVMRegisterRawValue>sum;
  }

  @Ix(104, TwoRegIxDecoder)
  leading_zero_bits_64({ wD, wA }: TwoRegArgs) {
    const wa = wA;
    const val: bigint = wa.value;
    let count = 0n;
    for (let i = 0; i < 64; i++) {
      if (val & (1n << (63n - BigInt(i)))) {
        break;
      }
      count++;
    }
    wD.value = <PVMRegisterRawValue>count;
  }

  @Ix(105, TwoRegIxDecoder)
  leading_zero_bits_32({ wD, wA }: TwoRegArgs) {
    const wa = wA;
    const val: bigint = wa.value % 2n ** 32n;
    let count = 0n;
    for (let i = 0; i < 32; i++) {
      if (val & (1n << (31n - BigInt(i)))) {
        break;
      }
      count++;
    }
    wD.value = <PVMRegisterRawValue>count;
  }

  @Ix(106, TwoRegIxDecoder)
  trailing_zero_bits_64({ wD, wA }: TwoRegArgs) {
    const wa = wA;
    const val: bigint = wa.value;
    let count = 0n;
    for (let i = 0; i < 64; i++) {
      if (val & (1n << BigInt(i))) {
        break;
      }
      count++;
    }
    wD.value = <PVMRegisterRawValue>count;
  }

  @Ix(107, TwoRegIxDecoder)
  trailing_zero_bits_32({ wD, wA }: TwoRegArgs) {
    const wa = wA;
    const val: bigint = wa.value % 2n ** 32n;
    let count = 0n;
    for (let i = 0; i < 32; i++) {
      if (val & (1n << BigInt(i))) {
        break;
      }
      count++;
    }
    wD.value = <PVMRegisterRawValue>count;
  }

  @Ix(108, TwoRegIxDecoder)
  sign_extend_8({ wD, wA }: TwoRegArgs) {
    wD.value = Z8_inv(Z1(wA.value % 2n ** 8n));
  }

  @Ix(109, TwoRegIxDecoder)
  sign_extend_16({ wD, wA }: TwoRegArgs) {
    wD.value = Z8_inv(Z2(wA.value % 2n ** 16n));
  }

  @Ix(110, TwoRegIxDecoder)
  zero_extend_16({ wD, wA }: TwoRegArgs) {
    wD.value = <PVMRegisterRawValue>(wA.value % 2n ** 16n);
  }

  @Ix(111, TwoRegIxDecoder)
  reverse_bytes({ wD, wA }: TwoRegArgs) {
    let newVal = 0n;
    const wa = wA;
    for (let i = 0; i < 8; i++) {
      newVal |= ((wa.value >> BigInt(i * 8)) & 0xffn) << BigInt((7 - i) * 8);
    }
    wD.value = <PVMRegisterRawValue>newVal;
  }

  @Ix(180, TwoRegTwoImmIxDecoder, true)
  @BlockTermination
  load_imm_jump_ind(
    args: TwoRegTwoImmIxArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    const r = djump(
      Number((args.wB.value + args.vY) % 2n ** 32n) as u32,
      context,
    );
    // NOTE: graypaper is not specific if we should execute even if djump panics
    args.wA.value = <PVMRegisterRawValue>args.vX;
    return r;
  }

  // 2 reg 1 offset
  @Ix(170, TwoRegOneOffsetIxDecoder, true)
  @BlockTermination
  branch_eq(
    { wA, wB, ipOffset }: TwoRegOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
    skip: number,
  ) {
    return branch(context, ipOffset, wA.value === wB.value, skip);
  }

  @Ix(171, TwoRegOneOffsetIxDecoder, true)
  @BlockTermination
  branch_ne(
    { wA, wB, ipOffset }: TwoRegOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
    skip: number,
  ) {
    return branch(context, ipOffset, wA.value !== wB.value, skip);
  }

  @Ix(172, TwoRegOneOffsetIxDecoder, true)
  @BlockTermination
  branch_lt_u(
    { wA, wB, ipOffset }: TwoRegOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
    skip: number,
  ) {
    return branch(context, ipOffset, wA.value < wB.value, skip);
  }

  @Ix(173, TwoRegOneOffsetIxDecoder, true)
  @BlockTermination
  branch_lt_s(
    { wA, wB, ipOffset }: TwoRegOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
    skip: number,
  ) {
    return branch(context, ipOffset, Z8(wA.value) < Z8(wB.value), skip);
  }

  @Ix(174, TwoRegOneOffsetIxDecoder, true)
  @BlockTermination
  branch_ge_u(
    { wA, wB, ipOffset }: TwoRegOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
    skip: number,
  ) {
    return branch(context, ipOffset, wA >= wB, skip);
  }

  @Ix(175, TwoRegOneOffsetIxDecoder, true)
  @BlockTermination
  branch_ge_s(
    { wA, wB, ipOffset }: TwoRegOneOffsetArgs,
    context: PVMIxEvaluateFNContextImpl,
    skip: number,
  ) {
    return branch(context, ipOffset, Z8(wA.value) >= Z8(wB.value), skip);
  }

  @Ix(120, TwoRegOneImmIxDecoder)
  store_ind_u8(
    { wB, vX, wA }: TwoRegOneImmArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    const location = toSafeMemoryAddress(wB.value + vX);
    return storeSafe(
      location as u32,
      Buffer.from([Number(wA.value & 0xffn)]),
      context,
    );
  }

  @Ix(121, TwoRegOneImmIxDecoder)
  store_ind_u16(
    { wA, wB, vX }: TwoRegOneImmArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    const location = toSafeMemoryAddress(wB.value + vX);
    E_2_Buf.writeUint16LE(Number(wA.value & 0xffffn));
    return storeSafe(location, E_2_Buf, context);
  }

  @Ix(122, TwoRegOneImmIxDecoder)
  store_ind_u32(
    { wA, wB, vX }: TwoRegOneImmArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    const location = toSafeMemoryAddress(wB.value + vX);
    E_4_Buf.writeUInt32LE(Number(wA.value % 2n ** 32n));
    return storeSafe(location, E_4_Buf, context);
  }

  @Ix(123, TwoRegOneImmIxDecoder)
  store_ind_u64(
    { wA, wB, vX }: TwoRegOneImmArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    const location = toSafeMemoryAddress(wB.value + vX);
    E_8_Buf.writeBigUint64LE(wA.value);
    return storeSafe(location, E_8_Buf, context);
  }

  // # load unsigned
  @Ix(124, TwoRegOneImmIxDecoder)
  load_ind_u8(
    { wA, wB, vX }: TwoRegOneImmArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    const location = toSafeMemoryAddress(wB.value + vX);
    if (!context.execution.memory.canRead(location, 1)) {
      return handleMemoryFault(
        context.execution.memory.firstUnreadable(location, 1)!,
      );
    }
    wA.value = <PVMRegisterRawValue>(
      BigInt(context.execution.memory.getBytes(location, 1)[0])
    );
  }

  @Ix(126, TwoRegOneImmIxDecoder)
  load_ind_u16(
    { wA, wB, vX }: TwoRegOneImmArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    const location = toSafeMemoryAddress(wB.value + vX);
    if (!context.execution.memory.canRead(location, 2)) {
      return handleMemoryFault(
        context.execution.memory.firstUnreadable(location, 2)!,
      );
    }
    const r = context.execution.memory.getBytes(location, 2);
    wA.value = <PVMRegisterRawValue>BigInt(r.readUint16LE());
  }

  @Ix(128, TwoRegOneImmIxDecoder)
  load_ind_u32(
    { wA, wB, vX }: TwoRegOneImmArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    const location = toSafeMemoryAddress(wB.value + vX);
    if (!context.execution.memory.canRead(location, 4)) {
      return handleMemoryFault(
        context.execution.memory.firstUnreadable(location, 4)!,
      );
    }
    const r = context.execution.memory.getBytes(location, 4);
    wA.value = <PVMRegisterRawValue>BigInt(r.readUInt32LE());
  }

  @Ix(130, TwoRegOneImmIxDecoder)
  load_ind_u64(
    { wA, wB, vX }: TwoRegOneImmArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    const location = toSafeMemoryAddress(wB.value + vX);
    if (!context.execution.memory.canRead(location, 8)) {
      return handleMemoryFault(
        context.execution.memory.firstUnreadable(location, 8)!,
      );
    }
    const r = context.execution.memory.getBytes(location, 8);

    wA.value = <PVMRegisterRawValue>r.readBigUInt64LE(0);
  }

  // # load signed
  @Ix(125, TwoRegOneImmIxDecoder)
  load_ind_i8(
    { wA, wB, vX }: TwoRegOneImmArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    const location = toSafeMemoryAddress(wB.value + vX);
    if (!context.execution.memory.canRead(location, 1)) {
      return handleMemoryFault(
        context.execution.memory.firstUnreadable(location, 1)!,
      );
    }
    const raw = context.execution.memory.getBytes(location, 1);
    const val = Z8_inv(Z1(BigInt(raw[0])));
    wA.value = <PVMRegisterRawValue>val;
  }

  @Ix(127, TwoRegOneImmIxDecoder)
  load_ind_i16(
    { wA, wB, vX }: TwoRegOneImmArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    const location = toSafeMemoryAddress(wB.value + vX);
    if (!context.execution.memory.canRead(location, 2)) {
      return handleMemoryFault(
        context.execution.memory.firstUnreadable(location, 2)!,
      );
    }
    const val = context.execution.memory.getBytes(location, 2);
    const num = val.readUint16LE();
    wA.value = <PVMRegisterRawValue>Z8_inv(Z2(BigInt(num)));
  }

  @Ix(129, TwoRegOneImmIxDecoder)
  load_ind_i32(
    { wA, wB, vX }: TwoRegOneImmArgs,
    context: PVMIxEvaluateFNContextImpl,
  ) {
    const location = toSafeMemoryAddress(wB.value + vX);
    if (!context.execution.memory.canRead(location, 4)) {
      return handleMemoryFault(
        context.execution.memory.firstUnreadable(location, 4)!,
      );
    }
    const val = context.execution.memory.getBytes(location, 4);
    const num = val.readUInt32LE();
    wA.value = <PVMRegisterRawValue>Z8_inv(Z4(BigInt(num)));
  }

  // math
  @Ix(131, TwoRegOneImmIxDecoder)
  add_imm_32({ wA, wB, vX }: TwoRegOneImmArgs) {
    wA.value = <PVMRegisterRawValue>X_4((wB.value + vX) % 2n ** 32n);
  }

  @Ix(132, TwoRegOneImmIxDecoder)
  and_imm({ wA, wB, vX }: TwoRegOneImmArgs) {
    wA.value = <PVMRegisterRawValue>(wB.value & vX);
  }

  @Ix(133, TwoRegOneImmIxDecoder)
  xor_imm({ wA, wB, vX }: TwoRegOneImmArgs) {
    wA.value = <PVMRegisterRawValue>(wB.value ^ vX);
  }

  @Ix(134, TwoRegOneImmIxDecoder)
  or_imm({ wA, wB, vX }: TwoRegOneImmArgs) {
    wA.value = <PVMRegisterRawValue>(wB.value | vX);
  }

  @Ix(135, TwoRegOneImmIxDecoder)
  mul_imm_32({ wA, wB, vX }: TwoRegOneImmArgs) {
    wA.value = <PVMRegisterRawValue>((wB.value * vX) % 2n ** 32n);
  }

  @Ix(136, TwoRegOneImmIxDecoder)
  set_lt_u_imm({ wA, wB, vX }: TwoRegOneImmArgs) {
    wA.value = <PVMRegisterRawValue>(wB.value < vX ? 1n : 0n);
  }

  @Ix(137, TwoRegOneImmIxDecoder)
  set_lt_s_imm({ wA, wB, vX }: TwoRegOneImmArgs) {
    wA.value = <PVMRegisterRawValue>(Z8(wB.value) < Z8(vX) ? 1n : 0n);
  }

  @Ix(138, TwoRegOneImmIxDecoder)
  shlo_l_imm_32({ wA, wB, vX }: TwoRegOneImmArgs) {
    wA.value = <PVMRegisterRawValue>X_4((wB.value << vX % 32n) % 2n ** 32n);
  }

  @Ix(139, TwoRegOneImmIxDecoder)
  shlo_r_imm_32({ wA, wB, vX }: TwoRegOneImmArgs) {
    const wb = Number(wB.value % 2n ** 32n);
    wA.value = <PVMRegisterRawValue>X_4(BigInt(wb >>> Number(vX % 32n)));
  }

  @Ix(140, TwoRegOneImmIxDecoder)
  shar_r_imm_32({ wA, wB, vX }: TwoRegOneImmArgs) {
    const wb = wB.value % 2n ** 32n;
    wA.value = <PVMRegisterRawValue>Z8_inv(BigInt(Z4(wb) >> vX % 32n));
  }

  @Ix(141, TwoRegOneImmIxDecoder)
  neg_add_imm_32({ wA, wB, vX }: TwoRegOneImmArgs) {
    let val = (vX + 2n ** 32n - wB.value) % 2n ** 32n;
    if (val < 0n) {
      // other languages behave differently than js when modulo a negative number
      // see comment 3 on pull 3 of jamtestvector.
      val += 2n ** 32n;
    }
    wA.value = <PVMRegisterRawValue>X_4(val);
  }

  @Ix(142, TwoRegOneImmIxDecoder)
  set_gt_u_imm({ wA, wB, vX }: TwoRegOneImmArgs) {
    wA.value = <PVMRegisterRawValue>(wB.value > vX ? 1n : 0n);
  }

  @Ix(143, TwoRegOneImmIxDecoder)
  set_gt_s_imm({ wA, wB, vX }: TwoRegOneImmArgs) {
    wA.value = <PVMRegisterRawValue>(Z8(wB.value) > Z8(BigInt(vX)) ? 1n : 0n);
  }

  @Ix(144, TwoRegOneImmIxDecoder)
  shlo_l_imm_alt_32({ wA, wB, vX }: TwoRegOneImmArgs) {
    wA.value = <PVMRegisterRawValue>X_4((vX << wB.value % 32n) % 2n ** 32n);
  }

  @Ix(145, TwoRegOneImmIxDecoder)
  shlo_r_imm_alt_32({ wA, wB, vX }: TwoRegOneImmArgs) {
    wA.value = <PVMRegisterRawValue>(
      BigInt(Number(vX) >>> Number(wB.value % 32n))
    );
  }

  @Ix(146, TwoRegOneImmIxDecoder)
  shar_r_imm_alt_32({ wA, wB, vX }: TwoRegOneImmArgs) {
    wA.value = <PVMRegisterRawValue>(
      Z8_inv(BigInt(Z4(vX % 2n ** 32n)) >> wB.value % 32n)
    );
  }

  @Ix(147, TwoRegOneImmIxDecoder)
  cmov_iz_imm({ wA, wB, vX }: TwoRegOneImmArgs) {
    if (wB.value === 0n) {
      wA.value = <PVMRegisterRawValue>vX;
    }
  }

  @Ix(148, TwoRegOneImmIxDecoder)
  cmov_nz_imm({ wA, wB, vX }: TwoRegOneImmArgs) {
    if (wB.value !== 0n) {
      wA.value = <PVMRegisterRawValue>vX;
    }
  }

  @Ix(149, TwoRegOneImmIxDecoder)
  add_imm_64({ wA, wB, vX }: TwoRegOneImmArgs) {
    wA.value = <PVMRegisterRawValue>((wB.value + BigInt(vX)) % 2n ** 64n);
  }

  @Ix(150, TwoRegOneImmIxDecoder)
  mul_imm_64({ wA, wB, vX }: TwoRegOneImmArgs) {
    wA.value = <PVMRegisterRawValue>((wB.value * BigInt(vX)) % 2n ** 64n);
  }

  @Ix(151, TwoRegOneImmIxDecoder)
  shlo_l_imm_64({ wA, wB, vX }: TwoRegOneImmArgs) {
    wA.value = <PVMRegisterRawValue>(
      X_8((wB.value << BigInt(vX % 64n)) % 2n ** 64n)
    );
  }

  @Ix(152, TwoRegOneImmIxDecoder)
  shlo_r_imm_64({ wA, wB, vX }: TwoRegOneImmArgs) {
    wA.value = <PVMRegisterRawValue>X_8(wB.value / 2n ** (BigInt(vX) % 64n));
  }

  @Ix(153, TwoRegOneImmIxDecoder)
  shar_r_imm_64({ wA, wB, vX }: TwoRegOneImmArgs) {
    const z8b = Z8(wB.value);
    const dividend = 2n ** (BigInt(vX) % 64n);
    let result = z8b / dividend;
    // Math.floor for negative numbers
    if (z8b < 0n && dividend > 0n && z8b % dividend !== 0n) {
      result -= 1n;
    }
    wA.value = <PVMRegisterRawValue>Z8_inv(result);
  }

  @Ix(154, TwoRegOneImmIxDecoder)
  neg_add_imm_64({ wA, wB, vX }: TwoRegOneImmArgs) {
    wA.value = <PVMRegisterRawValue>(
      ((BigInt(vX) + 2n ** 64n - wB.value) % 2n ** 64n)
    );
  }

  @Ix(155, TwoRegOneImmIxDecoder)
  shlo_l_imm_alt_64({ wA, wB, vX }: TwoRegOneImmArgs) {
    wA.value = <PVMRegisterRawValue>(
      ((BigInt(vX) << wB.value % 64n) % 2n ** 64n)
    );
  }

  @Ix(156, TwoRegOneImmIxDecoder)
  shlo_r_imm_alt_64({ wA, wB, vX }: TwoRegOneImmArgs) {
    wA.value = <PVMRegisterRawValue>(
      ((BigInt(vX) / 2n ** (wB.value % 64n)) % 2n ** 64n)
    );
  }

  @Ix(157, TwoRegOneImmIxDecoder)
  shar_r_imm_alt_64({ wA, wB, vX }: TwoRegOneImmArgs) {
    wA.value = <PVMRegisterRawValue>Z8_inv(Z8(BigInt(vX)) >> wB.value % 64n);
  }

  @Ix(158, TwoRegOneImmIxDecoder)
  rot_r_64_imm({ wA, wB, vX }: TwoRegOneImmArgs) {
    const shift = vX % 64n;
    const mask = 2n ** 64n - 1n;
    const value = wB.value;
    const result = (value >> shift) | ((value << (64n - shift)) & mask);
    wA.value = <PVMRegisterRawValue>result;
  }

  @Ix(159, TwoRegOneImmIxDecoder)
  rot_r_64_imm_alt({ wA, wB, vX }: TwoRegOneImmArgs) {
    const shift = wB.value % 64n;
    const mask = 2n ** 64n - 1n;
    const value = vX;
    const result = (value >> shift) | ((value << (64n - shift)) & mask);
    wA.value = <PVMRegisterRawValue>result;
  }

  @Ix(160, TwoRegOneImmIxDecoder)
  rot_r_32_imm({ wA, wB, vX }: TwoRegOneImmArgs) {
    const shift = vX % 32n;
    const mask = 2n ** 32n - 1n;
    const value = wB.value % 2n ** 32n;
    const result = (value >> shift) | ((value << (32n - shift)) & mask);
    wA.value = <PVMRegisterRawValue>X_4(result);
  }

  @Ix(161, TwoRegOneImmIxDecoder)
  rot_r_32_imm_alt({ wA, wB, vX }: TwoRegOneImmArgs) {
    const shift = wB.value % 32n;
    const mask = 2n ** 32n - 1n;
    const value = vX % 2n ** 32n;
    const result = (value >> shift) | ((value << (32n - shift)) & mask);
    wA.value = <PVMRegisterRawValue>X_4(result);
  }

  @Ix(190, ThreeRegIxDecoder)
  add_32({ wA, wB, wD }: ThreeRegArgs) {
    wD.value = <PVMRegisterRawValue>X_4((wA.value + wB.value) % 2n ** 32n);
  }

  @Ix(191, ThreeRegIxDecoder)
  sub_32({ wA, wB, wD }: ThreeRegArgs) {
    wD.value = <PVMRegisterRawValue>(
      X_4((wA.value + 2n ** 32n - (wB.value % 2n ** 32n)) % 2n ** 32n)
    );
  }

  @Ix(192, ThreeRegIxDecoder)
  mul_32({ wA, wB, wD }: ThreeRegArgs) {
    wD.value = <PVMRegisterRawValue>X_4((wA.value * wB.value) % 2n ** 32n);
  }

  @Ix(193, ThreeRegIxDecoder)
  div_u_32({ wA, wB, wD }: ThreeRegArgs) {
    if (wB.value % 2n ** 32n === 0n) {
      wD.value = <PVMRegisterRawValue>(2n ** 64n - 1n);
    } else {
      wD.value = <PVMRegisterRawValue>((wA.value % 2n**32n)/ (wB.value%2n**32n));
    }
  }

  @Ix(194, ThreeRegIxDecoder)
  div_s_32({ wA, wB, wD }: ThreeRegArgs) {
    const z4a = Number(Z4(wA.value % 2n ** 32n));
    const z4b = Number(Z4(wB.value % 2n ** 32n));
    let newVal: number | bigint;
    if (z4b === 0) {
      newVal = 2n ** 64n - 1n;
    } else if (z4a == -1 * 2 ** 31 && z4b === -1) {
      newVal = Z8_inv(BigInt(z4a));
    } else {
      // this is basically `rtz`
      newVal = Z8_inv(BigInt(Math.trunc(z4a / z4b)));
    }

    wD.value = <PVMRegisterRawValue>newVal;
  }

  @Ix(195, ThreeRegIxDecoder)
  rem_u_32({ wA, wB, wD }: ThreeRegArgs) {
    let newVal: bigint;
    if (wB.value % 2n ** 32n === 0n) {
      newVal = X_4(wA.value % 2n ** 32n);
    } else {
      newVal = X_4((wA.value % 2n ** 32n) % (wB.value % 2n ** 32n));
    }
    wD.value = <PVMRegisterRawValue>newVal;
  }

  @Ix(196, ThreeRegIxDecoder)
  rem_s_32({ wA, wB, wD }: ThreeRegArgs) {
    const z4a = Number(Z4(wA.value % 2n ** 32n));
    const z4b = Number(Z4(wB.value % 2n ** 32n));
    let newVal: bigint;
    if (z4a === -1 * 2 ** 31 && z4b === -1) {
      newVal = 0n;
    } else {
      newVal = Z8_inv(smod(BigInt(z4a), BigInt(z4b)));
    }
    wD.value = <PVMRegisterRawValue>newVal;
  }

  @Ix(197, ThreeRegIxDecoder)
  shlo_l_32({ wA, wB, wD }: ThreeRegArgs) {
    wD.value = <PVMRegisterRawValue>(
      X_4((wA.value << wB.value % 32n) % 2n ** 32n)
    );
  }

  @Ix(198, ThreeRegIxDecoder)
  shlo_r_32({ wA, wB, wD }: ThreeRegArgs) {
    const wa_32 = Number(wA.value % 2n ** 32n);
    const wb_32 = Number(wB.value % 2n ** 32n);
    wD.value = <PVMRegisterRawValue>X_4(BigInt(wa_32 >>> wb_32));
  }

  @Ix(199, ThreeRegIxDecoder)
  shar_r_32({ wA, wB, wD }: ThreeRegArgs) {
    const z4a = Number(Z4(wA.value % 2n ** 32n));
    wD.value = <PVMRegisterRawValue>(
      Z8_inv(BigInt(Math.floor(z4a / 2 ** Number(wB.value % 32n))))
    );
  }

  @Ix(200, ThreeRegIxDecoder)
  add_64({ wA, wB, wD }: ThreeRegArgs) {
    wD.value = <PVMRegisterRawValue>((wA.value + wB.value) % 2n ** 64n);
  }

  @Ix(201, ThreeRegIxDecoder)
  sub_64({ wA, wB, wD }: ThreeRegArgs) {
    wD.value = <PVMRegisterRawValue>(
      ((wA.value + 2n ** 64n - wB.value) % 2n ** 64n)
    );
  }

  @Ix(202, ThreeRegIxDecoder)
  mul_64({ wA, wB, wD }: ThreeRegArgs) {
    wD.value = <PVMRegisterRawValue>((wA.value * wB.value) % 2n ** 64n);
  }

  @Ix(203, ThreeRegIxDecoder)
  div_u_64({ wA, wB, wD }: ThreeRegArgs) {
    if (wB.value === 0n) {
      wD.value = <PVMRegisterRawValue>(2n ** 64n - 1n);
    } else {
      wD.value = <PVMRegisterRawValue>(wA.value / wB.value);
    }
  }

  @Ix(204, ThreeRegIxDecoder)
  div_s_64({ wA, wB, wD }: ThreeRegArgs) {
    const z8a = Z8(wA.value);
    const z8b = Z8(wB.value);
    let newVal: bigint;
    if (wB.value === 0n) {
      newVal = 2n ** 64n - 1n;
    } else if (z8a == -1n * 2n ** 63n && z8b === -1n) {
      newVal = wA.value;
    } else {
      newVal = Z8_inv(z8a / z8b); // since bigint (RegisterValue) has no decimal point this is `rtz` already
    }
    wD.value = <PVMRegisterRawValue>newVal;
  }

  @Ix(205, ThreeRegIxDecoder)
  rem_u_64({ wA, wB, wD }: ThreeRegArgs) {
    let newVal: bigint;
    if (wB.value === 0n) {
      newVal = wA.value;
    } else {
      newVal = wA.value % wB.value;
    }
    wD.value = <PVMRegisterRawValue>newVal;
  }

  @Ix(206, ThreeRegIxDecoder)
  rem_s_64({ wA, wB, wD }: ThreeRegArgs) {
    const z8a = Z8(wA.value);
    const z8b = Z8(wB.value);
    let newVal: bigint;
    if (z8a === -1n * 2n ** 63n && z8b === -1n) {
      newVal = 0n;
    } else {
      newVal = Z8_inv(smod(z8a, z8b));
    }
    wD.value = <PVMRegisterRawValue>newVal;
  }

  @Ix(207, ThreeRegIxDecoder)
  shlo_l_64({ wA, wB, wD }: ThreeRegArgs) {
    wD.value = <PVMRegisterRawValue>((wA.value << wB.value % 64n) % 2n ** 64n);
  }

  @Ix(208, ThreeRegIxDecoder)
  shlo_r_64({ wA, wB, wD }: ThreeRegArgs) {
    wD.value = <PVMRegisterRawValue>(wA.value / 2n ** (wB.value % 64n));
  }

  @Ix(209, ThreeRegIxDecoder)
  shar_r_64({ wA, wB, wD }: ThreeRegArgs) {
    const z8a = Z8(wA.value);
    const dividend = 2n ** (wB.value % 64n);
    let result = z8a / dividend;
    if (z8a < 0n && dividend > 0n && z8a % dividend !== 0n) {
      result -= 1n;
    }
    wD.value = <PVMRegisterRawValue>Z8_inv(result);
  }

  @Ix(210, ThreeRegIxDecoder)
  and({ wA, wB, wD }: ThreeRegArgs) {
    wD.value = <PVMRegisterRawValue>(wA.value & wB.value);
  }

  @Ix(211, ThreeRegIxDecoder)
  xor({ wA, wB, wD }: ThreeRegArgs) {
    wD.value = <PVMRegisterRawValue>(wA.value ^ wB.value);
  }

  @Ix(212, ThreeRegIxDecoder)
  or({ wA, wB, wD }: ThreeRegArgs) {
    wD.value = <PVMRegisterRawValue>(wA.value | wB.value);
  }

  @Ix(213, ThreeRegIxDecoder)
  mul_upper_s_s({ wA, wB, wD }: ThreeRegArgs) {
    wD.value = <PVMRegisterRawValue>(
      Z8_inv((Z8(wA.value) * Z8(wB.value)) / 2n ** 64n)
    );
  }

  @Ix(214, ThreeRegIxDecoder)
  mul_upper_u_u({ wA, wB, wD }: ThreeRegArgs) {
    wD.value = <PVMRegisterRawValue>((wA.value * wB.value) / 2n ** 64n);
  }

  @Ix(215, ThreeRegIxDecoder)
  mul_upper_s_u({ wA, wB, wD }: ThreeRegArgs) {
    const mult = Z8(wA.value) * wB.value;
    let val = mult / 2n ** 64n;
    if (val < 0n && mult % 2n ** 64n !== 0n) {
      val--;
    }
    wD.value = <PVMRegisterRawValue>Z8_inv(val);
  }

  @Ix(216, ThreeRegIxDecoder)
  set_lt_u({ wA, wB, wD }: ThreeRegArgs) {
    wD.value = <PVMRegisterRawValue>(wA.value < wB.value ? 1n : 0n);
  }

  @Ix(217, ThreeRegIxDecoder)
  set_lt_s({ wA, wB, wD }: ThreeRegArgs) {
    const z4a = Z8(wA.value);
    const z4b = Z8(wB.value);
    wD.value = <PVMRegisterRawValue>(z4a < z4b ? 1n : 0n);
  }

  @Ix(218, ThreeRegIxDecoder)
  cmov_iz({ wA, wB, wD }: ThreeRegArgs) {
    if (wB.value === 0n) {
      wD.value = wA.value;
    }
  }

  @Ix(219, ThreeRegIxDecoder)
  cmov_nz({ wA, wB, wD }: ThreeRegArgs) {
    if (wB.value !== 0n) {
      wD.value = wA.value;
    }
  }

  @Ix(220, ThreeRegIxDecoder)
  rot_l_64({ wA, wB, wD }: ThreeRegArgs) {
    const shift = wB.value & 63n; // ensure its in the range 0-63
    const mask = 2n ** 64n - 1n;
    const result = ((wA.value << shift) | (wA.value >> (64n - shift))) & mask;
    wD.value = <PVMRegisterRawValue>result;
  }

  @Ix(221, ThreeRegIxDecoder)
  rot_l_32({ wA: _wA, wB, wD }: ThreeRegArgs) {
    const wA = _wA.value % 2n ** 32n;
    const shift = wB.value & 31n; // ensure its in the range 0-31
    const mask = 2n ** 32n - 1n;
    const result = ((wA << shift) | (wA >> (32n - shift))) & mask;
    wD.value = <PVMRegisterRawValue>X_4(result);
  }

  @Ix(222, ThreeRegIxDecoder)
  rot_r_64({ wA, wB, wD }: ThreeRegArgs) {
    const shift = wB.value & 63n; // ensure its in the range 0-63
    const mask = 2n ** 64n - 1n;
    const result = ((wA.value >> shift) | (wA.value << (64n - shift))) & mask;
    wD.value = <PVMRegisterRawValue>result;
  }

  @Ix(223, ThreeRegIxDecoder)
  rot_r_32({ wA: _wA, wB, wD }: ThreeRegArgs) {
    const wA = _wA.value % 2n ** 32n;
    const shift = wB.value & 31n; // ensure its in the range 0-31
    const mask = 2n ** 32n - 1n;
    const result = ((wA >> shift) | (wA << (32n - shift))) & mask;
    wD.value = <PVMRegisterRawValue>X_4(result);
  }

  @Ix(224, ThreeRegIxDecoder)
  and_inv({ wA, wB, wD }: ThreeRegArgs) {
    wD.value = <PVMRegisterRawValue>(wA.value & ~wB.value);
  }

  @Ix(225, ThreeRegIxDecoder)
  or_inv({ wA, wB, wD }: ThreeRegArgs) {
    wD.value = <PVMRegisterRawValue>(
      ((2n ** 64n + (wA.value | ~wB.value)) % 2n ** 64n)
    );
  }

  @Ix(226, ThreeRegIxDecoder)
  xnor({ wA, wB, wD }: ThreeRegArgs) {
    wD.value = <PVMRegisterRawValue>(
      ((2n ** 64n + ~(wA.value ^ wB.value)) % 2n ** 64n)
    );
  }

  @Ix(227, ThreeRegIxDecoder)
  max({ wA, wB, wD }: ThreeRegArgs) {
    const z8a = Z8(wA.value);
    const z8b = Z8(wB.value);
    // using wA and wB is basically a Z8_inv
    wD.value = <PVMRegisterRawValue>(z8a > z8b ? wA.value : wB.value);
  }

  @Ix(228, ThreeRegIxDecoder)
  max_u({ wA, wB, wD }: ThreeRegArgs) {
    wD.value = <PVMRegisterRawValue>(wA.value > wB.value ? wA.value : wB.value);
  }

  @Ix(229, ThreeRegIxDecoder)
  min({ wA, wB, wD }: ThreeRegArgs) {
    const z8a = Z8(wA.value);
    const z8b = Z8(wB.value);
    // using wA and wB is basically a Z8_inv
    wD.value = <PVMRegisterRawValue>(z8a < z8b ? wA.value : wB.value);
  }

  @Ix(230, ThreeRegIxDecoder)
  min_u({ wA, wB, wD }: ThreeRegArgs) {
    wD.value = <PVMRegisterRawValue>(wA.value < wB.value ? wA.value : wB.value);
  }
}

/**
 * $(0.7.1 - A.9)
 * $(0.7.1 - A.8) | is handled by caller
 */
const handleMemoryFault = (location: u32): PVMExitReasonImpl => {
  if (location < 2 ** 16) {
    return PVMExitReasonImpl.panic();
  }
  return PVMExitReasonImpl.pageFault(<u32>(Zp * Math.floor(location % Zp)));
};
const storeSafe = (
  location: u32,
  bytes: Buffer,
  context: PVMIxEvaluateFNContextImpl,
) => {
  const memory = context.execution.memory;
  if (!memory.canWrite(location, bytes.length)) {
    return PVMExitReasonImpl.pageFault(
      memory.firstUnwriteable(location, bytes.length)!,
    );
  }
  memory.setBytes(location, bytes);
};
