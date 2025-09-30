import { PVMExitReason } from "./exit-reason";
import { BigInt } from "as-bigint/assembly";
import * as console from "as-console";
import { varint, readLE, x_fn } from "./varint";
import {
  $oneImmIxDecoder,
  $oneRegOneExtImmArgsIxDecoder,
  $twoImmIxDecoder,
  $oneOffsetIxDecoder,
  $oneRegOneImmIxDecoder,
  $oneRegTwoImmIxDecoder,
  $oneRegOneImmOneOffsetIxDecoder,
  $twoRegIxDecoder,
  $twoRegOneImmIxDecoder,
  $twoRegOneOffsetIxDecoder,
  $twoRegTwImmIxDecoder,
  $threeRegIxDecoder,
} from "./ix-decoders";
import { Z, Z_inv } from "./zed";
import { PVMMemory } from "./pvm-memory";

export class PVM {
  registers: StaticArray<u64>;
  /** Remaining gas */
  gas: u64;
  /** Instruction pointer */
  pc: u32;
  memory: PVMMemory;
  code: Uint8Array;
  jumpTable: StaticArray<u32>;
  instructionMask: StaticArray<u8>;
  hostCall: u8 = 0;

  // # caches
  blockBeginnings: StaticArray<u8>; // 0 = not checked, 1 = is block beginning, 2 = is not block beginnin
  skips: StaticArray<u32>; // cache of skips
  faultAddress: u32;

  constructor(
    registers: StaticArray<u64>,
    memory: PVMMemory,
    gas: u64,
    pc: u32,
    code: Uint8Array,
    /**
     * `j`
     */
    jumpTable: StaticArray<u32>,
    /**
     * `k`
     */
    instructionMask: StaticArray<u8>,
  ) {
    this.registers = registers;
    this.memory = memory;
    this.gas = gas;
    this.pc = pc;
    this.code = code;
    this.jumpTable = jumpTable;
    this.instructionMask = instructionMask;
    this.blockBeginnings = new StaticArray<u8>(instructionMask.length).fill(0);
    this.skips = new StaticArray<u32>(instructionMask.length).fill(0);
    this.faultAddress = 0;
    this.blockBeginnings[0] = 1;
  }

  deinit(): void {
    this.code = new Uint8Array(0);
    this.blockBeginnings = new StaticArray<u8>(0);
    this.skips = new StaticArray<u32>(0);
    this.registers = new StaticArray<u64>(0);
  }

  /**
   * checks if the given pc is the beginning of a block
   */
  isBlockBeginning(pc: u32): boolean {
    if (this.blockBeginnings[pc] !== 0) {
      return this.blockBeginnings[pc] === 1;
    }
    if (
      pc >= u32(this.instructionMask.length) ||
      this.instructionMask[pc] === 0
    ) {
      // no cache because might be out of bounds
      return false;
    }
    let prevPC = pc - 1;
    for (; prevPC > 0 && this.instructionMask[prevPC] === 0; prevPC--);
    const prevOpCode = this.code[prevPC];

    switch (prevOpCode) {
      case 0: // trap
      case 1: // fallthrough
      case 20: // load_imm_64
      case 40: // jump
      case 50: // jump_ind
      case 80: // load_imm_jump
      case 81: // branch_eq_imm
      case 82: // branch_ne_imm
      case 83: // branch_lt_u_imm
      case 84: // branch_le_u_imm
      case 85: // branch_ge_u_imm
      case 86: // branch_gt_u_imm
      case 87: // branch_lt_s_imm
      case 88: // branch_le_s_imm
      case 89: // branch_ge_s_imm
      case 90: // branch_gt_s_imm
      case 180: // load_imm_jump_ind
      case 170: // branch_eq
      case 171: // branch_ne
      case 172: // branch_lt_u
      case 173: // branch_lt_s
      case 174: // branch_ge_u
      case 175: // branch_ge_s
        this.blockBeginnings[pc] = 1;
        return true;
      default:
        this.blockBeginnings[pc] = 2;
        return false;
    }
  }

  /**
   * computes $(0.7.1 - A.20)
   */
  skip(pc: u32): u32 {
    // cache
    if (this.skips[pc] !== 0) {
      return this.skips[pc];
    }

    // we assume pc points to a valid instruction
    let nextPC: u32 = pc + 1;
    while (
      nextPC < u32(this.instructionMask.length) &&
      this.instructionMask[nextPC] === 0
    ) {
      nextPC++;
    }

    return (this.skips[pc] = nextPC - pc);
  }

