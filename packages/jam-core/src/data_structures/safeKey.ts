import { uncheckedConverter } from "@vekexasia/bigint-uint8array";

export type SafeKey = string | number | boolean | bigint | symbol;

export interface SafeKeyable {
  safeKey(): SafeKey;
}

export type SafeKeyProvider<T> = (value: T) => SafeKey;

export const isSafeKeyable = (x: any): x is SafeKeyable => {
  return typeof x === "object" && x !== null && typeof x.safeKey === "function";
};

export const isSafeKey = (key: any): key is SafeKey => {
  return (
    typeof key === "string" ||
    typeof key === "number" ||
    typeof key === "boolean" ||
    typeof key === "bigint" ||
    typeof key === "symbol"
  );
};

export const IdentitySafeKeyProvider: SafeKeyProvider<Uint8Array> = (
  value: Uint8Array,
) => {
  return uncheckedConverter.arrayToLittleEndian(value);
};
