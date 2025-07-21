import {
  BandersnatchKey,
  Dagger,
  DoubleDagger,
  ExportingWorkPackageHash,
  Hash,
  JamHeader,
  JamState,
  Posterior,
  Tagged,
  ValidatorData,
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
 * `HA` in the graypaper
 * @param header - the header of the blockj
 * @param state - the state of the safrole state machine
 *
 * @returns undefined in case blockAuthorKeyIndex is invalid and not within
 * $(0.7.0 - 5.9)
 */

export const getBlockAuthorKey = (
  header: JamHeader,
  p_kappa: Posterior<JamState["kappa"]>,
): BandersnatchKey | undefined => {
  const k: ValidatorData | undefined = p_kappa.elements[header.authorIndex];
  return k?.banderSnatch;
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
