import { newSTF } from "@vekexasia/jam-utils";
import {
  PVMProgramExecutionContext,
  PVMResultContext,
  RegularPVMExitReason,
  u32,
  u64,
} from "@vekexasia/jam-types";
import {
  HostCallExecutor,
  HostCallOut,
  hostCallInvocation,
} from "@/invocations/hostCall.js";
import { programInitialization } from "@/program.js";

/**
 * `ΨM` in the paper
 * (247)
 */
export const argumentInvocation = newSTF<
  PVMProgramExecutionContext,
  {
    p: Uint8Array;
    arguments: Uint8Array;
    fn: HostCallExecutor;
    ctx: PVMResultContext;
  },
  ArgumentInvocationOut
>((input) => {
  const res = programInitialization(input.p, input.arguments);
  if (typeof res === "undefined") {
    return { exit: RegularPVMExitReason.Panic, out: input.ctx };
  }
  const { program, parsed, memory, registers } = res;
  const hRes = hostCallInvocation.apply(
    {
      program,
      parsedProgram: parsed,
      fn: input.fn,
    },
    {
      context: {
        instructionPointer: 0 as u32,
        gas: 0n as u64,
        memory,
        registers,
      },
      out: input.ctx,
    },
  );

  return R_fn(hRes);
});

type ArgumentInvocationOut = (
  | { exit: RegularPVMExitReason.Panic | RegularPVMExitReason.OutOfGas }
  | { ok: [u64, Uint8Array] }
) & { out: PVMResultContext };

const R_fn = (input: HostCallOut): ArgumentInvocationOut => {
  if (input.exitReason === RegularPVMExitReason.OutOfGas) {
    return { exit: RegularPVMExitReason.OutOfGas, out: input.out };
  }
  if (typeof input.exitReason === "undefined") {
    const readable = input.context.memory.canRead(
      input.context.registers[10],
      input.context.registers[11],
    );
    if (readable) {
      return {
        ok: [
          input.context.gas,
          input.context.memory.getBytes(
            input.context.registers[10],
            input.context.registers[11],
          ),
        ],
        out: input.out,
      };
    } else {
      return { ok: [input.context.gas, new Uint8Array(0)], out: input.out };
    }
  } else {
    return { exit: RegularPVMExitReason.Panic, out: input.out };
  }
};
