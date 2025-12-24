import { describe, it } from "vitest";
import v8 from "v8";
import { produceBlock } from "../src/block-generator";
import { GENESIS } from "../src/genesis";
import { AppliedBlock, ChainManager, SlotImpl } from "@tsjam/core";
import { u32 } from "@tsjam/types";
import { toTagged } from "@tsjam/utils";

describe.skip("Garbage Collection", () => {
  it(
    "should not crash",
    async () => {
      console.log(
        "Heap limit:",
        v8.getHeapStatistics().heap_size_limit / 1024 / 1024,
        v8.getHeapStatistics().used_heap_size / 1024 / 1024,
        "MB",
      );
      const chainManager = await ChainManager.build(GENESIS);
      let b: AppliedBlock = GENESIS;
      for (let i = 0; i < 4444; i++) {
        b = await produceBlock(
          b,
          toTagged(new SlotImpl(<u32>(420420 + i))),
          chainManager,
        );
        // global.gc!();
      }
      console.log(b!);
      console.log(
        "Heap limit:",
        v8.getHeapStatistics().heap_size_limit / 1024 / 1024,
        v8.getHeapStatistics().used_heap_size / 1024 / 1024,
        "MB",
      );
    },
    { timeout: 60000 },
  );
});
