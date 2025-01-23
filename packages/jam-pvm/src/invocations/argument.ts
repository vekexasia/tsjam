import { Gas, RegularPVMExitReason, u32, u64 } from "@tsjam/types";
import {
  HostCallExecutor,
  HostCallOut,
  hostCallInvocation,
} from "@/invocations/hostCall.js";
import { programInitialization } from "@/program.js";

/**
 * `ΨM` in the paper
 * $(0.5.4 - A.38)
 */
export const argumentInvocation = <X>(
  p: Uint8Array,
  instructionPointer: u32, // ı
  gas: Gas, // ξ
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

// $(0.5.4 - A.39)
const R_fn = <X>(input: HostCallOut<X>): ArgumentInvocationOut<X> => {
  if (input.exitReason === RegularPVMExitReason.OutOfGas) {
    return { exitReason: RegularPVMExitReason.OutOfGas, out: input.out };
  }
  if (typeof input.exitReason === "undefined") {
    const readable = input.context.memory.canRead(
      input.context.registers[7],
      input.context.registers[8],
    );
    if (readable) {
      return {
        ok: [
          input.context.gas,
          input.context.memory.getBytes(
            input.context.registers[7],
            input.context.registers[8],
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
