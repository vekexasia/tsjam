import { WorkOutputImpl } from "@/impls/work-output-impl";
import {
  Gas,
  PVMProgramCode,
  RegularPVMExitReason,
  u32,
  WorkError,
} from "@tsjam/types";
import { HostCallExecutor, hostCallInvocation, HostCallOut } from "./host-call";
import { pvmImpl } from "../proxy";
import {
  BaseMemory,
  deblobProgram,
  programInitialization,
  PVMExitReasonImpl,
  PVMRegistersImpl,
} from "@tsjam/pvm-base";

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
  args: Buffer, // a
  f: HostCallExecutor<X>,
  x: X,
  pvmLogger: (line: string) => void,
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
  const context = {
    instructionPointer,
    gas,
    registers,
    memory: pvmImpl.buildMemory(memory),
  };
  //
  // NOTE:this is not part of A.35 but an optimization
  // to avoid deblobbing multiple times in basicInvocation
  const r = deblobProgram(programCode);
  if (r instanceof PVMExitReasonImpl) {
    return R_fn(
      gas,
      {
        exitReason: r,
        out: x,
      },
      context,
    );
  }
  const pvm = pvmImpl.buildPVM({
    mem: context.memory,
    pc: context.instructionPointer,
    program: r,
    regs: registers,
    gas,
    logger: pvmLogger,
  });

  pvm.set_debug(process.env.DEBUG_STEPS === "true");
  const hRes = hostCallInvocation(pvm, f, x);
  context.memory = pvm.memory;
  context.gas = pvm.gas;
  context.instructionPointer = pvm.pc;
  context.registers = pvm.registers;

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
  context: {
    instructionPointer: u32;
    gas: Gas;
    registers: PVMRegistersImpl;
    memory: BaseMemory;
  },
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
    if (
      w7.fitsInU32() &&
      context.memory.canRead(w7.u32(), Number(context.registers.w8()))
    ) {
      const rb = Buffer.allocUnsafe(Number(context.registers.w8()));
      context.memory.readInto(w7.u32(), rb);
      return {
        gasUsed: gas_prime,
        res: new WorkOutputImpl<WorkError.OutOfGas>(rb),
        out: hostCall.out,
      };
    } else {
      return {
        gasUsed: gas_prime,
        res: new WorkOutputImpl<WorkError.OutOfGas>(Buffer.alloc(0)),
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
