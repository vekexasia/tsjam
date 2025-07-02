import {
  CoreIndex,
  Gas,
  PVMResultContext,
  WorkError,
  WorkPackageWithAuth,
  u32,
} from "@tsjam/types";
import { argumentInvocation } from "@/invocations/argument.js";
import { E_2_int, encodeWithCodec } from "@tsjam/codec";
import { HostCallExecutor } from "@/invocations/hostCall.js";
import { omega_g } from "@/functions/general.js";
import {
  HostCallResult,
  MAXIMUM_SIZE_IS_AUTHORIZED,
  TOTAL_GAS_IS_AUTHORIZED,
} from "@tsjam/constants";
import { IxMod } from "@/instructions/utils";
import { applyMods } from "@/functions/utils";

/**
 * `ΨI` in the paper
 * it's stateless so `null` for curState
 * $(0.6.6 - B.1)
 */
export const isAuthorized = (p: WorkPackageWithAuth, c: CoreIndex) => {
  if (p.pc.length === 0) {
    return { res: WorkError.Bad, gasUsed: <Gas>0n };
  }
  if (p.pc.length > MAXIMUM_SIZE_IS_AUTHORIZED) {
    return { res: WorkError.Big, gasUsed: <Gas>0n };
  }

  const res = argumentInvocation(
    p.pc,
    0 as u32, // instruction pointer
    TOTAL_GAS_IS_AUTHORIZED as Gas,
    encodeWithCodec(E_2_int, c),
    F_Fn,
    undefined as unknown as PVMResultContext, // something is missing from the paper
  );
  return {
    /**
     * `bold_t`
     */
    res: res.res,
    /**
     * `g`
     */
    gasUsed: res.gasUsed,
  };
};

// $(0.6.4 - B.2)
const F_Fn: HostCallExecutor<unknown> = (input) => {
  if (input.hostCallOpcode === 0 /** ΩG */) {
    return applyMods(input.ctx, input.out as never, omega_g(input.ctx));
  }
  return applyMods(input.ctx, input.out as never, [
    IxMod.gas(10n),
    IxMod.reg(7, HostCallResult.WHAT),
  ]);
};
