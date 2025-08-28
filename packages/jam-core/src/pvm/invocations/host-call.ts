import { PVMExitReasonImpl } from "@/impls/pvm/pvm-exit-reason-impl";
import { PVMProgramExecutionContextImpl } from "@/impls/pvm/pvm-program-execution-context-impl";
import { u8 } from "@tsjam/types";
import "@/pvm/functions/functions";
import { basicInvocation, deblobProgram } from "./basic";
import assert from "assert";
import { PVMIxEvaluateFNContextImpl } from "@/impls/pvm/pvm-ix-evaluate-fn-context-impl";

/**
 * Host call invocation
 * `ΨH` in the graypaper
 * $(0.7.1 - A.35)
 */
export const hostCallInvocation = <X>(
  program: Uint8Array,
  ctx: PVMProgramExecutionContextImpl, // ı, ξ, ω, μ
  f: HostCallExecutor<X>,
  x: X,
): HostCallOut<X> => {
  // NOTE:this is not part of A.35 but an optimization
  // to avoid deblobbing multiple times in basicInvocation
  const r = deblobProgram(program);
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
