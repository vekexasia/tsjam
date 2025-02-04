import { HostCallExecutor } from "@/invocations/hostCall.js";
import {
  Delta,
  ExportSegment,
  Hash,
  RefinementContext,
  RegularPVMExitReason,
  ServiceIndex,
  Tau,
  WorkError,
  WorkOutput,
  WorkPackageHash,
  WorkPackageWithAuth,
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
  omega_e,
  omega_z,
} from "@/functions/refine.js";
import { FnsDb } from "@/functions/fnsdb.js";
import { applyMods } from "@/functions/utils.js";
import { omega_g } from "@/functions/general.js";
import { historicalLookup } from "@tsjam/utils";
import { argumentInvocation } from "@/invocations/argument.js";
import { IxMod } from "@/instructions/utils";
import {
  createCodec,
  E_sub_int,
  encodeWithCodec,
  HashCodec,
  IdentityCodec,
  RefinementContextCodec,
  WorkPackageCodec,
  WorkPackageHashCodec,
} from "@tsjam/codec";
import { Hashing } from "@tsjam/crypto";

const refine_a_Codec = createCodec<{
  serviceIndex: ServiceIndex;
  payload: Uint8Array;
  packageHash: WorkPackageHash;
  context: RefinementContext;
  authorizerHash: Hash;
}>([
  ["serviceIndex", E_sub_int<ServiceIndex>(4)],
  ["payload", IdentityCodec],
  ["packageHash", WorkPackageHashCodec],
  ["context", RefinementContextCodec],
  ["authorizerHash", HashCodec],
]);
/**
 * $(0.6.1 - B.4)
 */
export const refineInvocation = (
  index: number, // `i`
  workPackage: WorkPackageWithAuth, // `p`
  authorizerOutput: Uint8Array, // `bold_o`
  importSegments: ExportSegment[][], // `\overline{i}`
  exportSegmentOffset: number, // `ς`
  deps: {
    delta: Delta;
    tau: Tau;
  },
): {
  result: WorkOutput;
  // exported segments
  out: RefineContext["e"];
} => {
  const w = workPackage.workItems[index];
  const lookupResult = historicalLookup(
    deps.delta.get(w.serviceIndex)!,
    workPackage.context.lookupAnchor.timeSlot,
    w.codeHash,
  );
  // first matching case
  if (!deps.delta.has(w.serviceIndex) || typeof lookupResult === "undefined") {
    return { result: WorkError.Bad, out: [] };
  }
  // second metching case
  if (lookupResult.length > SERVICECODE_MAX_SIZE) {
    return { result: WorkError.Big, out: [] };
  }

  // encode
  const a = encodeWithCodec(refine_a_Codec, {
    serviceIndex: w.serviceIndex,
    payload: w.payload,
    packageHash: Hashing.blake2b<WorkPackageHash>(
      encodeWithCodec(WorkPackageCodec, workPackage),
    ),
    context: workPackage.context,
    authorizerHash: workPackage.pa,
  });

  const argOut = argumentInvocation(
    lookupResult,
    <u32>0, // instructionPointer
    w.refinementGasLimit,
    a,
    F_fn(
      w.serviceIndex,
      deps.delta,
      deps.tau,
      importSegments,
      exportSegmentOffset,
      authorizerOutput,
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
 * $(0.5.4 - B.5)
 */
const F_fn: (
  service: ServiceIndex,
  delta: Delta,
  tau: Tau,
  overline_i: ExportSegment[][],
  exportSegmentOffset: number,
  authorizerOutput: Uint8Array,
) => HostCallExecutor<RefineContext> =
  (
    service: ServiceIndex,
    delta: Delta,
    tau: Tau,
    overline_i: ExportSegment[][],
    exportSegmentOffset: number,
    authorizerOutput: Uint8Array,
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
      /*return applyMods(
          input.ctx,
          input.out,
          omega_y(input.ctx, exportedSegments),
        );
        */
      // TODO: change with fetch
      case "export":
        return applyMods(
          input.ctx,
          input.out,
          omega_e(input.ctx, input.out, exportSegmentOffset),
        );
      case "gas":
        return applyMods(input.ctx, input.out, omega_g(input.ctx));
      case "machine":
        return applyMods(input.ctx, input.out, omega_m(input.ctx, input.out));
      case "peek":
        return applyMods(input.ctx, input.out, omega_p(input.ctx, input.out));
      case "zero":
        return applyMods(input.ctx, input.out, omega_z(input.ctx, input.out));
      case "poke":
        return applyMods(input.ctx, input.out, omega_o(input.ctx, input.out));
      case "invoke":
        return applyMods(input.ctx, input.out, omega_k(input.ctx, input.out));
      case "expunge":
        return applyMods(input.ctx, input.out, omega_x(input.ctx, input.out));
      default:
        return applyMods(input.ctx, input.out, [
          IxMod.gas(10n),
          IxMod.w7(HostCallResult.WHAT),
        ]);
    }
  };
