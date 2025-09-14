import {
  memory,
  uint8ArrayToU64LE,
  uint8ArrayToU64LEFast,
  foruint8ArrayToU64LEFast,
} from "../build/release.js";
import { beforeAll, bench, describe } from "vitest";

console.log(memory.buffer);
const v = Buffer.from(memory.buffer);
v.set([1, 2, 3, 4, 5, 6, 7, 8], 0);
describe("reading u64 from uint8array", () => {
  bench("uint8ArrayToU64LE", () => {
    uint8ArrayToU64LE(0);
  });
  bench("uint8ArrayToU64LEFast", () => {
    uint8ArrayToU64LEFast(0);
  });
  bench("Buffer.readBigUInt64LE", () => {
    v.readBigUInt64LE(0);
  });
});
describe("loop", () => {
  bench("wasm", () => {
    foruint8ArrayToU64LEFast(0);
  });
  bench("js", () => {
    for (let i = 0; i < 10000000; i++) {
      v.readBigUInt64LE(0);
    }
  });
});
