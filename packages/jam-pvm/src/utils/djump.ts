import { Result, err, ok } from "neverthrow";
import {
  PVMIx,
  PVMIxExecutionError,
  PVMSingleModGas,
  PVMSingleModMemory,
  PVMSingleModRegister,
  PVMSingleModPointer,
  RegularPVMExitReason,
  RegisterIdentifier,
  u32,
} from "@tsjam/types";
import { IxMod } from "@/instructions/utils";
const ZA = 2;
/**
 * djump(a) method defined in `225`
 * @param context - the current evaluating context
 * @param a - the address to jump to
 * @param mods - mods to apply in both cases
 * $(0.5.4 - A.15)
 */
export const djump = (
  context: Parameters<PVMIx<unknown[], PVMIxExecutionError>["evaluate"]>[0],
  a: u32,
  mods: Array<
    | PVMSingleModPointer
    | PVMSingleModGas
    | PVMSingleModMemory
    | PVMSingleModRegister<RegisterIdentifier>
  > = [],
): Result<
  Array<
    | PVMSingleModPointer
    | PVMSingleModGas
    | PVMSingleModMemory
    | PVMSingleModRegister<RegisterIdentifier>
  >,
  PVMIxExecutionError
> => {
  // first branch of djump(a)
  if (a == 2 ** 32 - 2 ** 16) {
    return err(
      new PVMIxExecutionError(
        mods,
        RegularPVMExitReason.Halt,
        "regular halt",
        false,
      ),
    );
  } else if (
    a === 0 ||
    a > context.program.j.length * ZA ||
    a % ZA != 0 ||
    false /* TODO: check if start of block context.program.j[jumpLocation / ZA] !== 1*/
  ) {
    return err(
      new PVMIxExecutionError(
        mods,
        RegularPVMExitReason.Panic,
        "invalid jump location",
        false,
      ),
    );
  }

  return ok([...mods, IxMod.ip(context.program.j[a / ZA - 1])]);
};
