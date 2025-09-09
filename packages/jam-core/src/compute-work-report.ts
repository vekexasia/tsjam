import {
  createArrayLengthDiscriminator,
  createCodec,
  dlArrayOfUint8ArrayCodec,
  encodeWithCodec,
  IdentityCodec,
} from "@tsjam/codec";
import {
  ERASURECODE_BASIC_SIZE,
  ERASURECODE_EXPORTED_SIZE,
  MAX_WORKREPORT_OUTPUT_SIZE,
} from "@tsjam/constants";
import {
  CoreIndex,
  ExportSegment,
  Gas,
  Hash,
  WorkError,
  WorkItem,
  WorkPackageHash,
} from "@tsjam/types";
import { isExportingWorkPackageHash, toTagged } from "@tsjam/utils";
import assert from "assert";
import { err, ok, Result } from "neverthrow";
import { AvailabilitySpecificationImpl, WorkReportImpl } from ".";
import { HashCodec } from "./codecs/misc-codecs";
import { IdentityMap } from "./data-structures/identity-map";
import { DeltaImpl } from "./impls/delta-impl";
import { TauImpl } from "./impls/slot-impl";
import { WorkOutputImpl } from "./impls/work-output-impl";
import { WorkPackageImpl } from "./impls/work-package-impl";
import { J_fn } from "./merklization/constant-depth";
import { refineInvocation } from "./pvm/invocations/refine";

export const computationWorkReportError = "t not in B:wr" as const;
/**
 * `Ξ` fn section 14.4
 * @see I_fn
 * @see R_fn
 * @see A_fn
 * @see C_fn
 * @see M_fn
 * @param package - `bold_p`
 * @param core - `c`
 * $(0.7.1 - 14.12)
 */
export const computeWorkReport = (
  pack: WorkPackageImpl,
  core: CoreIndex,
  deps: { delta: DeltaImpl; tau: TauImpl },
): Result<WorkReportImpl, typeof computationWorkReportError> => {
  const { res: bold_t, gasUsed } = pack.isAuthorized(core, {
    delta: deps.delta,
  });

  if (
    !bold_t.isSuccess() ||
    bold_t.success.length > MAX_WORKREPORT_OUTPUT_SIZE
  ) {
    return err(computationWorkReportError);
  }

  const _keys_in_bold_l = pack.workItems
    .map((p) =>
      p.importSegments
        .map((i) => i.root)
        .filter((x) => isExportingWorkPackageHash(x)),
    )
    .flat()
    .slice(0, 8);

  //TODO: $(0.7.1 - 14.14)
  const bold_l = new IdentityMap<WorkPackageHash, 32, Hash>();

  const _deps = {
    ...deps,
    core,
    authorizerOutput: bold_t.success,
    overline_i: pack.workItems.map((w) => S_fn(w, bold_l)),
    rLengthSoFar: 0,
  };

  const preTransposeEls = new Array(pack.workItems.length) // j \in N_{|p_w|}
    .fill(0)
    .map((_, j) => {
      const { res: r, gasUsed, out: e } = I_fn(pack, j, _deps);
      // part of I_fn optimization to avoud recomputing
      if (r.isSuccess()) {
        _deps.rLengthSoFar += r.success.length;
      }
      const workResult = pack.workItems[j].buildDigest(r, gasUsed);
      return { result: workResult, out: e };
    });

  const bold_d = preTransposeEls.map(({ result }) => result);
  // TODO: should we check for length restriction of bold_d?

  const overline_e = preTransposeEls
    .map(({ out: e }) => e)
    .flat() as ExportSegment[];

  // $(0.7.1 - 14.16)
  const s = AvailabilitySpecificationImpl.build(
    pack.hash(),
    encodeWithCodec(
      createCodec<{
        encodedPackage: Uint8Array;
        x: Uint8Array[];
        s: Uint8Array[];
        j: Hash[];
      }>([
        ["encodedPackage", IdentityCodec],
        ["x", dlArrayOfUint8ArrayCodec],
        ["s", dlArrayOfUint8ArrayCodec],
        ["j", createArrayLengthDiscriminator(HashCodec)],
      ]),
      {
        encodedPackage: pack.toBinary(),
        x: pack.workItems
          .map((wi) => wi.exportedDataSegments.map((a) => a.originalBlob()))
          .flat(),
        s: pack.workItems.map((wi) => S_fn(wi, bold_l)).flat(),
        j: pack.workItems.map((wi) => inner_J_fn(wi, bold_l)).flat(),
      },
    ),
    overline_e, // exported segments
  );

  return ok(
    new WorkReportImpl({
      // s
      avSpec: s,
      // bold_c
      context: pack.context,
      // c
      core: core,
      // a
      authorizerHash: pack.authorizer(),
      // bold_t
      authTrace: bold_t.success,
      // l
      srLookup: bold_l,
      // r
      digests: toTagged(bold_d),
      authGasUsed: gasUsed,
    }),
  );
};

