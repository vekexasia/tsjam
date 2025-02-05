import {
  CoreIndex,
  Gas,
  PVMResultContext,
  RegularPVMExitReason,
  WorkPackage,
  u32,
} from "@tsjam/types";
import { argumentInvocation } from "@/invocations/argument.js";
import { E_4, WorkPackageCodec } from "@tsjam/codec";
import { HostCallExecutor } from "@/invocations/hostCall.js";
import { omega_g } from "@/functions/general.js";
import { HostCallResult, TOTAL_GAS_IS_AUTHORIZED } from "@tsjam/constants";
import { IxMod } from "@/instructions/utils";
import { applyMods } from "@/functions/utils";

/**
 * `ΨI` in the paper
 * it's stateless so `null` for curState
 * $(0.6.1 - B.1)
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
    TOTAL_GAS_IS_AUTHORIZED as Gas,
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

// $(0.6.1 - B.2)
const F_Fn: HostCallExecutor<unknown> = (input) => {
  if (input.hostCallOpcode === 0 /** ΩG */) {
    return applyMods(input.ctx, input.out as never, omega_g(input.ctx));
  }
  return applyMods(input.ctx, input.out as never, [
    IxMod.gas(10n),
    IxMod.reg(7, HostCallResult.WHAT),
  ]);
};
