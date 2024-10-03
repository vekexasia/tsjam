import { ByteArrayOfLength } from "@/genericTypes.js";

/**
 * `G` in the graypaper
 * (173)
 * Exported segments are also imported in the refine logic (and produced by the refine logic)
 * they're referenced by root of a merkle tree + their index in the tree
 * @see WorkItem.importedDataSegments
 * @see WorkItem.exportedDataSegments
 * @see section 14.2.1
 */
export type ExportSegment = ByteArrayOfLength<4104>;
