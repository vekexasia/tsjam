import { BlockTermination, Ix } from "@/instructions/ixdb.js";
import { IxMod } from "../utils";
import { PVMIxEvaluateFNContext } from "@tsjam/types";

export const NoArgIxDecoder = () => null;
export type NoArgIxArgs = ReturnType<typeof NoArgIxDecoder>;

class NoArgIxs {
  @BlockTermination
  @Ix(1, NoArgIxDecoder)
  fallthrough(_: NoArgIxArgs, context: PVMIxEvaluateFNContext) {
    return [IxMod.ip(context.execution.instructionPointer + 1)];
  }

  @BlockTermination
  @Ix(0, NoArgIxDecoder)
  trap(_: NoArgIxArgs) {
    return [IxMod.panic()];
  }
}
