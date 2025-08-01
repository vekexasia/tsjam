import { WorkOutputImpl } from "@/classes/WorkOutputImpl";
import {
  Gas,
  PVMProgramCode,
  RegularPVMExitReason,
  u32,
  WorkError,
} from "@tsjam/types";
import { programInitialization } from "../program";
import { HostCallExecutor, hostCallInvocation, HostCallOut } from "./hostCall";

/**
 * `ΨM` in the paper
 * $(0.7.1 - A.44)
 * @param encodedProgram - bold_p
 * @param instructionPointer - ı
 * @param gas - ϱ
 * @param args - bold_a
 * @param f - host call executor
 * @param x - out
 *
 */
export const argumentInvocation = <X>(
  encodedProgram: PVMProgramCode,
  instructionPointer: u32, // ı
  gas: Gas, // ϱ
  args: Uint8Array, // a
  f: HostCallExecutor<X>,
  x: X,
): {
  gasUsed: Gas;
  res: WorkOutputImpl<WorkError.Panic | WorkError.OutOfGas>;
  out: X;
} => {
  const res = programInitialization(encodedProgram, args);
  if (typeof res === "undefined") {
    return { gasUsed: <Gas>0n, res: WorkOutputImpl.panic(), out: x };
  }
  const { programCode, memory, registers } = res;
  const hRes = hostCallInvocation(
    programCode,
    { instructionPointer, gas, registers, memory },
    f,
    x,
  );

  console.log(`ε = ${hRes.exitReason}`);
  return R_fn(gas, hRes);
};

type ArgumentInvocationOut<X> = {
  gasUsed: Gas;
  // in reality its either panic or out of gas
  res: WorkOutputImpl<WorkError.OutOfGas | WorkError.Panic>;
  out: X;
};

// $(0.7.1 - A.44)
const R_fn = <X>(
  gas: Gas,
  hostCall: HostCallOut<X>,
): ArgumentInvocationOut<X> => {
  const u_prime = hostCall.context.gas;
  const gas_prime: Gas = <Gas>(gas - (u_prime > 0n ? u_prime : 0n));

  if (hostCall.exitReason?.reason === RegularPVMExitReason.OutOfGas) {
    return {
      gasUsed: gas_prime,
      res: WorkOutputImpl.outOfGas(),
      out: hostCall.out, // x'
    };
  }
  if (hostCall.exitReason?.reason === RegularPVMExitReason.Halt) {
    const readable = hostCall.context.memory.canRead(
      hostCall.context.registers.w7().value,
      Number(hostCall.context.registers.w8()),
    );
    if (readable) {
      return {
        gasUsed: gas_prime,
        res: new WorkOutputImpl<any>(
          hostCall.context.memory.getBytes(
            hostCall.context.registers.w7().value,
            Number(hostCall.context.registers.w8()),
          ),
        ),
        out: hostCall.out,
      };
    } else {
      return {
        gasUsed: gas_prime,
        res: new WorkOutputImpl<any>(new Uint8Array()),
        out: hostCall.out,
      };
    }
  } else {
    return {
      gasUsed: gas_prime,
      res: WorkOutputImpl.panic(),
      out: hostCall.out,
    };
  }
};
