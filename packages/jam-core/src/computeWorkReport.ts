import {
  AvailabilitySpecification,
  CoreIndex,
  Delta,
  ExportSegment,
  Gas,
  Hash,
  Tau,
  WorkDigest,
  WorkError,
  WorkItem,
  WorkOutput,
  WorkPackageHash,
  WorkPackageWithAuth,
  WorkReport,
  u16,
  u32,
} from "@tsjam/types";
import { isAuthorized, refineInvocation } from "@tsjam/pvm";
import {
  HashCodec,
  IdentityCodec,
  WorkPackageCodec,
  createArrayLengthDiscriminator,
  createCodec,
  dlArrayOfHashesCodec,
  dlArrayOfUint8ArrayCodec,
  encodeWithCodec,
} from "@tsjam/codec";
import { Hashing } from "@tsjam/crypto";
import {
  J_fn,
  L_fn as Leaf_fn,
  constantDepthBinaryTree,
  wellBalancedBinaryMerkleRoot,
} from "@tsjam/merklization";
import { isHash, toTagged, zeroPad } from "@tsjam/utils";
import {
  ERASURECODE_BASIC_SIZE,
  ERASURECODE_EXPORTED_SIZE,
  MAX_WORKREPORT_OUTPUT_SIZE,
} from "@tsjam/constants";
import { erasureCoding, transpose } from "@tsjam/erasurecoding";
import assert from "assert";

/**
 * `Ξ` fn section 14.4
 * @see I_fn
 * @see R_fn
 * @see A_fn
 * @see C_fn
 * @see M_fn
 * $(0.6.6 - 14.11)
 */
export const computeWorkReport = (
  pac: WorkPackageWithAuth,
  core: CoreIndex,
  deps: { delta: Delta; tau: Tau },
): WorkReport => {
  const bold_o = isAuthorized(pac, core);
  const authOutput = bold_o.res;
  if (!(authOutput instanceof Uint8Array)) {
    throw new Error("no auth output. ??????");
  }
  const _deps = {
    ...deps,
    authorizerOutput: authOutput,
    overline_i: pac.items.map((wi) => S_fn(wi, bold_l)),
    rLengthSoFar: 0,
  };

  const preTransposeEls = new Array(pac.items.length) // j \in N_{|p_w|}
    .fill(0)
    .map((_, j) => {
      const { res: r, out: e, usedGas } = I_fn(pac, j, _deps);
      // part of I_fn optimization to avoud recomputing
      if (r instanceof Uint8Array) {
        _deps.rLengthSoFar += r.length;
      }
      const workResult = C_fn(pac.items[j], r, usedGas);
      return { result: workResult, out: e };
    });

  const bold_r = <WorkReport["digests"]>(
    preTransposeEls.map(({ result }) => result)
  );

  const overline_e = preTransposeEls
    .map(({ out: e }) => e)
    .flat() as ExportSegment[];

  // TODO: this is defined in 14.13 and 14.11
  const bold_l = new Map<WorkPackageHash, Hash>();
  //const key_l: ExportingWorkPackageHash[] = pac.workItems
  //  .map((w) => w.importedDataSegments)
  //  .flat()
  //  .map((i) => i.root)
  //  .filter((root) => isExportingWorkPackageHash(root));

  const encodedPackage = encodeWithCodec(WorkPackageCodec, pac);

  const s = A_fn(
    Hashing.blake2b(encodedPackage),
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
        x: pac.items.map((wi) => X_fn(wi)).flat(),
        s: pac.items.map((wi) => S_fn(wi, bold_l)).flat(),
        j: pac.items.map((wi) => inner_J_fn(wi, bold_l)).flat(),
      },
    ),
    overline_e, // exported segments
  );

  return {
    // s
    avSpec: s,
    // bold_c
    context: pac.context,
    // c
    core: core,
    // a
    authorizer: pac.pa,
    // o
    authTrace: authOutput,
    // l
    srLookup: bold_l,
    // r
    digests: bold_r,
    authGasUsed: bold_o.usedGas,
  };
};
/**
 * compute availability specifier
 * @returns AvailabilitySpecification
 * $(0.6.4 - 14.16)
 */
