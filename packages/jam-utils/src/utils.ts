import {
  BandersnatchKey,
  Dagger,
  DoubleDagger,
  Hash,
  JamState,
  Posterior,
  SeqOfLength,
  Tagged,
  ValidatorData,
} from "@tsjam/types";
import { JamHeader, SafroleState } from "@tsjam/types";
import { EPOCH_LENGTH } from "@tsjam/constants";
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
 * Check if the current epoch is in fallback mode.
 * @param gamma_s - a series of E tickets or, in the case of a fallback mode, a series of E Bandersnatch keys
 * @returns
 * @see SafroleState.gamma_s
 */
export const isFallbackMode = (
  gamma_s: SafroleState["gamma_s"],
): gamma_s is SeqOfLength<BandersnatchKey, typeof EPOCH_LENGTH, "gamma_s"> => {
  return gamma_s[0] instanceof Uint8Array;
};

/**
 * `Ha` in the graypaper
 * @param header - the header of the blockj
 * @param state - the state of the safrole state machine
 *
 * @returns undefined in case blockAuthorKeyIndex is invalid and not within
 * $(0.5.3 - 5.9)
 */

export const getBlockAuthorKey = (
  header: JamHeader,
  p_kappa: Posterior<JamState["kappa"]>,
): BandersnatchKey | undefined => {
  const k: ValidatorData | undefined = p_kappa[header.blockAuthorKeyIndex];
  return k?.banderSnatch;
};

/**
 * Creates a new buffer which is a multiple of n in length
 * `P` in the graypaper
 * @param buf - original buffer
 * @param n - the multiple of which the end buffer length should be
 * @see (186)
 */
export const zeroPad = (n: number, buf: Uint8Array): Uint8Array => {
  const toRet = new Uint8Array(Math.ceil(buf.length / n) * n).fill(0);
  toRet.set(buf);
  return toRet;
};

export const isHash = <X = any>(x: Hash | X): x is Hash => {
  return typeof x === "bigint";
};
