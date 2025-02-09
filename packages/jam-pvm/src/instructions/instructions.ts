import { PVMIxReturnMods } from "@tsjam/types";
import { TwoRegTwoImmIxsDecoder } from "@/instructions/decoders.js";

export type MissingArgs = ReturnType<MissingIxsDecoder>;
interface MissingIxs {
  /**
   * 10
   **/
  ecalli(args: MissingArgs): PVMIxReturnMods;

  /**
   * 1
   **/
  fallthrough(args: MissingArgs): PVMIxReturnMods;

  /**
   * 0
   **/
  trap(args: MissingArgs): PVMIxReturnMods;
}

// Init OneOffset

export type OneOffsetArgs = ReturnType<OneOffsetIxsDecoder>;
interface OneOffsetIxs {
  /**
   * 40
   **/
  jump(args: OneOffsetArgs): PVMIxReturnMods;
}

// Init OneRegOneImm

export type OneRegOneImmArgs = ReturnType<OneRegOneImmIxsDecoder>;
interface OneRegOneImmIxs {
  /**
   * 50
   **/
  jump_ind(args: OneRegOneImmArgs): PVMIxReturnMods;

  /**
   * 51
   **/
  load_imm(args: OneRegOneImmArgs): PVMIxReturnMods;

  /**
   * 52
   **/
  load_u8(args: OneRegOneImmArgs): PVMIxReturnMods;

  /**
   * 54
   **/
  load_u16(args: OneRegOneImmArgs): PVMIxReturnMods;

  /**
   * 56
   **/
  load_u32(args: OneRegOneImmArgs): PVMIxReturnMods;

  /**
   * 58
   **/
  load_u64(args: OneRegOneImmArgs): PVMIxReturnMods;

  /**
   * 53
   **/
  load_i8(args: OneRegOneImmArgs): PVMIxReturnMods;

  /**
   * 55
   **/
  load_i16(args: OneRegOneImmArgs): PVMIxReturnMods;

  /**
   * 57
   **/
  load_i32(args: OneRegOneImmArgs): PVMIxReturnMods;

  /**
   * 59
   **/
  store_u8(args: OneRegOneImmArgs): PVMIxReturnMods;

  /**
   * 60
   **/
  store_u16(args: OneRegOneImmArgs): PVMIxReturnMods;

  /**
   * 61
   **/
  store_u32(args: OneRegOneImmArgs): PVMIxReturnMods;

  /**
   * 62
   **/
  store_u64(args: OneRegOneImmArgs): PVMIxReturnMods;
}

// Init OneRegOneIMMOneOffset

export type OneRegOneIMMOneOffsetArgs =
  ReturnType<OneRegOneIMMOneOffsetIxsDecoder>;
interface OneRegOneIMMOneOffsetIxs {
  /**
   * 80
   **/
  load_imm_jump(args: OneRegOneIMMOneOffsetArgs): PVMIxReturnMods;

  /**
   * 81
   **/
  branch_eq_imm(args: OneRegOneIMMOneOffsetArgs): PVMIxReturnMods;

  /**
   * 82
   **/
  branch_ne_imm(args: OneRegOneIMMOneOffsetArgs): PVMIxReturnMods;

  /**
   * 83
   **/
  branch_lt_u_imm(args: OneRegOneIMMOneOffsetArgs): PVMIxReturnMods;

  /**
   * 84
   **/
  branch_le_u_imm(args: OneRegOneIMMOneOffsetArgs): PVMIxReturnMods;

  /**
   * 85
   **/
  branch_ge_u_imm(args: OneRegOneIMMOneOffsetArgs): PVMIxReturnMods;

  /**
   * 86
   **/
  branch_gt_u_imm(args: OneRegOneIMMOneOffsetArgs): PVMIxReturnMods;

  /**
   * 87
   **/
  branch_lt_s_imm(args: OneRegOneIMMOneOffsetArgs): PVMIxReturnMods;

  /**
   * 88
   **/
  branch_le_s_imm(args: OneRegOneIMMOneOffsetArgs): PVMIxReturnMods;

  /**
   * 89
   **/
  branch_ge_s_imm(args: OneRegOneIMMOneOffsetArgs): PVMIxReturnMods;

  /**
   * 90
   **/
  branch_gt_s_imm(args: OneRegOneIMMOneOffsetArgs): PVMIxReturnMods;
}

