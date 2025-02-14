import {
  BeefyRootHash,
  HeaderHash,
  RefinementContext,
  StateRootHash,
  Tau,
} from "@tsjam/types";
import { create32BCodec, HashCodec, WorkPackageHashCodec } from "@/identity.js";
import { E_sub_int } from "@/ints/E_subscr.js";
import { createCodec } from "@/utils";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator";

/**
 * it defines codec for the RefinementContext or member of `X` set
 * $(0.6.1 - C.21)
 */
export const RefinementContextCodec = createCodec<RefinementContext>([
  [
    "anchor",
    createCodec<RefinementContext["anchor"]>([
      ["hash", create32BCodec<HeaderHash>()],
      ["stateRoot", create32BCodec<StateRootHash>()],
      ["beefyRoot", create32BCodec<BeefyRootHash>()],
    ]),
  ],
  [
    "lookupAnchor",
    createCodec<RefinementContext["lookupAnchor"]>([
      ["hash", create32BCodec<HeaderHash>()],
      ["timeSlot", E_sub_int<Tau>(4)],
    ]),
  ],
  ["dependencies", createArrayLengthDiscriminator(WorkPackageHashCodec)],
]);

if (import.meta.vitest) {
  const { beforeAll, describe, it, expect } = import.meta.vitest;
  const { getCodecFixtureFile } = await import("@/test/utils.js");
  const { encodeWithCodec } = await import("@/utils");
  describe("RefinementContextCodec", () => {
    let bin: Uint8Array;
    beforeAll(() => {
      bin = getCodecFixtureFile("refine_context.bin");
    });

    it("should encode/decode properly", () => {
      const decoded = RefinementContextCodec.decode(bin);
      expect(RefinementContextCodec.encodedSize(decoded.value)).toBe(
        bin.length,
      );
      const reencoded = encodeWithCodec(RefinementContextCodec, decoded.value);
      expect(Buffer.from(reencoded).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
  });
}