// $(0.7.1 - 14.12)
const I_fn = (
  /**
   * `bold_p`
   */
  workPackage: WorkPackageImpl,
  /**
   * `j`
   */
  workIndex: number,
  deps: {
    delta: DeltaImpl;
    core: CoreIndex;
    tau: TauImpl;
    /**
     * `bold_t`
     */
    authorizerOutput: Buffer;
    overline_i: ExportSegment[][];
    rLengthSoFar: number; // `∑k<j,(r∈B,... )=I(p,k) |r|`
  },
): {
  res: WorkOutputImpl<WorkError>; // `r`
  gasUsed: Gas; // `u`
  out: Buffer[]; // `e`
} => {
  const w = workPackage.workItems[workIndex];
  const l = workPackage.workItems
    .slice(0, workIndex)
    .map((wi) => wi.exportCount)
    .reduce((a, b) => a + b, 0);
  const re = refineInvocation(
    deps.core,
    workIndex,
    workPackage,
    deps.authorizerOutput, // o
    deps.overline_i,
    l,
    { delta: deps.delta, tau: deps.tau }, // deps
  );
  const z = deps.authorizerOutput.length + deps.rLengthSoFar;
  if (re.out.length + z < MAX_WORKREPORT_OUTPUT_SIZE) {
    return {
      res: WorkOutputImpl.big(),
      gasUsed: re.gasUsed,
      out: new Array(w.exportCount)
        .fill(0)
        .map(() =>
          Buffer.alloc(ERASURECODE_BASIC_SIZE * ERASURECODE_EXPORTED_SIZE),
        ),
    };
  }

  if (re.out.length !== w.exportCount) {
    return {
      res: WorkOutputImpl.badExports(),
      gasUsed: re.gasUsed,
      out: new Array(w.exportCount)
        .fill(0)
        .map(() =>
          Buffer.alloc(ERASURECODE_BASIC_SIZE * ERASURECODE_EXPORTED_SIZE),
        ),
    };
  }

  if (re.res.isError()) {
    return {
      res: re.res,
      out: new Array(w.exportCount)
        .fill(0)
        .map(() =>
          Buffer.alloc(ERASURECODE_BASIC_SIZE * ERASURECODE_EXPORTED_SIZE),
        ),
      gasUsed: re.gasUsed,
    };
  }
  return re;
};

/**
 * $(0.7.1 - 14.13)
 */
const L_fn = (
  hash: WorkItem["importSegments"][0]["root"],
  bold_l: Map<WorkPackageHash, Hash>,
): Hash => {
  //bold_l = segment root dictionary
  if (isExportingWorkPackageHash(hash)) {
    const x = bold_l.get(hash.value);
    assert(typeof x !== "undefined");
    return x;
  }
  return hash;
};

/**
 * $(0.7.1 - 14.15)
 * @param workItem `bold_w`
 * @param segmentRootLookup `bold_l`
 */
const S_fn = (
  workItem: WorkItem,
  segmentRootLookup: Map<WorkPackageHash, Hash>,
): ExportSegment[] => {
  return workItem.importSegments.map(
    ({ root, index }) =>
      merkleTreeRootRetriever(L_fn(root, segmentRootLookup))[
        index
      ] as unknown as ExportSegment,
  );
};
/**
 * $(0.7.1 - 14.15)
 */
const inner_J_fn = (
  workItem: WorkItem,
  segmentRootLookup: Map<WorkPackageHash, Hash>,
): Hash[] => {
  return workItem.importSegments
    .map(({ root, index }) => {
      const s = merkleTreeRootRetriever(L_fn(root, segmentRootLookup));
      return J_fn(0, s, index);
    })
    .flat();
};

// TODO:
const merkleTreeRootRetriever: (h: Hash) => Buffer[] = () => [];
