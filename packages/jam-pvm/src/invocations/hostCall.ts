import {
  IPVMMemory,
  PVMExitReason,
  PVMProgram,
  PVMProgramExecutionContext,
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
export const hostCallInvocation: BaseSTF<StateIn, Input, StateOut> = newSTF<
  StateIn,
  Input,
  StateOut
>((input, curState): StateOut => {
  const out = basicInvocation.apply(input, curState.context);
  if (
    typeof out.exitReason == "object" &&
    out.exitReason.type === "host-call"
  ) {
    const res = input.fn({
      hostCall: out.exitReason.h,
      gas: out.context.gas as unknown as u64,
      registers: out.context.registers,
      memory: out.context.memory,
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
            1 +
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
  out: any;
};

type StateOut = {
  exitReason?: PVMExitReason;
  context: PVMProgramExecutionContext;
  out: any;
};

type Input = {
  program: PVMProgram;
  parsedProgram: ParsedProgram;
  /**
   * `f`
   */
  fn: HostCallExecutor;
};

export type HostCallExecutor = <T>(input: {
  hostCall: any;
  gas: u64;
  registers: SeqOfLength<u32, 13>;
  memory: IPVMMemory;
  out: T;
}) => { pageFaultAddress: u32 } | (PVMProgramExecutionContext & { out: T });
