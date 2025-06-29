import {
  BeefyRootHash,
  HeaderHash,
  WorkContext,
  StateRootHash,
  Tau,
  WorkPackageHash,
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

/**
 * it defines codec for the WorkContext or member of `X` set
 * $(0.6.4 - C.21)
 */
export const WorkContextCodec = createCodec<WorkContext>([
  [
    "anchor",
    createCodec<WorkContext["anchor"]>([
      ["hash", create32BCodec<HeaderHash>()],
      ["postState", create32BCodec<StateRootHash>()],
      ["accOutLog", create32BCodec<BeefyRootHash>()],
    ]),
  ],
  [
    "lookupAnchor",
    createCodec<WorkContext["lookupAnchor"]>([
      ["hash", create32BCodec<HeaderHash>()],
      ["time", E_sub_int<Tau>(4)],
    ]),
  ],
  ["prerequisites", createArrayLengthDiscriminator(WorkPackageHashCodec)],
]);

export const WorkContextJSONCodec: JSONCodec<
  WorkContext,
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
        hash: HashJSONCodec<HeaderHash>().fromJSON(json.anchor),
        postState: HashJSONCodec<StateRootHash>().fromJSON(json.state_root),
        accOutLog: HashJSONCodec<BeefyRootHash>().fromJSON(json.beefy_root),
      },
      lookupAnchor: {
        hash: HashJSONCodec<HeaderHash>().fromJSON(json.lookup_anchor),
        time: <Tau>json.lookup_anchor_slot,
      },
      prerequisites: json.prerequisites.map((a) =>
        HashJSONCodec<WorkPackageHash>().fromJSON(a),
      ),
    };
  },
  toJSON(value) {
    return {
      anchor: HashJSONCodec().toJSON(value.anchor.hash),
      state_root: HashJSONCodec().toJSON(value.anchor.postState),
      beefy_root: HashJSONCodec().toJSON(value.anchor.accOutLog),
      lookup_anchor: HashJSONCodec().toJSON(value.lookupAnchor.hash),
      lookup_anchor_slot: NumberJSONCodec().toJSON(value.lookupAnchor.time),
      prerequisites: ArrayOfJSONCodec(HashJSONCodec()).toJSON(
        value.prerequisites,
      ),
    };
  },
};
if (import.meta.vitest) {
  const { beforeAll, describe, it, expect } = import.meta.vitest;
  const { getCodecFixtureFile } = await import("@/test/utils.js");
  const { encodeWithCodec } = await import("@/utils");
  describe("WorkContextCodec", () => {
    let bin: Uint8Array;
    beforeAll(() => {
      bin = getCodecFixtureFile("refine_context.bin");
    });

    it("should encode/decode properly", () => {
      const decoded = WorkContextCodec.decode(bin);
      expect(WorkContextCodec.encodedSize(decoded.value)).toBe(bin.length);
      const reencoded = encodeWithCodec(WorkContextCodec, decoded.value);
      expect(Buffer.from(reencoded).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
  });
}
