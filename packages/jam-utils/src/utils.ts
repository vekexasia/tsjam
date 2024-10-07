import {
  BandersnatchKey,
  Dagger,
  DoubleDagger,
  Posterior,
  SeqOfLength,
  Tagged,
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
  return toTagged(value);
};

/**
 * converts any value to DoubleDagger<Value>
 */
export const toDoubleDagger = <T>(value: Dagger<T>): DoubleDagger<T> => {
  return toTagged(value);
};

/**
 * converts any value to Posterior<Value>
 */
export const toPosterior = <T>(
  value: Dagger<T> | DoubleDagger<T> | T,
): Posterior<T> => {
  return toTagged(value);
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
  return typeof gamma_s[0] === "bigint";
};

/**
 * `Ha` in the graypaper
 * @param header - the header of the blockj
 * @param state - the state of the safrole state machine
 */
export const getBlockAuthorKey = (header: JamHeader, state: SafroleState) => {
  if (isFallbackMode(state.gamma_s)) {
    return state.gamma_s[header.timeSlotIndex % EPOCH_LENGTH];
  } else {
    const k = state.kappa[header.blockAuthorKeyIndex];
    return k.banderSnatch;
  }
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
