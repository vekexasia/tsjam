import { PVMExitReasonImpl } from "@tsjam/pvm-base";
import { u32 } from "@tsjam/types";
import { PVMJS } from "..";

const ZA = 2;
/**
 * djump(a)
 * @param context - the current evaluating context
 * @param a - the address to jump to
 * $(0.7.1 - A.18)
 */
export const djump = (a: u32, pvm: PVMJS): PVMExitReasonImpl | void => {
  // first branch of djump(a)
  const newIP = pvm.prog.j[a / ZA - 1];
  if (a == 2 ** 32 - 2 ** 16) {
    return PVMExitReasonImpl.halt();
  } else if (
    a === 0 ||
    a > pvm.prog.j.length * ZA ||
    a % ZA != 0 ||
    typeof newIP === "undefined" ||
    !pvm.isBlockBeginning(newIP)
  ) {
    return PVMExitReasonImpl.panic();
  }
  pvm.pc = newIP;
};
