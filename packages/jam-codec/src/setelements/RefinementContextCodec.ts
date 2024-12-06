import { RefinementContext, Tau, WorkPackageHash } from "@tsjam/types";
import { JamCodec } from "@/codec.js";
import { GenericBytesBigIntCodec, HashCodec } from "@/identity.js";
import { E_4 } from "@/ints/E_subscr.js";
import { OptBytesBigIntCodec } from "@/optional.js";

export const OptWorkHashCodec = OptBytesBigIntCodec<WorkPackageHash, 32>(
  GenericBytesBigIntCodec<WorkPackageHash, 32>(32),
);
/**
 * it defines codec for the RefinementContext or member of `X` set
 * $(0.5.0 - C.21)
 */
export const RefinementContextCodec: JamCodec<RefinementContext> = {
  encode(value: RefinementContext, bytes: Uint8Array): number {
    let offset = HashCodec.encode(
      value.anchor.headerHash,
      bytes.subarray(0, 32),
    );
    offset += HashCodec.encode(
      value.anchor.posteriorStateRoot,
      bytes.subarray(offset, offset + 32),
    );
    offset += HashCodec.encode(
      value.anchor.posteriorBeefyRoot,
      bytes.subarray(offset, offset + 32),
    );
    offset += HashCodec.encode(
      value.lookupAnchor.headerHash,
      bytes.subarray(offset, offset + 32),
    );
    offset += E_4.encode(
      BigInt(value.lookupAnchor.timeSlot),
      bytes.subarray(offset, offset + 4),
    );
    offset += OptWorkHashCodec.encode(
      value.requiredWorkPackage,
      bytes.subarray(offset),
    );
    return offset;
  },
  decode(bytes: Uint8Array): { value: RefinementContext; readBytes: number } {
    let offset = 0;
    const anchor = {
      headerHash: HashCodec.decode(bytes.subarray(offset, offset + 32)).value,
      posteriorStateRoot: HashCodec.decode(
        bytes.subarray(offset + 32, offset + 64),
      ).value,
      posteriorBeefyRoot: HashCodec.decode(
        bytes.subarray(offset + 64, offset + 96),
      ).value,
    };
    offset += 96;
    const lookupAnchor = {
      headerHash: HashCodec.decode(bytes.subarray(offset, offset + 32)).value,
      timeSlot: Number(
        E_4.decode(bytes.subarray(offset + 32, offset + 36)).value,
      ) as Tau,
    };
    offset += 36;
    const requiredWorkPackage = OptWorkHashCodec.decode(bytes.subarray(offset));
    return {
      value: {
        anchor,
        lookupAnchor,
        requiredWorkPackage: requiredWorkPackage.value,
      },
      readBytes: offset + requiredWorkPackage.readBytes,
    };
  },
  encodedSize(value: RefinementContext): number {
    return 32 * 4 + 4 + OptWorkHashCodec.encodedSize(value.requiredWorkPackage);
  },
};

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