  /**
   * basic invocation
   */
  run(): PVMExitReason {
    let rA!: u8;
    let rB!: u8;
    let rD!: u8;
    let vX!: u64;
    let vY!: u64;
    let offset!: u32;

    const buf1: Uint8Array = new Uint8Array(1);
    const buf2: Uint8Array = new Uint8Array(2);
    const buf4: Uint8Array = new Uint8Array(4);
    const buf8: Uint8Array = new Uint8Array(8);
    const codeLen = u32(this.code.length);

    let pcHandledByIx: boolean;

    while (this.gas > 0) {
      const pc = <u32>this.pc;
      pcHandledByIx = false;
      this.gas--;
      if (pc >= codeLen) {
        return PVMExitReason.Panic;
      }
      const skip = this.skip(pc);
      const args: Uint8Array = this.code.subarray(pc + 1, pc + skip);
      const opCode = this.code[pc];

      // it might be overriden by a jump
      // console.log(
      //   `pc=${pc} opCode=${opCode} args=[${args.join(",")}] gas=${this.gas}`,
      // );
      // console.log(`regs=${this.registers.join(",")}`);

      // DECODE and execute ix
      switch (opCode) {
        default: {
          return PVMExitReason.Panic;
        }
        case 0: {
          return PVMExitReason.Panic;
        }
        case 1: {
          // fallthrough
          break;
        }
        case 10: {
          // ecalli
          $oneImmIxDecoder!(args, vX);
          this.hostCall = u8(vX);
          break;
        }
        case 20: {
          // load_imm_64
          $oneRegOneExtImmArgsIxDecoder!(args, rA, vX);
          this.registers[rA] = vX;
          break;
        }
        case 30: {
          // store_imm_u8
          $twoImmIxDecoder!(args, vX, vY);
          store<u8>(buf1.dataStart, <u8>vY);
          $storeSafe!(vX, buf1);
          break;
        }
        case 31: {
          // store_imm_u16
          $twoImmIxDecoder!(args, vX, vY);
          store<u16>(buf2.dataStart, <u16>vY);
          $storeSafe!(vX, buf2);
          break;
        }
        case 32: {
          // store_imm_u32
          $twoImmIxDecoder!(args, vX, vY);
          store<u32>(buf4.dataStart, <u32>vY);
          $storeSafe!(vX, buf4);
          break;
        }
        case 33: {
          // store_imm_u64
          $twoImmIxDecoder!(args, vX, vY);
          store<u64>(buf8.dataStart, vY);
          $storeSafe!(vX, buf8);
          break;
        }

        // can optimize the switch
        case 40: {
          // jump
          $oneOffsetIxDecoder!(args, pc, offset);
          $branch!(true, offset);
          break;
        }

        case 50: {
          // jump_ind
          $oneRegOneImmIxDecoder!(args, rA, vX);
          const jumpAddr = <u32>(this.registers[rA] + vX);
          $djump!(jumpAddr);
          break;
        }

        case 51: {
          //load_imm
          $oneRegOneImmIxDecoder!(args, rA, vX);
          this.registers[rA] = vX;
          break;
        }

        case 52: {
          // load_u8
          $oneRegOneImmIxDecoder!(args, rA, vX);
          $readSafe!(u32(vX), buf1);
          this.registers[rA] = load<u8>(buf1.dataStart);
          break;
        }

        case 53: {
          // load_i8
          $oneRegOneImmIxDecoder!(args, rA, vX);
          $readSafe!(u32(vX), buf1);
          this.registers[rA] = x_fn(1, load<u8>(buf1.dataStart));
          break;
        }

        case 54: {
          // load_u16
          $oneRegOneImmIxDecoder!(args, rA, vX);
          $readSafe!(u32(vX), buf2);
          this.registers[rA] = load<u16>(buf2.dataStart);
          break;
        }

        case 55: {
          // load_i16
          $oneRegOneImmIxDecoder!(args, rA, vX);
          $readSafe!(u32(vX), buf2);
          this.registers[rA] = x_fn(2, load<u16>(buf2.dataStart));
          break;
        }

        case 56: {
          // load_u32
          $oneRegOneImmIxDecoder!(args, rA, vX);
          $readSafe!(u32(vX), buf4);
          this.registers[rA] = load<u32>(buf4.dataStart);
          break;
        }

        case 57: {
          // load_i32
          $oneRegOneImmIxDecoder!(args, rA, vX);
          $readSafe!(u32(vX), buf4);
          this.registers[rA] = <u64>x_fn(4, load<u32>(buf4.dataStart));
          break;
        }

        case 58: {
          // load_u64
          $oneRegOneImmIxDecoder!(args, rA, vX);
          $readSafe!(u32(vX), buf8);
          this.registers[rA] = load<u64>(buf8.dataStart);
          break;
        }

        case 59: {
          // store u8
          $oneRegOneImmIxDecoder!(args, rA, vX);
          const safeAddr = <u32>vX;
          store<u8>(buf1.dataStart, <u8>this.registers[rA]);
          $storeSafe!(safeAddr, buf1);
          break;
        }

        case 60: {
          // store_u16
          $oneRegOneImmIxDecoder!(args, rA, vX);
          const safeAddr = <u32>vX;
          store<u16>(buf2.dataStart, <u16>this.registers[rA]);
          $storeSafe!(safeAddr, buf2);
          break;
        }

        case 61: {
          //store_u32
          $oneRegOneImmIxDecoder!(args, rA, vX);
          const safeAddr = <u32>vX;
          store<u32>(buf4.dataStart, <u32>this.registers[rA]);
          $storeSafe!(safeAddr, buf4);
          break;
        }

        case 62: {
          //store_u64
          $oneRegOneImmIxDecoder!(args, rA, vX);
          const safeAddr = <u32>vX;
          store<u64>(buf8.dataStart, <u64>this.registers[rA]);
          $storeSafe!(safeAddr, buf8);
          break;
        }

        // TODO: maybe fill the gaps wasm opt switch

        case 70: {
          // store_imm_ind_u8
          $oneRegTwoImmIxDecoder!(args, rA, vX, vY);
          const safeAddr = <u32>(this.registers[rA] + vX);
          store<u8>(buf1.dataStart, <u8>vY);
          $storeSafe!(safeAddr, buf1);
          break;
        }

        case 71: {
          // store_imm_ind_u16
          $oneRegTwoImmIxDecoder!(args, rA, vX, vY);
          const safeAddr = <u32>(this.registers[rA] + vX);
          store<u16>(buf2.dataStart, <u16>vY);
          $storeSafe!(safeAddr, buf2);
          break;
        }

        case 72: {
          // store_imm_ind_u32
          $oneRegTwoImmIxDecoder!(args, rA, vX, vY);
          const safeAddr = <u32>(this.registers[rA] + vX);
          store<u32>(buf4.dataStart, <u32>vY);
          $storeSafe!(safeAddr, buf4);
          break;
        }

        case 73: {
          // store_imm_ind_u64

          $oneRegTwoImmIxDecoder!(args, rA, vX, vY);
          const safeAddr = <u32>(this.registers[rA] + vX);
          store<u64>(buf8.dataStart, <u64>vY);
          $storeSafe!(safeAddr, buf8);
          break;
        }

        // TODO: maybe fill the gaps wasm opt switch

        case 80: {
          // load_imm_jump
          $oneRegOneImmOneOffsetIxDecoder!(args, pc, rA, vX, offset);
          this.registers[rA] = vX;
          $branch!(true, offset);
          break;
        }

        case 81: {
          // branch_eq_imm
          $oneRegOneImmOneOffsetIxDecoder!(args, pc, rA, vX, offset);
          $branch!(this.registers[rA] === vX, offset);
          break;
        }

        case 82: {
          // branch_ne_imm
          $oneRegOneImmOneOffsetIxDecoder!(args, pc, rA, vX, offset);
          $branch!(this.registers[rA] !== vX, offset);
          break;
        }

        case 83: {
          // branch_lt_u_imm
          $oneRegOneImmOneOffsetIxDecoder!(args, pc, rA, vX, offset);
          $branch!(this.registers[rA] < vX, offset);
          break;
        }

        case 84: {
          // branch_le_u_imm
          $oneRegOneImmOneOffsetIxDecoder!(args, pc, rA, vX, offset);
          $branch!(this.registers[rA] <= vX, offset);
          break;
        }

        case 85: {
          // branch_ge_u_imm
          $oneRegOneImmOneOffsetIxDecoder!(args, pc, rA, vX, offset);
          $branch!(this.registers[rA] >= vX, offset);
          break;
        }

        case 86: {
          // branch_gt_u_imm
          $oneRegOneImmOneOffsetIxDecoder!(args, pc, rA, vX, offset);
          $branch!(this.registers[rA] > vX, offset);
          break;
        }

        case 87: {
          // branch_lt_s_imm
          $oneRegOneImmOneOffsetIxDecoder!(args, pc, rA, vX, offset);
          $branch!(Z(8, this.registers[rA]) < Z(8, vX), offset);
          break;
        }

        case 88: {
          /// branch_le_s_imm
          $oneRegOneImmOneOffsetIxDecoder!(args, pc, rA, vX, offset);
          $branch!(Z(8, this.registers[rA]) <= Z(8, vX), offset);
          break;
        }

        case 89: {
          // branch_ge_s_imm
          $oneRegOneImmOneOffsetIxDecoder!(args, pc, rA, vX, offset);
          $branch!(Z(8, this.registers[rA]) >= Z(8, vX), offset);
          break;
        }

        case 90: {
          // branch_gt_s_imm
          $oneRegOneImmOneOffsetIxDecoder!(args, pc, rA, vX, offset);
          $branch!(Z(8, this.registers[rA]) > Z(8, vX), offset);
          break;
        }

        case 100: {
          // move_reg
          $twoRegIxDecoder!(args, rA, rD);
          this.registers[rD] = this.registers[rA];
          break;
        }

        case 101: {
          $twoRegIxDecoder!(args, rA, rD);
          // NOTE: there is nothing against having a register asking for u64 size of memory
          // the sbrk assumes it will always comply
          this.registers[rD] = this.memory.sbrk(u32(this.registers[rA]));
          break;
        }

        case 102: {
          // count_set_bits_64
          $twoRegIxDecoder!(args, rA, rD);
          let wA = this.registers[rA];
          let sum: u8 = 0;
          for (let i: u8 = 0; i < 64; i++) {
            sum += <u8>(wA & 1);
            wA >>= 1;
          }
          this.registers[rD] = sum;
          break;
        }

        case 103: {
          // count_set_bits_32
          $twoRegIxDecoder!(args, rA, rD);
          let wA = <u32>this.registers[rA];
          let sum: u8 = 0;
          for (let i: u8 = 0; i < 32; i++) {
            sum += <u8>(wA & 1);
            wA >>= 1;
          }
          this.registers[rD] = sum;
          break;
        }

        case 104: {
          // leading_zero_bits_64
          $twoRegIxDecoder!(args, rA, rD);
          const wA = this.registers[rA];
          let count: u8 = 0;
          for (let i: u8 = 0; i < 64; i++) {
            if ((wA & (u64(1) << (63 - i))) !== 0) {
              break;
            }
            count++;
          }
          this.registers[rD] = count;
          break;
        }

        case 105: {
          // leading_zero_bits_32
          $twoRegIxDecoder!(args, rA, rD);
          const wA = <u32>this.registers[rA];
          let count: u8 = 0;
          for (let i: u8 = 0; i < 32; i++) {
            if ((wA & (u32(1) << (31 - i))) !== 0) {
              break;
            }
            count++;
          }
          this.registers[rD] = count;
          break;
        }

        case 106: {
          // trailing_zero_bits_64
          $twoRegIxDecoder!(args, rA, rD);
          const wA = this.registers[rA];
          let count: u8 = 0;
          for (let i: u8 = 0; i < 64; i++) {
            if ((wA & (u64(1) << i)) !== 0) {
              break;
            }
            count++;
          }
          this.registers[rD] = count;
          break;
        }

        case 107: {
          // trailing_zero_bits_32
          $twoRegIxDecoder!(args, rA, rD);
          const wA = <u32>this.registers[rA];
          let count: u8 = 0;
          for (let i: u8 = 0; i < 32; i++) {
            if ((wA & (u32(1) << i)) !== 0) {
              break;
            }
            count++;
          }
          this.registers[rD] = count;
          break;
        }

        case 108: {
          // sign_extend_8
          $twoRegIxDecoder!(args, rA, rD);
          this.registers[rD] = u64(i8(this.registers[rA]));
          break;
        }
        case 109: {
          // sign_extend_16
          $twoRegIxDecoder!(args, rA, rD);
          this.registers[rD] = u64(i16(this.registers[rA]));
          break;
        }

        case 110: {
          // zero_extend_16
          $twoRegIxDecoder!(args, rA, rD);
          this.registers[rD] = u16(this.registers[rA]);
          break;
        }

        case 111: {
          // reverse_bytes
          // TODO: check if there is a more efficient way to do this
          $twoRegIxDecoder!(args, rA, rD);
          let newVal: u64 = 0;
          const wA = this.registers[rA];
          for (let i: u8 = 0; i < 8; i++) {
            newVal |= ((wA >> (i * 8)) & 0xff) << ((7 - i) * 8);
          }
          this.registers[rD] = newVal;
          break;
        }

        case 120: {
          // store_ind_u8
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          const safeAddr = <u32>(this.registers[rB] + vX);
          store<u8>(buf1.dataStart, <u8>this.registers[rA]);
          $storeSafe!(safeAddr, buf1);
          break;
        }

        case 121: {
          // store_ind_u16
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          const safeAddr = <u32>(this.registers[rB] + vX);
          store<u16>(buf2.dataStart, <u16>this.registers[rA]);
          $storeSafe!(safeAddr, buf2);
          break;
        }

        case 122: {
          // store_ind_u32
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          const safeAddr = <u32>(this.registers[rB] + vX);
          store<u32>(buf4.dataStart, <u32>this.registers[rA]);
          $storeSafe!(safeAddr, buf4);
          break;
        }

        case 123: {
          // store_ind_u64
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          const safeAddr = <u32>(this.registers[rB] + vX);
          store<u64>(buf8.dataStart, this.registers[rA]);
          $storeSafe!(safeAddr, buf8);
          break;
        }

        case 124: {
          // load_ind_u8
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          $readSafe!(<u32>(this.registers[rB] + vX), buf1);
          this.registers[rA] = load<u8>(buf1.dataStart);
          break;
        }

        case 125: {
          // load_ind_i8
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          $readSafe!(<u32>(this.registers[rB] + vX), buf1);
          this.registers[rA] = i64(load<i8>(buf1.dataStart));
          break;
        }

        case 126: {
          // load_ind_u16
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          $readSafe!(<u32>(this.registers[rB] + vX), buf2);
          this.registers[rA] = load<u16>(buf2.dataStart);
          break;
        }

        case 127: {
          //load_ind_i16
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          $readSafe!(<u32>(this.registers[rB] + vX), buf2);
          this.registers[rA] = i64(load<i16>(buf2.dataStart));
          break;
        }

        case 128: {
          // load_ind_u32
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          $readSafe!(<u32>(this.registers[rB] + vX), buf4);
          this.registers[rA] = load<u32>(buf4.dataStart);
          break;
        }

        case 129: {
          // load_ind_i32
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          $readSafe!(<u32>(this.registers[rB] + vX), buf4);
          this.registers[rA] = i64(load<i32>(buf4.dataStart));
          break;
        }

        case 130: {
          // load_ind_u64
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          $readSafe!(<u32>(this.registers[rB] + vX), buf8);
          this.registers[rA] = load<u64>(buf8.dataStart);
          break;
        }

        case 131: {
          // add_imm_32
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          this.registers[rA] = x_fn(4, u32(this.registers[rB] + vX));
          break;
        }

        case 132: {
          // and_imm
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          this.registers[rA] = this.registers[rB] & vX;
          break;
        }

        case 133: {
          // xor_imm
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          this.registers[rA] = this.registers[rB] ^ vX;
          break;
        }
        case 134: {
          // or_imm
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          this.registers[rA] = this.registers[rB] | vX;
          break;
        }

        case 135: {
          // mul_imm_32
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          this.registers[rA] = u32(this.registers[rB] * vX);
          break;
        }

        case 136: {
          // set_lt_u_imm
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          this.registers[rA] = this.registers[rB] < vX ? 1 : 0;
          break;
        }

        case 137: {
          // set_lt_s_imm
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          this.registers[rA] = i64(this.registers[rB]) < i64(vX) ? 1 : 0;
          break;
        }

        case 138: {
          // shlo_l_imm_32
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          this.registers[rA] = x_fn(4, u32(this.registers[rB] << (vX & 31)));
          break;
        }

        case 139: {
          // shlo_r_imm_32
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          this.registers[rA] = x_fn(
            4,
            u32(this.registers[rB]) >>> u32(vX & 31),
          );
          break;
        }

        case 140: {
          // shar_r_imm_32
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          this.registers[rA] = u64(i32(this.registers[rB]) >> u32(vX & 31));
          break;
        }

        case 141: {
          // neg_add_imm_32
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          const val = u32(vX + 2 ** 32 - this.registers[rB]);
          this.registers[rA] = x_fn(4, val);
          break;
        }

        case 142: {
          // set_gt_u_imm
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          this.registers[rA] = this.registers[rB] > vX ? 1 : 0;
          break;
        }

        case 143: {
          // set_gt_s_imm
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          this.registers[rA] = i64(this.registers[rB]) > i64(vX) ? 1 : 0;
          break;
        }

        case 144: {
          // shlo_l_imm_alt_32
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          this.registers[rA] = x_fn(4, u32(vX << (this.registers[rB] & 31)));
          break;
        }

        case 145: {
          // shlo_r_imm_alt_32
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          this.registers[rA] = x_fn(4, u32(vX) >> u32(this.registers[rB] & 31));
          break;
        }

        case 146: {
          // shar_r_imm_alt_32
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          this.registers[rA] = u64(
            i32(u32(vX)) >> u32(this.registers[rB] & 31),
          );
          break;
        }

        case 147: {
          // cmov_iz_imm
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          if (this.registers[rB] === 0) {
            this.registers[rA] = vX;
          }
          break;
        }

        case 148: {
          // cmov_nz_imm
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          if (this.registers[rB] !== 0) {
            this.registers[rA] = vX;
          }
          break;
        }

        case 149: {
          // add_imm_64
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          this.registers[rA] = this.registers[rB] + vX;
          break;
        }

        case 150: {
          // mul_imm_64
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          this.registers[rA] = this.registers[rB] * vX;
          break;
        }

        case 151: {
          // shlo_l_imm_64
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          this.registers[rA] = this.registers[rB] << (vX & 63);
          break;
        }
        case 152: {
          // shlo_r_imm_64
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          this.registers[rA] = u64(i64(this.registers[rB]) >>> (vX & 63));
          break;
        }

        case 153: {
          // shar_r_imm_64
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          this.registers[rA] = u64(i64(this.registers[rB]) >> (vX & 63));
          break;
        }

        case 154: {
          // neg_add_imm_64
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          this.registers[rA] = u64(vX + 2 ** 64 - this.registers[rB]);
          break;
        }

        case 155: {
          // shlo_l_imm_alt_64
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          this.registers[rA] = vX << (this.registers[rB] & 63);
          break;
        }

        case 156: {
          // shlo_r_imm_alt_64
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          this.registers[rA] = vX >> (this.registers[rB] & 63);
          break;
        }

        case 157: {
          // shar_r_imm_alt_64
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          this.registers[rA] = u64(i64(vX) >> (this.registers[rB] & 63));
          break;
        }

        case 158: {
          // rot_r_64_imm
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          const shift = u32(vX & 63);
          this.registers[rA] = rotr<i64>(this.registers[rB], shift);
          break;
        }

        case 159: {
          // rot_r_64_imm_alt
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          const shift = u32(this.registers[rB] & 63);
          this.registers[rA] = rotr<i64>(vX, shift);
          break;
        }

        case 160: {
          // rot_r_32_imm
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          const shift = u32(vX & 31);
          const value = u32(this.registers[rB]);
          this.registers[rA] = x_fn(4, u32(rotr<i32>(value, shift)));
          break;
        }

        case 161: {
          // rot_r_32_imm_alt
          $twoRegOneImmIxDecoder!(args, rA, rB, vX);
          const shift = u32(this.registers[rB] & 31);
          const value = u32(vX);
          this.registers[rA] = x_fn(4, u32(rotr<i32>(value, shift)));
          break;
        }

        case 170: {
          // branch_eq
          $twoRegOneOffsetIxDecoder!(args, pc, rA, rB, offset);
          $branch!(this.registers[rA] == this.registers[rB], offset);
          break;
        }

        case 171: {
          // branch_ne
          $twoRegOneOffsetIxDecoder!(args, pc, rA, rB, offset);
          $branch!(this.registers[rA] != this.registers[rB], offset);
          break;
        }

        case 172: {
          // branch_lt_u
          $twoRegOneOffsetIxDecoder!(args, pc, rA, rB, offset);
          $branch!(this.registers[rA] < this.registers[rB], offset);
          break;
        }

        case 173: {
          // branch_lt_s
          $twoRegOneOffsetIxDecoder!(args, pc, rA, rB, offset);
          $branch!(i64(this.registers[rA]) < i64(this.registers[rB]), offset);
          break;
        }

        case 174: {
          // branch_ge_u
          $twoRegOneOffsetIxDecoder!(args, pc, rA, rB, offset);
          $branch!(this.registers[rA] >= this.registers[rB], offset);
          break;
        }

        case 175: {
          // branch_ge_s
          $twoRegOneOffsetIxDecoder!(args, pc, rA, rB, offset);
          $branch!(i64(this.registers[rA]) >= i64(this.registers[rB]), offset);
          break;
        }

        case 180: {
          // load_imm_jump_ind
          $twoRegTwImmIxDecoder!(args, rA, rB, vX, vY);
          const v = u32(this.registers[rB] + vY);
          this.registers[rA] = vX;
          $djump!(v);
          break;
        }

        case 190: {
          // add_32
          $threeRegIxDecoder!(args, rA, rB, rD);
          this.registers[rD] = x_fn(
            4,
            u32(this.registers[rA] + this.registers[rB]),
          );
          break;
        }

        case 191: {
          // sub_32
          $threeRegIxDecoder!(args, rA, rB, rD);
          this.registers[rD] = x_fn(
            4,
            u32(this.registers[rA] + 2 ** 32 - u32(this.registers[rB])),
          );
          break;
        }

        case 192: {
          // mul_32
          $threeRegIxDecoder!(args, rA, rB, rD);
          this.registers[rD] = x_fn(
            4,
            u32(this.registers[rA] * this.registers[rB]),
          );
          break;
        }

        case 193: {
          // div_u_32
          $threeRegIxDecoder!(args, rA, rB, rD);
          if (u32(this.registers[rB]) === 0) {
            this.registers[rD] = u64(-1);
          } else {
            this.registers[rD] = x_fn(
              4,
              u32(this.registers[rA]) / u32(this.registers[rB]),
            );
          }
          break;
        }

        case 194: {
          // div_s_32
          $threeRegIxDecoder!(args, rA, rB, rD);
          const z4a = i32(u32(this.registers[rA]));
          const z4b = i32(u32(this.registers[rB]));
          if (z4b === 0) {
            this.registers[rD] = 2 ** 64 - 1;
          } else if (z4a == i32(-1 * 2 ** 31) && z4b == -1) {
            this.registers[rD] = u64(z4a);
          } else {
            // rtz
            this.registers[rD] = u64(i32(z4a / z4b));
          }
          break;
        }

        case 195: {
          // rem_u_32
          $threeRegIxDecoder!(args, rA, rB, rD);
          if (u32(this.registers[rB]) === 0) {
            this.registers[rD] = x_fn(4, u32(this.registers[rA]));
          } else {
            this.registers[rD] = x_fn(
              4,
              u32(this.registers[rA]) % u32(this.registers[rB]),
            );
          }
          break;
        }

        case 196: {
          // rem_s_32
          $threeRegIxDecoder!(args, rA, rB, rD);
          const z4a = i32(u32(this.registers[rA]));
          const z4b = i32(u32(this.registers[rB]));
          if (z4a === -1 * 2 ** 31 && z4b === -1) {
            this.registers[rD] = 0;
          } else {
            $smod!(this.registers[rD], z4a, z4b);
          }
          break;
        }
        case 197: {
          // shlo_l_32
          $threeRegIxDecoder!(args, rA, rB, rD);
          this.registers[rD] = x_fn(
            4,
            u32(this.registers[rA] << u32(this.registers[rB] & 31)),
          );
          break;
        }

        case 198: {
          // shlo_r_32
          $threeRegIxDecoder!(args, rA, rB, rD);
          this.registers[rD] = x_fn(
            4,
            u32(this.registers[rA]) >>> u32(this.registers[rB] & 31),
          );
          break;
        }

        case 199: {
          // shar_r_32
          $threeRegIxDecoder!(args, rA, rB, rD);
          const z4a = i32(u32(this.registers[rA]));
          this.registers[rD] = u64(z4a >> i32(this.registers[rB] & 31));
          break;
        }

        case 200: {
          // add_64
          $threeRegIxDecoder!(args, rA, rB, rD);
          this.registers[rD] = this.registers[rA] + this.registers[rB];
          break;
        }

        case 201: {
          // sub_64
          $threeRegIxDecoder!(args, rA, rB, rD);
          this.registers[rD] =
            this.registers[rA] + (2 ** 64 - this.registers[rB]);
          break;
        }
        case 202: {
          // mul_64
          $threeRegIxDecoder!(args, rA, rB, rD);
          this.registers[rD] = this.registers[rA] * this.registers[rB];
          break;
        }
        case 203: {
          // div_u_64
          $threeRegIxDecoder!(args, rA, rB, rD);
          if (this.registers[rB] === 0) {
            this.registers[rD] = 2 ** 64 - 1;
          } else {
            this.registers[rD] = this.registers[rA] / this.registers[rB];
          }
          break;
        }
        case 204: {
          //div_s_64
          $threeRegIxDecoder!(args, rA, rB, rD);
          const z8a = i64(this.registers[rA]);
          const z8b = i64(this.registers[rB]);
          if (this.registers[rB] == 0) {
            this.registers[rD] = 2 ** 64 - 1;
          } else if (z8a == i64(-1 * 2 ** 63) && z8b == -1) {
            this.registers[rD] = this.registers[rA];
          } else {
            this.registers[rD] = u64(i64(z8a / z8b));
          }
          break;
        }
        case 205: {
          // rem_u_64
          $threeRegIxDecoder!(args, rA, rB, rD);
          if (this.registers[rB] === 0) {
            this.registers[rD] = this.registers[rA];
          } else {
            this.registers[rD] = this.registers[rA] % this.registers[rB];
          }
          break;
        }

        case 206: {
          // rem_s_64
          $threeRegIxDecoder!(args, rA, rB, rD);
          const z8a = i64(this.registers[rA]);
          const z8b = i64(this.registers[rB]);
          if (z8a === -1 * 2 ** 63 && z8b === -1) {
            this.registers[rD] = 0;
          } else {
            $smod!(this.registers[rD], z8a, z8b);
          }
          break;
        }

        case 207: {
          // shlo_l_64
          $threeRegIxDecoder!(args, rA, rB, rD);
          this.registers[rD] = this.registers[rA] << (this.registers[rB] & 63);
          break;
        }

        case 208: {
          // shlo_r_64
          $threeRegIxDecoder!(args, rA, rB, rD);
          this.registers[rD] = this.registers[rA] >> (this.registers[rB] & 63);
          break;
        }

        case 209: {
          // shar_r_64
          $threeRegIxDecoder!(args, rA, rB, rD);
          const z8a = i64(this.registers[rA]);

          this.registers[rD] = u64(z8a >> (this.registers[rB] & 63));
          break;
        }
        case 210: {
          // and
          $threeRegIxDecoder!(args, rA, rB, rD);
          this.registers[rD] = this.registers[rA] & this.registers[rB];
          break;
        }
        case 211: {
          // xor
          $threeRegIxDecoder!(args, rA, rB, rD);
          this.registers[rD] = this.registers[rA] ^ this.registers[rB];
          break;
        }
        case 212: {
          // or
          $threeRegIxDecoder!(args, rA, rB, rD);
          this.registers[rD] = this.registers[rA] | this.registers[rB];
          break;
        }
        case 213: {
          // mul_upper_s_s
          $threeRegIxDecoder!(args, rA, rB, rD);

          this.registers[rD] = i64(
            BigInt.fromInt64(i64(this.registers[rA]))
              .mul(BigInt.fromInt64(i64(this.registers[rB])))
              .rightShift(64)
              .toInt64(),
          );
          break;
        }
        case 214: {
          // mul_upper_u_u
          $threeRegIxDecoder!(args, rA, rB, rD);
          this.registers[rD] = BigInt.fromUInt64(this.registers[rA])
            .mul(BigInt.fromUInt64(this.registers[rB]))
            .rightShift(64)
            .toUInt64();
          break;
        }
        case 215: {
          // mul_uppser_s_u
          $threeRegIxDecoder!(args, rA, rB, rD);
          this.registers[rD] = u64(
            BigInt.fromInt64(i64(this.registers[rA]))
              .mul(BigInt.fromUInt64(this.registers[rB]))
              .rightShift(64)
              .toInt64(),
          );
          break;
        }
        case 216: {
          // set_lt_u
          $threeRegIxDecoder!(args, rA, rB, rD);
          this.registers[rD] = this.registers[rA] < this.registers[rB] ? 1 : 0;
          break;
        }
        case 217: {
          // set_lt_s
          $threeRegIxDecoder!(args, rA, rB, rD);
          this.registers[rD] =
            i64(this.registers[rA]) < i64(this.registers[rB]) ? 1 : 0;
          break;
        }

        case 218: {
          //cmov_iz
          $threeRegIxDecoder!(args, rA, rB, rD);
          if (this.registers[rB] === 0) {
            this.registers[rD] = this.registers[rA];
          }
          break;
        }

        case 219: {
          // cmov_nz
          $threeRegIxDecoder!(args, rA, rB, rD);
          if (this.registers[rB] !== 0) {
            this.registers[rD] = this.registers[rA];
          }
          break;
        }
        case 220: {
          // rot_l_64
          $threeRegIxDecoder!(args, rA, rB, rD);
          const shift = u32(this.registers[rB] & 63);
          this.registers[rD] = u64(rotl<i64>(this.registers[rA], shift));
          break;
        }
        case 221: {
          // rot_l_32
          //
          $threeRegIxDecoder!(args, rA, rB, rD);
          const shift = u32(this.registers[rB] & 31);
          this.registers[rD] = x_fn(
            4,
            u32(rotl<i32>(i32(u32(this.registers[rA])), shift)),
          );
          break;
        }
        case 222: {
          // rot_r_64
          $threeRegIxDecoder!(args, rA, rB, rD);
          const shift = u32(this.registers[rB] & 63);
          this.registers[rD] = rotr<i64>(this.registers[rA], shift);
          break;
        }
        case 223: {
          // rot_r_32
          $threeRegIxDecoder!(args, rA, rB, rD);
          const shift: i32 = u32(this.registers[rB] & 31);
          this.registers[rD] = x_fn(
            4,
            u32(rotr<i32>(u32(this.registers[rA]), shift)),
          );
          break;
        }
        case 224: {
          //and_inv
          $threeRegIxDecoder!(args, rA, rB, rD);
          this.registers[rD] = this.registers[rA] & ~this.registers[rB];
          break;
        }
        case 225: {
          // or_inv
          $threeRegIxDecoder!(args, rA, rB, rD);
          this.registers[rD] = this.registers[rA] | ~this.registers[rB];
          break;
        }
        case 226: {
          // xnor
          $threeRegIxDecoder!(args, rA, rB, rD);
          this.registers[rD] = ~(this.registers[rA] ^ this.registers[rB]);
          break;
        }
        case 227: {
          // max
          $threeRegIxDecoder!(args, rA, rB, rD);
          this.registers[rD] = $max!(
            i64(this.registers[rA]),
            i64(this.registers[rB]),
          );
          break;
        }
        case 228: {
          // max_u
          $threeRegIxDecoder!(args, rA, rB, rD);
          this.registers[rD] = $max!(this.registers[rA], this.registers[rB]);
          break;
        }
        case 229: {
          // min
          $threeRegIxDecoder!(args, rA, rB, rD);
          this.registers[rD] = $min!(
            i64(this.registers[rA]),
            i64(this.registers[rB]),
          );
          break;
        }
        case 230: {
          // min_u
          $threeRegIxDecoder!(args, rA, rB, rD);
          this.registers[rD] = $min!(this.registers[rA], this.registers[rB]);
          break;
        }
      }
      // if not modified by the instructions
      if (!pcHandledByIx) {
        this.pc += skip;
      }
    }
    return PVMExitReason.OutOfGas;
  }
}