// Init OneRegOneIMM

export type OneRegOneIMMArgs = ReturnType<OneRegOneIMMIxsDecoder>;
interface OneRegOneIMMIxs {
  /**
   * 20
   **/
  load_imm_64(args: OneRegOneIMMArgs): PVMIxReturnMods;
}

// Init OneRegTwoImm

export type OneRegTwoImmArgs = ReturnType<OneRegTwoImmIxsDecoder>;
interface OneRegTwoImmIxs {
  /**
   * 70
   **/
  store_imm_ind_u8(args: OneRegTwoImmArgs): PVMIxReturnMods;

  /**
   * 71
   **/
  store_imm_ind_u16(args: OneRegTwoImmArgs): PVMIxReturnMods;

  /**
   * 72
   **/
  store_imm_ind_u32(args: OneRegTwoImmArgs): PVMIxReturnMods;

  /**
   * 73
   **/
  store_imm_ind_u64(args: OneRegTwoImmArgs): PVMIxReturnMods;
}

// Init ThreeReg

export type ThreeRegArgs = ReturnType<ThreeRegIxsDecoder>;
interface ThreeRegIxs {
  /**
   * 190
   **/
  add_32(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 191
   **/
  sub_32(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 192
   **/
  mul_32(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 193
   **/
  div_u_32(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 194
   **/
  div_s_32(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 195
   **/
  rem_u_32(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 196
   **/
  rem_s_32(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 197
   **/
  shlo_l_32(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 198
   **/
  shlo_r_32(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 199
   **/
  shar_r_32(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 200
   **/
  add_64(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 201
   **/
  sub_64(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 202
   **/
  mul_64(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 203
   **/
  div_u_64(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 204
   **/
  div_s_64(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 205
   **/
  rem_u_64(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 206
   **/
  rem_s_64(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 207
   **/
  shlo_l_64(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 208
   **/
  shlo_r_64(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 209
   **/
  shar_r_64(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 210
   **/
  and(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 211
   **/
  xor(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 212
   **/
  or(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 213
   **/
  mul_upper_s_s(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 214
   **/
  mul_upper_u_u(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 215
   **/
  mul_upper_s_u(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 216
   **/
  set_lt_u(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 217
   **/
  set_lt_s(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 218
   **/
  cmov_iz(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 219
   **/
  cmov_nz(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 220
   **/
  rot_l_64(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 221
   **/
  rot_l_32(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 222
   **/
  rot_r_64(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 223
   **/
  rot_r_32(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 224
   **/
  and_inv(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 225
   **/
  or_inv(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 226
   **/
  xnor(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 227
   **/
  max(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 228
   **/
  max_u(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 229
   **/
  min(args: ThreeRegArgs): PVMIxReturnMods;

  /**
   * 230
   **/
  min_u(args: ThreeRegArgs): PVMIxReturnMods;
}

// Init TwoImm

export type TwoImmArgs = ReturnType<TwoImmIxsDecoder>;
interface TwoImmIxs {
  /**
   * 30
   **/
  store_imm_u8(args: TwoImmArgs): PVMIxReturnMods;

  /**
   * 31
   **/
  store_imm_u16(args: TwoImmArgs): PVMIxReturnMods;

  /**
   * 32
   **/
  store_imm_u32(args: TwoImmArgs): PVMIxReturnMods;

  /**
   * 33
   **/
  store_imm_u64(args: TwoImmArgs): PVMIxReturnMods;
}

// Init TwoReg

export type TwoRegArgs = ReturnType<TwoRegIxsDecoder>;
interface TwoRegIxs {
  /**
   * 100
   **/
  move_reg(args: TwoRegArgs): PVMIxReturnMods;

  /**
   * 101
   **/
  sbrk(args: TwoRegArgs): PVMIxReturnMods;

  /**
   * 102
   **/
  count_set_bits_64(args: TwoRegArgs): PVMIxReturnMods;

  /**
   * 103
   **/
  count_set_bits_32(args: TwoRegArgs): PVMIxReturnMods;

  /**
   * 104
   **/
  leading_zero_bits_64(args: TwoRegArgs): PVMIxReturnMods;

  /**
   * 105
   **/
  leading_zero_bits_32(args: TwoRegArgs): PVMIxReturnMods;

  /**
   * 106
   **/
  trailing_zero_bits_64(args: TwoRegArgs): PVMIxReturnMods;

  /**
   * 107
   **/
  trailing_zero_bits_32(args: TwoRegArgs): PVMIxReturnMods;

  /**
   * 108
   **/
  sign_extend_8(args: TwoRegArgs): PVMIxReturnMods;

  /**
   * 109
   **/
  sign_extend_16(args: TwoRegArgs): PVMIxReturnMods;

  /**
   * 110
   **/
  zero_extend_16(args: TwoRegArgs): PVMIxReturnMods;

  /**
   * 111
   **/
  reverse_bytes(args: TwoRegArgs): PVMIxReturnMods;
}

// Init TwoRegOneImm

export type TwoRegOneImmArgs = ReturnType<TwoRegOneImmIxsDecoder>;
interface TwoRegOneImmIxs {
  /**
   * 120
   **/
  store_ind_u8(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 121
   **/
  store_ind_u16(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 122
   **/
  store_ind_u32(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 123
   **/
  store_ind_u64(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 124
   **/
  load_ind_u8(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 126
   **/
  load_ind_u16(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 128
   **/
  load_ind_u32(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 130
   **/
  load_ind_u64(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 125
   **/
  load_ind_i8(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 127
   **/
  load_ind_i16(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 129
   **/
  load_ind_i32(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 131
   **/
  add_imm_32(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 132
   **/
  and_imm(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 133
   **/
  xor_imm(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 134
   **/
  or_imm(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 135
   **/
  mul_imm_32(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 136
   **/
  set_lt_u_imm(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 137
   **/
  set_lt_s_imm(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 138
   **/
  shlo_l_imm_32(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 139
   **/
  shlo_r_imm_32(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 140
   **/
  shar_r_imm_32(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 141
   **/
  neg_add_imm_32(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 142
   **/
  set_gt_u_imm(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 143
   **/
  set_gt_s_imm(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 144
   **/
  shlo_l_imm_alt_32(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 145
   **/
  shlo_r_imm_alt_32(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 146
   **/
  shar_r_imm_alt_32(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 147
   **/
  cmov_iz_imm(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 148
   **/
  cmov_nz_imm(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 149
   **/
  add_imm_64(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 150
   **/
  mul_imm_64(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 151
   **/
  shlo_l_imm_64(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 152
   **/
  shlo_r_imm_64(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 153
   **/
  shar_r_imm_64(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 154
   **/
  neg_add_imm_64(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 155
   **/
  shlo_l_imm_alt_64(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 156
   **/
  shlo_r_imm_alt_64(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 157
   **/
  shar_r_imm_alt_64(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 158
   **/
  rot_r_64_imm(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 159
   **/
  rot_r_64_imm_alt(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 160
   **/
  rot_r_32_imm(args: TwoRegOneImmArgs): PVMIxReturnMods;

  /**
   * 161
   **/
  rot_r_32_imm_alt(args: TwoRegOneImmArgs): PVMIxReturnMods;
}

// Init TwoRegOneOffset

export type TwoRegOneOffsetArgs = ReturnType<TwoRegOneOffsetIxsDecoder>;
interface TwoRegOneOffsetIxs {
  /**
   * 170
   **/
  branch_eq(args: TwoRegOneOffsetArgs): PVMIxReturnMods;

  /**
   * 171
   **/
  branch_ne(args: TwoRegOneOffsetArgs): PVMIxReturnMods;

  /**
   * 172
   **/
  branch_lt_u(args: TwoRegOneOffsetArgs): PVMIxReturnMods;

  /**
   * 173
   **/
  branch_lt_s(args: TwoRegOneOffsetArgs): PVMIxReturnMods;

  /**
   * 174
   **/
  branch_ge_u(args: TwoRegOneOffsetArgs): PVMIxReturnMods;

  /**
   * 175
   **/
  branch_ge_s(args: TwoRegOneOffsetArgs): PVMIxReturnMods;
}

// Init TwoRegTwoImm

export type TwoRegTwoImmArgs = ReturnType<typeof TwoRegTwoImmIxsDecoder>;
interface TwoRegTwoImmIxs {
  /**
   * 180
   **/
  load_imm_jump_ind(args: TwoRegTwoImmArgs): PVMIxReturnMods;
}
