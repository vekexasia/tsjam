import { E_M } from "@/E_M";
import { createCodec } from "../utils";
import { create32BCodec, HashCodec } from "@/identity";
import {
  HeaderHash,
  RecentHistory,
  RecentHistoryItem,
  StateRootHash,
  WorkPackageHash,
} from "@tsjam/types";
import { buildKeyValueCodec } from "@/dicts/keyValue";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator";
import { JamCodec } from "@/codec";
import {
  ArrayOfJSONCodec,
  createJSONCodec,
  HashJSONCodec,
  JSONCodec,
  MapJSONCodec,
  ZipJSONCodecs,
} from "@/json/JsonCodec";

/**
 *
 * This is defined in C(3) of state merklization
 */
export const RecentHistoryCodec: JamCodec<RecentHistory> = createCodec([
  [
    "h",
    createArrayLengthDiscriminator<RecentHistory["h"]>(
      createCodec([
        ["headerHash", create32BCodec<HeaderHash>()],
        ["accumulationResultMMB", HashCodec],
        ["stateRoot", create32BCodec<StateRootHash>()],
        ["reportedPackages", buildKeyValueCodec(HashCodec)],
      ]),
    ),
  ],
  ["b", E_M],
]);

export const RecentHistoryJSONCodec: JSONCodec<
  RecentHistory["h"],
  Array<{
    header_hash: string;
    mmb: string;
    state_root: string;
    reported: Array<{ hash: string; exports_root: string }>;
  }> | null
> = ZipJSONCodecs(
  {
    fromJSON(json) {
      if (json === null) {
        return [];
      }
      return json;
    },
    toJSON(value) {
      if (value.length === 0) {
        return null;
      }
      return value;
    },
  },
  ArrayOfJSONCodec(
    createJSONCodec<
      RecentHistoryItem,
      {
        header_hash: string;
        mmb: string;
        state_root: string;
        reported: Array<{ hash: string; exports_root: string }>;
      }
    >([
      ["headerHash", "header_hash", HashJSONCodec<HeaderHash>()],
      ["accumulationResultMMB", "mmb", HashJSONCodec()],
      ["stateRoot", "state_root", HashJSONCodec<StateRootHash>()],
      [
        "reportedPackages",
        "reported",
        MapJSONCodec(
          { key: "hash", value: "exports_root" },
          HashJSONCodec<WorkPackageHash>(),
          HashJSONCodec(),
        ),
      ],
    ]),
  ),
);
