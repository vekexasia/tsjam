export * from "./bigint_bytes.js";
export * from "./hex.js";
export * from "./historicalLookup.js";
export * from "./Timekeeping.js";
export * from "./utils.js";
export * from "./serviceAccountVirtualElements.js";
import { Err, Ok } from "neverthrow";

declare module "neverthrow" {
  export interface Err<T, E> {
    safeRet(): E extends never ? [E, T] : [E, undefined];
  }

  export interface Ok<T, E> {
    safeRet(): T extends never ? [E, T] : [undefined, T];
  }
}

Ok.prototype.safeRet = function () {
  return [undefined, this.value];
};

Err.prototype.safeRet = function () {
  return [this.error, undefined];
};
