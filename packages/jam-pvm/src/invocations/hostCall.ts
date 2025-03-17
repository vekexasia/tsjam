import {
  IParsedProgram,
  PVMExitReason,
  PVMProgram,
  PVMProgramExecutionContext,
  u32,
  u8,
} from "@tsjam/types";
import { basicInvocation } from "@/invocations/basic.js";

/**
 * Host call invocation
 * `ΨH` in the graypaper
 * $(0.6.2 - A.33)
 */
export const hostCallInvocation = <X>(
  p: { program: PVMProgram; parsedProgram: IParsedProgram },
  ctx: PVMProgramExecutionContext, // ı, ξ, ω, μ
  f: HostCallExecutor<X>,
  x: X,
): HostCallOut<X> => {
  const out = basicInvocation(p, ctx);
  if (
    typeof out.exitReason == "object" &&
    out.exitReason.type === "host-call"
  ) {
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
      if (typeof exitReason === "object" && exitReason.type === "page-fault") {
        // if page fault we need to use the context from basic invocation

        return {
          exitReason,
          context: out.context as unknown as PVMProgramExecutionContext,
          out: x,
        };
      } else {
        // otherwise only use the instructionpointer from basic (out)
        return {
          exitReason,
          context: {
            ...hostCallRes.ctx,
            instructionPointer: out.context.instructionPointer,
          },
          out: hostCallRes.out,
        };
      }
    } else {
      // all good we skip and hostcall
      return hostCallInvocation(
        p,
        {
          instructionPointer: (out.context.instructionPointer +
            p.parsedProgram.skip(out.context.instructionPointer) +
            1) as u32,
          gas: hostCallRes.ctx.gas,
          registers: hostCallRes.ctx.registers,
          memory: hostCallRes.ctx.memory,
        },
        f,
        hostCallRes.out,
      );
    }
  } else {
    // regular execution without host call
    return {
      exitReason: out.exitReason,
      out: x,
      context: out.context as unknown as PVMProgramExecutionContext,
    };
  }
};

export type HostCallOut<X> = {
  exitReason?: PVMExitReason;
  context: PVMProgramExecutionContext;
  out: X;
};

/**
 * `Ω(X)` in the paper
 * $(0.6.1 - A.32)
 */
export type HostCallExecutor<X> = (input: {
  hostCallOpcode: u8;
  ctx: PVMProgramExecutionContext;
  out: X;
}) => {
  exitReason?: PVMExitReason;
  out: X;
  ctx: PVMProgramExecutionContext;
};
