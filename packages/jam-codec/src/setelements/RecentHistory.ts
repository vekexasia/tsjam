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
  NULLORCodec,
  WrapJSONCodec,
} from "@/json/JsonCodec";

/**
 *
 * This is defined in C(3) of state merklization
 */
export const RecentHistoryCodec: JamCodec<RecentHistory> =
  createArrayLengthDiscriminator(
    createCodec<RecentHistoryItem>([
      ["headerHash", create32BCodec<HeaderHash>()],
      ["accumulationResultMMR", E_M],
      ["stateRoot", create32BCodec<StateRootHash>()],
      ["reportedPackages", buildKeyValueCodec(HashCodec)],
    ]),
  );

export const RecentHistoryJSONCodec: JSONCodec<
  RecentHistory,
  Array<{
    header_hash: string;
    mmr: { peaks: Array<null | string> };
    state_root: string;
    reported: Array<{ hash: string; exports_root: string }>;
  }>
> = ArrayOfJSONCodec(
  createJSONCodec<RecentHistoryItem>([
    ["headerHash", "header_hash", HashJSONCodec<HeaderHash>()],
    [
      "accumulationResultMMR",
      "mmr",
      WrapJSONCodec("peaks", ArrayOfJSONCodec(NULLORCodec(HashJSONCodec()))),
    ],
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
);
