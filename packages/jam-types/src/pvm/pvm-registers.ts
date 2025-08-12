import { PVMRegisterRawValue, SeqOfLength } from "@/generic-types";

export type PVMRegisterValue = { value: PVMRegisterRawValue };
/**
 * The array of the registers in the PVM
 * `ω`
 */
export type PVMRegisters = { elements: SeqOfLength<PVMRegisterValue, 13> };
