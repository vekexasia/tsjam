import { initPVM, read_registers, set_register } from "../build/release";
import { describe, it, expect } from "vitest";

describe("pvmasm", () => {
  it("diocan", () => {
    console.log(initPVM);
    const x = initPVM();
    const y = initPVM();
    console.log(set_register(x, 1, 2n ** 64n - 1n));
    console.log(set_register(y, 1, 42n));

    console.log(read_registers(x));
    console.log(read_registers(y));
  });
});
