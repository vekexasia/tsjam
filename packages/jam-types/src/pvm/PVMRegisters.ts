import { PVMRegisterRawValue, SeqOfLength } from "@/genericTypes";

export type PVMRegisterValue = { value: PVMRegisterRawValue };
/**
 * The array of the registers in the PVM
 * `ω`
 */
export type PVMRegisters = { elements: SeqOfLength<PVMRegisterValue, 13> };