const A_fn = (
  packageHash: WorkPackageHash,
  bold_b: Uint8Array,
  exportedSegments: ExportSegment[], // bold_s
): AvailabilitySpecification => {
  const s_flower = transpose(
    [...exportedSegments, ...pagedProof(exportedSegments)].map((x) =>
      erasureCoding(6, x),
    ),
  ).map((x) => wellBalancedBinaryMerkleRoot(x));

  const b_flower = erasureCoding(
    Math.ceil(bold_b.length / ERASURECODE_BASIC_SIZE),
    zeroPad(ERASURECODE_BASIC_SIZE, bold_b),
  ).map(Hashing.blake2b);

  return {
    segmentCount: exportedSegments.length as u16,
    packageHash,
    bundleLength: toTagged(<u32>bold_b.length),
    segmentRoot: constantDepthBinaryTree(exportedSegments),
    erasureRoot: wellBalancedBinaryMerkleRoot(
      transpose<Hash>([b_flower, s_flower]).flat(),
    ),
  };
};

/**
 * Paged Proof
 * $(0.6.4 - 14.10)
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
  pac: WorkPackageWithAuth,
  workIndex: number, // `j`
  deps: {
    delta: Delta;
    tau: Tau;
    authorizerOutput: Uint8Array;
    overline_i: ExportSegment[][];
    rLengthSoFar: number; // `∑k<j,(r∈Y,... )=I(p,k) |r|`
  },
): {
  res: WorkOutput; // `r`
  out: Uint8Array[]; // `e`
  usedGas: Gas; // `u`
} => {
  const w = pac.items[workIndex];
  const l = pac.items
    .slice(0, workIndex)
    .map((wi) => wi.exportCount)
    .reduce((a, b) => a + b, 0);
  const re = refineInvocation(
    workIndex,
    pac,
    deps.authorizerOutput, // o
    deps.overline_i,
    l,
    { delta: deps.delta, tau: deps.tau }, // deps
  );
  const z = deps.authorizerOutput.length + deps.rLengthSoFar;
  if (re.out.length + z < MAX_WORKREPORT_OUTPUT_SIZE) {
    return {
      res: WorkError.Big,
      usedGas: re.usedGas,
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
      res: WorkError.BadExports,
      usedGas: re.usedGas,
      out: new Array(w.exportCount)
        .fill(0)
        .map(() =>
          new Uint8Array(
            ERASURECODE_BASIC_SIZE * ERASURECODE_EXPORTED_SIZE,
          ).fill(0),
        ),
    };
  }

  if (!(re.res instanceof Uint8Array)) {
    return {
      res: re.res,
      out: new Array(w.exportCount)
        .fill(0)
        .map(() =>
          new Uint8Array(
            ERASURECODE_BASIC_SIZE * ERASURECODE_EXPORTED_SIZE,
          ).fill(0),
        ),
      usedGas: re.usedGas,
    };
  }
  return re;
};

/**
 * $(0.6.4 - 14.12)
 */
const L_fn = (
  hash: WorkItem["importSegments"][0]["root"],
  bold_l: Map<WorkPackageHash, Hash>,
): Hash => {
  //bold_l = segment root dictionary
  if (!isHash(hash)) {
    // ExportingWorkPackageHash
    const x = bold_l.get(<WorkPackageHash>hash.value);
    assert(typeof x !== "undefined");
    return x;
  }
  return hash;
};

/**
 * $(0.6.4 - 14.14)
 */
const X_fn = (workItem: WorkItem) => {
  return workItem.exportedDataSegments.map(({ blobHash }) => {
    return blobPreimageRetriever(blobHash);
  });
};
/**
 * $(0.6.4 - 14.14)
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
 * $(0.6.4 - 14.14)
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
 * `C` constructs WorkResult from item and output
 * $(0.6.4 - 14.8)
 */
export const C_fn = (
  workItem: WorkItem,
  out: WorkOutput,
  gasUsed: Gas,
): WorkDigest => {
  return {
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
  };
};

// TODO:
const merkleTreeRootRetriever: (h: Hash) => Uint8Array[] = () => [];
const blobPreimageRetriever: (h: Hash) => Uint8Array = () => new Uint8Array(); // todg
