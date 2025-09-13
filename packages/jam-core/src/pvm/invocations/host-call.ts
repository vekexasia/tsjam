import { PVMExitReasonImpl } from "@/impls/pvm/pvm-exit-reason-impl";
import { PVMIxEvaluateFNContextImpl } from "@/impls/pvm/pvm-ix-evaluate-fn-context-impl";
import { PVMProgramExecutionContextImpl } from "@/impls/pvm/pvm-program-execution-context-impl";
import "@/pvm/functions/functions";
import { PVMProgramCode, u8 } from "@tsjam/types";
import assert from "assert";
import { basicInvocation } from "./basic";
import { ParsedProgram } from "../parse-program";

/**
 * Host call invocation
 * `ΨH` in the graypaper
 * $(0.7.1 - A.35)
 */
export const hostCallInvocation = <X>(
  program: PVMProgramCode,
  ctx: PVMProgramExecutionContextImpl, // ı, ξ, ω, μ
  f: HostCallExecutor<X>,
  x: X,
): HostCallOut<X> => {
  // NOTE:this is not part of A.35 but an optimization
  // to avoid deblobbing multiple times in basicInvocation
  const r = ParsedProgram.deblob(program);
  if (r instanceof PVMExitReasonImpl) {
    return {
      exitReason: r,
      out: x,
    };
  }

  const ixCtx = new PVMIxEvaluateFNContextImpl({
    execution: ctx,
    program: r,
  });
  while (true) {
    const outExit = basicInvocation(r, ixCtx);
    if (outExit.isHostCall()) {
      // i'
      const p_i = ixCtx.execution.instructionPointer;
      const hostCallRes = f({
        hostCallOpcode: outExit.opCode,
        ctx: ctx,
        out: x,
      });
      // all flows of A.35 when its host call wants instruction pointer
      // to be the one after the basic invocation
      ctx.instructionPointer = p_i;

      if (typeof hostCallRes !== "undefined") {
        // log("not defined res", process.env.DEBUG_TRACES == "true");
        // https://github.com/gavofyork/graypaper/pull/485
        assert(
          false == hostCallRes.isPageFault(),
          "host call cannot return page fault",
        );
        return {
          exitReason: hostCallRes,
          out: x, // this has been modified already by hostcall
        };
      }
    } else {
      // log(
      //   `hostCallInvocation: non-host call exit ${outExit}`,
      //   process.env.DEBUG_TRACES == "true",
      // );
      // regular execution without host call
      return {
        exitReason: outExit,
        out: x,
      };
    }
  }
};

export type HostCallOut<X> = {
  exitReason?: PVMExitReasonImpl;
  out: X;
};

/**
 * `Ω(X)` in the paper
 * it can modify ctx and out (not pure function)
 * $(0.7.1 - A.36)
 */
export type HostCallExecutor<X> = (input: {
  hostCallOpcode: u8;
  ctx: PVMProgramExecutionContextImpl;
  out: X;
}) => PVMExitReasonImpl | undefined;
