import {
  AvailabilitySpecification,
  CoreIndex,
  Delta,
  ExportSegment,
  ExportingWorkPackageHash,
  Hash,
  Tau,
  WorkError,
  WorkItem,
  WorkOutput,
  WorkPackageHash,
  WorkPackageWithAuth,
  WorkReport,
  WorkResult,
  u16,
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
 * $(0.5.4 - 14.11)
 */
export const computeWorkReport = (
  pac: WorkPackageWithAuth,
  core: CoreIndex,
  deps: { delta: Delta; tau: Tau },
): WorkReport => {
  const o = isAuthorized(pac, core);
  if (!(o instanceof Uint8Array)) {
    throw new Error("unexpected");
  }

  // TODO: this is defined in 14.13
  const bold_l = new Map<WorkPackageHash, Hash>();
  const _deps = {
    ...deps,
    segmentRootLookup: bold_l,
    authorizerOutput: o,
  };

  const els = new Array(pac.workItems.length).fill(0).map((_, j) => {
    const { result: r, out: e } = I_fn(pac, j, _deps);
    const workResult = C_fn(pac.workItems[j], r);
    return { result: workResult, out: e };
  });
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
        x: pac.workItems.map((wi) => X_fn(wi)).flat(),
        s: pac.workItems.map((wi) => S_fn(wi, bold_l)).flat(),
        j: pac.workItems.map((wi) => inner_J_fn(wi, bold_l)).flat(),
      },
    ),
    els.map((a) => a.out).flat() as ExportSegment[],
  );

  return {
    // s
    workPackageSpecification: s,
    authorizerHash: pac.pa,
    authorizerOutput: o,
    refinementContext: pac.context,
    segmentRootLookup: bold_l,
    results: toTagged(els.map((a) => a.result)),
    coreIndex: core,
  };
};
/**
 * compute availability specifier
 * @returns AvailabilitySpecification
 * $(0.5.4 - 14.16)
 */
const A_fn = (
  workPackageHash: WorkPackageHash,
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
    workPackageHash,
    bundleLength: toTagged(bold_b.length),
    segmentRoot: constantDepthBinaryTree(exportedSegments),
    erasureRoot: wellBalancedBinaryMerkleRoot(
      transpose<Hash>([b_flower, s_flower]).flat(),
    ),
  };
};

/**
 * Paged Proof
 * $(0.5.4 - 14.10)
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
  j: number,
  deps: {
    delta: Delta;
    tau: Tau;
    authorizerOutput: Uint8Array;
    segmentRootLookup: Map<WorkPackageHash, Hash>;
  },
): {
  result: WorkOutput;
  out: Uint8Array[];
} => {
  const packageHash: WorkPackageHash = Hashing.blake2b(
    encodeWithCodec(WorkPackageCodec, pac),
  );
  const w = pac.workItems[j];
  const l = pac.workItems
    .slice(0, j)
    .map((wi) => wi.numberExportedSegments)
    .reduce((a, b) => a + b, 0);
  const re = refineInvocation(
    w.codeHash,
    w.refinementGasLimit,
    w.serviceIndex,
    packageHash,
    w.payload,
    pac.context,
    pac.pa,
    // output
    deps.authorizerOutput,
    S_fn(w, deps.segmentRootLookup),
    X_fn(w),
    l,
    { delta: deps.delta, tau: deps.tau }, // deps
  );
  if (re.out.length === w.numberExportedSegments) {
    return { result: re.result, out: re.out };
  } else if (re.result instanceof Uint8Array) {
    return {
      result: re.result,
      out: new Array(w.numberExportedSegments)
        .fill(0)
        .map(() =>
          new Uint8Array(
            ERASURECODE_BASIC_SIZE * ERASURECODE_EXPORTED_SIZE,
          ).fill(0),
        ),
    };
  } else {
    return {
      result: WorkError.BadExports,
      out: new Array(w.numberExportedSegments)
        .fill(0)
        .map(() =>
          new Uint8Array(
            ERASURECODE_BASIC_SIZE * ERASURECODE_EXPORTED_SIZE,
          ).fill(0),
        ),
    };
  }
};

/**
 * $(0.5.4 - 14.12)
 */
const L_fn = (
  hash: Hash | ExportingWorkPackageHash,
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
 * $(0.5.4 - 14.14)
 */
const X_fn = (workItem: WorkItem) => {
  return workItem.exportedDataSegments.map(({ blobHash }) => {
    return blobPreimageRetriever(blobHash);
  });
};
/**
 * $(0.5.4 - 14.14)
 */
const S_fn = (
  workItem: WorkItem,
  segmentRootLookup: Map<WorkPackageHash, Hash>,
): ExportSegment[] => {
  return workItem.importedDataSegments.map(
    ({ root, index }) =>
      merkleTreeRootRetriever(L_fn(root, segmentRootLookup))[
        index
      ] as unknown as ExportSegment,
  );
};
/**
 * $(0.5.4 - 14.14)
 */
const inner_J_fn = (
  workItem: WorkItem,
  segmentRootLookup: Map<WorkPackageHash, Hash>,
): Hash[] => {
  return workItem.importedDataSegments
    .map(({ root, index }) => {
      const s = merkleTreeRootRetriever(L_fn(root, segmentRootLookup));
      return J_fn(0, s, index);
    })
    .flat();
};

/**
 * (179) `C` constructs WorkResult from item and output
 * $(0.5.4 - 14.8)
 */
export const C_fn = (workItem: WorkItem, out: WorkOutput): WorkResult => {
  return {
    serviceIndex: workItem.serviceIndex,
    codeHash: workItem.codeHash,
    payloadHash: Hashing.blake2b(workItem.payload),
    gasPrioritization: workItem.accumulationGasLimit,
    output: out,
  };
};

const merkleTreeRootRetriever: (h: Hash) => Uint8Array[] = () => []; // todokk
const blobPreimageRetriever: (h: Hash) => Uint8Array = () => new Uint8Array(); // todg
