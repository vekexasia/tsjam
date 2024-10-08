import {
  CoreIndex,
  PVMProgramExecutionContext,
  PVMResultContext,
  RegularPVMExitReason,
  WorkPackage,
  u32,
  u64,
} from "@tsjam/types";
import { argumentInvocation } from "@/invocations/argument.js";
import { E_4, WorkPackageCodec } from "@tsjam/codec";
import { HostCallExecutor } from "@/invocations/hostCall.js";
import { omega_g } from "@/functions/general.js";
import { processIxResult } from "@/invocations/singleStep.js";
import { HostCallResult } from "@tsjam/constants";
import { IxMod } from "@/instructions/utils";

/**
 * `ΨI` in the paper
 * it's stateless so `null` for curState
 */
export const isAuthorized = (
  p: WorkPackage,
  c: CoreIndex,
): RegularPVMExitReason.OutOfGas | RegularPVMExitReason.Panic | Uint8Array => {
  const args = new Uint8Array(WorkPackageCodec.encodedSize(p) + 4);
  WorkPackageCodec.encode(p, args);
  E_4.encode(BigInt(c), args.subarray(args.length - 4));
  const res = argumentInvocation(
    new Uint8Array(), // todo missing the preimage fetch
    0 as u32,
    Gi,
    args,
    F_Fn,
    undefined as unknown as PVMResultContext, // something is missing from the paper
  );
  if (
    res.exitReason === RegularPVMExitReason.OutOfGas ||
    res.exitReason === RegularPVMExitReason.Panic
  ) {
    return res.exitReason;
  }
  if (res.ok) {
    return res.ok[1];
  }
  throw new Error("unexpected");
};

/**
 * TODO set the correct value
 */
const Gi = 0n as u64;

const F_Fn: HostCallExecutor<unknown> = (input) => {
  if (input.hostCallOpcode === 0 /** ΩG */) {
    const r = processIxResult(
      { ...input.ctx, instructionPointer: 4 as u32 },
      [IxMod.gas(omega_g.gasCost as bigint), ...omega_g.execute(input.ctx)],
      0,
    );
    return {
      ctx: {
        gas: r.p_context.gas,
        registers: r.p_context.registers,
        memory: r.p_context.memory,
      },
      out: input.out,
    };
  }
  return {
    ctx: {
      gas: (input.ctx.gas - 10n) as u64,
      registers: [
        HostCallResult.WHAT,
        input.ctx.registers.slice(1),
      ] as PVMProgramExecutionContext["registers"],
      memory: input.ctx.memory,
    },
    out: input.out,
  };
};
