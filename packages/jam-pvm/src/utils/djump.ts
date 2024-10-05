import {
  PVMIx,
  PVMModification,
  RegularPVMExitReason,
  u32,
} from "@tsjam/types";
const ZA = 4;
/**
 * djump(a) method defined in `225`
 * @param context - the current evaluating context
 * @param a - the address to jump to
 */
export const djump = (
  context: Parameters<PVMIx<unknown[]>["evaluate"]>[0],
  a: u32,
): PVMModification[] => {
  // first branch of djump(a)
  if (a == 2 ** 32 - 2 ** 16) {
    return [
      {
        type: "exit",
        data: RegularPVMExitReason.Halt,
      },
    ];
  } else if (
    a === 0 ||
    a > context.program.j.length * ZA ||
    a % ZA != 0 ||
    false /* TODO check if start of block context.program.j[jumpLocation / ZA] !== 1*/
  ) {
    return [
      {
        type: "exit",
        data: RegularPVMExitReason.Panic,
      },
    ];
  }

  return [
    {
      type: "ip",
      data: (context.program.j[Math.floor(a / ZA)] - 1) as u32,
    },
  ];
};
