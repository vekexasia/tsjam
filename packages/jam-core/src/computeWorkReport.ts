import {
  createArrayLengthDiscriminator,
  createCodec,
  dlArrayOfHashesCodec,
  dlArrayOfUint8ArrayCodec,
  encodeWithCodec,
  HashCodec,
  IdentityCodec,
} from "@tsjam/codec";
import {
  ERASURECODE_BASIC_SIZE,
  ERASURECODE_EXPORTED_SIZE,
  MAX_WORKREPORT_OUTPUT_SIZE,
} from "@tsjam/constants";
import { Hashing } from "@tsjam/crypto";
import { erasureCoding, transpose } from "@tsjam/erasurecoding";
import {
  CoreIndex,
  ExportSegment,
  Gas,
  Hash,
  u16,
  u32,
  WorkError,
  WorkItem,
  WorkPackageHash,
} from "@tsjam/types";
import {
  isExportingWorkPackageHash,
  isHash,
  toTagged,
  zeroPad,
} from "@tsjam/utils";
import assert from "assert";
import { err, ok, Result } from "neverthrow";
import { AvailabilitySpecificationImpl } from "./classes/AvailabilitySpecificationImpl";
import { DeltaImpl } from "./classes/DeltaImpl";
import { WorkDigestImpl } from "./classes/WorkDigestImpl";
import { WorkOutputImpl } from "./classes/WorkOutputImpl";
import { WorkPackageImpl } from "./classes/WorkPackageImpl";
import { WorkReportImpl } from "./classes/WorkReportImpl";
import {
  constantDepthBinaryTree,
  J_fn,
  L_fn as Leaf_fn,
  wellBalancedBinaryMerkleRoot,
} from "./merklization";
import { refineInvocation } from "./pvm";
import { TauImpl } from "./classes/SlotImpl";

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
  if (bold_t.isError()) {
    return err(computationWorkReportError);
  }

  if (
    bold_t.isSuccess() &&
    bold_t.success.length > MAX_WORKREPORT_OUTPUT_SIZE
  ) {
    return err(computationWorkReportError);
  }
  if (!bold_t.isSuccess()) {
    // it's impossible it is not success at this point
    throw new Error("type guard for typescript");
  }

  const keys_in_bold_l = pack.workItems
    .map((p) =>
      p.importSegments
        .map((i) => i.root)
        .filter((x) => isExportingWorkPackageHash(x)),
    )
    .flat()
    .slice(0, 8);

  //TODO: $(0.7.1 - 14.14)
  const bold_l = new Map<WorkPackageHash, Hash>();

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
      if (r instanceof Uint8Array) {
        _deps.rLengthSoFar += r.length;
      }
      const workResult = C_fn(pack.workItems[j], r, gasUsed);
      return { result: workResult, out: e };
    });

  const bold_d = preTransposeEls.map(({ result }) => result);
  // TODO: should we check for length restriction of bold_d?

  const overline_e = preTransposeEls
    .map(({ out: e }) => e)
    .flat() as ExportSegment[];

  const encodedPackage = pack.toBinary();
  const h = pack.hash();
  const s = A_fn(
    h,
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
        encodedPackage,
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
/**
 * compute availability specifier
 * @returns AvailabilitySpecification
 * $(0.7.1 - 14.17)
 */
const A_fn = (
  packageHash: WorkPackageHash,
  bold_b: Uint8Array,
  exportedSegments: ExportSegment[], // bold_s
): AvailabilitySpecificationImpl => {
  const s_flower = transpose(
    [...exportedSegments, ...pagedProof(exportedSegments)].map((x) =>
      erasureCoding(6, x),
    ),
  ).map((x) => wellBalancedBinaryMerkleRoot(x));

  const b_flower = erasureCoding(
    Math.ceil(bold_b.length / ERASURECODE_BASIC_SIZE),
    zeroPad(ERASURECODE_BASIC_SIZE, bold_b),
  ).map(Hashing.blake2b);

  return new AvailabilitySpecificationImpl({
    segmentCount: exportedSegments.length as u16,
    packageHash,
    bundleLength: toTagged(<u32>bold_b.length),
    segmentRoot: constantDepthBinaryTree(exportedSegments),
    erasureRoot: wellBalancedBinaryMerkleRoot(
      transpose<Hash>([b_flower, s_flower]).flat(),
    ),
  });
};

/**
 * Paged Proof
 * $(0.7.1 - 14.11)
 */
const pagedProof = (segments: ExportSegment[]): Uint8Array[] => {
  const limit = 64 * Math.ceil(segments.length / 64);
  const toRet = [];
  for (let i = 0; i < limit; i += 64) {
    const j6 = J_fn(6, segments, i);
    const l6 = Leaf_fn(6, segments, i);
    const encoded = new Uint8Array([
      ...encodeWithCodec(dlArrayOfHashesCodec, j6),
      ...encodeWithCodec(dlArrayOfHashesCodec, l6),
    ]);
    toRet.push(
      zeroPad(ERASURECODE_BASIC_SIZE * ERASURECODE_EXPORTED_SIZE, encoded),
    );
  }
  return toRet as ExportSegment[];
};

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
    authorizerOutput: Uint8Array;
    overline_i: ExportSegment[][];
    rLengthSoFar: number; // `∑k<j,(r∈B,... )=I(p,k) |r|`
  },
): {
  res: WorkOutputImpl<WorkError>; // `r`
  gasUsed: Gas; // `u`
  out: Uint8Array[]; // `e`
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
          new Uint8Array(
            ERASURECODE_BASIC_SIZE * ERASURECODE_EXPORTED_SIZE,
          ).fill(0),
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
          new Uint8Array(
            ERASURECODE_BASIC_SIZE * ERASURECODE_EXPORTED_SIZE,
          ).fill(0),
        ),
    };
  }

  if (re.res.isError()) {
    return {
      res: re.res,
      out: new Array(w.exportCount)
        .fill(0)
        .map(() =>
          new Uint8Array(
            ERASURECODE_BASIC_SIZE * ERASURECODE_EXPORTED_SIZE,
          ).fill(0),
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
  if (!isHash(hash)) {
    // ExportingWorkPackageHash
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

/**
 * `C` constructs WorkDigest from item and output
 * $(0.7.1 - 14.9)
 */
export const C_fn = (
  workItem: WorkItem,
  /**
   * `bold_l`
   */
  out: WorkOutputImpl,
  /**
   * `u`
   */
  gasUsed: Gas,
): WorkDigestImpl => {
  return new WorkDigestImpl({
    serviceIndex: workItem.service,
    codeHash: workItem.codeHash,
    payloadHash: Hashing.blake2b(workItem.payload),
    gasLimit: workItem.accumulateGasLimit,
    result: out,
    refineLoad: {
      gasUsed,
      importCount: <u16>workItem.importSegments.length,
      extrinsicCount: <u16>workItem.exportedDataSegments.length,
      extrinsicSize: <u32>(
        workItem.exportedDataSegments
          .map((x) => x.length)
          .reduce((a, b) => a + b, 0)
      ),
      exportCount: <u16>workItem.exportCount,
    },
  });
};

// TODO:
const merkleTreeRootRetriever: (h: Hash) => Uint8Array[] = () => [];
