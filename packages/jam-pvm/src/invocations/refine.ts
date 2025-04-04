import { HostCallExecutor } from "@/invocations/hostCall.js";
import {
  Delta,
  ExportSegment,
  Gas,
  Hash,
  PVMProgramCode,
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
  omega_y,
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
import { serviceMetadataCodec } from "@tsjam/serviceaccounts";

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
 * $(0.6.4 - B.5)
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
  res: WorkOutput;
  // exported segments
  out: RefineContext["e"];
  usedGas: Gas;
} => {
  const w = workPackage.items[index];
  const lookupResult = historicalLookup(
    deps.delta.get(w.service)!,
    workPackage.context.lookupAnchor.timeSlot,
    w.codeHash,
  );
  // first matching case
  if (!deps.delta.has(w.service) || typeof lookupResult === "undefined") {
    return { res: WorkError.Bad, out: [], usedGas: <Gas>0n };
  }
  // second metching case
  if (lookupResult.length > SERVICECODE_MAX_SIZE) {
    return { res: WorkError.Big, out: [], usedGas: <Gas>0n };
  }

  // encode
  const a = encodeWithCodec(refine_a_Codec, {
    serviceIndex: w.service,
    payload: w.payload,
    packageHash: Hashing.blake2b<WorkPackageHash>(
      encodeWithCodec(WorkPackageCodec, workPackage),
    ),
    context: workPackage.context,
    authorizerHash: workPackage.authorizationCodeHash,
  });
  const { code } = serviceMetadataCodec.decode(lookupResult).value;

  const argOut = argumentInvocation(
    <PVMProgramCode>code,
    <u32>0, // instructionPointer
    w.refineGasLimit,
    a,
    F_fn(
      w.service,
      deps.delta,
      deps.tau,
      importSegments,
      exportSegmentOffset,
      authorizerOutput,
      workPackage,
      index,
    ),
    {
      m: new Map(),
      e: [],
    },
  );
  const argRes = argOut.res;
  if (
    argRes === RegularPVMExitReason.Panic ||
    argRes === RegularPVMExitReason.OutOfGas
  ) {
    return {
      res:
        argOut.res === RegularPVMExitReason.Panic
          ? WorkError.UnexpectedTermination
          : WorkError.OutOfGas,
      out: [],
      usedGas: argOut.usedGas,
    };
  }
  return {
    res: argRes,
    out: argOut.out.e,
    usedGas: argOut.usedGas,
  };
};

/**
 * $(0.6.4 - B.6)
 */
const F_fn: (
  service: ServiceIndex,
  delta: Delta,
  tau: Tau,
  overline_i: ExportSegment[][],
  exportSegmentOffset: number,
  authorizerOutput: Uint8Array,
  workPackage: WorkPackageWithAuth,
  workIndex: number,
) => HostCallExecutor<RefineContext> =
  (
    service: ServiceIndex,
    delta: Delta,
    tau: Tau,
    overline_i: ExportSegment[][],
    exportSegmentOffset: number,
    authorizerOutput: Uint8Array,
    workPackage: WorkPackageWithAuth,
    workItemIndex: number,
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
      case "fetch":
        return applyMods(
          input.ctx,
          input.out,
          omega_y(
            input.ctx,
            workItemIndex,
            workPackage,
            authorizerOutput,
            overline_i,
          ),
        );
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
