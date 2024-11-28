import { Result, err, ok } from "neverthrow";
import {
  PVMIx,
  PVMIxExecutionError,
  PVMModification,
  RegularPVMExitReason,
  u32,
} from "@tsjam/types";
import { IxMod } from "@/instructions/utils";
const ZA = 4;
/**
 * djump(a) method defined in `225`
 * @param context - the current evaluating context
 * @param a - the address to jump to
 * $(0.5.0 - A.13)
 */
export const djump = (
  context: Parameters<PVMIx<unknown[], PVMIxExecutionError>["evaluate"]>[0],
  a: u32,
): Result<PVMModification[], PVMIxExecutionError> => {
  // first branch of djump(a)
  if (a == 2 ** 32 - 2 ** 16) {
    return err(
      new PVMIxExecutionError(
        [],
        RegularPVMExitReason.Halt,
        "regular halt",
        false,
      ),
    );
  } else if (
    a === 0 ||
    a > context.program.j.length * ZA ||
    a % ZA != 0 ||
    false /* TODO check if start of block context.program.j[jumpLocation / ZA] !== 1*/
  ) {
    return err(
      new PVMIxExecutionError(
        [],
        RegularPVMExitReason.Panic,
        "invalid jump location",
        false,
      ),
    );
  }

  return ok([IxMod.ip(context.program.j[Math.floor(a / ZA)] - 1)]);
};
