import {
  CoreIndex,
  Gas,
  PVMProgramCode,
  PVMResultContext,
  WorkPackage,
  u32,
} from "@tsjam/types";
import { argumentInvocation } from "@/invocations/argument.js";
import {
  createCodec,
  E_sub_int,
  encodeWithCodec,
  WorkPackageCodec,
} from "@tsjam/codec";
import { HostCallExecutor } from "@/invocations/hostCall.js";
import { omega_g } from "@/functions/general.js";
import { HostCallResult, TOTAL_GAS_IS_AUTHORIZED } from "@tsjam/constants";
import { IxMod } from "@/instructions/utils";
import { applyMods } from "@/functions/utils";

const authArgsCodec = createCodec<{ p: WorkPackage; c: CoreIndex }>([
  ["p", WorkPackageCodec],
  ["c", E_sub_int<CoreIndex>(2)],
]);
/**
 * `ΨI` in the paper
 * it's stateless so `null` for curState
 * $(0.6.4 - B.1)
 */
export const isAuthorized = (p: WorkPackage, c: CoreIndex) => {
  const res = argumentInvocation(
    <PVMProgramCode>new Uint8Array(), // FIXME: missing the preimage fetch
    0 as u32, // instruction pointer
    TOTAL_GAS_IS_AUTHORIZED as Gas,
    encodeWithCodec(authArgsCodec, { p, c }),
    F_Fn,
    undefined as unknown as PVMResultContext, // something is missing from the paper
  );
  return { res: res.res, usedGas: res.usedGas };
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
