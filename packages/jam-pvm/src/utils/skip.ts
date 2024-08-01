import { PVMProgram } from "@/program.js";

/**
 * This function returns the number of bytes to `skip` for the next instruction.
 * it's defined in `(216)` appendix A.
 * @param program - the program we're evaluating
 * @param curOffset - the current offset we already evaluated
 */
export const skipForNextIx = (
  program: PVMProgram,
  curOffset: number,
): number => {
  for (let i = curOffset + 1; i < program.c.length; i++) {
    if (program.k[i] === 1) {
      // the number of bytes to skip for next instruction is -1
      return curOffset - i - 1;
    }
  }
  // formula states a min(24, ...)
  return 24;
};
