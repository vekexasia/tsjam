import { Tagged } from "@/genericTypes";

/**
 *
 * The encoded program binary
 */
export type PVMProgramCode = Tagged<Uint8Array, "pvmProgramCode">;
