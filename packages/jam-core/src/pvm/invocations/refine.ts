import { DeltaImpl } from "@/classes/DeltaImpl";
import { WorkOutputImpl } from "@/classes/WorkOutputImpl";
import { WorkPackageImpl } from "@/classes/WorkPackageImpl";
import {
  createCodec,
  E_int,
  encodeWithCodec,
  LengthDiscrimantedIdentity,
} from "@tsjam/codec";
import { HostCallResult, SERVICECODE_MAX_SIZE } from "@tsjam/constants";
import { Hashing } from "@tsjam/crypto";
import {
  CoreIndex,
  ExportSegment,
  Gas,
  Hash,
  PVMProgramCode,
  ServiceIndex,
  u32,
  WorkError,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import { FnsDb } from "../functions/fnsdb";
import { hostFunctions, RefineContext } from "../functions/functions";
import { applyMods } from "../functions/utils";
import { IxMod } from "../instructions/utils";
import { argumentInvocation } from "./argument";
import { HostCallExecutor } from "./hostCall";
import { TauImpl } from "@/classes/SlotImpl";
import { HashCodec } from "@/codecs/miscCodecs";

const refine_a_Codec = createCodec<{
  c: CoreIndex; // `c`
  i: number;
  w_s: ServiceIndex;
  card_w_y: number;
  h_p: Hash;
}>([
  ["c", E_int<CoreIndex>()],
  ["i", E_int()],
  ["w_s", E_int<ServiceIndex>()],
  ["card_w_y", E_int()], // `|w_y|`
  ["h_p", HashCodec],
]);

/**
 * $(0.7.1 - B.5)
 * @param core - `c`
 * @param index - `i`
 * @param workPackage - `p`
 * @param authorizerOutput - `bold_r`
 * @param importSegments - `\overline{i}`
 * @param exportSegmentOffset - `ς`
 */
export const refineInvocation = (
  core: CoreIndex,
  index: number,
  workPackage: WorkPackageImpl,
  authorizerOutput: Uint8Array,
  importSegments: ExportSegment[][],
  exportSegmentOffset: number,
  deps: {
    delta: DeltaImpl;
    tau: TauImpl;
  },
): {
  res: WorkOutputImpl<
    WorkError.Bad | WorkError.Big | WorkError.Panic | WorkError.OutOfGas
  >;
  // exported segments
  out: RefineContext["segments"];
  gasUsed: Gas;
} => {
  const w = workPackage.workItems[index];
  const lookupRes = deps.delta
    .get(w.service)
    ?.historicalLookup(
      toTagged(workPackage.context.lookupAnchorSlot),
      w.codeHash,
    );

  // first matching case
  if (!deps.delta.has(w.service) || typeof lookupRes === "undefined") {
    return { res: WorkOutputImpl.bad(), out: [], gasUsed: <Gas>0n };
  }
  // second metching case
  if (lookupRes.length > SERVICECODE_MAX_SIZE) {
    return { res: WorkOutputImpl.big(), out: [], gasUsed: <Gas>0n };
  }

  const bold_a = encodeWithCodec(refine_a_Codec, {
    c: core,
    i: index,
    w_s: w.service,
    card_w_y: w.payload.length,
    h_p: Hashing.blake2b(workPackage.toBinary()),
  });
  // @eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { value: _bold_z, readBytes: skip } =
    LengthDiscrimantedIdentity.decode(lookupRes);

  const bold_c = <PVMProgramCode>lookupRes.subarray(skip);

  const argOut = argumentInvocation(
    bold_c,
    <u32>0, // instructionPointer
    w.refineGasLimit,
    bold_a,
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
      bold_m: new Map(),
      segments: [],
    },
  );
  const argRes = argOut.res;
  if (argRes.isPanic() || argRes.isOutOfGas()) {
    return {
      res: argRes,
      out: [],
      gasUsed: argOut.gasUsed,
    };
  }
  return {
    res: argRes,
    out: argOut.out.segments,
    gasUsed: argOut.gasUsed,
  };
};

/**
 * $(0.7.1 - B.6)
 */
const F_fn: (
  service: ServiceIndex,
  delta: DeltaImpl,
  tau: TauImpl,
  importSegments: ExportSegment[][],
  exportSegmentOffset: number,
  authorizerOutput: Uint8Array, // bold_r
  workPackage: WorkPackageImpl,
  workItemIndex: number, // i
) => HostCallExecutor<RefineContext> =
  (
    service: ServiceIndex,
    delta: DeltaImpl,
    tau: TauImpl,
    importSegments: ExportSegment[][],
    exportSegmentOffset: number,
    authorizerOutput: Uint8Array,
    workPackage: WorkPackageImpl,
    workItemIndex: number,
  ) =>
  (input) => {
    const fnIdentifier = FnsDb.byCode.get(input.hostCallOpcode)!;
    switch (fnIdentifier) {
      case "gas":
        return applyMods(
          input.ctx,
          input.out,
          hostFunctions.gas(input.ctx, undefined),
        );

      case "fetch":
        return applyMods(
          input.ctx,
          input.out,
          hostFunctions.fetch(input.ctx, {
            p: workPackage,
            n: <Hash>new Uint8Array(32).fill(0),
            bold_r: authorizerOutput,
            i: workItemIndex,
            overline_i: importSegments,
            overline_x: workPackage.workItems.map((wi) =>
              wi.exportedDataSegments.map((wx) => wx.originalBlob()),
            ),
            bold_i: undefined,
          }),
        );
      case "historical_lookup":
        return applyMods(
          input.ctx,
          input.out,
          hostFunctions.historical_lookup(input.ctx, {
            s: service,
            bold_d: delta,
            tau: tau,
          }),
        );
      case "export":
        return applyMods(
          input.ctx,
          input.out,
          hostFunctions.export(input.ctx, {
            refineCtx: input.out,
            segmentOffset: exportSegmentOffset,
          }),
        );
      case "machine":
        return applyMods(
          input.ctx,
          input.out,
          hostFunctions.machine(input.ctx, input.out),
        );
      case "peek":
        return applyMods(
          input.ctx,
          input.out,
          hostFunctions.peek(input.ctx, input.out),
        );
      case "poke":
        return applyMods(
          input.ctx,
          input.out,
          hostFunctions.poke(input.ctx, input.out),
        );
      case "pages":
        return applyMods(
          input.ctx,
          input.out,
          hostFunctions.pages(input.ctx, input.out),
        );
      case "invoke":
        return applyMods(
          input.ctx,
          input.out,
          hostFunctions.invoke(input.ctx, input.out),
        );
      case "expunge":
        return applyMods(
          input.ctx,
          input.out,
          hostFunctions.expunge(input.ctx, input.out),
        );
      default:
        return applyMods(input.ctx, input.out, [
          IxMod.gas(10n),
          IxMod.w7(HostCallResult.WHAT),
        ]);
    }
  };
