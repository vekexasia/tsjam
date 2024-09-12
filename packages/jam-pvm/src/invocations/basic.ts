import { newSTF, toTagged } from "@vekexasia/jam-utils";
import {
  PVMExitReason,
  PVMProgram,
  PVMProgramExecutionContext,
  RegularPVMExitReason,
  i64,
} from "@vekexasia/jam-types";
import { pvmSingleStepSTF } from "@/invocations/singleStep.js";
import { ParsedProgram } from "@/parseProgram.js";

/**
 * Basic invocation
 * `Ψ` in the graypaper
 */
export const basicInvocation = newSTF<
  PVMProgramExecutionContext,
  { parsedProgram: ParsedProgram; program: PVMProgram },
  {
    context: Omit<PVMProgramExecutionContext, "gas"> & { gas: i64 };
    exitReason?: PVMExitReason;
  }
>((input, curState) => {
  // how to handle errors here?

  let intermediateState = curState;
  while (intermediateState.gas > 0) {
    const out = pvmSingleStepSTF.apply(input, intermediateState);
    if (typeof out.exitReason !== "undefined") {
      return {
        context: {
          ...out.posteriorContext,
          gas: toTagged(out.posteriorContext.gas),
        },
        exitReason: out.exitReason,
      };
    }
    intermediateState = out.posteriorContext;
  }
  return {
    context: {
      ...intermediateState,
      gas: toTagged(intermediateState.gas),
    },
    exitReason: RegularPVMExitReason.OutOfGas,
  };
});
