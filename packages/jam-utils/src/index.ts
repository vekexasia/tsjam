export * from "./bigint_bytes.js";
export * from "./hex.js";
export * from "./historicalLookup.js";
export * from "./Timekeeping.js";
export * from "./utils.js";
export * from "./serviceAccountVirtualElements.js";
import { Err, Ok, Result, err, ok } from "neverthrow";

declare module "neverthrow" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export class Err<T, E> {
    public safeRet(): E extends never ? [E, T] : [E, undefined];
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export class Ok<T, E> {
    public safeRet(): T extends never ? [E, T] : [undefined, T];
  }
}
Ok.prototype.safeRet = function () {
  return [undefined, this.value];
};
Err.prototype.safeRet = function () {
  return [this.error, undefined];
};