function $smod(regRef: u64, a: number, b: number) {
  if (b === 0) {
    regRef = u64(a);
  } else {
    regRef = u64(i64((abs(a) % abs(b)) * (a < 0 ? -1 : 1)));
  }
}

function $max(a: number, b: number): u64 {
  return u64(a > b ? a : b);
}
function $min(a: number, b: number): u64 {
  return u64(a < b ? a : b);
}

function $branch(condition: bool, newPC: u32): PVMExitReason | void {
  if (condition) {
    // @ts-ignore
    if (!this.isBlockBeginning(newPC)) {
      return PVMExitReason.Panic;
    }
    // @ts-ignore
    pcHandledByIx = true;
    // @ts-ignore
    this.pc = newPC;
  }
}

function $readSafe(address: u32, buffer: Uint8Array): PVMExitReason | void {
  // @ts-ignore
  if (!this.memory.canRead(address, buffer.length)) {
    // @ts-ignore
    this.faultAddress = this.memory.firstUnreadable(address, buffer.length);
    return PVMExitReason.PageFault;
  }
  // @ts-ignore
  this.memory.readInto(<u32>address, buffer);
}

function $storeSafe(address: u64, buffer: Uint8Array): PVMExitReason | void {
  // @ts-ignore
  if (!this.memory.canWrite(<u32>address, buffer.length)) {
    // @ts-ignore
    this.faultAddress = this.memory.firstUnwriteable(
      <u32>address,
      buffer.length,
    )!;
    return PVMExitReason.PageFault;
  }
  // @ts-ignore
  this.memory.writeAt(<u32>address, buffer);
}

function $djump(a: u32): PVMExitReason | void {
  if (a === <u64>(2 ** 32) - 2 ** 16) {
    return PVMExitReason.Halt;
  }
  // @ts-ignore
  if (a === 0 || a > u32(this.jumpTable.length * 2) || a % 2 !== 0) {
    return PVMExitReason.Panic;
  }

  // @ts-ignore
  const newIP = this.jumpTable[a / 2 /*ZA*/ - 1];
  // @ts-ignore
  if (!this.isBlockBeginning(newIP)) {
    return PVMExitReason.Panic;
  }
  // @ts-ignore
  pcHandledByIx = true;
  // @ts-ignore
  this.pc = newIP;
}
