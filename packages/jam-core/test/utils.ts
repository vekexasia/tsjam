import { Hash } from "@tsjam/types";

export const randomHash = <T extends Hash>(): T => {
  return new Uint8Array(32).fill((Math.random() * 256) | 0) as unknown as T;
};
