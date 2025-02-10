import { BlockTermination, Ix } from "@/instructions/ixdb.js";
import { IxMod } from "../utils";
import { PVMIxEvaluateFNContext } from "@tsjam/types";

export const NoArgIxDecoder = () => null;
export type NoArgIxArgs = ReturnType<typeof NoArgIxDecoder>;

class NoArgIxs {
  @Ix(1, NoArgIxDecoder)
  @BlockTermination
  fallthrough(_: NoArgIxArgs, context: PVMIxEvaluateFNContext) {
    return [IxMod.ip(context.execution.instructionPointer + 1)];
  }

  @Ix(0, NoArgIxDecoder)
  @BlockTermination
  trap(_: NoArgIxArgs, context: PVMIxEvaluateFNContext) {
    return [IxMod.ip(context.execution.instructionPointer), IxMod.panic()];
  }
}
