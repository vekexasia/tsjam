import { Gas, PVMProgramCode, RegularPVMExitReason, u32 } from "@tsjam/types";
import {
  HostCallExecutor,
  HostCallOut,
  hostCallInvocation,
} from "@/invocations/hostCall.js";
import { toSafeMemoryAddress } from "@/pvmMemory";
import { programInitialization } from "@/program.js";

/**
 * `ΨM` in the paper
 * $(0.6.4 - A.43)
 */
export const argumentInvocation = <X>(
  encodedProgram: PVMProgramCode,
  instructionPointer: u32, // ı
  gas: Gas, // ϱ
  args: Uint8Array, // a
  f: HostCallExecutor<X>,
  x: X,
): {
  usedGas: Gas;
  res: Uint8Array | RegularPVMExitReason.Panic | RegularPVMExitReason.OutOfGas;
  out: X;
} => {
  const res = programInitialization(encodedProgram, args);
  if (typeof res === "undefined") {
    return { usedGas: <Gas>0n, res: RegularPVMExitReason.Panic, out: x };
  }
  const { programCode, memory, registers } = res;
  const hRes = hostCallInvocation(
    programCode,
    { instructionPointer, gas, registers, memory },
    f,
    x,
  );

  return R_fn(gas, hRes);
};

type ArgumentInvocationOut<X> = {
  usedGas: Gas;
  res: Uint8Array | RegularPVMExitReason.Panic | RegularPVMExitReason.OutOfGas;
  out: X;
};

// $(0.6.4 - A.43)
const R_fn = <X>(
  gas: Gas,
  hostCall: HostCallOut<X>,
): ArgumentInvocationOut<X> => {
  const u_prime = hostCall.context.gas;
  const gas_prime: Gas = <Gas>(gas - (u_prime > 0n ? u_prime : 0n));

  if (hostCall.exitReason === RegularPVMExitReason.OutOfGas) {
    return {
      usedGas: gas_prime,
      res: RegularPVMExitReason.OutOfGas,
      out: hostCall.out, // x'
    };
  }
  if (
    typeof hostCall.exitReason === "undefined" ||
    hostCall.exitReason === RegularPVMExitReason.Halt
  ) {
    const readable = hostCall.context.memory.canRead(
      toSafeMemoryAddress(hostCall.context.registers[7]),
      Number(hostCall.context.registers[8]),
    );
    if (readable) {
      return {
        usedGas: gas_prime,
        res: hostCall.context.memory.getBytes(
          toSafeMemoryAddress(hostCall.context.registers[7]),
          Number(hostCall.context.registers[8]),
        ),
        out: hostCall.out,
      };
    } else {
      return { usedGas: gas_prime, res: new Uint8Array(0), out: hostCall.out };
    }
  } else {
    return {
      usedGas: gas_prime,
      res: RegularPVMExitReason.Panic,
      out: hostCall.out,
    };
  }
};
