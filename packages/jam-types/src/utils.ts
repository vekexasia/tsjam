import { Dagger, DoubleDagger, Posterior, Tagged } from "@/genericTypes";

/**
 * simple utility function to go from untagged to tagged
 */
export const toTagged = <K, Tag extends PropertyKey, Metadata>(
  value: K,
): Tagged<K, Tag, Metadata> => {
  return value as Tagged<K, Tag, Metadata>;
};

export const toDagger = <T>(value: T): Dagger<T> => {
  return toTagged(value);
};

export const toDoubleDagger = <T>(value: Dagger<T>): DoubleDagger<T> => {
  return toTagged(value);
};

export const toPosterior = <T>(
  value: Dagger<T> | DoubleDagger<T> | T,
): Posterior<T> => {
  return toTagged(value);
};
