import {
  AvailabilitySpecification,
  CoreIndex,
  Delta,
  ExportSegment,
  Hash,
  Tau,
  WorkItem,
  WorkPackageHash,
  WorkPackageWithAuth,
  WorkReport,
} from "@vekexasia/jam-types";
import { isAuthorized, refineInvocation } from "@vekexasia/jam-pvm";
import { WorkPackageCodec, encodeWithCodec } from "@vekexasia/jam-codec";
import { Hashing } from "@vekexasia/jam-crypto";
import { J_fn, constantDepthBinaryTree } from "@vekexasia/jam-merklization";
import { bytesToBigInt, toTagged } from "@vekexasia/jam-utils";

export const computeWorkResults = (
  pac: WorkPackageWithAuth,
  core: CoreIndex,
): WorkReport => {
  const o = isAuthorized(pac, core);
  if (!(o instanceof Uint8Array)) {
    throw new Error("unexpected");
  }
  return {
    authorizerHash: pac.pa,
    authorizerOutput: o,
    refinementContext: pac.context,
    workPackageSpecification: A_fn(pac, []), // todo
    results: null as unknown as any, // todo
    coreIndex: core,
  };

  throw new Error("Not implemented");
};
/**
 * compute availability specifier
 * @param pac
 * @returns AvailabilitySpecification
 */
const A_fn = (
  pac: WorkPackageWithAuth,
  exportedSegments: Uint8Array[],
): AvailabilitySpecification => {
  const x = pac.workItems.map((item) => X_fn(item)).flat();
  const i = pac.workItems.map((item) => M_fn(item)).flat();
  const j = pac.workItems
    .map((item) =>
      item.importedDataSegments.map(({ root, index }) =>
        J_fn(merkleTreeRootRetriever(root), index, Hashing.blake2bBuf),
      ),
    )
    .flat(2);

  const blob = new Uint8Array(); // todo:encode x, i, j

  const a: AvailabilitySpecification = {
    workPackageHash: Hashing.blake2b(encodeWithCodec(WorkPackageCodec, pac)),
    bundleLength: toTagged(blob.length),
    segmentRoot: bytesToBigInt(
      constantDepthBinaryTree(exportedSegments, Hashing.blake2bBuf),
    ),
    erasureRoot: null as unknown as Hash, //todo
  };

  throw new Error("Not implemented");
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
  l: any,
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
 * (184) X_fn
 */
export const X_fn = (workItem: WorkItem) => {
  return workItem.exportedDataSegments.map(({ blobHash }) => {
    return blobPreimageRetriever(blobHash);
  });
};

const merkleTreeRootRetriever: (h: Hash) => Uint8Array[] = () => []; // todo
const importedSegmentRetriever: (
  h: Hash,
  index: number,
) => ExportSegment = () => null as unknown as ExportSegment; // todo
const blobPreimageRetriever: (h: Hash) => Uint8Array = () => new Uint8Array(); // todo
