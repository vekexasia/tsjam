import { ByteArrayOfLength } from "@/genericTypes.js";

/**
 * `J` in the graypaper
 * they're referenced by root of a merkle tree + their index in the tree
 * @see WorkItem.importedDataSegments
 * @see WorkItem.exportedDataSegments
 * $(0.7.1 - 14.1)
 * length value is `WG = WP*WE`
 */
export type ExportSegment = ByteArrayOfLength<4104>;
