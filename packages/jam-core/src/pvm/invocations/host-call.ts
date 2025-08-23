import { PVMExitReasonImpl } from "@/impls/pvm/pvm-exit-reason-impl";
import { PVMProgramExecutionContextImpl } from "@/impls/pvm/pvm-program-execution-context-impl";
import { u8 } from "@tsjam/types";
import "@/pvm/functions/functions";
import { basicInvocation } from "./basic";

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
  const out = basicInvocation(program, ctx);
  if (out.exitReason.isHostCall()) {
    const hostCallRes = f({
      hostCallOpcode: out.exitReason.opCode,
      ctx: out.context,
      out: x,
    });

    if (
      "exitReason" in hostCallRes &&
      typeof hostCallRes.exitReason !== "undefined"
    ) {
      const exitReason = hostCallRes.exitReason;
      if (exitReason.isPageFault()) {
        // if page fault we need to use the context from basic invocation
        return {
          exitReason,
          context: out.context,
          out: x,
        };
      } else {
        // otherwise only use the instructionpointer from basic (out)
        hostCallRes.ctx.instructionPointer = out.context.instructionPointer;
        return {
          exitReason,
          context: hostCallRes.ctx,
          out: hostCallRes.out,
        };
      }
    } else {
      // all good we skip and hostcall
      return hostCallInvocation(
        program,
        new PVMProgramExecutionContextImpl({
          instructionPointer: out.context.instructionPointer,
          gas: hostCallRes.ctx.gas,
          registers: hostCallRes.ctx.registers,
          memory: hostCallRes.ctx.memory,
        }),
        f,
        hostCallRes.out,
      );
    }
  } else {
    // regular execution without host call
    return {
      exitReason: out.exitReason,
      out: x,
      context: out.context,
    };
  }
};

export type HostCallOut<X> = {
  exitReason?: PVMExitReasonImpl;
  context: PVMProgramExecutionContextImpl;
  out: X;
};

/**
 * `Ω(X)` in the paper
 * $(0.7.1 - A.36)
 */
export type HostCallExecutor<X> = (input: {
  hostCallOpcode: u8;
  ctx: PVMProgramExecutionContextImpl;
  out: X;
}) => {
  exitReason?: PVMExitReasonImpl;
  out: X;
  ctx: PVMProgramExecutionContextImpl;
};
