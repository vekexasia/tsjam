import {
  IPVMMemory,
  PVMExitReason,
  PVMProgram,
  PVMProgramExecutionContext,
  PVMProgramExecutionContextBase,
  PVMResultContext,
  SeqOfLength,
  u32,
  u64,
} from "@vekexasia/jam-types";
import { basicInvocation } from "@/invocations/basic.js";
import { ParsedProgram } from "@/parseProgram.js";
import { BaseSTF, newSTF } from "@vekexasia/jam-utils";

/**
 * Host call invocation
 * `ΨH` in the graypaper
 * (238)
 */
export const hostCallInvocation: BaseSTF<StateIn, Input, HostCallOut> = newSTF<
  StateIn,
  Input,
  HostCallOut
>((input, curState): HostCallOut => {
  const out = basicInvocation.apply(input, curState.context);
  if (
    typeof out.exitReason == "object" &&
    out.exitReason.type === "host-call"
  ) {
    const res = input.fn({
      hostCallOpcode: out.exitReason.h,
      ctx: out.context,
      out: curState.out,
    });
    if ("pageFaultAddress" in res) {
      return {
        exitReason: {
          type: "page-fault",
          memoryLocationIn: res.pageFaultAddress,
        },
        context: out.context as unknown as PVMProgramExecutionContext,
        out: curState.out,
      };
    } else {
      // check on gas maybe?
      return hostCallInvocation.apply(input, {
        context: {
          instructionPointer: (out.context.instructionPointer +
            input.parsedProgram.skip(out.context.instructionPointer)) as u32,
          gas: res.gas,
          registers: res.registers,
          memory: res.memory,
        },
        out: res.out,
      });
    }
  } else {
    // regular execution without host call
    return {
      exitReason: out.exitReason,
      out: curState.out,
      context: out.context as unknown as PVMProgramExecutionContext,
    };
  }
});

type StateIn = {
  context: PVMProgramExecutionContext;
  /**
   * `x`
   */
  out: PVMResultContext;
};

export type HostCallOut = {
  exitReason?: PVMExitReason;
  context: PVMProgramExecutionContext;
  out: PVMResultContext;
};

type Input = {
  program: PVMProgram;
  parsedProgram: ParsedProgram;
  /**
   * `f`
   */
  fn: HostCallExecutor;
};

export type HostCallExecutor = (input: {
  hostCallOpcode: number;
  ctx: PVMProgramExecutionContextBase;
  out: PVMResultContext;
}) =>
  | { pageFaultAddress: u32 }
  | (PVMProgramExecutionContextBase & { out: PVMResultContext });
