import {
  BeefyRootHash,
  HeaderHash,
  RefinementContext,
  StateRootHash,
  Tau,
} from "@tsjam/types";
import { create32BCodec, WorkPackageHashCodec } from "@/identity.js";
import { E_sub_int } from "@/ints/E_subscr.js";
import { createCodec } from "@/utils";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator";
import {
  ArrayOfJSONCodec,
  HashJSONCodec,
  JSONCodec,
  NumberJSONCodec,
} from "@/json/JsonCodec";
import { hextToBigInt } from "@tsjam/utils";

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

export const RefinementContextJSONCodec: JSONCodec<
  RefinementContext,
  {
    anchor: string;
    state_root: string;
    beefy_root: string;
    lookup_anchor: string;
    lookup_anchor_slot: number;
    prerequisites: string[];
  }
> = {
  fromJSON(json) {
    return {
      anchor: {
        hash: hextToBigInt(json.anchor),
        stateRoot: hextToBigInt(json.state_root),
        beefyRoot: hextToBigInt(json.beefy_root),
      },
      lookupAnchor: {
        hash: hextToBigInt(json.lookup_anchor),
        timeSlot: <Tau>json.lookup_anchor_slot,
      },
      dependencies: json.prerequisites.map((a) => hextToBigInt(a)),
    };
  },
  toJSON(value) {
    return {
      anchor: HashJSONCodec().toJSON(value.anchor.hash),
      state_root: HashJSONCodec().toJSON(value.anchor.stateRoot),
      beefy_root: HashJSONCodec().toJSON(value.anchor.beefyRoot),
      lookup_anchor: HashJSONCodec().toJSON(value.lookupAnchor.hash),
      lookup_anchor_slot: NumberJSONCodec().toJSON(value.lookupAnchor.timeSlot),
      prerequisites: ArrayOfJSONCodec(HashJSONCodec()).toJSON(
        value.dependencies,
      ),
    };
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
