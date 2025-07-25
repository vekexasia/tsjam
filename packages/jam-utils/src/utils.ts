import {
  Dagger,
  DoubleDagger,
  ExportingWorkPackageHash,
  Hash,
  Posterior,
  Tagged,
} from "@tsjam/types";
/**
 * simple utility function to go from untagged to tagged
 */
export const toTagged = <K, Tag extends PropertyKey, Metadata>(
  value: K,
): Tagged<K, Tag, Metadata> => {
  return value as Tagged<K, Tag, Metadata>;
};

/**
 * converts any value to Dagger<Value>
 */
export const toDagger = <T>(value: T): Dagger<T> => {
  return value as Dagger<T>;
};

/**
 * converts any value to DoubleDagger<Value>
 */
export const toDoubleDagger = <T>(value: Dagger<T>): DoubleDagger<T> => {
  return value as DoubleDagger<T>;
};

/**
 * converts any value to Posterior<Value>
 */
export const toPosterior = <T>(
  value: Dagger<T> | DoubleDagger<T> | T,
): Posterior<T> => {
  return value as Posterior<T>;
};

/**
 * Creates a new buffer which is a multiple of n in length
 * `P` in the graypaper
 * @param buf - original buffer
 * @param n - the multiple of which the end buffer length should be
 * @see $(0.6.4 - 14.17)
 */
export const zeroPad = (n: number, buf: Uint8Array): Uint8Array => {
  const toRet = new Uint8Array(Math.ceil(buf.length / n) * n).fill(0);
  toRet.set(buf);
  return toRet;
};

/**
 * Checks if its a plain hash.
 * Can be used to check about the workItem importedDataSegments[0].root
 */
export const isHash = <X = unknown>(x: Hash | X): x is Hash => {
  return typeof x === "bigint";
};

export const isExportingWorkPackageHash = (
  x: ExportingWorkPackageHash | Hash,
): x is ExportingWorkPackageHash => {
  return !isHash(x);
};
