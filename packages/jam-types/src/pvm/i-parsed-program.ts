import { u32 } from "@/generic-types";
import { PVMIx } from "@/pvm/pvm-ix";

export interface IParsedProgram {
  /**
   * Get the instruction at the given pointer
   * @param pointer - the ix pointer
   */
  ixAt<K extends PVMIx<unknown>>(pointer: u32): K | undefined;

  /**
   * (214) appendix
   * @returns - the number of instructions to skip for the next ix
   * it should be min(24, j ∈ N : k[pointer + 1 + j])
   */
  skip(pointer: u32): u32;

  /**
   * tells if  instruction  belongs to the block beginnings set
   * defined by ϖ in the graypaper
   */
  isBlockBeginning(pointer: u32): boolean;
}
