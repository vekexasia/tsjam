import { RegularPVMExitReason, u32, u64 } from "@vekexasia/jam-types";
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
export const argumentInvocation = <X>(
  p: Uint8Array,
  instructionPointer: u32, // ı
  gas: u64, // ξ
  args: Uint8Array, // a
  f: HostCallExecutor<X>,
  x: X,
): ArgumentInvocationOut<X> => {
  const res = programInitialization(p, args);
  if (typeof res === "undefined") {
    return { exitReason: RegularPVMExitReason.Panic, out: x };
  }
  const { program, parsed, memory, registers } = res;
  const hRes = hostCallInvocation(
    { program, parsedProgram: parsed },
    { instructionPointer, gas, registers, memory },
    f,
    x,
  );

  return R_fn(hRes);
};

type ArgumentInvocationOut<X> = {
  exitReason?: RegularPVMExitReason.Panic | RegularPVMExitReason.OutOfGas;
  ok?: [u64, Uint8Array];
  out: X;
};

const R_fn = <X>(input: HostCallOut<X>): ArgumentInvocationOut<X> => {
  if (input.exitReason === RegularPVMExitReason.OutOfGas) {
    return { exitReason: RegularPVMExitReason.OutOfGas, out: input.out };
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
    return { exitReason: RegularPVMExitReason.Panic, out: input.out };
  }
};
