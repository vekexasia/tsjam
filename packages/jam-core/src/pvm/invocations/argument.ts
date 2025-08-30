import { WorkOutputImpl } from "@/impls/work-output-impl";
import {
  Gas,
  PVMProgramCode,
  RegularPVMExitReason,
  u32,
  WorkError,
} from "@tsjam/types";
import { programInitialization } from "../program";
import { HostCallExecutor, hostCallInvocation, HostCallOut } from "./host-call";
import { PVMProgramExecutionContextImpl } from "@/impls/pvm/pvm-program-execution-context-impl";

/**
 * `ΨM` in the paper
 * $(0.7.1 - A.44)
 * @param core - CoreIndex added for context but not in gp
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
  const context = new PVMProgramExecutionContextImpl({
    instructionPointer,
    gas,
    registers,
    memory,
  });
  const hRes = hostCallInvocation(programCode, context, f, x);

  return R_fn(gas, hRes, context);
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
  context: PVMProgramExecutionContextImpl,
): ArgumentInvocationOut<X> => {
  const u_prime = context.gas;
  const gas_prime: Gas = <Gas>(gas - (u_prime > 0n ? u_prime : 0n));

  if (hostCall.exitReason?.reason === RegularPVMExitReason.OutOfGas) {
    return {
      gasUsed: gas_prime,
      res: WorkOutputImpl.outOfGas(),
      out: hostCall.out, // x'
    };
  }
  if (hostCall.exitReason?.reason === RegularPVMExitReason.Halt) {
    const w7 = context.registers.w7();
    const readable =
      w7.fitsInU32() &&
      context.memory.canRead(w7.u32(), Number(context.registers.w8()));
    if (readable) {
      return {
        gasUsed: gas_prime,
        res: new WorkOutputImpl<WorkError.OutOfGas>(
          context.memory.getBytes(w7.u32(), Number(context.registers.w8())),
        ),
        out: hostCall.out,
      };
    } else {
      return {
        gasUsed: gas_prime,
        res: new WorkOutputImpl<WorkError.OutOfGas>(new Uint8Array()),
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
