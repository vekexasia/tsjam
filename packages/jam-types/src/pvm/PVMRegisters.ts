import { RegisterValue, SeqOfLength } from "@/genericTypes";

/**
 * The array of the registers in the PVM
 * `ω`
 */
export type PVMRegisters = SeqOfLength<RegisterValue, 13>;
