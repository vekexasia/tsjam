import { HostCallExecutor } from "@/invocations/hostCall.js";
import {
  Delta,
  ExportSegment,
  Hash,
  PVMProgramExecutionContextBase,
  RefinementContext,
  RegularPVMExitReason,
  ServiceIndex,
  Tau,
  WorkError,
  WorkOutput,
  WorkPackageHash,
  u32,
  u64,
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

export const refineInvocation = (
  serviceCodeHash: Hash, // `c`
  gas: u64,
  serviceIndex: ServiceIndex,
  workPackageHash: WorkPackageHash,
  workPayload: Uint8Array, // `y`
  refinementContext: RefinementContext, // `c`
  authorizerHash: Hash, // `a`
  authorizerOutput: Uint8Array, // `o`
  importSegments: ExportSegment[], // `i`
  workData: Uint8Array[], // `d`
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
  if (!deps.delta.has(serviceIndex) || typeof lookupResult === "undefined") {
    return { result: WorkError.Bad, out: [] };
  }
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
    const fn = FnsDb.byCode.get(input.hostCallOpcode)!;
    switch (fn.identifier) {
      case "historical_lookup":
        return applyMods(
          input.ctx,
          input.out,
          omega_h.execute(input.ctx, service, delta, tau),
        );
      case "import":
        return applyMods(
          input.ctx,
          input.out,
          omega_y.execute(input.ctx, exportedSegments),
        );
      case "export":
        return applyMods(
          input.ctx,
          input.out,
          omega_z.execute(input.ctx, input.out, exportSegmentOffset),
        );
      case "gas":
        return applyMods(input.ctx, input.out, omega_g.execute(input.ctx));
      case "machine":
        return applyMods(
          input.ctx,
          input.out,
          omega_m.execute(input.ctx, input.out),
        );
      case "peek":
        return applyMods(
          input.ctx,
          input.out,
          omega_p.execute(input.ctx, input.out),
        );
      case "poke":
        return applyMods(
          input.ctx,
          input.out,
          omega_o.execute(input.ctx, input.out),
        );
      case "invoke":
        return applyMods(
          input.ctx,
          input.out,
          omega_k.execute(input.ctx, input.out),
        );
      case "expunge":
        return applyMods(
          input.ctx,
          input.out,
          omega_x.execute(input.ctx, input.out),
        );
      default:
        return {
          ctx: {
            ...input.ctx,
            gas: input.ctx.gas - 10n,
            registers: [HostCallResult.WHAT, ...input.ctx.registers.slice(1)],
          } as PVMProgramExecutionContextBase,
          out: input.out,
        };
    }
  };
