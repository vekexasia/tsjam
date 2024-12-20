import { HostCallExecutor } from "@/invocations/hostCall.js";
import {
  Delta,
  ExportSegment,
  Gas,
  Hash,
  RefinementContext,
  RegularPVMExitReason,
  ServiceIndex,
  Tau,
  WorkError,
  WorkOutput,
  WorkPackageHash,
  u32,
} from "@tsjam/types";
import { HostCallResult, SERVICECODE_MAX_SIZE } from "@tsjam/constants";
import {
  RefineContext,
  omega_h,
  omega_k,
  omega_m,
  omega_o,
  omega_p,
  omega_x,
  omega_y,
  omega_z,
} from "@/functions/refine.js";
import { FnsDb } from "@/functions/fnsdb.js";
import { applyMods } from "@/functions/utils.js";
import { omega_g } from "@/functions/general.js";
import { historicalLookup } from "@tsjam/utils";
import { argumentInvocation } from "@/invocations/argument.js";
import { IxMod } from "@/instructions/utils";

/**
 * $(0.5.3 - B.4)
 */
export const refineInvocation = (
  serviceCodeHash: Hash, // `c`
  gas: Gas,
  serviceIndex: ServiceIndex,
  workPackageHash: WorkPackageHash,
  workPayload: Uint8Array, // `y`
  refinementContext: RefinementContext, // `c`
  authorizerHash: Hash, // `a`
  authorizerOutput: Uint8Array, // `o`
  importSegments: ExportSegment[], // `i`
  workData: Uint8Array[], // `x`
  exportSegmentOffset: number, // `ς`
  deps: {
    delta: Delta;
    tau: Tau;
  },
): {
  result: WorkOutput;
  out: RefineContext["e"];
} => {
  const lookupResult = historicalLookup(
    deps.delta.get(serviceIndex)!,
    refinementContext.lookupAnchor.timeSlot,
    serviceCodeHash,
  );
  // first matching case
  if (!deps.delta.has(serviceIndex) || typeof lookupResult === "undefined") {
    return { result: WorkError.Bad, out: [] };
  }
  // second metching case
  if (lookupResult.length > SERVICECODE_MAX_SIZE) {
    return { result: WorkError.Big, out: [] };
  }

  // encode
  const a = new Uint8Array();
  const argOut = argumentInvocation(
    lookupResult,
    5 as u32,
    gas,
    a,
    F_fn(
      serviceIndex,
      deps.delta,
      deps.tau,
      importSegments,
      exportSegmentOffset,
    ),
    {
      m: new Map(),
      e: [],
    },
  );
  if (argOut.ok) {
    return { result: argOut.ok[1], out: argOut.out.e };
  }
  return {
    result:
      argOut.exitReason === RegularPVMExitReason.OutOfGas
        ? WorkError.OutOfGas
        : WorkError.UnexpectedTermination,
    out: [],
  };
};

/**
 * $(0.5.3 - B.5)
 */
const F_fn: (
  service: ServiceIndex,
  delta: Delta,
  tau: Tau,
  exportedSegments: ExportSegment[],
  exportSegmentOffset: number,
) => HostCallExecutor<RefineContext> =
  (
    service: ServiceIndex,
    delta: Delta,
    tau: Tau,
    exportedSegments: ExportSegment[],
    exportSegmentOffset: number,
  ) =>
  (input) => {
    const fnIdentifier = FnsDb.byCode.get(input.hostCallOpcode)!;
    switch (fnIdentifier) {
      case "historical_lookup":
        return applyMods(
          input.ctx,
          input.out,
          omega_h(input.ctx, service, delta, tau),
        );
      case "import":
        return applyMods(
          input.ctx,
          input.out,
          omega_y(input.ctx, exportedSegments),
        );
      case "export":
        return applyMods(
          input.ctx,
          input.out,
          omega_z(input.ctx, input.out, exportSegmentOffset),
        );
      case "gas":
        return applyMods(input.ctx, input.out, omega_g(input.ctx));
      case "machine":
        return applyMods(input.ctx, input.out, omega_m(input.ctx, input.out));
      case "peek":
        return applyMods(input.ctx, input.out, omega_p(input.ctx, input.out));
      case "poke":
        return applyMods(input.ctx, input.out, omega_o(input.ctx, input.out));
      case "invoke":
        return applyMods(input.ctx, input.out, omega_k(input.ctx, input.out));
      case "expunge":
        return applyMods(input.ctx, input.out, omega_x(input.ctx, input.out));
      default:
        return applyMods(input.ctx, input.out, [
          IxMod.gas(10n),
          IxMod.reg(7, HostCallResult.WHAT),
        ]);
    }
  };
