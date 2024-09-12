import { newSTF, toTagged } from "@vekexasia/jam-utils";
import {
  PVMExitReason,
  PVMProgram,
  PVMProgramExecutionContext,
  RegularPVMExitReason,
  i64,
  u64,
} from "@vekexasia/jam-types";
import { pvmSingleStepSTF } from "@/stfs/singleStep.js";
import { ParsedProgram } from "@/parseProgram.js";

export const runProgramSTF = newSTF<
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
      ...curState,
      gas: toTagged(intermediateState.gas),
    },
    exitReason: RegularPVMExitReason.OutOfGas,
  };
});
