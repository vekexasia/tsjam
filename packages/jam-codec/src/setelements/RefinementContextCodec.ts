import { RefinementContext, Tau, WorkPackageHash } from "@tsjam/types";
import {
  GenericBytesBigIntCodec,
  HashCodec,
  WorkPackageHashCodec,
} from "@/identity.js";
import { E_sub_int } from "@/ints/E_subscr.js";
import { OptBytesBigIntCodec } from "@/optional.js";
import { createCodec } from "@/utils";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator";

/**
 * it defines codec for the RefinementContext or member of `X` set
 * $(0.5.0 - C.21)
 */
export const RefinementContextCodec = createCodec<RefinementContext>([
  [
    "anchor",
    createCodec<RefinementContext["anchor"]>([
      ["headerHash", HashCodec],
      ["posteriorStateRoot", HashCodec],
      ["posteriorBeefyRoot", HashCodec],
    ]),
  ],
  [
    "lookupAnchor",
    createCodec<RefinementContext["lookupAnchor"]>([
      ["headerHash", HashCodec],
      ["timeSlot", E_sub_int<Tau>(4)],
    ]),
  ],
  [
    "requiredWorkPackages",
    createArrayLengthDiscriminator(WorkPackageHashCodec),
  ],
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
