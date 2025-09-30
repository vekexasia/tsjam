import { HashCodec } from "@/codecs/misc-codecs";
import { DeltaImpl } from "@/impls/delta-impl";
import { TauImpl } from "@/impls/slot-impl";
import { WorkOutputImpl } from "@/impls/work-output-impl";
import { WorkPackageImpl } from "@/impls/work-package-impl";
import {
  createCodec,
  E_int,
  encodeWithCodec,
  LengthDiscrimantedIdentityCodec,
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
import { argumentInvocation } from "./argument";
import { HostCallExecutor } from "./host-call";
import { IxMod } from "@tsjam/pvm-js";

const refine_a_Codec = createCodec<{
  //  c: CoreIndex; // `c`
  i: number;
  w_s: ServiceIndex;
  card_w_y: number;
  h_p: Hash;
}>([
  //  ["c", E_int<CoreIndex>()],
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
  authorizerOutput: Buffer,
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
    //c: core,
    i: index,
    w_s: w.service,
    card_w_y: w.payload.length,
    h_p: Hashing.blake2b(workPackage.toBinary()),
  });
  // @eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { value: _bold_z, readBytes: skip } =
    LengthDiscrimantedIdentityCodec.decode(lookupRes);

  const bold_c = <PVMProgramCode>lookupRes.subarray(skip);

  const argOut = argumentInvocation(
    bold_c,
    <u32>0, // instructionPointer
    w.refineGasLimit,
    bold_a,
    F_fn(
      core,
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
  core: CoreIndex,
  service: ServiceIndex,
  delta: DeltaImpl,
  tau: TauImpl,
  importSegments: ExportSegment[][],
  exportSegmentOffset: number,
  authorizerOutput: Buffer, // bold_r
  workPackage: WorkPackageImpl,
  workItemIndex: number, // i
) => HostCallExecutor<RefineContext> =
  (
    core: CoreIndex,
    service: ServiceIndex,
    delta: DeltaImpl,
    tau: TauImpl,
    importSegments: ExportSegment[][],
    exportSegmentOffset: number,
    authorizerOutput: Buffer,
    workPackage: WorkPackageImpl,
    workItemIndex: number,
  ) =>
  (input) => {
    const fnIdentifier = FnsDb.byCode.get(input.hostCallOpcode)!;
    switch (fnIdentifier) {
      case "gas":
        return applyMods(
          input.pvm,
          input.out,
          hostFunctions.gas(input.pvm, undefined),
        );

      case "fetch":
        return applyMods(
          input.pvm,
          input.out,
          hostFunctions.fetch(input.pvm, {
            p: workPackage,
            n: <Hash>Buffer.alloc(32),
            bold_r: authorizerOutput,
            i: workItemIndex,
            overline_i: importSegments,
            overline_x: workPackage.workItems.map((wi) =>
              wi.exportedDataSegments.map((wx) => wx.originalBlob()),
            ),
            bold_o: undefined,
          }),
        );
      case "historical_lookup":
        return applyMods(
          input.pvm,
          input.out,
          hostFunctions.historical_lookup(input.pvm, {
            s: service,
            bold_d: delta,
            tau: tau,
          }),
        );
      case "export":
        return applyMods(
          input.pvm,
          input.out,
          hostFunctions.export(input.pvm, {
            refineCtx: input.out,
            segmentOffset: exportSegmentOffset,
          }),
        );
      case "machine":
        return applyMods(
          input.pvm,
          input.out,
          hostFunctions.machine(input.pvm, input.out),
        );
      case "peek":
        return applyMods(
          input.pvm,
          input.out,
          hostFunctions.peek(input.pvm, input.out),
        );
      case "poke":
        return applyMods(
          input.pvm,
          input.out,
          hostFunctions.poke(input.pvm, input.out),
        );
      case "pages":
        return applyMods(
          input.pvm,
          input.out,
          hostFunctions.pages(input.pvm, input.out),
        );
      case "invoke":
        return applyMods(
          input.pvm,
          input.out,
          hostFunctions.invoke(input.pvm, input.out),
        );
      case "expunge":
        return applyMods(
          input.pvm,
          input.out,
          hostFunctions.expunge(input.pvm, input.out),
        );
      case "log":
        return applyMods(
          input.pvm,
          input.out,
          hostFunctions.log(input.pvm, { core: core, serviceIndex: service }),
        );
      default:
        return applyMods(input.pvm, input.out, [
          IxMod.gas(10n),
          IxMod.w7(HostCallResult.WHAT),
        ]);
    }
  };
