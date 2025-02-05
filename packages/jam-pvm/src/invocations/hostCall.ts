import {
  IParsedProgram,
  PVMExitReason,
  PVMProgram,
  PVMProgramExecutionContext,
  PVMProgramExecutionContextBase,
  RegularPVMExitReason,
  u32,
  u8,
} from "@tsjam/types";
import { basicInvocation } from "@/invocations/basic.js";

/**
 * Host call invocation
 * `ΨH` in the graypaper
 * $(0.6.1 - A.31)
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
    const res = f({
      hostCallOpcode: out.exitReason.opCode,
      ctx: out.context,
      out: x,
    });
    if ("pageFaultAddress" in res) {
      return {
        exitReason: {
          type: "page-fault",
          memoryLocationIn: res.pageFaultAddress,
        },
        context: out.context as unknown as PVMProgramExecutionContext,
        out: x,
      };
    } else if ("exitReason" in res && typeof res.exitReason !== "undefined") {
      // all good we hostcall
      return hostCallInvocation(
        p,
        {
          instructionPointer: (out.context.instructionPointer +
            p.parsedProgram.skip(out.context.instructionPointer)) as u32,
          gas: res.ctx.gas,
          registers: res.ctx.registers,
          memory: res.ctx.memory,
        },
        f,
        res.out,
      );
    } else {
      return {
        exitReason: res.exitReason,
        context: out.context as unknown as PVMProgramExecutionContext,
        out: x,
      };
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
  ctx: PVMProgramExecutionContextBase;
  out: X;
}) =>
  | { pageFaultAddress: u32 }
  | {
      exitReason?: RegularPVMExitReason;
      out: X;
      ctx: PVMProgramExecutionContextBase;
    };
