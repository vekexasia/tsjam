import {
  AvailabilitySpecification,
  CoreIndex,
  Delta,
  ExportSegment,
  Hash,
  Tau,
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
  WorkPackageCodec,
  dlArrayOfHashesCodec,
  dlArrayOfUint8ArrayCodec,
  encodeWithCodec,
} from "@tsjam/codec";
import { Hashing } from "@tsjam/crypto";
import {
  J_fn,
  constantDepthBinaryTree,
  traceBinarySliced,
  wellBalancedBinaryMerkleRoot,
} from "@tsjam/merklization";
import { toTagged, zeroPad } from "@tsjam/utils";
import {
  ERASURECODE_BASIC_SIZE,
  ERASURECODE_EXPORTED_SIZE,
} from "@tsjam/constants";
import { erasureCoding, transpose } from "@tsjam/erasurecoding";

/**
 * `Ξ` fn section 14.4
 * @see I_fn
 * @see R_fn
 * @see A_fn
 * @see C_fn
 * @see M_fn
 */
export const computeWorkReport = (
  pac: WorkPackageWithAuth,
  core: CoreIndex,
  deps: { delta: Delta; tau: Tau },
): WorkReport => {
  //

  // $(0.5.0 - 14.10) | first matching case
  const o = isAuthorized(pac, core);
  if (!(o instanceof Uint8Array)) {
    throw new Error("unexpected");
  }

  const els = new Array(pac.workItems.length).fill(0).map((_, j) => {
    const { result: r, out: e } = I_fn(pac, j, o, deps);
    const workResult = C_fn(pac.workItems[j], r);
    return { result: workResult, out: e };
  });

  return {
    authorizerHash: pac.pa,
    authorizerOutput: o,
    refinementContext: pac.context,
    // FIXME: (196)
    segmentRootLookup: null as unknown as Map<WorkPackageHash, Hash>,
    workPackageSpecification: A_fn(
      pac,
      els.map((a) => a.out).flat() as ExportSegment[],
    ),
    results: toTagged(els.map((a) => a.result)),
    coreIndex: core,
  };
};
/**
 * compute availability specifier
 * @returns AvailabilitySpecification
 * $(0.5.0 - 14.15)
 */
const A_fn = (
  pac: WorkPackageWithAuth,
  exportedSegments: ExportSegment[],
): AvailabilitySpecification => {
  const x = pac.workItems.map((item) => X_fn(item)).flat();
  const i = pac.workItems.map((item) => M_fn(item)).flat();
  const j = pac.workItems
    .map((item) =>
      item.importedDataSegments.map(({ root, index }) =>
        J_fn(merkleTreeRootRetriever(root), index),
      ),
    )
    .flat(2);

  const blob = new Uint8Array([
    ...encodeWithCodec(WorkPackageCodec, pac),
    ...encodeWithCodec(dlArrayOfUint8ArrayCodec, x), // todo this is probably wrong
    ...encodeWithCodec(dlArrayOfUint8ArrayCodec, i), // todo this is probably wrong
    ...encodeWithCodec(dlArrayOfHashesCodec, j),
  ]);

  const s_flower = transpose(
    [...exportedSegments, ...pagedProof(exportedSegments)].map((x) =>
      erasureCoding(6, x),
    ),
  ).map((x) => wellBalancedBinaryMerkleRoot(x));

  const b_flower = erasureCoding(
    Math.ceil(blob.length / ERASURECODE_BASIC_SIZE),
    zeroPad(ERASURECODE_BASIC_SIZE, blob),
  ).map(Hashing.blake2b);

  const erasureRoot = wellBalancedBinaryMerkleRoot(
    transpose<Hash>([b_flower, s_flower]).flat(),
  );

  return {
    segmentCount: 0 as u16, // FIXME: this is wrong just comply with TS
    workPackageHash: Hashing.blake2b(encodeWithCodec(WorkPackageCodec, pac)),
    bundleLength: toTagged(blob.length),
    segmentRoot: constantDepthBinaryTree(exportedSegments),
    erasureRoot,
  };
};

/**
 * Paged Proof
 * $(0.5.0 - 14.9)
 */
const pagedProof = (segments: ExportSegment[]): Uint8Array[] => {
  const limit = 64 * Math.ceil(segments.length / 64);
  const toRet = [];
  for (let i = 0; i < limit; i += 64) {
    const p = segments.slice(i, i + 64);
    const j6 = traceBinarySliced(6, segments, i);
    const encoded = new Uint8Array([
      ...encodeWithCodec(dlArrayOfHashesCodec, j6),
      ...encodeWithCodec(dlArrayOfUint8ArrayCodec, p),
    ]);
    toRet.push(
      zeroPad(ERASURECODE_BASIC_SIZE * ERASURECODE_EXPORTED_SIZE, encoded),
    );
  }
  return toRet as Uint8Array[];
};

const I_fn = (
  pac: WorkPackageWithAuth,
  j: number,
  authorizerOutput: Uint8Array,
  deps: { delta: Delta; tau: Tau },
) => {
  return R_fn(
    pac,
    pac.workItems[j],
    pac.workItems
      .slice(0, j)
      .reduce((acc, item) => acc + item.numberExportedSegments, 0),
    authorizerOutput,
    deps,
  );
};

const R_fn = (
  pac: WorkPackageWithAuth,
  item: WorkItem,
  l: number,
  authorizerOutput: Uint8Array,
  deps: {
    delta: Delta;
    tau: Tau;
  },
) => {
  const packageHash: WorkPackageHash = Hashing.blake2b(
    encodeWithCodec(WorkPackageCodec, pac),
  );
  return refineInvocation(
    item.codeHash,
    item.gasLimit,
    item.serviceIndex,
    packageHash,
    item.payload,
    pac.context,
    pac.pa,
    // output
    authorizerOutput,
    M_fn(item),
    X_fn(item),
    l,
    deps, // deps
  );
};

/**
 * (183) M_fn
 */
export const M_fn = (workItem: WorkItem) => {
  return workItem.importedDataSegments.map(({ root, index }) => {
    return importedSegmentRetriever(root, index);
  });
};

/**
 * $(0.5.0 - 14.13)
 */
export const X_fn = (workItem: WorkItem) => {
  return workItem.exportedDataSegments.map(({ blobHash }) => {
    return blobPreimageRetriever(blobHash);
  });
};

/**
 * (179) `C` constructs WorkResult from item and output
 * $(0.5.0 - 14.7)
 */
export const C_fn = (workItem: WorkItem, out: WorkOutput): WorkResult => {
  return {
    serviceIndex: workItem.serviceIndex,
    codeHash: workItem.codeHash,
    payloadHash: Hashing.blake2b(workItem.payload),
    gasPrioritization: workItem.gasLimit,
    output: out,
  };
};

const merkleTreeRootRetriever: (h: Hash) => Uint8Array[] = () => []; // todo
const importedSegmentRetriever: (
  h: Hash,
  index: number,
) => ExportSegment = () => null as unknown as ExportSegment; // todo
const blobPreimageRetriever: (h: Hash) => Uint8Array = () => new Uint8Array(); // todg
