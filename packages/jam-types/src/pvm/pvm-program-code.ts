import { Tagged } from "@/generic-types";

/**
 *
 * The encoded program binary
 */
export type PVMProgramCode = Tagged<Buffer, "pvmProgramCode">;
